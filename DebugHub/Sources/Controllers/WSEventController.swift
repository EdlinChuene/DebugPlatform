// WSEventController.swift
// DebugHub
//
// Created by Sun on 2025/12/02.
// Copyright © 2025 Sun. All rights reserved.
//

import Fluent
import Vapor

struct WSEventController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let ws = routes.grouped("devices", ":deviceId")

        ws.get("ws-sessions", use: listWSSessions)
        ws.get("ws-sessions", ":sessionId", use: getWSSession)
        ws.get("ws-sessions", ":sessionId", "frames", use: listWSFrames)
    }

    // MARK: - 获取 WebSocket 会话列表

    func listWSSessions(req: Request) async throws -> WSSessionListResponse {
        guard let deviceId = req.parameters.get("deviceId") else {
            throw Abort(.badRequest, reason: "Missing deviceId")
        }

        let page = req.query[Int.self, at: "page"] ?? 1
        let pageSize = min(req.query[Int.self, at: "pageSize"] ?? 50, 100)
        let urlContains = req.query[String.self, at: "urlContains"]
        let isOpen = req.query[Bool.self, at: "isOpen"]
        let timeFrom = req.query[Date.self, at: "timeFrom"]
        let timeTo = req.query[Date.self, at: "timeTo"]

        var query = WSSessionModel.query(on: req.db)
            .filter(\.$deviceId == deviceId)

        if let urlContains {
            query = query.filter(\.$url ~~ urlContains)
        }

        if let isOpen {
            if isOpen {
                query = query.filter(\.$disconnectTime == nil)
            } else {
                query = query.filter(\.$disconnectTime != nil)
            }
        }

        if let timeFrom {
            query = query.filter(\.$connectTime >= timeFrom)
        }

        if let timeTo {
            query = query.filter(\.$connectTime <= timeTo)
        }

        let total = try await query.count()

        let sessions = try await query
            .sort(\.$connectTime, .descending)
            .range((page - 1) * pageSize..<page * pageSize)
            .all()

        let items = sessions.map { session in
            WSSessionSummaryDTO(
                id: session.id!,
                url: session.url,
                connectTime: session.connectTime,
                disconnectTime: session.disconnectTime,
                closeCode: session.closeCode,
                closeReason: session.closeReason,
                isOpen: session.disconnectTime == nil
            )
        }

        return WSSessionListResponse(
            total: total,
            page: page,
            pageSize: pageSize,
            items: items
        )
    }

    // MARK: - 获取单个 WebSocket 会话详情

    func getWSSession(req: Request) async throws -> WSSessionDetailDTO {
        guard
            let deviceId = req.parameters.get("deviceId"),
            let sessionId = req.parameters.get("sessionId") else {
            throw Abort(.badRequest, reason: "Missing deviceId or sessionId")
        }

        guard
            let session = try await WSSessionModel.query(on: req.db)
                .filter(\.$id == sessionId)
                .filter(\.$deviceId == deviceId)
                .first()
        else {
            throw Abort(.notFound, reason: "WebSocket session not found")
        }

        let decoder = JSONDecoder()
        let requestHeaders = (try? decoder.decode([String: String].self, from: Data(session.requestHeaders.utf8))) ??
            [:]
        let subprotocols = (try? decoder.decode([String].self, from: Data(session.subprotocols.utf8))) ?? []

        // 统计帧数量
        let frameCount = try await WSFrameModel.query(on: req.db)
            .filter(\.$sessionId == sessionId)
            .count()

        return WSSessionDetailDTO(
            id: session.id!,
            url: session.url,
            requestHeaders: requestHeaders,
            subprotocols: subprotocols,
            connectTime: session.connectTime,
            disconnectTime: session.disconnectTime,
            closeCode: session.closeCode,
            closeReason: session.closeReason,
            frameCount: frameCount
        )
    }

    // MARK: - 获取 WebSocket 帧列表

    func listWSFrames(req: Request) async throws -> WSFrameListResponse {
        guard
            let deviceId = req.parameters.get("deviceId"),
            let sessionId = req.parameters.get("sessionId") else {
            throw Abort(.badRequest, reason: "Missing deviceId or sessionId")
        }

        let page = req.query[Int.self, at: "page"] ?? 1
        let pageSize = min(req.query[Int.self, at: "pageSize"] ?? 100, 500)
        let direction = req.query[String.self, at: "direction"]
        let timeFrom = req.query[Date.self, at: "timeFrom"]
        let timeTo = req.query[Date.self, at: "timeTo"]

        var query = WSFrameModel.query(on: req.db)
            .filter(\.$deviceId == deviceId)
            .filter(\.$sessionId == sessionId)

        if let direction {
            query = query.filter(\.$direction == direction)
        }

        if let timeFrom {
            query = query.filter(\.$timestamp >= timeFrom)
        }

        if let timeTo {
            query = query.filter(\.$timestamp <= timeTo)
        }

        let total = try await query.count()

        let frames = try await query
            .sort(\.$timestamp, .ascending)
            .range((page - 1) * pageSize..<page * pageSize)
            .all()

        let items = frames.map { frame in
            WSFrameItemDTO(
                id: frame.id!,
                direction: frame.direction,
                opcode: frame.opcode,
                payloadPreview: frame.payloadPreview,
                payloadSize: frame.payload.count,
                timestamp: frame.timestamp,
                isMocked: frame.isMocked
            )
        }

        return WSFrameListResponse(
            total: total,
            page: page,
            pageSize: pageSize,
            items: items
        )
    }
}

// MARK: - DTOs

struct WSSessionListResponse: Content {
    let total: Int
    let page: Int
    let pageSize: Int
    let items: [WSSessionSummaryDTO]
}

struct WSSessionSummaryDTO: Content {
    let id: String
    let url: String
    let connectTime: Date
    let disconnectTime: Date?
    let closeCode: Int?
    let closeReason: String?
    let isOpen: Bool
}

struct WSSessionDetailDTO: Content {
    let id: String
    let url: String
    let requestHeaders: [String: String]
    let subprotocols: [String]
    let connectTime: Date
    let disconnectTime: Date?
    let closeCode: Int?
    let closeReason: String?
    let frameCount: Int
}

struct WSFrameListResponse: Content {
    let total: Int
    let page: Int
    let pageSize: Int
    let items: [WSFrameItemDTO]
}

struct WSFrameItemDTO: Content {
    let id: String
    let direction: String
    let opcode: String
    let payloadPreview: String?
    let payloadSize: Int
    let timestamp: Date
    let isMocked: Bool
}
