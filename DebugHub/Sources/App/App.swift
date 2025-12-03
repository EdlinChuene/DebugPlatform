// App.swift
// DebugHub
//
// Created by Sun on 2025/12/02.
// Copyright © 2025 Sun. All rights reserved.
//

import Vapor

@main
struct DebugHubApp {
    static func main() async throws {
        let env = try Environment.detect()
        let app = try await Application.make(env)

        do {
            try configure(app)
            try await app.execute()
            // 服务正常停止后清理资源
            try await app.asyncShutdown()
        } catch {
            // 出错时也需要清理资源，使用 try? 确保原始错误被传播
            try? await app.asyncShutdown()
            throw error
        }
    }
}
