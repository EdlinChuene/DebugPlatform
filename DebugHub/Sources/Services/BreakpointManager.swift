// BreakpointManager.swift
// DebugHub
//
// Created by Sun on 2025/12/02.
// Copyright © 2025 Sun. All rights reserved.
//

import Foundation
import Vapor

// MARK: - 断点管理器

/// 管理断点规则和断点命中事件
final class BreakpointManager: @unchecked Sendable {
    static let shared = BreakpointManager()

    /// 等待中的断点命中事件 (requestId -> hit)
    private var pendingHits: [String: BreakpointHitDTO] = [:]
    private var hitContinuations: [String: AsyncStream<BreakpointHitDTO>.Continuation] = [:]
    private let lock = NSLock()

    private init() {}

    func addPendingHit(_ hit: BreakpointHitDTO) {
        lock.lock()
        pendingHits[hit.requestId] = hit
        lock.unlock()

        // 通知所有订阅者
        notifyHit(hit)
    }

    func getPendingHits() -> [BreakpointHitDTO] {
        lock.lock()
        defer { lock.unlock() }
        return Array(pendingHits.values)
    }

    func removePendingHit(requestId: String) {
        lock.lock()
        pendingHits.removeValue(forKey: requestId)
        lock.unlock()
    }

    func subscribeToHits() -> AsyncStream<BreakpointHitDTO> {
        AsyncStream { continuation in
            let id = UUID().uuidString
            lock.lock()
            hitContinuations[id] = continuation
            lock.unlock()

            continuation.onTermination = { [weak self] _ in
                self?.lock.lock()
                self?.hitContinuations.removeValue(forKey: id)
                self?.lock.unlock()
            }
        }
    }

    private func notifyHit(_ hit: BreakpointHitDTO) {
        lock.lock()
        let continuations = hitContinuations.values
        lock.unlock()

        for continuation in continuations {
            continuation.yield(hit)
        }
    }
}
