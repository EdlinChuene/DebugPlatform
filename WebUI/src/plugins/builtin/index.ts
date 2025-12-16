// 内置前端插件注册
// 注册所有内置的前端插件

import { PluginRegistry } from '../PluginRegistry'
import { HttpPlugin } from './HttpPlugin'
import { LogPlugin } from './LogPlugin'
import { WebSocketPlugin } from './WebSocketPlugin'
import { DatabasePlugin } from './DatabasePlugin'
import { HttpMockPlugin } from './HttpMockPlugin'
import { HttpBreakpointPlugin } from './HttpBreakpointPlugin'
import { HttpChaosPlugin } from './HttpChaosPlugin'
import { PerformancePlugin } from './PerformancePlugin'

// 注册所有内置插件
// 插件顺序固定为：HTTP（含 Mock/断点/混沌子标签）、WebSocket、Log、Database、Performance
// Mock、Breakpoint、Chaos 作为 HTTP 的子插件注册（不在标签栏显示，但在插件管理器中显示）
export function registerBuiltinPlugins(): void {
    // HTTP 请求监控插件（包含 Mock、断点、混沌子标签）
    PluginRegistry.register(HttpPlugin, {
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

    // 性能监控插件
    PluginRegistry.register(PerformancePlugin, {
        routePath: '/device/:deviceId/performance',
        tabOrder: 4,
    })

    // Mock 插件（作为 HTTP 的子插件，不在标签栏显示）
    PluginRegistry.register(HttpMockPlugin, {
        routePath: '/device/:deviceId/http', // 子插件路由指向父插件
        tabOrder: 100, // 子插件放在后面
    })

    // 断点插件（作为 HTTP 的子插件，不在标签栏显示）
    PluginRegistry.register(HttpBreakpointPlugin, {
        routePath: '/device/:deviceId/http', // 子插件路由指向父插件
        tabOrder: 101,
    })

    // 混沌插件（作为 HTTP 的子插件，不在标签栏显示）
    PluginRegistry.register(HttpChaosPlugin, {
        routePath: '/device/:deviceId/http', // 子插件路由指向父插件
        tabOrder: 102,
    })

    console.log('[BuiltinPlugins] All builtin plugins registered')
}

// 导出所有内置插件（Mock、Breakpoint、Chaos 仍然导出，因为可能其他地方会引用）
export { HttpPlugin } from './HttpPlugin'
export { LogPlugin } from './LogPlugin'
export { WebSocketPlugin } from './WebSocketPlugin'
export { DatabasePlugin } from './DatabasePlugin'
export { HttpMockPlugin, MockPluginContent } from './HttpMockPlugin'
export { HttpBreakpointPlugin, BreakpointPluginContent } from './HttpBreakpointPlugin'
export { HttpChaosPlugin, ChaosPluginContent } from './HttpChaosPlugin'
export { PerformancePlugin } from './PerformancePlugin'
