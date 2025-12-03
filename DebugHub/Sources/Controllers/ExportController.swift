// ExportController.swift
// DebugHub
//
// Created by Sun on 2025/12/02.
// Copyright © 2025 Sun. All rights reserved.
//

import Fluent
import Vapor

struct ExportController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let export = routes.grouped("devices", ":deviceId", "export")

        export.get("logs", use: exportLogs)
        export.get("http", use: exportHTTP)
        export.get("har", use: exportHAR)
    }

    // MARK: - 导出日志

    func exportLogs(req: Request) async throws -> Response {
        guard let deviceId = req.parameters.get("deviceId") else {
            throw Abort(.badRequest, reason: "Missing deviceId")
        }

        let format = req.query[String.self, at: "format"] ?? "json"
        let timeFrom = req.query[Date.self, at: "timeFrom"]
        let timeTo = req.query[Date.self, at: "timeTo"]
        let level = req.query[String.self, at: "level"]
        let subsystem = req.query[String.self, at: "subsystem"]
        let category = req.query[String.self, at: "category"]

        var query = LogEventModel.query(on: req.db)
            .filter(\.$deviceId == deviceId)

        if let timeFrom {
            query = query.filter(\.$timestamp >= timeFrom)
        }
        if let timeTo {
            query = query.filter(\.$timestamp <= timeTo)
        }
        if let level {
            query = query.filter(\.$level == level)
        }
        if let subsystem {
            query = query.filter(\.$subsystem == subsystem)
        }
        if let category {
            query = query.filter(\.$category == category)
        }

        let events = try await query
            .sort(\.$timestamp, .ascending)
            .all()

        let decoder = JSONDecoder()
        let items = events.map { event -> ExportLogItem in
            let tags = (try? decoder.decode([String].self, from: Data(event.tags.utf8))) ?? []
            return ExportLogItem(
                id: event.id!,
                source: event.source,
                timestamp: event.timestamp,
                level: event.level,
                subsystem: event.subsystem,
                category: event.category,
                loggerName: event.loggerName,
                thread: event.thread,
                file: event.file,
                function: event.function,
                line: event.line,
                message: event.message,
                tags: tags,
                traceId: event.traceId
            )
        }

        return try generateExportResponse(items: items, format: format, filename: "logs", req: req)
    }

    // MARK: - 导出 HTTP 事件

    func exportHTTP(req: Request) async throws -> Response {
        guard let deviceId = req.parameters.get("deviceId") else {
            throw Abort(.badRequest, reason: "Missing deviceId")
        }

        let format = req.query[String.self, at: "format"] ?? "json"
        let timeFrom = req.query[Date.self, at: "timeFrom"]
        let timeTo = req.query[Date.self, at: "timeTo"]
        let method = req.query[String.self, at: "method"]
        let statusCode = req.query[Int.self, at: "statusCode"]

        var query = HTTPEventModel.query(on: req.db)
            .filter(\.$deviceId == deviceId)

        if let timeFrom {
            query = query.filter(\.$startTime >= timeFrom)
        }
        if let timeTo {
            query = query.filter(\.$startTime <= timeTo)
        }
        if let method {
            query = query.filter(\.$method == method.uppercased())
        }
        if let statusCode {
            query = query.filter(\.$statusCode == statusCode)
        }

        let events = try await query
            .sort(\.$startTime, .ascending)
            .all()

        let items = events.map { event -> ExportHTTPItem in
            ExportHTTPItem(
                id: event.id!,
                method: event.method,
                url: event.url,
                statusCode: event.statusCode,
                startTime: event.startTime,
                endTime: event.endTime,
                duration: event.duration,
                errorDescription: event.errorDescription,
                isMocked: event.isMocked,
                traceId: event.traceId
            )
        }

        return try generateExportResponse(items: items, format: format, filename: "http_events", req: req)
    }

    // MARK: - 导出 HAR 格式

    func exportHAR(req: Request) async throws -> Response {
        guard let deviceId = req.parameters.get("deviceId") else {
            throw Abort(.badRequest, reason: "Missing deviceId")
        }

        let timeFrom = req.query[Date.self, at: "timeFrom"]
        let timeTo = req.query[Date.self, at: "timeTo"]
        let ids = req.query[String.self, at: "ids"]?.split(separator: ",").map(String.init)

        var query = HTTPEventModel.query(on: req.db)
            .filter(\.$deviceId == deviceId)

        if let timeFrom {
            query = query.filter(\.$startTime >= timeFrom)
        }
        if let timeTo {
            query = query.filter(\.$startTime <= timeTo)
        }
        if let ids, !ids.isEmpty {
            query = query.filter(\.$id ~~ ids)
        }

        let events = try await query
            .sort(\.$startTime, .ascending)
            .all()

        let harLog = try buildHARLog(from: events)

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(harLog)

        let dateFormatter = ISO8601DateFormatter()
        let timestamp = dateFormatter.string(from: Date())
        let filename = "debug_platform_\(timestamp).har"

        var headers = HTTPHeaders()
        headers.add(name: .contentType, value: "application/json")
        headers.add(name: .contentDisposition, value: "attachment; filename=\"\(filename)\"")

        return Response(status: .ok, headers: headers, body: .init(data: data))
    }

    private func buildHARLog(from events: [HTTPEventModel]) throws -> HARLog {
        let decoder = JSONDecoder()
        var entries: [HAREntry] = []

        for event in events {
            let requestHeaders = (try? decoder.decode([String: String].self, from: Data(event.requestHeaders.utf8))) ??
                [:]
            let responseHeaders: [String: String]? = event.responseHeaders.flatMap {
                try? decoder.decode([String: String].self, from: Data($0.utf8))
            }
            let queryItems = (try? decoder.decode([String: String].self, from: Data(event.queryItems.utf8))) ?? [:]
            let timing: HARTiming? = event.timingJSON.flatMap {
                try? decoder.decode(HARTiming.self, from: Data($0.utf8))
            }

            // 构建请求
            let request = HARRequest(
                method: event.method,
                url: event.url,
                httpVersion: timing?.protocolName ?? "HTTP/1.1",
                cookies: [],
                headers: requestHeaders.map { HARHeader(name: $0.key, value: $0.value) },
                queryString: queryItems.map { HARQueryParam(name: $0.key, value: $0.value) },
                postData: event.requestBody.map { data in
                    HARPostData(
                        mimeType: requestHeaders["Content-Type"] ?? "application/octet-stream",
                        text: String(data: data, encoding: .utf8)
                    )
                },
                headersSize: -1,
                bodySize: event.requestBody?.count ?? 0
            )

            // 构建响应
            let response = HARResponse(
                status: event.statusCode ?? 0,
                statusText: HTTPStatus(statusCode: event.statusCode ?? 0).reasonPhrase,
                httpVersion: timing?.protocolName ?? "HTTP/1.1",
                cookies: [],
                headers: responseHeaders?.map { HARHeader(name: $0.key, value: $0.value) } ?? [],
                content: HARContent(
                    size: event.responseBody?.count ?? 0,
                    mimeType: responseHeaders?["Content-Type"] ?? "application/octet-stream",
                    text: event.responseBody.flatMap { String(data: $0, encoding: .utf8) }
                ),
                redirectURL: responseHeaders?["Location"] ?? "",
                headersSize: -1,
                bodySize: event.responseBody?.count ?? 0
            )

            // 构建时间线
            let harTiming = HARTimings(
                dns: (timing?.dnsLookup).map { $0 * 1000 } ?? -1,
                connect: (timing?.tcpConnection).map { $0 * 1000 } ?? -1,
                ssl: (timing?.tlsHandshake).map { $0 * 1000 } ?? -1,
                send: -1,
                wait: (timing?.timeToFirstByte).map { $0 * 1000 } ?? -1,
                receive: (timing?.contentDownload).map { $0 * 1000 } ?? -1
            )

            let entry = HAREntry(
                startedDateTime: ISO8601DateFormatter().string(from: event.startTime),
                time: (event.duration ?? 0) * 1000,
                request: request,
                response: response,
                cache: HARCache(),
                timings: harTiming,
                serverIPAddress: timing?.remoteAddress,
                connection: timing?.connectionReused == true ? "reused" : nil
            )

            entries.append(entry)
        }

        return HARLog(log: HARLogContent(
            version: "1.2",
            creator: HARCreator(name: "Debug Platform", version: "1.0.0"),
            entries: entries
        ))
    }

    // MARK: - Helpers

    private func generateExportResponse(
        items: [some Encodable],
        format: String,
        filename: String,
        req _: Request
    ) throws -> Response {
        let dateFormatter = ISO8601DateFormatter()
        let timestamp = dateFormatter.string(from: Date())
        let fullFilename = "\(filename)_\(timestamp)"

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]

        let data: Data
        let contentType: String
        let fileExtension: String

        switch format.lowercased() {
        case "ndjson":
            // Newline-delimited JSON
            var lines: [String] = []
            let lineEncoder = JSONEncoder()
            lineEncoder.dateEncodingStrategy = .iso8601
            for item in items {
                let lineData = try lineEncoder.encode(item)
                if let line = String(data: lineData, encoding: .utf8) {
                    lines.append(line)
                }
            }
            data = Data(lines.joined(separator: "\n").utf8)
            contentType = "application/x-ndjson"
            fileExtension = "ndjson"

        case "csv":
            // CSV 格式（简化版，只导出基本字段）
            data = try generateCSV(items: items)
            contentType = "text/csv"
            fileExtension = "csv"

        default:
            // JSON 数组
            data = try encoder.encode(items)
            contentType = "application/json"
            fileExtension = "json"
        }

        var headers = HTTPHeaders()
        headers.add(name: .contentType, value: contentType)
        headers.add(name: .contentDisposition, value: "attachment; filename=\"\(fullFilename).\(fileExtension)\"")

        return Response(status: .ok, headers: headers, body: .init(data: data))
    }

    private func generateCSV(items: [some Encodable]) throws -> Data {
        // 简化的 CSV 生成
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601

        guard let first = items.first else {
            return Data()
        }

        let firstData = try encoder.encode(first)
        guard let firstDict = try JSONSerialization.jsonObject(with: firstData) as? [String: Any] else {
            return Data()
        }

        let headers = firstDict.keys.sorted()
        var lines: [String] = [headers.joined(separator: ",")]

        for item in items {
            let data = try encoder.encode(item)
            if let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                let values = headers.map { key -> String in
                    if let value = dict[key] {
                        let stringValue = String(describing: value)
                        // 转义 CSV 特殊字符
                        if stringValue.contains(",") || stringValue.contains("\"") || stringValue.contains("\n") {
                            return "\"\(stringValue.replacingOccurrences(of: "\"", with: "\"\""))\""
                        }
                        return stringValue
                    }
                    return ""
                }
                lines.append(values.joined(separator: ","))
            }
        }

        return Data(lines.joined(separator: "\n").utf8)
    }
}

// MARK: - Export DTOs

struct ExportLogItem: Content {
    let id: String
    let source: String
    let timestamp: Date
    let level: String
    let subsystem: String?
    let category: String?
    let loggerName: String?
    let thread: String?
    let file: String?
    let function: String?
    let line: Int?
    let message: String
    let tags: [String]
    let traceId: String?
}

struct ExportHTTPItem: Content {
    let id: String
    let method: String
    let url: String
    let statusCode: Int?
    let startTime: Date
    let endTime: Date?
    let duration: Double?
    let errorDescription: String?
    let isMocked: Bool
    let traceId: String?
}

// MARK: - HAR Format DTOs

struct HARLog: Content {
    let log: HARLogContent
}

struct HARLogContent: Content {
    let version: String
    let creator: HARCreator
    let entries: [HAREntry]
}

struct HARCreator: Content {
    let name: String
    let version: String
}

struct HAREntry: Content {
    let startedDateTime: String
    let time: Double
    let request: HARRequest
    let response: HARResponse
    let cache: HARCache
    let timings: HARTimings
    let serverIPAddress: String?
    let connection: String?
}

struct HARRequest: Content {
    let method: String
    let url: String
    let httpVersion: String
    let cookies: [HARCookie]
    let headers: [HARHeader]
    let queryString: [HARQueryParam]
    let postData: HARPostData?
    let headersSize: Int
    let bodySize: Int
}

struct HARResponse: Content {
    let status: Int
    let statusText: String
    let httpVersion: String
    let cookies: [HARCookie]
    let headers: [HARHeader]
    let content: HARContent
    let redirectURL: String
    let headersSize: Int
    let bodySize: Int
}

struct HARHeader: Content {
    let name: String
    let value: String
}

struct HARQueryParam: Content {
    let name: String
    let value: String
}

struct HARCookie: Content {
    let name: String
    let value: String
}

struct HARPostData: Content {
    let mimeType: String
    let text: String?
}

struct HARContent: Content {
    let size: Int
    let mimeType: String
    let text: String?
}

struct HARCache: Content {}

struct HARTimings: Content {
    let dns: Double
    let connect: Double
    let ssl: Double
    let send: Double
    let wait: Double
    let receive: Double
}

struct HARTiming: Codable {
    let dnsLookup: Double?
    let tcpConnection: Double?
    let tlsHandshake: Double?
    let timeToFirstByte: Double?
    let contentDownload: Double?
    let connectionReused: Bool?
    let protocolName: String?
    let localAddress: String?
    let remoteAddress: String?
}
