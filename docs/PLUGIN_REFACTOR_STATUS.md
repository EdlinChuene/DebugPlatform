# 插件化重构进度追踪

> **最后更新**: 2025-01-XX
>
> **当前阶段**: Phase 1 - 框架搭建与内置插件完成

---

## 📊 总体进度

| 层级 | 进度 | 状态 |
|------|------|------|
| iOS (DebugProbe) | ████████████████████ 100% | ✅ 完成 |
| Server (DebugHub) | ████████████████████ 100% | ✅ 完成 |
| WebUI | ████████████████████ 100% | ✅ 完成 |
| 旧代码废弃标记 | ████████████████████ 100% | ✅ 完成 |
| 端到端测试 | ░░░░░░░░░░░░░░░░░░░░ 0% | ⏳ 待开始 |

---

## ✅ 已完成任务

### Phase 1: 插件框架搭建

#### iOS 层 (DebugProbe)
- [x] `PluginProtocol` - 插件协议定义
- [x] `PluginContext` - 插件上下文接口
- [x] `PluginManager` - 插件生命周期管理
- [x] `PluginBridgeAdapter` - 桥接适配器（支持单例和实例两种模式）
- [x] `PluginCommand` / `PluginEvent` - 消息类型定义

#### Server 层 (DebugHub)
- [x] `BackendPluginProtocol` - 后端插件协议
- [x] `BackendPluginContext` - 后端插件上下文
- [x] `BackendPluginRegistry` - 插件注册中心
- [x] 插件事件路由机制

#### WebUI 层
- [x] `FrontendPlugin` - 前端插件接口
- [x] `PluginRegistry` - 插件注册表
- [x] `PluginRenderer` - 插件渲染器
- [x] `PluginContext` - 前端插件上下文
- [x] `usePluginBridge` - 插件桥接 Hook
- [x] `PluginStoreConnector` - 经典 Store 连接器
- [x] `DevicePluginView` - 插件模式设备详情页

---

### Phase 2: 内置插件实现

#### iOS 内置插件 (7个)
- [x] `HTTPPlugin` - HTTP 网络抓包
- [x] `LogPlugin` - 日志采集
- [x] `WebSocketPlugin` - WebSocket 监控
- [x] `DatabasePlugin` - 数据库检查
- [x] `MockPlugin` - Mock 规则管理
- [x] `BreakpointPlugin` - 断点调试
- [x] `ChaosPlugin` - 混沌工程

#### Server 内置插件 (7个)
- [x] `HTTPBackendPlugin` - HTTP 事件处理
- [x] `LogBackendPlugin` - 日志事件处理
- [x] `WebSocketBackendPlugin` - WebSocket 事件处理
- [x] `DatabaseBackendPlugin` - 数据库查询代理
- [x] `MockBackendPlugin` - Mock 规则同步
- [x] `BreakpointBackendPlugin` - 断点命令路由
- [x] `ChaosBackendPlugin` - 混沌配置同步

#### WebUI 内置插件 (7个)
- [x] `HTTPPlugin` - HTTP 请求列表与详情
- [x] `LogPlugin` - 日志查看器
- [x] `WebSocketPlugin` - WebSocket 会话监控
- [x] `DatabasePlugin` - 数据库浏览器
- [x] `MockPlugin` - Mock 规则编辑器
- [x] `BreakpointPlugin` - 断点管理面板
- [x] `ChaosPlugin` - 混沌工程配置

---

### Phase 3: 桥接与兼容

#### iOS 桥接协议更新
- [x] `DebugBridgeClient.onPluginCommandReceived` 回调
- [x] `pluginCommand` 消息类型处理
- [x] `PluginBridgeAdapter` 实例化支持

#### WebUI 桥接组件
- [x] `PluginStoreConnector` - 插件事件转发到经典 Zustand stores
- [x] `DeviceDetailPage` 支持 `?mode=plugin` 参数

---

### Phase 4: 旧代码废弃标记

#### Server Controllers (已标记 @available deprecated)
- [x] `BreakpointController` → 使用 `BreakpointBackendPlugin`
- [x] `ChaosController` → 使用 `ChaosBackendPlugin`
- [x] `DatabaseController` → 使用 `DatabaseBackendPlugin`
- [x] `HTTPEventController` → 使用 `HTTPBackendPlugin`
- [x] `LogEventController` → 使用 `LogBackendPlugin`
- [x] `MockRuleController` → 使用 `MockBackendPlugin`
- [x] `WSEventController` → 使用 `WebSocketBackendPlugin`

#### iOS Engines (已标记 deprecated)
- [x] `NetworkInstrumentation` → 使用 `HTTPPlugin`
- [x] `MockRuleEngine` → 使用 `MockPlugin`
- [x] `BreakpointEngine` → 使用 `BreakpointPlugin`
- [x] `ChaosEngine` → 使用 `ChaosPlugin`

---

## ⏳ 待完成任务

### Phase 5: 验证与测试
- [ ] iOS 插件模式功能验证
- [ ] Server 插件路由端到端测试
- [ ] WebUI 插件模式 UI 测试
- [ ] 性能对比测试（经典 vs 插件模式）

### Phase 6: 文档与清理
- [ ] 更新 README.md 说明插件架构
- [ ] 添加插件开发指南
- [ ] 移除已废弃的旧代码（在插件稳定后）

---

## 📁 关键文件索引

### iOS (DebugProbe)
```
Sources/Core/Plugin/
├── PluginProtocol.swift          # 插件协议
├── PluginManager.swift           # 插件管理器
├── PluginBridgeAdapter.swift     # 桥接适配器
├── BuiltinPlugins.swift          # 7个内置插件
└── PluginTypes.swift             # 类型定义
```

### Server (DebugHub)
```
Sources/Services/Plugin/
├── BackendPluginProtocol.swift   # 后端插件协议
├── BackendPluginRegistry.swift   # 插件注册中心
└── BuiltinBackendPlugins.swift   # 7个后端插件
```

### WebUI
```
src/plugins/
├── types.ts                      # 类型定义
├── PluginRegistry.ts             # 插件注册表
├── PluginRenderer.tsx            # 渲染器
└── builtin/                      # 7个前端插件
    ├── HTTPPlugin.tsx
    ├── LogPlugin.tsx
    ├── WebSocketPlugin.tsx
    ├── DatabasePlugin.tsx
    ├── MockPlugin.tsx
    ├── BreakpointPlugin.tsx
    └── ChaosPlugin.tsx

src/components/
└── PluginStoreConnector.tsx      # Store 连接器

src/hooks/
└── usePluginBridge.ts            # 桥接 Hook

src/pages/
└── DevicePluginView.tsx          # 插件模式视图
```

---

## 🔗 相关文档

- [插件化重构 Prompts.md](插件化重构%20Prompts.md) - 原始需求规格
- [ROADMAP.md](ROADMAP.md) - 项目整体路线图
- [CHANGELOG.md](CHANGELOG.md) - 更新日志
