// DeviceModel.swift
// DebugHub
//
// Created by Sun on 2025/12/08.
// Copyright © 2025 Sun. All rights reserved.
//

import Fluent
import Foundation
import Vapor

/// 设备信息（持久化存储）
final class DeviceModel: Model, Content, @unchecked Sendable {
    static let schema = "devices"

    @ID(key: .id)
    var id: UUID?

    /// 设备唯一标识（来自 SDK）
    @Field(key: "device_id")
    var deviceId: String

    /// 原始设备名称（系统设备名）
    @Field(key: "device_name")
    var deviceName: String

    /// 用户设置的设备别名
    @OptionalField(key: "device_alias")
    var deviceAlias: String?

    /// 设备型号
    @Field(key: "device_model")
    var deviceModel: String

    /// 系统名称
    @Field(key: "system_name")
    var systemName: String

    /// 系统版本
    @Field(key: "system_version")
    var systemVersion: String

    /// 应用名称
    @Field(key: "app_name")
    var appName: String

    /// 应用版本
    @Field(key: "app_version")
    var appVersion: String

    /// 构建号
    @Field(key: "build_number")
    var buildNumber: String

    /// 平台
    @Field(key: "platform")
    var platform: String

    /// 是否模拟器
    @Field(key: "is_simulator")
    var isSimulator: Bool

    /// App 图标（Base64）
    @OptionalField(key: "app_icon")
    var appIcon: String?

    /// 首次连接时间
    @Field(key: "first_seen_at")
    var firstSeenAt: Date

    /// 最后活动时间
    @Field(key: "last_seen_at")
    var lastSeenAt: Date

    /// 是否已移除（软删除）
    @Field(key: "is_removed")
    var isRemoved: Bool

    init() {}

    init(
        id: UUID? = nil,
        deviceId: String,
        deviceName: String,
        deviceAlias: String? = nil,
        deviceModel: String,
        systemName: String,
        systemVersion: String,
        appName: String,
        appVersion: String,
        buildNumber: String,
        platform: String,
        isSimulator: Bool,
        appIcon: String? = nil,
        firstSeenAt: Date = Date(),
        lastSeenAt: Date = Date(),
        isRemoved: Bool = false
    ) {
        self.id = id
        self.deviceId = deviceId
        self.deviceName = deviceName
        self.deviceAlias = deviceAlias
        self.deviceModel = deviceModel
        self.systemName = systemName
        self.systemVersion = systemVersion
        self.appName = appName
        self.appVersion = appVersion
        self.buildNumber = buildNumber
        self.platform = platform
        self.isSimulator = isSimulator
        self.appIcon = appIcon
        self.firstSeenAt = firstSeenAt
        self.lastSeenAt = lastSeenAt
        self.isRemoved = isRemoved
    }
}

// MARK: - Migration

struct CreateDevice: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("devices")
            .id()
            .field("device_id", .string, .required)
            .field("device_name", .string, .required)
            .field("device_model", .string, .required)
            .field("system_name", .string, .required)
            .field("system_version", .string, .required)
            .field("app_name", .string, .required)
            .field("app_version", .string, .required)
            .field("build_number", .string, .required)
            .field("platform", .string, .required)
            .field("is_simulator", .bool, .required)
            .field("app_icon", .string)
            .field("first_seen_at", .datetime, .required)
            .field("last_seen_at", .datetime, .required)
            .field("is_removed", .bool, .required, .custom("DEFAULT false"))
            .unique(on: "device_id")
            .create()
    }

    func revert(on database: Database) async throws {
        try await database.schema("devices").delete()
    }
}
