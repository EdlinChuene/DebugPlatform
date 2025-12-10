// ReplayCommand.swift
// DebugHub
//
// Created by Sun on 2025/12/05.
// Copyright © 2025 Sun. All rights reserved.
//

import Foundation
import Vapor

// MARK: - Replay Command

/// 请求重放命令
struct ReplayCommand: Content {
    let id: String
    let method: String
    let url: String
    let headers: [String: String]
    let body: String? // base64 encoded

    init(
        id: String = UUID().uuidString,
        method: String,
        url: String,
        headers: [String: String] = [:],
        body: String? = nil
    ) {
        self.id = id
        self.method = method
        self.url = url
        self.headers = headers
        self.body = body
    }
}
