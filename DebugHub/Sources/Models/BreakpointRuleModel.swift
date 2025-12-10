// BreakpointRuleModel.swift
// DebugHub
//
// Created by Sun on 2025/12/02.
// Copyright © 2025 Sun. All rights reserved.
//

import Fluent
import Foundation
import Vapor

// MARK: - Database Model

final class BreakpointRuleModel: Model, Content, @unchecked Sendable {
    static let schema = "breakpoint_rules"

    @ID(custom: "id", generatedBy: .user)
    var id: String?

    @Field(key: "device_id")
    var deviceId: String

    @Field(key: "name")
    var name: String

    @Field(key: "url_pattern")
    var urlPattern: String?

    @Field(key: "method")
    var method: String?

    @Field(key: "phase")
    var phase: String

    @Field(key: "enabled")
    var enabled: Bool

    @Field(key: "priority")
    var priority: Int

    @Timestamp(key: "created_at", on: .create)
    var createdAt: Date?

    @Timestamp(key: "updated_at", on: .update)
    var updatedAt: Date?

    init() {}

    init(
        id: String,
        deviceId: String,
        name: String,
        urlPattern: String?,
        method: String?,
        phase: String,
        enabled: Bool,
        priority: Int
    ) {
        self.id = id
        self.deviceId = deviceId
        self.name = name
        self.urlPattern = urlPattern
        self.method = method
        self.phase = phase
        self.enabled = enabled
        self.priority = priority
    }

    func toDTO() -> BreakpointRuleDTO {
        BreakpointRuleDTO(
            id: id!,
            name: name,
            urlPattern: urlPattern,
            method: method,
            phase: phase,
            enabled: enabled,
            priority: priority,
            createdAt: createdAt
        )
    }
}
