// LogEventController.swift
// DebugHub
//
// Created by Sun on 2025/12/02.
// Copyright © 2025 Sun. All rights reserved.
//

import Fluent
import Vapor

struct LogEventController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let logs = routes.grouped("devices", ":deviceId", "logs")

        logs.get(use: listLogEvents)
        logs.get("subsystems", use: getSubsystems)
        logs.get("categories", use: getCategories)
    }

    // MARK: - 获取日志事件列表

    func listLogEvents(req: Request) async throws -> LogEventListResponse {
        guard let deviceId = req.parameters.get("deviceId") else {
            throw Abort(.badRequest, reason: "Missing deviceId")
        }

        let page = req.query[Int.self, at: "page"] ?? 1
        let pageSize = min(req.query[Int.self, at: "pageSize"] ?? 100, 500)
        let level = req.query[String.self, at: "level"]
        let levels = req.query[String.self, at: "levels"]?.split(separator: ",").map(String.init)
        let subsystem = req.query[String.self, at: "subsystem"]
        let category = req.query[String.self, at: "category"]
        let loggerName = req.query[String.self, at: "loggerName"]
        let text = req.query[String.self, at: "text"]
        let traceId = req.query[String.self, at: "traceId"]
        let timeFrom = req.query[Date.self, at: "timeFrom"]
        let timeTo = req.query[Date.self, at: "timeTo"]

        var query = LogEventModel.query(on: req.db)
            .filter(\.$deviceId == deviceId)

        // 单个级别或多个级别
        if let level {
            query = query.filter(\.$level == level)
        } else if let levels, !levels.isEmpty {
            query = query.filter(\.$level ~~ levels)
        }

        if let subsystem {
            query = query.filter(\.$subsystem == subsystem)
        }

        if let category {
            query = query.filter(\.$category == category)
        }

        if let loggerName {
            query = query.filter(\.$loggerName == loggerName)
        }

        if let text {
            query = query.filter(\.$message ~~ text)
        }

        if let traceId {
            query = query.filter(\.$traceId == traceId)
        }

        if let timeFrom {
            query = query.filter(\.$timestamp >= timeFrom)
        }

        if let timeTo {
            query = query.filter(\.$timestamp <= timeTo)
        }

        let total = try await query.count()

        let events = try await query
            .sort(\.$timestamp, .descending)
            .range((page - 1) * pageSize..<page * pageSize)
            .all()

        let decoder = JSONDecoder()

        let items = events.map { event in
            let tags = (try? decoder.decode([String].self, from: Data(event.tags.utf8))) ?? []

            return LogEventItemDTO(
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

        return LogEventListResponse(
            total: total,
            page: page,
            pageSize: pageSize,
            items: items
        )
    }

    // MARK: - 获取 Subsystem 列表

    func getSubsystems(req: Request) async throws -> [String] {
        guard let deviceId = req.parameters.get("deviceId") else {
            throw Abort(.badRequest, reason: "Missing deviceId")
        }

        let events = try await LogEventModel.query(on: req.db)
            .filter(\.$deviceId == deviceId)
            .filter(\.$subsystem != nil)
            .unique()
            .field(\.$subsystem)
            .all()

        return events.compactMap(\.subsystem).sorted()
    }

    // MARK: - 获取 Category 列表

    func getCategories(req: Request) async throws -> [String] {
        guard let deviceId = req.parameters.get("deviceId") else {
            throw Abort(.badRequest, reason: "Missing deviceId")
        }

        let events = try await LogEventModel.query(on: req.db)
            .filter(\.$deviceId == deviceId)
            .filter(\.$category != nil)
            .unique()
            .field(\.$category)
            .all()

        return events.compactMap(\.category).sorted()
    }
}

// MARK: - DTOs

struct LogEventListResponse: Content {
    let total: Int
    let page: Int
    let pageSize: Int
    let items: [LogEventItemDTO]
}

struct LogEventItemDTO: Content {
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
