// 内置前端插件注册
// 注册所有内置的前端插件

import { PluginRegistry } from '../PluginRegistry'
import { HttpPlugin } from './HttpPlugin'
import { LogPlugin } from './LogPlugin'
import { WebSocketPlugin } from './WebSocketPlugin'
import { DatabasePlugin } from './DatabasePlugin'
import { MockPlugin } from './MockPlugin'
import { BreakpointPlugin } from './BreakpointPlugin'
import { ChaosPlugin } from './ChaosPlugin'
import { PerformancePlugin } from './PerformancePlugin'

// 注册所有内置插件
// 核心插件：HTTP、Log、Database（"仅保留核心"操作不会禁用这些插件）
// 扩展插件：WebSocket、Performance、Mock、Breakpoint、Chaos
// 所有插件默认启用，可通过插件管理功能启用/禁用
export function registerBuiltinPlugins(): void {
    // === 核心插件 ===

    // HTTP 请求监控插件
    PluginRegistry.register(HttpPlugin, {
        routePath: '/device/:deviceId/http',
        tabOrder: 0,
    })

    // 日志插件
    PluginRegistry.register(LogPlugin, {
        routePath: '/device/:deviceId/logs',
        tabOrder: 1,
    })

    // 数据库插件
    PluginRegistry.register(DatabasePlugin, {
        routePath: '/device/:deviceId/database',
        tabOrder: 2,
    })

    // === 扩展插件 ===

    // WebSocket 插件
    PluginRegistry.register(WebSocketPlugin, {
        routePath: '/device/:deviceId/websocket',
        tabOrder: 3,
    })

    // 性能监控插件
    PluginRegistry.register(PerformancePlugin, {
        routePath: '/device/:deviceId/performance',
        tabOrder: 4,
    })

    // Mock 规则插件
    PluginRegistry.register(MockPlugin, {
        routePath: '/device/:deviceId/mock',
        tabOrder: 5,
    })

    // 断点插件
    PluginRegistry.register(BreakpointPlugin, {
        routePath: '/device/:deviceId/breakpoint',
        tabOrder: 6,
    })

    // 混沌工程插件
    PluginRegistry.register(ChaosPlugin, {
        routePath: '/device/:deviceId/chaos',
        tabOrder: 7,
    })

    console.log('[BuiltinPlugins] All builtin plugins registered')
}

// 导出所有内置插件
export { HttpPlugin } from './HttpPlugin'
export { LogPlugin } from './LogPlugin'
export { WebSocketPlugin } from './WebSocketPlugin'
export { DatabasePlugin } from './DatabasePlugin'
export { MockPlugin } from './MockPlugin'
export { BreakpointPlugin } from './BreakpointPlugin'
export { ChaosPlugin } from './ChaosPlugin'
export { PerformancePlugin } from './PerformancePlugin'
