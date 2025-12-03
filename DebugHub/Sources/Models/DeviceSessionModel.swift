// DeviceSessionModel.swift
// DebugHub
//
// Created by Sun on 2025/12/03.
// Copyright © 2025 Sun. All rights reserved.
//

import Fluent
import Foundation
import Vapor

/// 设备会话记录（持久化存储）
final class DeviceSessionModel: Model, Content, @unchecked Sendable {
    static let schema = "device_sessions"

    @ID(key: .id)
    var id: UUID?

    /// 设备 ID
    @Field(key: "device_id")
    var deviceId: String

    /// 设备名称
    @Field(key: "device_name")
    var deviceName: String

    /// 会话 ID（每次连接生成的唯一标识）
    @Field(key: "session_id")
    var sessionId: String

    /// 连接时间
    @Field(key: "connected_at")
    var connectedAt: Date

    /// 断开时间（为空表示当前在线）
    @OptionalField(key: "disconnected_at")
    var disconnectedAt: Date?

    /// 是否正常断开
    @Field(key: "is_normal_close")
    var isNormalClose: Bool

    init() {}

    init(
        id: UUID? = nil,
        deviceId: String,
        deviceName: String,
        sessionId: String,
        connectedAt: Date = Date(),
        disconnectedAt: Date? = nil,
        isNormalClose: Bool = true
    ) {
        self.id = id
        self.deviceId = deviceId
        self.deviceName = deviceName
        self.sessionId = sessionId
        self.connectedAt = connectedAt
        self.disconnectedAt = disconnectedAt
        self.isNormalClose = isNormalClose
    }
}

// MARK: - Migration

struct CreateDeviceSession: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("device_sessions")
            .id()
            .field("device_id", .string, .required)
            .field("device_name", .string, .required)
            .field("session_id", .string, .required)
            .field("connected_at", .datetime, .required)
            .field("disconnected_at", .datetime)
            .field("is_normal_close", .bool, .required, .custom("DEFAULT true"))
            .create()
    }

    func revert(on database: Database) async throws {
        try await database.schema("device_sessions").delete()
    }
}
