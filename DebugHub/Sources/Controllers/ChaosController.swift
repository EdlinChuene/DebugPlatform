// ChaosController.swift
// DebugHub
//
// Created by Sun on 2025/12/02.
// Copyright © 2025 Sun. All rights reserved.
//

import Fluent
import Vapor

struct ChaosController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let chaos = routes.grouped("devices", ":deviceId", "chaos")

        chaos.get(use: listChaosRules)
        chaos.post(use: createChaosRule)
        chaos.put(":ruleId", use: updateChaosRule)
        chaos.delete(":ruleId", use: deleteChaosRule)
    }

    // MARK: - 规则管理

    func listChaosRules(req: Request) async throws -> [ChaosRuleDTO] {
        guard let deviceId = req.parameters.get("deviceId") else {
            throw Abort(.badRequest, reason: "Missing deviceId")
        }

        let rules = try await ChaosRuleModel.query(on: req.db)
            .filter(\.$deviceId == deviceId)
            .sort(\.$priority, .descending)
            .all()

        return rules.map { $0.toDTO() }
    }

    func createChaosRule(req: Request) async throws -> ChaosRuleDTO {
        guard let deviceId = req.parameters.get("deviceId") else {
            throw Abort(.badRequest, reason: "Missing deviceId")
        }

        let input = try req.content.decode(ChaosRuleInput.self)

        let encoder = JSONEncoder()
        let chaosJSON = try String(data: encoder.encode(input.chaos), encoding: .utf8) ?? "{}"

        let model = ChaosRuleModel(
            id: UUID().uuidString,
            deviceId: deviceId,
            name: input.name,
            urlPattern: input.urlPattern,
            method: input.method,
            probability: input.probability,
            chaosJSON: chaosJSON,
            enabled: input.enabled,
            priority: input.priority
        )

        try await model.save(on: req.db)

        // 同步到设备
        syncChaosRulesToDevice(deviceId: deviceId, db: req.db)

        return model.toDTO()
    }

    func updateChaosRule(req: Request) async throws -> ChaosRuleDTO {
        guard
            let deviceId = req.parameters.get("deviceId"),
            let ruleId = req.parameters.get("ruleId") else {
            throw Abort(.badRequest, reason: "Missing deviceId or ruleId")
        }

        guard
            let model = try await ChaosRuleModel.query(on: req.db)
                .filter(\.$id == ruleId)
                .filter(\.$deviceId == deviceId)
                .first()
        else {
            throw Abort(.notFound, reason: "Chaos rule not found")
        }

        let input = try req.content.decode(ChaosRuleInput.self)

        let encoder = JSONEncoder()
        let chaosJSON = try String(data: encoder.encode(input.chaos), encoding: .utf8) ?? "{}"

        model.name = input.name
        model.urlPattern = input.urlPattern
        model.method = input.method
        model.probability = input.probability
        model.chaosJSON = chaosJSON
        model.enabled = input.enabled
        model.priority = input.priority

        try await model.save(on: req.db)

        // 同步到设备
        syncChaosRulesToDevice(deviceId: deviceId, db: req.db)

        return model.toDTO()
    }

    func deleteChaosRule(req: Request) async throws -> HTTPStatus {
        guard
            let deviceId = req.parameters.get("deviceId"),
            let ruleId = req.parameters.get("ruleId") else {
            throw Abort(.badRequest, reason: "Missing deviceId or ruleId")
        }

        guard
            let model = try await ChaosRuleModel.query(on: req.db)
                .filter(\.$id == ruleId)
                .filter(\.$deviceId == deviceId)
                .first()
        else {
            throw Abort(.notFound, reason: "Chaos rule not found")
        }

        try await model.delete(on: req.db)

        // 同步到设备
        syncChaosRulesToDevice(deviceId: deviceId, db: req.db)

        return .noContent
    }

    // MARK: - Helpers

    private func syncChaosRulesToDevice(deviceId: String, db: Database) {
        Task {
            let rules = try? await ChaosRuleModel.query(on: db)
                .filter(\.$deviceId == deviceId)
                .filter(\.$enabled == true)
                .sort(\.$priority, .descending)
                .all()

            let dtos = rules?.map { $0.toDTO() } ?? []
            DeviceRegistry.shared.sendMessage(to: deviceId, message: .updateChaosRules(dtos))
        }
    }
}

// MARK: - Input DTO

struct ChaosRuleInput: Content {
    let name: String
    let urlPattern: String?
    let method: String?
    let probability: Double
    let chaos: ChaosTypeDTO
    let enabled: Bool
    let priority: Int
}

// MARK: - Database Model

final class ChaosRuleModel: Model, Content, @unchecked Sendable {
    static let schema = "chaos_rules"

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

    @Field(key: "probability")
    var probability: Double

    @Field(key: "chaos_json")
    var chaosJSON: String

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
        probability: Double,
        chaosJSON: String,
        enabled: Bool,
        priority: Int
    ) {
        self.id = id
        self.deviceId = deviceId
        self.name = name
        self.urlPattern = urlPattern
        self.method = method
        self.probability = probability
        self.chaosJSON = chaosJSON
        self.enabled = enabled
        self.priority = priority
    }

    func toDTO() -> ChaosRuleDTO {
        let decoder = JSONDecoder()
        let chaos = (try? decoder.decode(ChaosTypeDTO.self, from: Data(chaosJSON.utf8)))
            ?? ChaosTypeDTO(type: "timeout")

        return ChaosRuleDTO(
            id: id!,
            name: name,
            urlPattern: urlPattern,
            method: method,
            probability: probability,
            chaos: chaos,
            enabled: enabled,
            priority: priority
        )
    }
}
