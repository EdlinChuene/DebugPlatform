// 内置前端插件注册
// 注册所有内置的前端插件

import { PluginRegistry } from '../PluginRegistry'
import { NetworkPlugin } from './NetworkPlugin'
import { LogPlugin } from './LogPlugin'
import { WebSocketPlugin } from './WebSocketPlugin'
import { DatabasePlugin } from './DatabasePlugin'
import { MockPlugin } from './MockPlugin'
import { BreakpointPlugin } from './BreakpointPlugin'
import { ChaosPlugin } from './ChaosPlugin'

// 注册所有内置插件
// 顺序：HTTP、WebSocket、Log、Database、Mock、Breakpoint、Chaos
// 所有插件同级显示，可通过插件管理功能启用/禁用
export function registerBuiltinPlugins(): void {
    // HTTP 网络监控插件
    PluginRegistry.register(NetworkPlugin, {
        routePath: '/device/:deviceId/http',
        tabOrder: 0,
    })

    // WebSocket 插件
    PluginRegistry.register(WebSocketPlugin, {
        routePath: '/device/:deviceId/websocket',
        tabOrder: 1,
    })

    // 日志插件
    PluginRegistry.register(LogPlugin, {
        routePath: '/device/:deviceId/logs',
        tabOrder: 2,
    })

    // 数据库插件
    PluginRegistry.register(DatabasePlugin, {
        routePath: '/device/:deviceId/database',
        tabOrder: 3,
    })

    // Mock 规则插件
    PluginRegistry.register(MockPlugin, {
        routePath: '/device/:deviceId/mock',
        tabOrder: 4,
    })

    // 断点插件
    PluginRegistry.register(BreakpointPlugin, {
        routePath: '/device/:deviceId/breakpoint',
        tabOrder: 5,
    })

    // 混沌工程插件
    PluginRegistry.register(ChaosPlugin, {
        routePath: '/device/:deviceId/chaos',
        tabOrder: 6,
    })

    console.log('[BuiltinPlugins] All builtin plugins registered')
}

// 导出所有内置插件
export { NetworkPlugin } from './NetworkPlugin'
export { LogPlugin } from './LogPlugin'
export { WebSocketPlugin } from './WebSocketPlugin'
export { DatabasePlugin } from './DatabasePlugin'
export { MockPlugin } from './MockPlugin'
export { BreakpointPlugin } from './BreakpointPlugin'
export { ChaosPlugin } from './ChaosPlugin'
