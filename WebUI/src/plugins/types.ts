// FrontendPlugin 类型定义
// 用于 WebUI 的插件化架构

import { ReactNode } from 'react'

// 内置插件 ID 常量
export const BuiltinPluginId = {
    NETWORK: 'network',
    LOG: 'log',
    DATABASE: 'database',
    WEBSOCKET: 'websocket',
    MOCK: 'mock',
    BREAKPOINT: 'breakpoint',
    CHAOS: 'chaos',
} as const

export type BuiltinPluginIdType = (typeof BuiltinPluginId)[keyof typeof BuiltinPluginId]

// 插件状态
export type PluginState = 'uninitialized' | 'loading' | 'ready' | 'error' | 'disabled'

// 插件元信息
export interface PluginMetadata {
    pluginId: string
    displayName: string
    version: string
    description: string
    icon: ReactNode
    dependencies?: string[]
}

// 插件上下文 - 提供给插件的能力
export interface PluginContext {
    // 当前设备 ID（可能未选择设备时为 undefined）
    deviceId: string | undefined

    // API 基础 URL
    apiBaseUrl: string

    // 发送 HTTP 请求
    fetch: typeof fetch

    // 获取配置
    getConfig: <T>(key: string) => T | undefined

    // 设置配置
    setConfig: <T>(key: string, value: T) => void

    // 显示 Toast 消息
    showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void

    // 发送插件命令到设备
    sendCommand: (command: PluginCommand) => Promise<PluginCommandResponse>

    // 订阅实时事件
    subscribeToEvents: (
        eventTypes: string[],
        handler: (event: PluginEvent) => void
    ) => () => void
}

// 插件命令
export interface PluginCommand {
    pluginId: string
    commandType: string
    commandId?: string
    payload?: unknown
}

// 插件命令响应
export interface PluginCommandResponse {
    pluginId: string
    commandId: string
    success: boolean
    errorMessage?: string
    payload?: unknown
}

// 插件事件
export interface PluginEvent {
    pluginId: string
    eventType: string
    eventId: string
    timestamp: string
    payload: unknown
}

// 插件渲染属性
export interface PluginRenderProps {
    context: PluginContext
    isActive: boolean
}

// 前端插件接口
export interface FrontendPlugin {
    // 插件元信息
    metadata: PluginMetadata

    // 当前状态
    state: PluginState

    // 插件是否启用
    isEnabled: boolean

    // 初始化插件
    initialize: (context: PluginContext) => Promise<void>

    // 渲染插件内容
    render: (props: PluginRenderProps) => ReactNode

    // 激活时调用（切换到此 Tab）
    onActivate?: () => void

    // 停用时调用（离开此 Tab）
    onDeactivate?: () => void

    // 接收实时事件
    onEvent?: (event: PluginEvent) => void

    // 销毁插件
    destroy?: () => void
}

// 插件注册信息
export interface PluginRegistration {
    plugin: FrontendPlugin
    routePath: string
    tabOrder: number
}

// 插件 Tab 配置
export interface PluginTabConfig {
    pluginId: string
    label: string
    icon: ReactNode
    description: string
    routePath: string
}
