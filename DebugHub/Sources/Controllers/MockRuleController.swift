// MockRuleController.swift
// DebugHub
//
// Created by Sun on 2025/12/02.
// Copyright © 2025 Sun. All rights reserved.
//

import Fluent
import Vapor

struct MockRuleController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let rules = routes.grouped("devices", ":deviceId", "mock-rules")

        rules.get(use: listMockRules)
        rules.post(use: createMockRule)
        rules.put(":ruleId", use: updateMockRule)
        rules.delete(":ruleId", use: deleteMockRule)

        // 全局规则（不针对特定设备）
        let globalRules = routes.grouped("mock-rules")
        globalRules.get(use: listGlobalMockRules)
        globalRules.post(use: createGlobalMockRule)
    }

    // MARK: - 获取设备的 Mock 规则列表

    func listMockRules(req: Request) async throws -> [MockRuleResponseDTO] {
        guard let deviceId = req.parameters.get("deviceId") else {
            throw Abort(.badRequest, reason: "Missing deviceId")
        }

        let rules = try await MockRuleModel.query(on: req.db)
            .group(.or) { group in
                group.filter(\.$deviceId == deviceId)
                group.filter(\.$deviceId == nil) // 包括全局规则
            }
            .sort(\.$priority, .descending)
            .all()

        return try rules.map { try convertToResponseDTO($0) }
    }

    // MARK: - 创建设备 Mock 规则

    func createMockRule(req: Request) async throws -> MockRuleResponseDTO {
        guard let deviceId = req.parameters.get("deviceId") else {
            throw Abort(.badRequest, reason: "Missing deviceId")
        }

        let input = try req.content.decode(MockRuleCreateDTO.self)

        let encoder = JSONEncoder()
        let conditionJSON = try String(data: encoder.encode(input.condition), encoding: .utf8) ?? "{}"
        let actionJSON = try String(data: encoder.encode(input.action), encoding: .utf8) ?? "{}"

        let model = MockRuleModel(
            id: UUID().uuidString,
            deviceId: deviceId,
            name: input.name,
            targetType: input.targetType,
            conditionJSON: conditionJSON,
            actionJSON: actionJSON,
            priority: input.priority ?? 0,
            enabled: input.enabled ?? true
        )

        try await model.save(on: req.db)

        // 下发规则到设备
        await pushRulesToDevice(deviceId: deviceId, db: req.db)

        return try convertToResponseDTO(model)
    }

    // MARK: - 更新 Mock 规则

    func updateMockRule(req: Request) async throws -> MockRuleResponseDTO {
        guard
            let deviceId = req.parameters.get("deviceId"),
            let ruleId = req.parameters.get("ruleId") else {
            throw Abort(.badRequest, reason: "Missing deviceId or ruleId")
        }

        // 验证规则属于指定设备
        guard
            let model = try await MockRuleModel.query(on: req.db)
                .filter(\.$id == ruleId)
                .filter(\.$deviceId == deviceId)
                .first()
        else {
            throw Abort(.notFound, reason: "Mock rule not found")
        }

        let input = try req.content.decode(MockRuleUpdateDTO.self)
        let encoder = JSONEncoder()

        if let name = input.name {
            model.name = name
        }
        if let targetType = input.targetType {
            model.targetType = targetType
        }
        if let condition = input.condition {
            model.conditionJSON = try String(data: encoder.encode(condition), encoding: .utf8) ?? "{}"
        }
        if let action = input.action {
            model.actionJSON = try String(data: encoder.encode(action), encoding: .utf8) ?? "{}"
        }
        if let priority = input.priority {
            model.priority = priority
        }
        if let enabled = input.enabled {
            model.enabled = enabled
        }

        try await model.save(on: req.db)

        // 下发规则到设备
        await pushRulesToDevice(deviceId: deviceId, db: req.db)

        return try convertToResponseDTO(model)
    }

    // MARK: - 删除 Mock 规则

    func deleteMockRule(req: Request) async throws -> HTTPStatus {
        guard
            let deviceId = req.parameters.get("deviceId"),
            let ruleId = req.parameters.get("ruleId") else {
            throw Abort(.badRequest, reason: "Missing deviceId or ruleId")
        }

        // 验证规则属于指定设备
        guard
            let model = try await MockRuleModel.query(on: req.db)
                .filter(\.$id == ruleId)
                .filter(\.$deviceId == deviceId)
                .first()
        else {
            throw Abort(.notFound, reason: "Mock rule not found")
        }

        try await model.delete(on: req.db)

        // 下发规则到设备
        await pushRulesToDevice(deviceId: deviceId, db: req.db)

        return .ok
    }

    // MARK: - 全局规则

    func listGlobalMockRules(req: Request) async throws -> [MockRuleResponseDTO] {
        let rules = try await MockRuleModel.query(on: req.db)
            .filter(\.$deviceId == nil)
            .sort(\.$priority, .descending)
            .all()

        return try rules.map { try convertToResponseDTO($0) }
    }

    func createGlobalMockRule(req: Request) async throws -> MockRuleResponseDTO {
        let input = try req.content.decode(MockRuleCreateDTO.self)

        let encoder = JSONEncoder()
        let conditionJSON = try String(data: encoder.encode(input.condition), encoding: .utf8) ?? "{}"
        let actionJSON = try String(data: encoder.encode(input.action), encoding: .utf8) ?? "{}"

        let model = MockRuleModel(
            id: UUID().uuidString,
            deviceId: nil,
            name: input.name,
            targetType: input.targetType,
            conditionJSON: conditionJSON,
            actionJSON: actionJSON,
            priority: input.priority ?? 0,
            enabled: input.enabled ?? true
        )

        try await model.save(on: req.db)

        return try convertToResponseDTO(model)
    }

    // MARK: - Helpers

    private func convertToResponseDTO(_ model: MockRuleModel) throws -> MockRuleResponseDTO {
        let decoder = JSONDecoder()
        let condition = try decoder.decode(MockRuleDTO.Condition.self, from: Data(model.conditionJSON.utf8))
        let action = try decoder.decode(MockRuleDTO.Action.self, from: Data(model.actionJSON.utf8))

        return MockRuleResponseDTO(
            id: model.id!,
            deviceId: model.deviceId,
            name: model.name,
            targetType: model.targetType,
            condition: condition,
            action: action,
            priority: model.priority,
            enabled: model.enabled,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt
        )
    }

    private func pushRulesToDevice(deviceId: String, db: Database) async {
        do {
            let rules = try await MockRuleModel.query(on: db)
                .group(.or) { group in
                    group.filter(\.$deviceId == deviceId)
                    group.filter(\.$deviceId == nil)
                }
                .filter(\.$enabled == true)
                .sort(\.$priority, .descending)
                .all()

            let dtos = try rules.map { model -> MockRuleDTO in
                let decoder = JSONDecoder()
                let condition = try decoder.decode(MockRuleDTO.Condition.self, from: Data(model.conditionJSON.utf8))
                let action = try decoder.decode(MockRuleDTO.Action.self, from: Data(model.actionJSON.utf8))

                return MockRuleDTO(
                    id: model.id!,
                    name: model.name,
                    targetType: model.targetType,
                    condition: condition,
                    action: action,
                    priority: model.priority,
                    enabled: model.enabled
                )
            }

            let message = BridgeMessageDTO.updateMockRules(dtos)
            DeviceRegistry.shared.sendMessage(to: deviceId, message: message)
        } catch {
            print("[MockRuleController] Failed to push rules: \(error)")
        }
    }
}

// MARK: - DTOs

struct MockRuleCreateDTO: Content {
    let name: String
    let targetType: String
    let condition: MockRuleDTO.Condition
    let action: MockRuleDTO.Action
    let priority: Int?
    let enabled: Bool?
}

struct MockRuleUpdateDTO: Content {
    let name: String?
    let targetType: String?
    let condition: MockRuleDTO.Condition?
    let action: MockRuleDTO.Action?
    let priority: Int?
    let enabled: Bool?
}

struct MockRuleResponseDTO: Content {
    let id: String
    let deviceId: String?
    let name: String
    let targetType: String
    let condition: MockRuleDTO.Condition
    let action: MockRuleDTO.Action
    let priority: Int
    let enabled: Bool
    let createdAt: Date?
    let updatedAt: Date?
}
