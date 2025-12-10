// 数据库检查前端插件
// 使用 DBInspector 组件

import React from 'react'
import {
    FrontendPlugin,
    PluginContext,
    PluginEvent,
    PluginMetadata,
    PluginRenderProps,
    PluginState,
    BuiltinPluginId,
} from '../types'
import { DatabaseIcon } from '@/components/icons'
import { DBInspector } from '@/components/DBInspector'

// 插件实现类
class DatabasePluginImpl implements FrontendPlugin {
    metadata: PluginMetadata = {
        pluginId: BuiltinPluginId.DATABASE,
        displayName: 'Database',
        version: '1.0.0',
        description: '数据库检查与查询',
        icon: <DatabaseIcon size={16} />,
    }

    state: PluginState = 'uninitialized'
    isEnabled = true

    private pluginContext: PluginContext | null = null
    private unsubscribe: (() => void) | null = null

    async initialize(context: PluginContext): Promise<void> {
        this.pluginContext = context
        this.state = 'loading'

        this.unsubscribe = context.subscribeToEvents(['db_query'], (event) =>
            this.handleEvent(event)
        )

        this.state = 'ready'
    }

    render(props: PluginRenderProps): React.ReactNode {
        return <DatabasePluginView {...props} />
    }

    onActivate(): void {
        console.log('[DatabasePlugin] Activated')
    }

    onDeactivate(): void {
        console.log('[DatabasePlugin] Deactivated')
    }

    onEvent(event: PluginEvent): void {
        this.handleEvent(event)
    }

    destroy(): void {
        this.unsubscribe?.()
        this.pluginContext = null
        this.state = 'uninitialized'
    }

    get context(): PluginContext | null {
        return this.pluginContext
    }

    private handleEvent(event: PluginEvent): void {
        // 数据库查询事件暂时不需要实时处理
        console.log('[DatabasePlugin] Received event:', event.eventType)
    }
}

// 插件视图组件 - 直接复用 DBInspector
function DatabasePluginView({ context, isActive }: PluginRenderProps) {
    const deviceId = context.deviceId

    if (!isActive || !deviceId) {
        return null
    }

    return (
        <div className="h-full flex flex-col">
            <DBInspector deviceId={deviceId} />
        </div>
    )
}

export const DatabasePlugin = new DatabasePluginImpl()
