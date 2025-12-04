# Debug Platform 优化路线图

本文档规划了 Debug Platform 的功能路线，记录已完成的功能和后续优化计划。

> **当前版本**: v1.2.0 | [更新日志](CHANGELOG.md)
>
> **最后更新**: 2025-12-04

---

## 🔴 待修复问题 (Code Analysis - 2025-12-04)

本节记录代码审查发现的问题，按优先级排序。

### P0: 协议层两端不匹配

#### 断点恢复消息格式不一致

**iOS SDK 端** (`iOSProbe/Sources/Models/BridgeMessage.swift`):
```swift
struct BreakpointResumePayload: Codable {
    let breakpointId: String
    let requestId: String
    let action: String  // 简单字符串: "continue", "abort", "modify"
    let modifiedRequest: ModifiedRequest?
}
```

**DebugHub 端** (`DebugHub/Sources/Services/DeviceRegistry.swift`):
```swift
struct BreakpointResumeDTO: Content {
    let requestId: String
    let action: BreakpointActionDTO  // 嵌套对象
}

struct BreakpointActionDTO: Content {
    let type: String // "resume", "modify", "abort", "mockResponse"
    let modification: BreakpointModificationDTO?
    let mockResponse: BreakpointResponseSnapshotDTO?
}
```

**问题**:
- iOS 端 `action` 是简单字符串，DebugHub 期望嵌套的 `BreakpointActionDTO` 对象
- iOS 端缺少 `mockResponse` 动作类型
- 字段名不一致：iOS 用 `modifiedRequest`，Hub 用 `modification`
- **影响**: 断点恢复消息发送后 iOS 端解码会失败，导致断点功能完全不可用

**修复方案**: 统一两端的消息格式，建议采用 DebugHub 的嵌套结构

---

### P0: 未实现的关键功能

#### 1. 断点规则同步未实现

**文件**: `iOSProbe/Sources/Core/DebugBridgeClient.swift:224`

```swift
case let .updateBreakpointRules(rules):
    DebugLog.info(.bridge, "Received \(rules.count) breakpoint rules")
    // TODO: 实现断点规则更新处理  ← 仅打印日志，未调用 BreakpointEngine
```

**应修改为**:
```swift
case let .updateBreakpointRules(rules):
    DebugLog.info(.bridge, "Received \(rules.count) breakpoint rules")
    BreakpointEngine.shared.updateRules(rules)  // 需要添加这行
```

#### 2. Chaos 规则同步未实现

**文件**: `iOSProbe/Sources/Core/DebugBridgeClient.swift:228`

```swift
case let .updateChaosRules(rules):
    DebugLog.info(.bridge, "Received \(rules.count) chaos rules")
    // TODO: 实现故障注入规则更新处理  ← 仅打印日志，未调用 ChaosEngine
```

**应修改为**:
```swift
case let .updateChaosRules(rules):
    DebugLog.info(.bridge, "Received \(rules.count) chaos rules")
    ChaosEngine.shared.updateRules(rules)  // 需要添加这行
```

#### 3. 断点恢复功能未实现

**文件**: `iOSProbe/Sources/Core/DebugBridgeClient.swift:236`

```swift
case let .breakpointResume(payload):
    DebugLog.info(.bridge, "Received breakpoint resume for \(payload.requestId)")
    // TODO: 实现断点恢复功能  ← 仅打印日志，未调用 BreakpointEngine
```

**应修改为**:
```swift
case let .breakpointResume(payload):
    DebugLog.info(.bridge, "Received breakpoint resume for \(payload.requestId)")
    let resume = BreakpointResume(requestId: payload.requestId, action: payload.action)
    BreakpointEngine.shared.resumeBreakpoint(resume)  // 需要添加这行
```

#### 4. 网络层未集成断点和 Chaos

**文件**: `iOSProbe/Sources/Network/NetworkInstrumentation.swift`

`CaptureURLProtocol.startLoading()` 方法中：
- ❌ 未调用 `BreakpointEngine.shared.checkRequestBreakpoint()`
- ❌ 未调用 `ChaosEngine.shared.evaluate()`

**影响**: 即使规则同步成功，断点和故障注入也不会生效

---

### P1: 设备重连时规则不同步

**文件**: `DebugHub/Sources/WebSocket/DebugBridgeHandler.swift:178`

```swift
private func sendCurrentMockRules(to deviceId: String, session: DeviceSession) async {
    // TODO: 从数据库加载该设备的 Mock 规则并发送
}
```

**影响**: 
- Mock 规则：设备断线重连后不会重新获取
- 断点规则：完全未同步
- Chaos 规则：完全未同步

**修复方案**:
```swift
private func sendCurrentRules(to deviceId: String, session: DeviceSession) async {
    // 1. Mock 规则
    let mockRules = try? await MockRuleModel.query(on: db)
        .filter(\.$deviceId == deviceId)
        .filter(\.$enabled == true)
        .all()
    if let rules = mockRules {
        DeviceRegistry.shared.sendMessage(to: deviceId, message: .updateMockRules(rules))
    }
    
    // 2. 断点规则
    let bpRules = try? await BreakpointRuleModel.query(on: db)
        .filter(\.$deviceId == deviceId)
        .filter(\.$enabled == true)
        .all()
    if let rules = bpRules {
        DeviceRegistry.shared.sendMessage(to: deviceId, message: .updateBreakpointRules(rules))
    }
    
    // 3. Chaos 规则
    let chaosRules = try? await ChaosRuleModel.query(on: db)
        .filter(\.$deviceId == deviceId)
        .filter(\.$enabled == true)
        .all()
    if let rules = chaosRules {
        DeviceRegistry.shared.sendMessage(to: deviceId, message: .updateChaosRules(rules))
    }
}
```

---

### P1: WebUI 缺少规则管理界面

**文件**: `WebUI/src/pages/DeviceDetailPage.tsx`

当前只有 4 个 Tab：`http`, `websocket`, `logs`, `mock`

**缺失**:
1. **断点规则管理 Tab**
   - API 已实现: `GET/POST/PUT/DELETE /devices/:deviceId/breakpoints`
   - 需要创建 `BreakpointRuleList.tsx` 和 `BreakpointRuleEditor.tsx`
   
2. **Chaos 规则管理 Tab**
   - API 已实现: `GET/POST/PUT/DELETE /devices/:deviceId/chaos`
   - 需要创建 `ChaosRuleList.tsx` 和 `ChaosRuleEditor.tsx`

3. **等待中断点面板**
   - API 已实现: `GET /devices/:deviceId/breakpoints/pending`
   - 需要显示当前命中的断点列表，允许用户恢复/修改/中止

---

### P2: 断点命中事件未处理

**文件**: `DebugHub/Sources/WebSocket/DebugBridgeHandler.swift`

`handleMessage()` 方法中，iOS SDK 发送的 `breakpointHit` 消息类型未被处理。

```swift
private func handleMessage(data: Data, ws: WebSocket, req: Request, deviceIdHolder: DeviceIdHolder) {
    // ... 
    switch message {
    case let .register(deviceInfo, token):
        // ...
    case .heartbeat:
        // ...
    case let .events(events):
        // ...
    default:
        print("[DebugBridge] Received unknown message type")
        // ❌ breakpointHit 消息会进入这里被忽略
    }
}
```

**修复方案**:
```swift
case let .breakpointHit(hit):
    BreakpointManager.shared.addPendingHit(hit)
    // 通知 WebUI 实时流
    RealtimeStreamHandler.shared.broadcastBreakpointHit(hit)
```

---

### P3: 未使用的代码

#### ruleStore 定义但未使用

**文件**: `WebUI/src/stores/ruleStore.ts`

- 定义了 `TrafficRule` 相关的 store
- API 路径使用 `/api/traffic-rules`，但后端没有实现这个路由
- 未在任何组件中被导入使用
- 与现有的 `MockRule` 功能可能存在概念重叠

**建议**: 评估是否需要此功能，若不需要则移除以减少代码冗余

---

### 修复优先级总结

| 优先级 | 问题 | 影响 | 预估工时 |
|-------|------|------|---------|
| 🔴 P0 | 断点恢复消息格式不匹配 | 断点功能完全不可用 | 0.5 天 |
| 🔴 P0 | 断点规则同步未实现 | 断点功能不生效 | 0.5 天 |
| 🔴 P0 | Chaos 规则同步未实现 | 故障注入不生效 | 0.5 天 |
| 🔴 P0 | 断点恢复功能未实现 | 断点无法恢复 | 0.5 天 |
| 🔴 P0 | 网络层未集成断点/Chaos | 规则不生效 | 1 天 |
| 🟡 P1 | 设备重连规则不同步 | 重连后规则丢失 | 0.5 天 |
| 🟡 P1 | WebUI 缺少断点管理 | 无法管理断点规则 | 2 天 |
| 🟡 P1 | WebUI 缺少 Chaos 管理 | 无法管理故障注入规则 | 2 天 |
| 🟢 P2 | breakpointHit 消息未处理 | WebUI 不知道断点命中 | 0.5 天 |
| 🟢 P3 | ruleStore 未使用 | 代码冗余 | 0.5 天 |

**总预估**: 约 8.5 天

---

## ✅ 已完成功能

### Phase 1: 核心调试能力

| 功能 | 状态 | 说明 |
|------|------|------|
| iOS Probe 网络捕获 | ✅ 完成 | URLProtocol + URLSessionTaskMetrics |
| iOS Probe 日志捕获 | ✅ 完成 | CocoaLumberjack + os_log 包装 |
| Debug Hub 后端服务 | ✅ 完成 | Vapor + PostgreSQL/SQLite + WebSocket |
| Web UI 基础框架 | ✅ 完成 | React + TypeScript + Vite + Tailwind |
| 实时数据流 | ✅ 完成 | WebSocket 双向通信 |
| Mock 规则引擎 | ✅ 完成 | HTTP/WS 请求拦截与响应模拟 |
| 请求重放 | ✅ 完成 | 通过 WebSocket 指令重放请求 (iOS SDK 完整实现) |
| cURL 导出 | ✅ 完成 | 生成可复制的 cURL 命令 |
| JSON 响应树形展示 | ✅ 完成 | 可折叠的 JSON 树形视图 |
| 性能时间线 | ✅ 完成 | DNS/TCP/TLS/TTFB 时间瀑布图 |

### Phase 2: 高级调试能力

| 功能 | 状态 | 说明 |
|------|------|------|
| 高级搜索语法 | ✅ 完成 | method:POST status:4xx duration:>500ms |
| HAR 导出 | ✅ 完成 | HTTP Archive 1.2 格式导出 |
| 断点调试 | ⚠️ 部分实现 | 后端 API 完成，SDK 端 TODO 未实现，WebUI 缺少管理界面 |
| 故障注入 | ⚠️ 部分实现 | 后端 API 完成，SDK 端 TODO 未实现，WebUI 缺少管理界面 |
| 请求 Diff 对比 | ✅ 完成 | 并排对比两个请求差异 |

### Phase 3: 用户体验增强

| 功能 | 状态 | 说明 |
|------|------|------|
| 数据自动清理 | ✅ 完成 | 默认3天过期，自动清理 |
| 图片响应预览 | ✅ 完成 | 检测图片类型并内联渲染 |
| 深色/浅色主题 | ✅ 完成 | CSS 变量 + 主题切换 + 跟随系统 |
| 键盘快捷键 | ✅ 完成 | 全局快捷键支持 + 帮助面板 |
| 请求收藏/标记 | ✅ 完成 | 收藏重要请求，防止被清理 |
| 批量操作 | ✅ 完成 | 多选 + 批量删除/收藏/导出 |

### Phase 3.5: 可靠性与协议增强

| 功能 | 状态 | 说明 |
|------|------|------|
| Protobuf 解析 | ✅ 完成 | Wire Format 解析 + 嵌套消息 + Hex 视图 |
| 事件持久化队列 | ✅ 完成 | SQLite 本地队列，断线不丢数据 |
| 断线重连恢复 | ✅ 完成 | 自动恢复发送持久化事件 |
| PostgreSQL 支持 | ✅ 完成 | 默认数据库，支持高并发 |

### Phase 3.6: 工程化增强

| 功能 | 状态 | 说明 |
|------|------|------|
| React WebUI | ✅ 完成 | React + TypeScript + Vite + Tailwind CSS |
| API 文档页 | ✅ 完成 | 内置交互式 API 文档 (/api-docs) |
| 健康检查页 | ✅ 完成 | 服务状态监控 (/health) |
| 一键部署脚本 | ✅ 完成 | deploy.sh 自动安装依赖、配置数据库 |
| Swift 6 兼容 | ✅ 完成 | Actor-based 并发、@unchecked Sendable |
| SPA 路由支持 | ✅ 完成 | 服务端 Fallback 支持前端路由刷新 |

### Phase 3.7: 配置与日志增强

| 功能 | 状态 | 说明 |
|------|------|------|
| 运行时配置管理 | ✅ 完成 | DebugProbeSettings 支持动态修改 Hub 地址 |
| 内部日志开关 | ✅ 完成 | DebugLog 分级日志，默认关闭调试日志 |
| 配置 UI 界面 | ✅ 完成 | DebugProbeSettingsController (iOS) |
| 配置持久化 | ✅ 完成 | UserDefaults + Info.plist 多层配置 |
| HTTP 自动拦截 | ✅ 完成 | URLSessionConfigurationSwizzle 零侵入 |
| WebSocket 监控 | ✅ 完成 | 连接级 Swizzle + 消息级 Hook |

### Phase 3.8: WebSocket 增强 (v1.2.0)

| 功能 | 状态 | 说明 |
|------|------|------|
| WS 消息完整内容查看 | ✅ 完成 | 点击展开加载完整 payload |
| 多格式显示切换 | ✅ 完成 | AUTO / TEXT / JSON / HEX / BASE64 |
| Hex Dump 专业格式 | ✅ 完成 | 带偏移量和 ASCII 列 |
| 视觉风格简化 | ✅ 完成 | 移除发光/渐变，纯粹调试风格 |

---

## 🚧 进行中 / 待开发功能

### Phase 4: 企业级特性（预计 4-6 周）

#### 4.1 会话录制与回放

**目标**：录制完整的调试会话，支持保存、分享和回放。

**功能设计**：

```typescript
interface DebugSession {
  id: string
  name: string
  deviceId: string
  deviceInfo: DeviceInfo
  startTime: Date
  endTime: Date
  events: DebugEvent[]        // 所有事件（HTTP、WS、Log）
  mockRules: MockRule[]       // 会话期间的 Mock 规则
  breakpoints: BreakpointRule[]
  annotations: Annotation[]   // 用户标注
  metadata: Record<string, unknown>
}
```

**用户故事**：
1. 开发者 A 在调试 Bug 时发现问题
2. 点击「保存会话」，命名为「登录接口 500 错误」
3. 会话被保存到服务器，生成分享链接
4. 开发者 B 打开链接，回放整个会话过程

**优先级**: P2 | **预估工时**: 2 周

---

#### 4.2 多设备并排对比

**目标**：同时监控多台设备，对比相同操作在不同设备上的表现。

**UI 设计**：

```
┌─────────────────────────────────────────────────────────────────┐
│ 多设备对比模式                                    [退出对比]   │
├───────────────────────┬─────────────────────┬───────────────────┤
│ iPhone 15 Pro (iOS 17)│ iPhone 12 (iOS 16)  │ iPad Pro (iOS 17) │
├───────────────────────┼─────────────────────┼───────────────────┤
│ GET /api/home  200 OK │ GET /api/home 200 OK│ GET /api/home 200 │
│ 150ms                 │ 320ms               │ 180ms             │
├───────────────────────┼─────────────────────┼───────────────────┤
│ GET /api/feed  200 OK │ GET /api/feed 500 ❌│ GET /api/feed 200 │
│ 280ms                 │ Timeout             │ 250ms             │
└───────────────────────┴─────────────────────┴───────────────────┘
```

**优先级**: P2 | **预估工时**: 1.5 周

---

#### 4.3 数据脱敏规则

**目标**：自动识别和脱敏敏感信息，保护用户隐私。

**脱敏规则类型**：

```swift
public struct SensitiveDataRule: Codable {
    public let id: String
    public let name: String
    public let type: SensitiveDataType
    public let pattern: String?        // 正则表达式
    public let fields: [String]?       // JSON 字段路径
    public let replacement: String     // 替换文本
    public let enabled: Bool
}

public enum SensitiveDataType: String, Codable {
    case creditCard     // 信用卡号
    case phone          // 手机号
    case email          // 邮箱
    case idCard         // 身份证
    case password       // 密码
    case accessToken    // 访问令牌
    case custom         // 自定义规则
}
```

**内置规则示例**：

| 规则名称 | 匹配模式 | 替换结果 |
|---------|---------|---------|
| 信用卡 | `\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}` | `****-****-****-1234` |
| 手机号 | `1[3-9]\d{9}` | `138****5678` |
| 邮箱 | `[\w.]+@[\w.]+` | `u***@***.com` |
| Bearer Token | `Bearer\s+[\w-]+` | `Bearer [REDACTED]` |

**优先级**: P2 | **预估工时**: 1 周

---

#### 4.4 Prometheus Metrics

**目标**：暴露 Debug Hub 的监控指标，接入现有监控体系。

**指标列表**：

```prometheus
# 连接指标
debug_hub_devices_connected{} 5
debug_hub_websocket_connections{type="debug_bridge"} 5
debug_hub_websocket_connections{type="realtime_stream"} 12

# 事件吞吐量
debug_hub_events_received_total{type="http"} 12345
debug_hub_events_received_total{type="ws"} 6789
debug_hub_events_received_total{type="log"} 45678

# 存储指标
debug_hub_database_size_bytes{} 1073741824
debug_hub_events_stored{type="http"} 100000

# 性能指标
debug_hub_event_processing_duration_seconds{quantile="0.5"} 0.001
debug_hub_event_processing_duration_seconds{quantile="0.9"} 0.005
```

**优先级**: P2 | **预估工时**: 3 天

---

#### 4.5 访问审计日志

**目标**：记录所有管理操作，满足合规要求。

**审计事件类型**：

```swift
enum AuditEventType: String, Codable {
    // 数据访问
    case viewHTTPEvent
    case viewLogEvent
    case exportData
    
    // 规则变更
    case createMockRule
    case updateMockRule
    case deleteMockRule
    
    // 控制操作
    case toggleCapture
    case clearDeviceData
    case replayRequest
}
```

**优先级**: P3 | **预估工时**: 1 周

---

#### 4.6 设备 SQLite 数据库查看

**目标**：在 WebUI 中远程查看和操作 iOS 设备上的 SQLite 数据库文件。

**功能设计**：

```typescript
interface DatabaseInfo {
  name: string           // 数据库名称
  path: string           // 设备上的路径
  size: number           // 文件大小
  tables: TableInfo[]    // 表信息
}

interface TableInfo {
  name: string
  rowCount: number
  columns: ColumnInfo[]
}

interface QueryResult {
  columns: string[]
  rows: any[][]
  rowCount: number
  executionTime: number
}
```

**用户故事**：
1. 在设备详情页选择「数据库」Tab
2. 列出设备上的所有 SQLite 数据库文件（App 沙盒内）
3. 选择数据库后显示表列表
4. 点击表可以浏览数据，支持分页
5. 支持执行只读 SQL 查询
6. 支持导出表数据为 CSV/JSON

**安全限制**：
- 仅支持只读查询（SELECT）
- 禁止修改数据（INSERT/UPDATE/DELETE）
- 禁止结构变更（CREATE/ALTER/DROP）
- 查询超时限制（5 秒）
- 结果集大小限制（1000 行）

**实现方案**：

```
WebUI                    DebugHub                    iOS Probe
  │                         │                            │
  │ GET /db/list           │                            │
  │────────────────────────▶│                            │
  │                         │ WS: listDatabases          │
  │                         │───────────────────────────▶│
  │                         │                            │ 扫描沙盒目录
  │                         │◀───────────────────────────│
  │◀────────────────────────│                            │
  │                         │                            │
  │ POST /db/query          │                            │
  │────────────────────────▶│                            │
  │                         │ WS: executeQuery           │
  │                         │───────────────────────────▶│
  │                         │                            │ sqlite3_exec
  │                         │◀───────────────────────────│
  │◀────────────────────────│                            │
```

**iOS Probe 新增**：

```swift
// DatabaseExplorer.swift
public class DatabaseExplorer {
    /// 列出所有数据库文件
    public func listDatabases() -> [DatabaseInfo]
    
    /// 获取表列表
    public func getTables(database: String) -> [TableInfo]
    
    /// 执行只读查询
    public func executeQuery(database: String, sql: String) -> QueryResult
}
```

**优先级**: P2 | **预估工时**: 1.5 周

---

### Phase 5: 高可用与扩展性（预计 3-4 周）

#### 5.1 高可用部署方案

**目标**：支持多实例部署，提供高可用性。

**当前进度**：
- ✅ PostgreSQL 默认数据库已完成
- ✅ 一键部署脚本已完成
- ✅ Swift 6 并发安全已完成
- ⏳ Redis 会话管理待实现
- ⏳ 多实例负载均衡待实现

**架构设计**：

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (Nginx/HAProxy)│
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Hub #1   │  │ Hub #2   │  │ Hub #3   │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │             │             │
             └──────────┬──┴─────────────┘
                        │
              ┌─────────────────────┐
              │   Redis Cluster     │
              │ (Session + Pub/Sub) │
              └─────────────────────┘
                        │
              ┌─────────────────────┐
              │   PostgreSQL ✅     │
              │   (默认数据库)       │
              └─────────────────────┘
```

**剩余工作**：
- 设备粘性会话：Redis 存储设备到实例的映射
- 跨实例通信：Redis Pub/Sub 广播实时事件

**优先级**: P3 | **预估工时**: 2 周

---

#### 5.2 插件系统

**目标**：支持第三方扩展，增强平台能力。

**插件类型**：
- **数据处理插件**：自定义数据解析、格式化
- **导出插件**：支持更多导出格式
- **UI 插件**：自定义面板和视图
- **规则插件**：自定义 Mock/断点规则

**优先级**: P3 | **预估工时**: 2 周

---

## 📊 功能优先级总览

| 优先级 | 功能 | 预估工时 | 依赖 |
|-------|------|---------|------|
| **🔴 P0** | **断点恢复消息格式统一** | **0.5 天** | **协议层修复** |
| **🔴 P0** | **断点规则同步实现** | **0.5 天** | **SDK 修复** |
| **🔴 P0** | **Chaos 规则同步实现** | **0.5 天** | **SDK 修复** |
| **🔴 P0** | **断点恢复功能实现** | **0.5 天** | **SDK 修复** |
| **🔴 P0** | **网络层集成断点/Chaos** | **1 天** | **SDK 修复** |
| **🟡 P1** | **设备重连规则同步** | **0.5 天** | **Hub 修复** |
| **🟡 P1** | **WebUI 断点规则管理** | **2 天** | **前端开发** |
| **🟡 P1** | **WebUI Chaos 规则管理** | **2 天** | **前端开发** |
| **🟢 P2** | **breakpointHit 消息处理** | **0.5 天** | **Hub 修复** |
| ~~P0~~ | ~~高级搜索语法~~ | ~~1 周~~ | ✅ 完成 |
| ~~P0~~ | ~~HAR 导出~~ | ~~3 天~~ | ✅ 完成 |
| ~~P1~~ | ~~断点调试~~ | ~~2 周~~ | ⚠️ 部分完成 |
| ~~P1~~ | ~~故障注入~~ | ~~1 周~~ | ⚠️ 部分完成 |
| ~~P1~~ | ~~请求 Diff~~ | ~~1 周~~ | ✅ 完成 |
| ~~P1~~ | ~~数据自动清理~~ | ~~2 天~~ | ✅ 完成 |
| ~~P1~~ | ~~图片预览~~ | ~~1 天~~ | ✅ 完成 |
| ~~P1~~ | ~~主题切换~~ | ~~1 天~~ | ✅ 完成 |
| ~~P1~~ | ~~键盘快捷键~~ | ~~1 天~~ | ✅ 完成 |
| ~~P1~~ | ~~收藏/标记~~ | ~~1 天~~ | ✅ 完成 |
| ~~P1~~ | ~~批量操作~~ | ~~1 天~~ | ✅ 完成 |
| ~~P1~~ | ~~Protobuf 解析~~ | ~~2 天~~ | ✅ 完成 |
| ~~P1~~ | ~~事件持久化~~ | ~~2 天~~ | ✅ 完成 |
| ~~P1~~ | ~~PostgreSQL 默认~~ | ~~1 天~~ | ✅ 完成 |
| ~~P1~~ | ~~React WebUI~~ | ~~3 天~~ | ✅ 完成 |
| ~~P1~~ | ~~一键部署脚本~~ | ~~1 天~~ | ✅ 完成 |
| ~~P1~~ | ~~Swift 6 兼容~~ | ~~2 天~~ | ✅ 完成 |
| ~~P1~~ | ~~运行时配置~~ | ~~1 天~~ | ✅ 完成 |
| ~~P1~~ | ~~内部日志开关~~ | ~~0.5 天~~ | ✅ 完成 |
| P2 | 设备数据库查看 | 1.5 周 | iOS Probe 扩展 |
| P2 | 会话录制 | 2 周 | 存储方案设计 |
| P2 | 多设备对比 | 1.5 周 | 无 |
| P2 | 数据脱敏 | 1 周 | 无 |
| P2 | Prometheus | 3 天 | 无 |
| P3 | 审计日志 | 1 周 | 无 |
| P3 | 高可用部署 | 2 周 | PostgreSQL 已完成 |
| P3 | 插件系统 | 2 周 | 架构设计 |
| P3 | ruleStore 清理 | 0.5 天 | 代码清理 |

---

## 📝 数据库配置

Debug Hub 支持两种数据库模式，通过环境变量 `DATABASE_MODE` 切换。

### PostgreSQL（默认）

适合多设备并发、需要高可用的场景：

```bash
# 使用部署脚本自动配置（推荐）
./deploy.sh

# 或手动配置
DATABASE_MODE=postgres \
POSTGRES_HOST=localhost \
POSTGRES_PORT=5432 \
POSTGRES_USER=debug_hub \
POSTGRES_PASSWORD=your_password \
POSTGRES_DB=debug_hub \
swift run
```

### SQLite（开发环境）

零配置，适合本地开发和测试：

```bash
# 切换到 SQLite
DATABASE_MODE=sqlite swift run

# 或使用部署脚本
./deploy.sh --sqlite

# 自定义数据库路径
SQLITE_PATH=/path/to/debug_hub.sqlite DATABASE_MODE=sqlite swift run
```

### 环境变量参考

| 变量 | 默认值 | 说明 |
|-----|-------|------|
| `DATABASE_MODE` | `postgres` | 数据库模式：`sqlite` 或 `postgres` |
| `SQLITE_PATH` | `debug_hub.sqlite` | SQLite 文件路径 |
| `POSTGRES_HOST` | `localhost` | PostgreSQL 主机 |
| `POSTGRES_PORT` | `5432` | PostgreSQL 端口 |
| `POSTGRES_USER` | `debug_hub` | PostgreSQL 用户名 |
| `POSTGRES_PASSWORD` | `debug_hub_password` | PostgreSQL 密码 |
| `POSTGRES_DB` | `debug_hub` | PostgreSQL 数据库名 |
| `POSTGRES_SSL` | `false` | 是否启用 SSL |
| `POSTGRES_MAX_CONNECTIONS` | `4` | 每个 EventLoop 最大连接数 |

---

## 📝 Protobuf 解析

Debug Platform 支持自动解析 Protobuf 格式的请求/响应体。

### 支持的 Content-Type

- `application/x-protobuf`
- `application/protobuf`
- `application/grpc`
- `application/grpc+proto`

### 解析模式

1. **Parsed 模式**：自动解析 Wire Format，显示字段编号、类型和值
2. **Hex 模式**：显示原始十六进制数据

### 数据类型解析

| Wire Type | 解析结果 |
|-----------|---------|
| Varint (0) | uint, sint (zigzag), bool, 时间戳猜测 |
| Fixed64 (1) | uint64, double |
| Length-Delimited (2) | 字符串、嵌套消息、原始字节 |
| Fixed32 (5) | uint32, float |

### 嵌套消息

自动检测并展开嵌套的 Protobuf 消息结构，支持无限层级。

---

## 📝 事件持久化配置

iOS Probe 支持将事件持久化到本地 SQLite 数据库，确保断线期间不丢失数据。

### 配置选项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `enablePersistence` | `true` | 是否启用持久化 |
| `maxPersistenceQueueSize` | 100,000 | 最大队列大小 |
| `persistenceRetentionDays` | 3 | 事件保留天数 |

### 使用示例

```swift
var config = DebugProbe.Configuration(
    hubURL: URL(string: "ws://127.0.0.1:8081/debug-bridge")!,
    token: "your-token"
)
config.enablePersistence = true
config.maxPersistenceQueueSize = 50_000
config.persistenceRetentionDays = 3

DebugProbe.shared.start(configuration: config)
```

### 工作原理

1. **正常连接**：事件通过 WebSocket 实时发送到 Debug Hub
2. **断线期间**：事件自动存入本地 SQLite 队列
3. **重新连接**：自动分批恢复发送持久化的事件
4. **队列溢出**：超过最大大小时，自动删除最旧的 10% 事件
5. **过期清理**：超过保留天数的事件自动清理

### 存储位置

事件存储在 App 的 `Caches/DebugPlatform/debug_events_queue.sqlite`

---

## 📝 键盘快捷键参考

| 快捷键 | 功能 |
|--------|------|
| `⌘/Ctrl + K` | 搜索 |
| `⌘/Ctrl + R` | 刷新列表 |
| `⌘/Ctrl + L` | 清空列表 |
| `⌘/Ctrl + E` | 导出数据 |
| `⌘/Ctrl + A` | 全选 |
| `⌘/Ctrl + T` | 切换主题 |
| `⌘/Ctrl + /` | 显示快捷键帮助 |
| `F` | 收藏/取消收藏 |
| `Delete/Backspace` | 删除选中 |
| `↑/↓` | 上下选择 |
| `Esc` | 取消选择/关闭面板 |

---

## 📝 数据清理配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `retentionDays` | 3 | 数据保留天数 |
| `cleanupIntervalSeconds` | 3600 | 清理间隔（秒） |

**API 端点**：
- `GET /api/cleanup/config` - 获取配置
- `PUT /api/cleanup/config` - 更新配置
- `POST /api/cleanup/run` - 手动触发清理

**注意**：被收藏的请求不会被自动清理。

---

## 🔧 技术选型建议

### 前端库

| 功能 | 推荐库 | 说明 |
|------|-------|------|
| JSON Diff | `jsondiffpatch` | 结构化差异 |
| Text Diff | `diff` | 通用文本差异 |
| Monaco Editor | `@monaco-editor/react` | 代码编辑器 |
| 虚拟列表 | `@tanstack/react-virtual` | 大列表性能 |
| 图表 | `recharts` | 性能图表 |

### 后端库

| 功能 | 推荐库 | 说明 |
|------|-------|------|
| Prometheus | `swift-prometheus` | 指标暴露 |
| Redis | `RediStack` | Vapor Redis 客户端 |
| PostgreSQL | `fluent-postgres-driver` | 生产数据库 |

