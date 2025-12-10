// 插件系统公共导出
// 提供统一的插件系统 API

import { PluginRegistry as Registry } from './PluginRegistry'

export { PluginRegistry } from './PluginRegistry'
export { PluginRenderer, PluginTabBar, getPluginTabs } from './PluginRenderer'
export { registerBuiltinPlugins } from './builtin'

export type {
    FrontendPlugin,
    PluginContext,
    PluginEvent,
    PluginCommand,
    PluginMetadata,
    PluginRenderProps,
    PluginState,
    BuiltinPluginId,
} from './types'

// 便捷方法：获取插件 Tab 配置
export function getPluginTabConfigs() {
    return Registry.getTabConfigs()
}

// 便捷方法：渲染指定插件
export function renderPlugin(pluginId: string, props: import('./types').PluginRenderProps) {
    const plugin = Registry.get(pluginId)
    if (!plugin) {
        console.warn(`Plugin not found: ${pluginId}`)
        return null
    }
    return plugin.render(props)
}
