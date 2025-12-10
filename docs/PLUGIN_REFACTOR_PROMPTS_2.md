## 插件化迁移重构计划

### 阶段一：消除 DebugProbe.swift 中的直接引擎调用

将 DebugProbe.swift 中的以下直接调用移除/委托给插件：

1. Network 相关

- 移除 NetworkInstrumentation.shared.start() 直接调用

- 移除 setNetworkCaptureEnabled() 方法

- 改由 NetworkPlugin 统一管理

2. Log 相关

- 移除 startLogCapture() / stopLogCapture() 方法

- 移除 ddLogger 成员变量

- 改由 LogPlugin 统一管理

3. WebSocket 相关

- 移除 setWebSocketCaptureEnabled() 方法

- 移除 getWebSocketHooks() 方法（移至 WebSocketPlugin）

- 移除 wsSessionURLCache 相关代码

4. Mock 相关

- 移除 bridgeClient.onMockRulesReceived 回调中的直接调用
- 通过 PluginBridgeAdapter 路由到 MockPlugin



### 阶段二：修改 Bridge 回调路由

修改 DebugProbe.setupCallbacks() 中的回调，改为通过 PluginBridgeAdapter 路由：

```swift
// 旧代码
bridgeClient.onMockRulesReceived = { rules in
    self?.mockRuleEngine.updateRules(rules) // 直接调用旧引擎
}

// 新代码
bridgeClient.onMockRulesReceived = { rules in
    Task {
        await self?.pluginBridgeAdapter?.routeMockRulesUpdate(rules)
    }
}
```



### 阶段三：简化 PluginBridgeAdapter

移除 PluginBridgeAdapter 中通过 EventBus 的双重转发逻辑，因为：

- 旧引擎已经将事件发到 EventBus

- 插件又订阅 EventBus 再转发一次

- 造成不必要的重复处理

### 阶段四：清理 DebugProbe.swift 启动逻辑

将 start() 方法中的启动逻辑简化为只启动插件系统：

```swift
public func start(configuration: Configuration) {
    // 1. 配置 EventBus
    // 2. 注册并启动插件（插件内部管理各自的引擎）
    // 3. 连接 Bridge
    // 4. 启动 PluginBridgeAdapter
}
```

