# Debug Platform AI 开发 Prompts 参考

本文档是为 AI Agent（如 GitHub Copilot、Cursor）提供的项目上下文和开发 Prompts 参考，帮助 AI 更高效地理解和修改代码。

> **版本**: 1.4.0 | **最后更新**: 2025-12-12

---

## 📋 项目概述

Debug Platform 是一个全功能移动 App 调试平台，采用三层插件化架构：

| 层级 | 技术栈 | 位置 | 插件数量 |
|------|--------|------|----------|
| **DebugProbe (SDK)** | Swift + Combine | `DebugProbe/Sources/` | 8 个 |
| **DebugHub (后端)** | Vapor + Fluent + PostgreSQL | `DebugHub/Sources/` | 8 个 |
| **WebUI (前端)** | React 18 + TypeScript + Zustand + Vite | `WebUI/src/` | 8 个 |

### 核心功能模块

| 插件 ID | 功能 | 状态 |
|---------|------|------|
| `http` | HTTP/HTTPS 请求监控 | ✅ 稳定 |
| `websocket` | WebSocket 连接和帧监控 | ✅ 稳定 |
| `log` | 日志捕获和分析 | ✅ 稳定 |
| `database` | SQLite 数据库检查 | ✅ 稳定 |
| `mock` | Mock 规则引擎 | ✅ 稳定 |
| `breakpoint` | 请求断点调试 | ✅ 稳定 |
| `chaos` | 故障注入引擎 | ✅ 稳定 |
| `performance` | 性能监控 | 🚧 开发中 |

---

## 🗂️ 项目结构

### DebugHub 后端 (Vapor)

```
DebugHub/Sources/
├── App/
│   ├── App.swift                          # 应用入口
│   └── Configure.swift                    # 应用配置
├── Controllers/
│   ├── DeviceController.swift             # 设备 CRUD API
│   ├── TrafficRuleController.swift        # 流量规则 API
│   ├── DomainPolicyController.swift       # 域名策略 API
│   ├── ExportController.swift             # 导出功能（cURL/HAR）
│   ├── StatsController.swift              # 统计信息 API
│   └── WebUIPluginController.swift        # WebUI 插件状态 API
├── Services/
│   ├── Plugin/                            # 后端插件系统
│   │   ├── BackendPluginProtocol.swift    # 插件协议定义
│   │   ├── BackendPluginRegistry.swift    # 插件注册中心
│   │   ├── BuiltinBackendPlugins.swift    # 内置插件工厂
│   │   ├── HttpBackendPlugin.swift        # HTTP 插件实现
│   │   └── PerformanceBackendPlugin.swift # 性能监控插件
│   ├── DeviceRegistry.swift               # 设备注册管理
│   ├── EventIngestor.swift                # 事件接收处理
│   ├── EventDTOs.swift                    # 事件数据传输对象
│   ├── DatabaseDTOs.swift                 # 数据库相关 DTO
│   ├── DBResponseManager.swift            # 数据库响应管理
│   ├── SearchQueryParser.swift            # 高级搜索语法解析
│   ├── BreakpointManager.swift            # 断点管理
│   ├── ReplayCommand.swift                # 请求重放命令
│   └── DataCleanupService.swift           # 数据清理服务
├── Models/
│   ├── DeviceModel.swift                  # 设备实体
│   ├── DeviceSessionModel.swift           # 设备会话实体
│   ├── DBModels.swift                     # 数据库模型（HTTP/WS/Log）
│   ├── BreakpointRuleModel.swift          # 断点规则实体
│   ├── ChaosRuleModel.swift               # 混沌规则实体
│   └── Migrations.swift                   # 数据库迁移
└── WebSocket/
    ├── DebugBridgeHandler.swift           # 设备连接处理
    └── RealtimeStreamHandler.swift        # WebUI 实时推送
```

### WebUI 前端 (React + TypeScript)

```
WebUI/src/
├── App.tsx                                # 应用入口和路由配置
├── main.tsx                               # React 挂载点
├── index.css                              # 全局样式（Tailwind + 主题变量）
├── components/                            # 可复用 UI 组件
│   ├── AdvancedSearch.tsx                 # 高级搜索语法组件
│   ├── BatchSelectionBar.tsx              # 批量选择操作栏
│   ├── BreakpointHitPanel.tsx             # 断点命中详情面板
│   ├── DBInspector.tsx                    # 数据库检查器
│   ├── DeviceCard.tsx                     # 设备卡片
│   ├── GroupedHTTPEventList.tsx           # HTTP 请求分组列表
│   ├── HTTPEventDetail.tsx                # HTTP 请求详情面板
│   ├── JSONTree.tsx                       # JSON 树形展示
│   ├── MockRuleEditor.tsx                 # Mock 规则编辑器
│   ├── MockRuleList.tsx                   # Mock 规则列表
│   ├── PluginManager.tsx                  # 插件管理界面
│   ├── ProtobufViewer.tsx                 # Protobuf 解析器
│   ├── RequestDiff.tsx                    # 请求对比组件
│   ├── Sidebar.tsx                        # 侧边栏（设备列表 + 域名树）
│   ├── TimingWaterfall.tsx                # 性能时间线瀑布图
│   ├── VirtualHTTPEventTable.tsx          # HTTP 虚拟滚动表格
│   ├── VirtualLogList.tsx                 # 日志虚拟滚动列表
│   ├── WSSessionDetail.tsx                # WebSocket 会话详情
│   ├── WSSessionList.tsx                  # WebSocket 会话列表
│   └── ...
├── pages/                                 # 页面组件
│   ├── ApiDocsPage.tsx                    # API 文档页
│   ├── DeviceDetailPage.tsx               # 设备详情页
│   ├── DeviceListPage.tsx                 # 设备列表页
│   ├── DevicePluginView.tsx               # 设备插件视图
│   ├── HealthPage.tsx                     # 健康检查页
│   └── RulesPage.tsx                      # 规则管理页
├── plugins/                               # 前端插件系统
│   ├── types.ts                           # 插件类型定义
│   ├── index.ts                           # 插件导出
│   ├── PluginRegistry.ts                  # 插件注册中心
│   ├── PluginRenderer.tsx                 # 插件渲染器
│   └── builtin/                           # 内置插件
│       ├── index.ts                       # 内置插件导出
│       ├── HttpPlugin.tsx                 # HTTP 网络插件
│       ├── WebSocketPlugin.tsx            # WebSocket 插件
│       ├── LogPlugin.tsx                  # 日志插件
│       ├── DatabasePlugin.tsx             # 数据库插件
│       ├── MockPlugin.tsx                 # Mock 规则插件
│       ├── BreakpointPlugin.tsx           # 断点调试插件
│       ├── ChaosPlugin.tsx                # Chaos 故障注入插件
│       └── PerformancePlugin.tsx          # 性能监控插件
├── stores/                                # Zustand 状态管理
│   ├── deviceStore.ts                     # 设备状态
│   ├── connectionStore.ts                 # WebSocket 连接状态
│   ├── httpStore.ts                       # HTTP 事件状态
│   ├── wsStore.ts                         # WebSocket 状态
│   ├── logStore.ts                        # 日志状态
│   ├── dbStore.ts                         # 数据库状态
│   ├── mockStore.ts                       # Mock 规则状态
│   ├── breakpointStore.ts                 # 断点状态
│   ├── performanceStore.ts                # 性能监控状态
│   ├── ruleStore.ts                       # 流量规则状态
│   ├── domainStore.ts                     # 域名策略状态
│   ├── protobufStore.ts                   # Protobuf 配置状态
│   ├── themeStore.ts                      # 主题状态
│   └── toastStore.ts                      # Toast 消息状态
├── services/
│   ├── api.ts                             # HTTP API 调用封装
│   └── realtime.ts                        # WebSocket 实时通信
├── hooks/
│   └── useKeyboardShortcuts.ts            # 键盘快捷键 Hook
├── types/
│   └── index.ts                           # 全局类型定义
└── utils/
    ├── format.ts                          # 格式化工具函数
    ├── deviceIcons.tsx                    # 设备图标
    ├── logSearch.ts                       # 日志搜索工具
    └── protobufDescriptor.ts              # Protobuf 描述符解析
```

---

## 🔌 插件系统架构

### 前端插件接口 (FrontendPlugin)

```typescript
interface FrontendPlugin {
  metadata: PluginMetadata     // 插件元信息
  state: PluginState           // 当前状态
  isEnabled: boolean           // 是否启用
  
  initialize(context: PluginContext): Promise<void>
  render(props: PluginRenderProps): ReactNode
  onActivate?(): void          // 切换到此 Tab 时
  onDeactivate?(): void        // 离开此 Tab 时
  onEvent?(event: PluginEvent): void
  destroy?(): void
}
```

### 后端插件协议 (BackendPluginProtocol)

```swift
protocol BackendPluginProtocol: AnyActor {
    var pluginId: String { get }
    var metadata: BackendPluginMetadata { get }
    var state: BackendPluginState { get }
    
    func boot(app: Application) async throws
    func shutdown() async
    func handleEvent(_ event: PluginEventDTO, deviceId: String) async throws
    func handleCommand(_ command: PluginCommandDTO, deviceId: String) async throws -> PluginCommandResponseDTO
    func registerRoutes(_ routes: RoutesBuilder)
}
```

---

## 📝 开发 Prompts

### 通用规则

```markdown
# 代码风格
- 使用简体中文回复，代码命名使用英文
- Swift 代码遵循 .swiftformat 配置
- TypeScript 代码遵循 ESLint + Prettier
- 最小改动原则，避免大范围重排

# 架构原则
- 三层架构：SDK → Hub → WebUI
- 每层都有对应的插件系统
- 事件驱动：设备 → Hub → WebUI 实时推送
```

### 新增功能模块

```markdown
# 新增 [功能名] 功能

## 需求
[描述功能需求]

## 涉及层级
- [ ] DebugProbe SDK（设备端采集）
- [ ] DebugHub 后端（数据存储/处理）
- [ ] WebUI 前端（界面展示）

## 实现步骤

### 1. SDK 层（如需要）
- 在 `DebugProbe/Sources/Plugins/` 创建新插件
- 实现 `DebugPlugin` 协议
- 在 `BuiltinPlugins.swift` 注册

### 2. Hub 层
- 在 `DebugHub/Sources/Services/Plugin/` 创建后端插件
- 实现 `BackendPluginProtocol`
- 定义数据模型和迁移
- 在 `BuiltinBackendPlugins.swift` 注册
- 添加 API 路由

### 3. WebUI 层
- 在 `WebUI/src/plugins/builtin/` 创建前端插件
- 实现 `FrontendPlugin` 接口
- 创建对应的 Store（Zustand）
- 创建 UI 组件
- 在 `plugins/builtin/index.ts` 注册
```

### HTTP 功能开发

```markdown
# HTTP Inspector 相关开发

## 关键文件
- 后端 API: `DebugHub/Sources/Services/Plugin/HttpBackendPlugin.swift`
- 前端插件: `WebUI/src/plugins/builtin/HttpPlugin.tsx`
- 状态管理: `WebUI/src/stores/httpStore.ts`
- 列表组件: `WebUI/src/components/VirtualHTTPEventTable.tsx`
- 分组列表: `WebUI/src/components/GroupedHTTPEventList.tsx`
- 详情组件: `WebUI/src/components/HTTPEventDetail.tsx`

## 数据流
1. SDK 捕获 HTTP 请求 → 发送 `http.request` / `http.response` 事件
2. Hub 接收并存储到 PostgreSQL
3. Hub 通过 WebSocket 推送到 WebUI
4. httpStore 更新状态 → 组件重渲染

## 常见任务
- 添加新过滤条件：修改 `SearchQueryParser.swift` 和 `AdvancedSearch.tsx`
- 添加详情面板 Tab：修改 `HTTPEventDetail.tsx`
- 优化虚拟滚动：修改 `VirtualHTTPEventTable.tsx`（使用 @tanstack/react-virtual）
```

### WebSocket 功能开发

```markdown
# WebSocket Inspector 相关开发

## 关键文件
- 前端插件: `WebUI/src/plugins/builtin/WebSocketPlugin.tsx`
- 状态管理: `WebUI/src/stores/wsStore.ts`
- 会话列表: `WebUI/src/components/WSSessionList.tsx`
- 会话详情: `WebUI/src/components/WSSessionDetail.tsx`

## 数据结构
- WSSession: 连接级信息（URL、状态、请求头）
- WSFrame: 消息帧（方向、opcode、payload）
- WSFrameDetail: 完整帧内容（懒加载）

## 虚拟滚动注意事项
- 使用 @tanstack/react-virtual 的 useVirtualizer
- 动态高度需要 measureElement + 手动 measure()
- 展开/收起时需要重新测量
```

### 日志功能开发

```markdown
# Log Viewer 相关开发

## 关键文件
- 前端插件: `WebUI/src/plugins/builtin/LogPlugin.tsx`
- 状态管理: `WebUI/src/stores/logStore.ts`
- 日志列表: `WebUI/src/components/VirtualLogList.tsx`
- 过滤组件: `WebUI/src/components/LogFilters.tsx`

## 日志级别
- verbose (0): 灰色
- debug (1): 蓝色
- info (2): 绿色
- warning (3): 黄色
- error (4): 红色
```

### 数据库功能开发

```markdown
# DB Inspector 相关开发

## 关键文件
- 前端插件: `WebUI/src/plugins/builtin/DatabasePlugin.tsx`
- 状态管理: `WebUI/src/stores/dbStore.ts`
- 检查器组件: `WebUI/src/components/DBInspector.tsx`
- Protobuf 解析: `WebUI/src/components/ProtobufViewer.tsx`

## 特性
- 数据库/表浏览
- SQL 查询（SELECT only）
- BLOB 字段 Protobuf 解析
- Wire Format 自动解析
```

### Mock 规则开发

```markdown
# Mock Engine 相关开发

## 关键文件
- 前端插件: `WebUI/src/plugins/builtin/MockPlugin.tsx`
- 状态管理: `WebUI/src/stores/mockStore.ts`
- 规则编辑器: `WebUI/src/components/MockRuleEditor.tsx`
- 规则列表: `WebUI/src/components/MockRuleList.tsx`

## Mock 规则结构
- urlPattern: URL 匹配模式（支持通配符）
- method: HTTP 方法
- responseStatus: 响应状态码
- responseBody: 响应体
- responseHeaders: 响应头
- delay: 延迟时间（ms）
```

### 断点调试开发

```markdown
# Breakpoint 相关开发

## 关键文件
- 后端管理: `DebugHub/Sources/Services/BreakpointManager.swift`
- 前端插件: `WebUI/src/plugins/builtin/BreakpointPlugin.tsx`
- 状态管理: `WebUI/src/stores/breakpointStore.ts`
- 命中面板: `WebUI/src/components/BreakpointHitPanel.tsx`

## 断点流程
1. 用户创建断点规则
2. SDK 匹配请求 → 暂停并上报
3. Hub 推送 breakpoint.hit 事件
4. WebUI 显示命中面板
5. 用户选择继续/修改/取消
6. WebUI 发送 breakpoint.resume 命令
```

### UI 组件开发

```markdown
# UI 组件开发规范

## 样式系统
- 使用 Tailwind CSS
- 主题变量定义在 index.css
- 使用 clsx 组合类名
- 玻璃态效果: glass-card, glass-button

## 常用组件
- Toggle: 开关组件
- Checkbox: 复选框
- ConfirmDialog: 确认对话框
- ToastContainer: Toast 消息
- LoadMoreButton: 加载更多按钮

## 虚拟滚动
- 库: @tanstack/react-virtual
- 固定高度: estimateSize 返回固定值
- 动态高度: 使用 measureElement
```

### 状态管理

```markdown
# Zustand Store 开发规范

## 创建新 Store

```typescript
import { create } from 'zustand'

interface MyState {
  items: Item[]
  loading: boolean
  error: string | null
  
  // Actions
  fetchItems: (deviceId: string) => Promise<void>
  addItem: (item: Item) => void
  reset: () => void
}

export const useMyStore = create<MyState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  
  fetchItems: async (deviceId) => {
    set({ loading: true, error: null })
    try {
      const items = await api.getItems(deviceId)
      set({ items, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },
  
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
  
  reset: () => set({ items: [], loading: false, error: null })
}))
```

## 命名约定
- Store 文件: `xxxStore.ts`
- Hook 名: `useXxxStore`
- 异步 Action: 返回 Promise
- 重置 Action: `reset()`
```

---

## 🔧 常见问题排查

### 构建问题

```markdown
# Vite 构建警告
- 动态导入冲突: 使用回调模式替代 import()
- 循环依赖: 检查 Store 之间的相互引用

# TypeScript 类型错误
- 检查 types/index.ts 类型定义
- 使用 as const 确保字面量类型
```

### 运行时问题

```markdown
# WebSocket 连接问题
- 检查 connectionStore 的连接状态
- 查看 onServerOfflineCallback 是否设置

# 虚拟滚动问题
- 元素重叠: 检查 measureElement 是否正确绑定
- 高度错误: 展开/收起后需要调用 measure()
- 顺序错误: 检查数据是否需要 reverse()
```

### 性能问题

```markdown
# 列表性能优化
- 使用 useMemo 缓存计算结果
- 使用 useCallback 缓存函数引用
- 使用 React.memo 包装纯组件
- 虚拟滚动处理大量数据

# 网络请求优化
- 分页加载（limit/offset）
- 增量更新（since 参数）
- WebSocket 实时推送替代轮询
```

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [ROADMAP.md](ROADMAP.md) | 开发路线图 |
| [CHANGELOG.md](CHANGELOG.md) | 更新日志 |
| [HTTP_INSPECTOR_ROADMAP.md](HTTP_INSPECTOR_ROADMAP.md) | HTTP 模块路线图 |
| [WS_INSPECTOR_ROADMAP.md](WS_INSPECTOR_ROADMAP.md) | WebSocket 模块路线图 |
| [LOG_VIEWER_ROADMAP.md](LOG_VIEWER_ROADMAP.md) | 日志模块路线图 |
| [DB_INSPECTOR_ROADMAP.md](DB_INSPECTOR_ROADMAP.md) | 数据库模块路线图 |
| [MOCK_ENGINE_ROADMAP.md](MOCK_ENGINE_ROADMAP.md) | Mock 引擎路线图 |
| [BREAKPOINT_ROADMAP.md](BREAKPOINT_ROADMAP.md) | 断点调试路线图 |
| [CHAOS_ENGINE_ROADMAP.md](CHAOS_ENGINE_ROADMAP.md) | 混沌引擎路线图 |

---

## ✨ AI 开发建议

1. **先理解架构**: 阅读本文档和 README.md，理解三层架构
2. **查看现有实现**: 参考同类功能的实现方式
3. **遵循约定**: 文件命名、代码风格、状态管理模式
4. **最小改动**: 只修改必要的代码，保持 Git Diff 清晰
5. **测试验证**: 运行 `npm run build` 验证无编译错误
6. **文档更新**: 重要变更同步更新 CHANGELOG.md
