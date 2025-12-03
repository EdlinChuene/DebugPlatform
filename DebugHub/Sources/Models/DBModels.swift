// DBModels.swift
// DebugHub
//
// Created by Sun on 2025/12/02.
// Copyright © 2025 Sun. All rights reserved.
//

import Fluent
import Foundation
import Vapor

// MARK: - HTTP Event Model

final class HTTPEventModel: Model, Content, @unchecked Sendable {
    static let schema = "http_events"

    @ID(custom: "id", generatedBy: .user)
    var id: String?

    @Field(key: "device_id")
    var deviceId: String

    @Field(key: "method")
    var method: String

    @Field(key: "url")
    var url: String

    @Field(key: "query_items")
    var queryItems: String // JSON

    @Field(key: "request_headers")
    var requestHeaders: String // JSON

    @Field(key: "request_body")
    var requestBody: Data?

    @Field(key: "status_code")
    var statusCode: Int?

    @Field(key: "response_headers")
    var responseHeaders: String? // JSON

    @Field(key: "response_body")
    var responseBody: Data?

    @Field(key: "start_time")
    var startTime: Date

    @Field(key: "end_time")
    var endTime: Date?

    @Field(key: "duration")
    var duration: Double?

    @Field(key: "error_description")
    var errorDescription: String?

    @Field(key: "is_mocked")
    var isMocked: Bool

    @Field(key: "mock_rule_id")
    var mockRuleId: String?

    @Field(key: "trace_id")
    var traceId: String?

    @Field(key: "timing_json")
    var timingJSON: String? // JSON encoded timing data

    @Field(key: "is_favorite")
    var isFavorite: Bool

    init() {}

    init(
        id: String,
        deviceId: String,
        method: String,
        url: String,
        queryItems: String,
        requestHeaders: String,
        requestBody: Data?,
        statusCode: Int?,
        responseHeaders: String?,
        responseBody: Data?,
        startTime: Date,
        endTime: Date?,
        duration: Double?,
        errorDescription: String?,
        isMocked: Bool,
        mockRuleId: String?,
        traceId: String?,
        timingJSON: String? = nil,
        isFavorite: Bool = false
    ) {
        self.id = id
        self.deviceId = deviceId
        self.method = method
        self.url = url
        self.queryItems = queryItems
        self.requestHeaders = requestHeaders
        self.requestBody = requestBody
        self.statusCode = statusCode
        self.responseHeaders = responseHeaders
        self.responseBody = responseBody
        self.startTime = startTime
        self.endTime = endTime
        self.duration = duration
        self.errorDescription = errorDescription
        self.isMocked = isMocked
        self.mockRuleId = mockRuleId
        self.traceId = traceId
        self.timingJSON = timingJSON
        self.isFavorite = isFavorite
    }
}

// MARK: - WebSocket Session Model

final class WSSessionModel: Model, Content, @unchecked Sendable {
    static let schema = "ws_sessions"

    @ID(custom: "id", generatedBy: .user)
    var id: String?

    @Field(key: "device_id")
    var deviceId: String

    @Field(key: "url")
    var url: String

    @Field(key: "request_headers")
    var requestHeaders: String // JSON

    @Field(key: "subprotocols")
    var subprotocols: String // JSON

    @Field(key: "connect_time")
    var connectTime: Date

    @Field(key: "disconnect_time")
    var disconnectTime: Date?

    @Field(key: "close_code")
    var closeCode: Int?

    @Field(key: "close_reason")
    var closeReason: String?

    init() {}

    init(
        id: String,
        deviceId: String,
        url: String,
        requestHeaders: String,
        subprotocols: String,
        connectTime: Date,
        disconnectTime: Date?,
        closeCode: Int?,
        closeReason: String?
    ) {
        self.id = id
        self.deviceId = deviceId
        self.url = url
        self.requestHeaders = requestHeaders
        self.subprotocols = subprotocols
        self.connectTime = connectTime
        self.disconnectTime = disconnectTime
        self.closeCode = closeCode
        self.closeReason = closeReason
    }
}

// MARK: - WebSocket Frame Model

final class WSFrameModel: Model, Content, @unchecked Sendable {
    static let schema = "ws_frames"

    @ID(custom: "id", generatedBy: .user)
    var id: String?

    @Field(key: "device_id")
    var deviceId: String

    @Field(key: "session_id")
    var sessionId: String

    @Field(key: "direction")
    var direction: String

    @Field(key: "opcode")
    var opcode: String

    @Field(key: "payload")
    var payload: Data

    @Field(key: "payload_preview")
    var payloadPreview: String?

    @Field(key: "timestamp")
    var timestamp: Date

    @Field(key: "is_mocked")
    var isMocked: Bool

    @Field(key: "mock_rule_id")
    var mockRuleId: String?

    init() {}

    init(
        id: String,
        deviceId: String,
        sessionId: String,
        direction: String,
        opcode: String,
        payload: Data,
        payloadPreview: String?,
        timestamp: Date,
        isMocked: Bool,
        mockRuleId: String?
    ) {
        self.id = id
        self.deviceId = deviceId
        self.sessionId = sessionId
        self.direction = direction
        self.opcode = opcode
        self.payload = payload
        self.payloadPreview = payloadPreview
        self.timestamp = timestamp
        self.isMocked = isMocked
        self.mockRuleId = mockRuleId
    }
}

// MARK: - Log Event Model

final class LogEventModel: Model, Content, @unchecked Sendable {
    static let schema = "log_events"

    @ID(custom: "id", generatedBy: .user)
    var id: String?

    @Field(key: "device_id")
    var deviceId: String

    @Field(key: "source")
    var source: String

    @Field(key: "timestamp")
    var timestamp: Date

    @Field(key: "level")
    var level: String

    @Field(key: "subsystem")
    var subsystem: String?

    @Field(key: "category")
    var category: String?

    @Field(key: "logger_name")
    var loggerName: String?

    @Field(key: "thread")
    var thread: String?

    @Field(key: "file")
    var file: String?

    @Field(key: "function")
    var function: String?

    @Field(key: "line")
    var line: Int?

    @Field(key: "message")
    var message: String

    @Field(key: "tags")
    var tags: String // JSON

    @Field(key: "trace_id")
    var traceId: String?

    init() {}

    init(
        id: String,
        deviceId: String,
        source: String,
        timestamp: Date,
        level: String,
        subsystem: String?,
        category: String?,
        loggerName: String?,
        thread: String?,
        file: String?,
        function: String?,
        line: Int?,
        message: String,
        tags: String,
        traceId: String?
    ) {
        self.id = id
        self.deviceId = deviceId
        self.source = source
        self.timestamp = timestamp
        self.level = level
        self.subsystem = subsystem
        self.category = category
        self.loggerName = loggerName
        self.thread = thread
        self.file = file
        self.function = function
        self.line = line
        self.message = message
        self.tags = tags
        self.traceId = traceId
    }
}

// MARK: - Mock Rule Model

final class MockRuleModel: Model, Content, @unchecked Sendable {
    static let schema = "mock_rules"

    @ID(custom: "id", generatedBy: .user)
    var id: String?

    @Field(key: "device_id")
    var deviceId: String?

    @Field(key: "name")
    var name: String

    @Field(key: "target_type")
    var targetType: String

    @Field(key: "condition_json")
    var conditionJSON: String

    @Field(key: "action_json")
    var actionJSON: String

    @Field(key: "priority")
    var priority: Int

    @Field(key: "enabled")
    var enabled: Bool

    @Timestamp(key: "created_at", on: .create)
    var createdAt: Date?

    @Timestamp(key: "updated_at", on: .update)
    var updatedAt: Date?

    init() {}

    init(
        id: String,
        deviceId: String?,
        name: String,
        targetType: String,
        conditionJSON: String,
        actionJSON: String,
        priority: Int,
        enabled: Bool
    ) {
        self.id = id
        self.deviceId = deviceId
        self.name = name
        self.targetType = targetType
        self.conditionJSON = conditionJSON
        self.actionJSON = actionJSON
        self.priority = priority
        self.enabled = enabled
    }
}
