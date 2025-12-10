// DBResponseManager.swift
// DebugHub
//
// Created by Sun on 2025/12/05.
// Copyright © 2025 Sun. All rights reserved.
//

import Foundation
import Vapor

// MARK: - DB Response Manager

/// 管理 DB 响应等待
final class DBResponseManager: @unchecked Sendable {
    static let shared = DBResponseManager()

    private var waiters: [String: (DBResponseDTO?) -> Void] = [:]
    private let lock = NSLock()

    private init() {}

    /// 注册等待响应的 handler
    func registerWaiter(requestId: String, timeout: TimeInterval, handler: @escaping (DBResponseDTO?) -> Void) {
        lock.lock()
        waiters[requestId] = handler
        lock.unlock()

        // 设置超时
        DispatchQueue.global().asyncAfter(deadline: .now() + timeout) { [weak self] in
            self?.handleTimeout(requestId: requestId)
        }
    }

    /// 处理收到的响应
    func handleResponse(_ response: DBResponseDTO) {
        lock.lock()
        let handler = waiters.removeValue(forKey: response.requestId)
        lock.unlock()

        handler?(response)
    }

    /// 处理超时
    private func handleTimeout(requestId: String) {
        lock.lock()
        let handler = waiters.removeValue(forKey: requestId)
        lock.unlock()

        handler?(nil)
    }
}
