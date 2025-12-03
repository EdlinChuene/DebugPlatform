你现在扮演一名同时精通 iOS、macOS 和 Observability（可观测性）体系的资深架构师，熟悉 Charles / Proxyman / mitmproxy 等抓包工具，也熟悉 CocoaLumberjack、os_log 以及分布式 Trace/Log/Metric 系统的设计。

## 【总目标】

设计并实现一套「生产级」的内部调试系统，专门服务于 **自家 iOS App**，而不是通用抓包工具。

这套系统包括：

1）嵌入 iOS App 内的 **调试探针（Probe）**
2）部署在 Mac mini 上的 **Debug Hub + Web 控制台**

它要实现：

- HTTP / HTTPS / WebSocket 的抓包、Mock、修改请求/响应。
- CocoaLumberjack 与 os_log 日志的采集、查看、分类、过滤、检索、导出。
- 实时流（实时查看当前设备的网络与日志）。
- 多设备聚合与统一 Web 控制台。
- 架构上对标「生产级调试基础设施」，参考 Proxyman，但不走系统级代理/MITM，而走**业务层埋点 + Debug Bridge** 的路线。

**核心架构原则（请严格围绕这些原则设计与实现）：**

1. 在 iOS 端，我们「仪表化（instrument）」网络层和日志系统，而不是模拟一个系统级代理。  
2. 数据流方向是：**iOS 设备主动连接 Mac mini 的 Debug Hub**，而不是 Mac mini 扫描设备。  
3. 抓包和日志都是结构化事件流（Event Stream）：  
   - iOS 端负责产生事件。  
   - Mac mini 负责接收、存储、查询和 Web UI 展示。  
4. 所有能力只在 Debug / 内部测试版本中开启，支持开关控制，不能影响生产环境行为和稳定性。

------------------------------------------------
## 一、总体架构（v2 架构）与模块划分

------------------------------------------------

请先给出整体架构设计，并用文字详细描述数据链路。

### 1.1 架构角色

1. **iOS App 内部（Debug Probe）**

- 模块：
  - `NetworkInstrumentation`
    - HTTP：基于统一的 `HTTPClient` 封装 + `URLSessionConfiguration` + `URLProtocol` 做拦截。
    - WebSocket：基于统一 `WebSocketClient` 抽象，对 `URLSessionWebSocketTask` 和第三方实现进行适配。
  - `LogInstrumentation`
    - CocoaLumberjack：通过自定义 `DDLogger` 把 `DDLogMessage` 转化为结构化 `LogEvent`。
    - os_log：通过自定义的 `AppLogger` 包装 os_log API，实现同时写入 os_log 与 Debug Probe。
  - `DebugEventBus`
    - 本地的事件分发中心，统一处理 Network Event 和 Log Event。
  - `DebugBridgeClient`
    - 从 iOS 主动连接到 Mac mini 的 Debug Hub（例如通过 WebSocket：`wss://mac-mini:port/debug-bridge`）。
    - 将事件流批量、节流地推送到服务端，并接收控制命令（开关、规则下发、导出指令等）。
  - `MockRuleEngine`
    - 在网络层处理 HTTP/WS 的 Mock 与请求/响应修改。
  - （可选）`EmbeddedHTTPServer`
    - 仅在需要时，提供本机 HTTP API 方便直接用浏览器连设备调试（不是主路径）。

- 所有网络事件和日志事件都被抽象为统一的 `DebugEvent`，通过 `DebugEventBus` 流向 `DebugBridgeClient`。

2. **Mac mini（Debug Hub）**

- 模块：
  - `DebugHubServer`
    - 提供一个 WebSocket 端点，供 iOS 设备主动连接并注册：`/debug-bridge`。
    - 对每个连接维护一个设备会话（DeviceSession）。
  - `DeviceRegistry`
    - 记录所有在线设备信息、连接状态、app 信息等。
  - `EventIngestor`
    - 接收来自各个设备的 `DebugEvent`（网络 + 日志）。
    - 写入持久化存储（例如 SQLite/PostgreSQL/日志文件）。
  - `QueryEngine`
    - 提供 REST API 供 Web UI 查询：
      - HTTP/WS 抓包记录。
      - 日志记录（按时间、级别、tag 等检索）。
  - `RuleCenter`
    - Web UI 配置的 Mock 规则在这里存储、管理，并通过 Debug Bridge 下发到设备。
  - `RealtimeStream`
    - 把某个设备的增量事件实时推送给 Web UI（使用 WebSocket/Server-Sent Events 等）。
  - `WebServer`
    - 提供 REST API + WebSocket 给 Web UI。
    - 提供静态资源（前端打包产物）。

3. **Web UI（浏览器端）**

- 主要功能：
  - 设备总览页面：显示在线设备，选择一个设备进入详情。
  - 网络视图：HTTP/WS 抓包列表 + 详情（实时流）。
  - 日志视图：按设备查看 CocoaLumberjack/os_log 日志流。
  - 关联视图：按同一 requestId/traceId 把请求与日志串起来。
  - Mock 规则管理：增删改查规则，下发到指定设备。
  - 导出：网络 & 日志数据导出为文件（JSON/NDJSON/CSV 等）。

### 1.2 数据流描述（请用文字描述清楚）

- HTTP/HTTPS 请求链路：
  - App 发出请求 → 被 `NetworkInstrumentation` 拦截 → 生成 `HTTPEvent` → 写入本地缓冲 & 发送到 `DebugEventBus` → `DebugBridgeClient` 批量推送到 Mac mini → `EventIngestor` 入库 → Web UI 查询或实时订阅。
- WebSocket 链路：
  - App 通过 `WebSocketClient` 发送/接收帧 → 拦截 send/receive → 生成 `WSEvent`（会话 + 帧） → 同上。
- 日志链路：
  - CocoaLumberjack：`DDLog` 被调用 → 自定义 `DDLogger` 收到 `DDLogMessage` → 转为 `LogEvent` → 走 `DebugEventBus`。  
  - os_log：业务通过 `AppLogger` 包装调用 os_log → 同时写入 os_log 和 DebugEventBus → `LogEvent` 流向 DebugBridgeClient。
- 控制链路：
  - Web UI → 调用 Debug Hub API（REST/WebSocket） → Hub 通过 DebugBridgeClient 向对应设备发送命令（开关抓包、修改规则、调整日志级别、触发导出）。

------------------------------------------------
## 二、iOS 端实现细节（网络 + 日志）
------------------------------------------------

### 2.1 数据模型设计

请使用 Swift 定义以下核心模型（可再细化）：

1. 顶层统一事件：

```swift
enum DebugEvent {
    case http(HTTPEvent)
    case webSocket(WSEvent)
    case log(LogEvent)
    case stats(StatsEvent) // 可选，用于汇报统计数据
}
```

2. HTTP 事件：

```swift
struct HTTPEvent {
    struct Request {
        let id: String
        let method: String
        let url: String
        let queryItems: [String: String]
        let headers: [String: String]
        let body: Data?
        let startTime: Date
        let traceId: String?    // 可选，用于串联日志和请求
    }

    struct Response {
        let statusCode: Int
        let headers: [String: String]
        let body: Data?
        let endTime: Date
        let duration: TimeInterval
        let errorDescription: String?
    }

    let request: Request
    let response: Response?
    let isMocked: Bool
    let mockRuleId: String?
}
```
3.	WebSocket 事件（包括会话和帧）：
```swift
struct WSEvent {
    struct Session {
        let id: String
        let url: String
        let requestHeaders: [String: String]
        let subprotocols: [String]
        let connectTime: Date
        let disconnectTime: Date?
        let closeCode: Int?
        let closeReason: String?
    }

    struct Frame {
        enum Direction { case send, receive }
        enum Opcode { case text, binary, ping, pong, close }

        let id: String
        let sessionId: String
        let direction: Direction
        let opcode: Opcode
        let payload: Data
        let payloadPreview: String?
        let timestamp: Date
        let isMocked: Bool
        let mockRuleId: String?
    }

    // 事件可以是「会话级」或「帧级」
    enum Kind {
        case sessionCreated(Session)
        case sessionClosed(Session)
        case frame(Frame)
    }

    let kind: Kind
}
```
4. 日志事件（CocoaLumberjack + os_log 统一）：
```swift
struct LogEvent {
    enum Source {
        case cocoaLumberjack
        case osLog
    }

    enum Level: String {
        case debug, info, warning, error, fault
    }

    let id: String
    let source: Source

    let timestamp: Date
    let level: Level

    let subsystem: String?   // 对应 os_log 的 subsystem
    let category: String?    // 对应 os_log 的 category
    let loggerName: String?  // 对应 CocoaLumberjack 的 logger 名称/flag context
    let thread: String?      // 线程信息
    let file: String?
    let function: String?
    let line: Int?

    let message: String
    let tags: [String]       // 自定义标签，如 feature 名、模块名
    let traceId: String?     // 用于和 HTTPEvent 关联
}
```
5. Mock 规则模型：
```swift
struct MockRule {
    enum TargetType {
        case httpRequest
        case httpResponse
        case wsOutgoing
        case wsIncoming
    }

    struct Condition {
        let urlPattern: String?      // 支持前缀/正则匹配
        let method: String?          // HTTP 方法
        let statusCode: Int?         // 响应码过滤
        let headerContains: [String: String]?
        let bodyContains: String?    // 文本匹配
        let wsPayloadContains: String?
        let enabled: Bool
    }

    struct Action {
        // 对 HTTP 请求：修改 header/body
        let modifyRequestHeaders: [String: String]?
        let modifyRequestBodyJSON: [String: Any]? // 伪代码，实际用 Codable/字典
        // 对 HTTP 响应：直接返回
        let mockResponseStatusCode: Int?
        let mockResponseHeaders: [String: String]?
        let mockResponseBody: Data?

        // 对 WebSocket 帧：修改/替换 payload
        let mockWebSocketPayload: Data?
    }

    let id: String
    let name: String
    let targetType: TargetType
    let condition: Condition
    let action: Action
}
```
6. 设备信息：
```swift
struct DeviceInfo {
    let deviceId: String
    let deviceName: String
    let systemName: String
    let systemVersion: String
    let appName: String
    let appVersion: String
    let buildNumber: String
    let platform: String  // "iOS"
    let captureEnabled: Bool
    let logCaptureEnabled: Bool
}
```
### 2.2 NetworkInstrumentation（HTTP）
- 采用统一的 HTTPClient 封装所有网络请求逻辑，内部使用 URLSession，并通过 URLSessionConfiguration 挂载一份 CaptureURLProtocol。
- CaptureURLProtocol 实现：
	- 拦截请求，构造 HTTPEvent.Request，生成唯一 ID 和 traceId。
	-	调用 MockRuleEngine：
		-	如需修改请求，调整 URL/Headers/Body。
		-	如需直接 Mock 响应，则构造 HTTPEvent.Response，不走真实网络。
	-	对于真实请求：
		-	使用内部 URLSession 发起请求。
		-	收到响应和数据后，构造 HTTPEvent.Response，汇总耗时、错误。
	-	将完整 HTTPEvent 发送到 DebugEventBus。
-	提供一个示例 HTTPClient 使用方式，展示如何在 App 里接入。

### 2.3 NetworkInstrumentation（WebSocket）
- 设计一个统一协议：
```swift
protocol WebSocketClient {
    func connect()
    func send(text: String)
    func send(data: Data)
    func close()
    var onText: ((String) -> Void)? { get set }
    var onData: ((Data) -> Void)? { get set }
    var onClose: ((Int?, String?) -> Void)? { get set }
    // ...
}
```
-	实现 InstrumentedWebSocketClient：
	- 包装底层实现（URLSessionWebSocketTask 或第三方库）。
-	在 send 前：
	-	构造 WSEvent.Frame（direction=send），先让 MockRuleEngine 决定是否修改 payload，再实际发送。
-	在收到消息时：
	-	收到文本/二进制 → 构造 Frame（direction=receive），先过 MockRuleEngine 检查是否有 Mock 替换，再回调给业务。
- 在 connect / close 时：
	- 分别产生会话级的 WSEvent.Kind.sessionCreated/sessionClosed。
-	提供一个对 URLSessionWebSocketTask 的适配示例代码，展示如何在 App 中使用统一 WebSocketClient 以获得抓包支持。

### 2.4 LogInstrumentation（CocoaLumberjack + os_log）
1. **CocoaLumberjack 集成**
- 注册自定义 DDLogger：
```swift
final class DebugProbeDDLogger: DDAbstractLogger {

    override func log(message logMessage: DDLogMessage) {
        // 将 DDLogMessage 映射为 LogEvent
        let event = LogEvent(
            id: UUID().uuidString,
            source: .cocoaLumberjack,
            timestamp: logMessage.timestamp,
            level: mapDDLogFlagToLevel(logMessage.flag),
            subsystem: nil,
            category: logMessage.context == 0 ? nil : String(logMessage.context),
            loggerName: logMessage.loggerName,
            thread: logMessage.threadID,
            file: logMessage.fileName,
            function: logMessage.function,
            line: Int(logMessage.line),
            message: logMessage.message,
            tags: [],          // 可从 userInfo 等处扩展
            traceId: nil       // 可从 thread-local 或 MDC 中取值
        )

        DebugEventBus.shared.enqueue(.log(event))
    }
}
```
- 提供 mapDDLogFlagToLevel 的实现，将 .debug / .info / .warning / .error 映射到 LogEvent.Level。
2. **os_log 集成**
- 不去解析系统 unified log store，而是设计一个 AppLogger 包装 os_log：
```swift
struct AppLogger {
    let subsystem: String
    let category: String

    private let oslog: OSLog

    init(subsystem: String, category: String) {
        self.subsystem = subsystem
        self.category = category
        self.oslog = OSLog(subsystem: subsystem, category: category)
    }

    func log(level: LogEvent.Level, _ message: String, traceId: String? = nil) {
        // 1. 写入 os_log
        os_log("%{public}@", log: oslog, type: mapLevelToOSLogType(level), message)

        // 2. 同步发送到 DebugEventBus
        let event = LogEvent(
            id: UUID().uuidString,
            source: .osLog,
            timestamp: Date(),
            level: level,
            subsystem: subsystem,
            category: category,
            loggerName: nil,
            thread: Thread.isMainThread ? "main" : Thread.current.description,
            file: nil,
            function: nil,
            line: nil,
            message: message,
            tags: [],
            traceId: traceId
        )
        DebugEventBus.shared.enqueue(.log(event))
    }
}
```
- 提供一些使用示例，比如：
```swift
let netLogger = AppLogger(subsystem: "com.company.app", category: "network")
netLogger.log(level: .debug, "Request started...", traceId: traceId)
```
### 2.5 DebugEventBus & 本地缓冲
-	DebugEventBus 提供一个线程安全的队列：
	-	本地可保留最近 N 条事件（防止 DebugBridge 暂时断开时丢数据）。
	-	对 DebugBridgeClient 暴露「批量获取待发送事件」的接口。
-	要求：
	-	避免在主线程做重 IO。
	-	考虑 backpressure：当事件量过大、网络不通时，采用丢弃旧事件或降采样策略。

### 2.6 DebugBridgeClient（iOS → Mac mini）
-	通过 WebSocket 主动连接到 Mac mini 的 Debug Hub：
	-	wss://<macmini-host>:<port>/debug-bridge
-	支持：
	-	设备注册消息（DeviceInfo 等）。
	-	批量事件上报（[DebugEventDTO]）。
	-	服务端到客户端的控制消息：
		-	开关网络捕获、日志捕获；
		-	更新 Mock 规则；
		-	请求导出某个时间段的数据等。
-	实现一个简单的协议（例如 JSON 序列化），并给出 Swift 客户端代码示例。

------------------------------------------------
## 三、Mac mini 端 Debug Hub 实现
------------------------------------------------
### 3.1 DebugHubServer & DeviceRegistry
-	使用 Swift（基于 SwiftNIO / Vapor 等）实现一个后端服务：
1.	WebSocket 端点：/debug-bridge
-	处理来自 iOS 设备的连接。
-	首条消息包含 DeviceInfo 与认证 token。
-	为每个连接维护一个 DeviceSession。
2.	DeviceRegistry
-	记录全部在线设备：
	-	deviceId、deviceName、appName、appVersion、platform、lastSeen、连接状态等。
-	提供 REST API：
	-	GET /api/devices：列出在线设备。
	-	GET /api/devices/{deviceId}：获取设备详细信息及基础统计。

### 3.2 EventIngestor & 持久化
-	每个 DeviceSession 收到的 DebugEvent：
	-	解析事件类型：HTTP / WS / Log / Stats。
	-	写入持久化存储：
		-	可用 SQLite 或 PostgreSQL，表结构大致：
			-	http_events（分 request/response 字段）。
			-	ws_sessions、ws_frames。
			-	log_events。
	-	要求：
		-	能按 deviceId + 时间范围快速查询；
		-	能按 URL、状态码、日志级别等条件过滤；
		-	提供简单的索引设计建议。

### 3.3 QueryEngine & REST API

提供 REST API 给 Web UI 使用，包括但不限于：
1. HTTP 抓包查询
-	GET /api/devices/{deviceId}/http
	-	参数：
		-	page, pageSize
		-	method, statusCode, urlContains, isMocked, timeFrom, timeTo
	-	返回一个摘要列表（每条只包含必要字段）。
-	GET /api/devices/{deviceId}/http/{eventId}
	-	返回单条 HTTP 事件的完整详情（包括头和 body，可 base64 编码）。

2. WebSocket 抓包
-	GET /api/devices/{deviceId}/ws-sessions
	-	查询 WebSocket 会话列表（按时间，URL，是否正常关闭等过滤）。
-	GET /api/devices/{deviceId}/ws-sessions/{sessionId}/frames
	-	按时间/方向过滤帧列表。

3. 日志查询（CocoaLumberjack + os_log 合流）
-	GET /api/devices/{deviceId}/logs
	-	参数：
		-	level（多选）、subsystem, category, loggerName, text（全局模糊匹配），timeFrom, timeTo
	-	支持分页。
	-	返回结构化 LogEvent。

4. 导出接口
-	GET /api/devices/{deviceId}/export/logs
	-	支持参数：
		-	format（json, ndjson, csv）
		-	timeFrom, timeTo, level, subsystem, category, text
	-	返回文件下载（或流）。
-	GET /api/devices/{deviceId}/export/http
	-	类似参数，导出 HTTP 事件。

5. 控制接口
-	POST /api/devices/{deviceId}/control/toggle-capture
	-	Body：{ "network": true/false, "log": true/false }
-	POST /api/devices/{deviceId}/control/update-mock-rules
	-	Body：全量或增量规则配置。

以上控制接口通过 DebugHubServer 转发为 WebSocket 控制消息下发到对应 DeviceSession。

### 3.4 RealtimeStream
-	提供一个 WebSocket 端点给 Web UI，例如：
	-	GET /ws/live?deviceId=xxx&type=network|log|both
-	后端逻辑：
	-	当 Web UI 建立连接时，在服务器内部订阅对应 deviceId 的实时事件流（可用内存队列 + 内部 pub/sub）。
	-	将新到的 DebugEvent 过滤后推送给前端，支持：
		-	HTTP 新请求/响应。
		-	WebSocket 新帧。
		-	新日志（LogEvent）。

------------------------------------------------
## 四、Web UI 设计与实现（网络 + 日志联动）
------------------------------------------------
Web UI 只需实现「最小可用」版本，但结构要清晰、易扩展。
### 4.1 设备列表页
-	调用 GET /api/devices：
	-	显示在线设备（设备名、App 名、版本、平台、最近活动时间）。
	-	点击某设备进入「设备详情页」。

### 4.2 设备详情页：网络视图
-	左侧：网络事件列表（HTTP + WebSocket）：
	-	HTTP 条目：时间、方法、状态码、URL、耗时、是否 Mock。
	-	WebSocket 条目：会话/帧视图（可切换），显示 URL、方向、opcode、payload preview。
	-	支持过滤条件：
		-	类型：HTTP / WebSocket / all。
		-	方法 / 状态码。
		-	URL 包含关键字。
		-	是否 Mock / 是否错误请求。
-	右侧：详情面板：
	-	HTTP：请求头、请求体（做 JSON pretty print）、响应头/体、时间线。
	-	WebSocket：会话信息 + 帧列表，点击帧显示完整内容。
-	顶部区域：
	-	设备信息展示。
	-	抓包开关按钮（调用控制 API）。
	-	一键清理本设备数据。

### 4.3 设备详情页：日志视图
-	日志列表：
	-	从 GET /api/devices/{deviceId}/logs 拉数据。
	-	每条展示：
		-	时间。
		-	level（颜色区分 debug/info/warning/error/fault）。
		-	subsystem / category / loggerName。
		-	message。
  -	支持筛选条件：
		-	level 多选。
		-	subsystem、category 下拉过滤。
		-	message 文本搜索。
		-	时间范围选择。
-	支持「实时尾部日志」：
	-	使用 ws/live?deviceId=xxx&type=log 接收实时 LogEvent 并 append 在列表末尾。

### 4.4 网络与日志关联视图（可简化）
-	当选中一个 HTTP 请求时：
	-	如果它带有 traceId，则调用 /logs 接口过滤同 traceId 的日志，并展示在同一个详情页面的下方或侧边。
-	实现一个简单关联视图：请求在上，相关日志在下，实现「请求 + 相关日志」的组合调试体验。

### 4.5 Mock 规则管理 UI
-	列表展示当前设备的规则（从 /api/devices/{id}/mock-rules 获得）。
-	提供表单编辑：
	-	规则名称。
	-	目标类型（HTTP Request / HTTP Response / WS Outgoing / WS Incoming）。
	-	条件配置（URL pattern、方法、statusCode、包含文本等）。
	-	Action 配置（替换 body、替换 payload 等）。
-	保存/删除规则后调用控制 API 下发。

### 4.6 导出 UI
-	提供简单导出按钮：
	-	导出指定时间范围的日志。
	-	导出指定时间范围的 HTTP 事件。
-	调用相应的 export API 并触发浏览器下载。

前端技术栈可以使用 React / Vue / Svelte / 或纯 HTML + 原生 JS。
请给出一个最小可用的示例页面代码（例如使用原生 JS）：
-	设备列表页面。
-	单设备的 HTTP 列表 + 详情。
-	日志列表 + 基本过滤。
-	使用 WebSocket 订阅实时日志。

------------------------------------------------
## 五、安全性与环境控制
------------------------------------------------

-	iOS：
	-	所有 Debug Probe 相关能力（NetworkInstrumentation、LogInstrumentation、DebugBridgeClient 等）仅在 Debug/内部测试包打开（使用 #if DEBUG 或 Feature Flag）。
	-	DebugBridge 连接需要使用 token 认证（在 App 内预置或动态生成）。
-	Mac mini：
	-	Debug Hub 默认只在内网提供访问。
	-	可以预留简单的访问控制机制（例如 Basic Auth、JWT），但可先实现最小版本。

------------------------------------------------
## 六、非功能性要求（生产级考虑）
------------------------------------------------
-	性能：
	-	事件生成不要阻塞主线程，对 JSON 格式化、大 body 数据处理要谨慎（截断、懒解析）。
	-	DebugEventBus 要有 backpressure 策略，防止 DebugBridge 断线导致内存打爆。
-	稳定性：
	-	任何 Probe 代码异常时，业务网络和日志功能必须仍然正常工作。
	-	对网络/WS Hook 使用 try-catch + 防御式编程，确保「调试系统不拖垮业务系统」。
-	可扩展性：
	-	所有模块通过协议/接口解耦（Instrument、Storage、Bridge、RuleEngine、UI）。
	-	预留将来接入轨迹（Tracing）、Metrics 以及导出为 HAR、NDJSON 的能力。
-	可观测性：
	-	Debug Hub 本身也要有日志和指标（可简略设计），便于排查连接/存储问题。

------------------------------------------------
## 七、输出格式与粒度要求
------------------------------------------------
请按以下结构给出你的回答，并尽量提供「可复制粘贴」的代码示例（Swift + 后端 + 前端）：

1）总体架构说明
- 详细描述 iOS Probe、DebugBridge、Mac mini Debug Hub、Web UI 的关系和数据流。

2）iOS 端实现
-	所有核心数据模型的 Swift 定义。
-	NetworkInstrumentation（HTTP / WebSocket）的主要代码（包括 CaptureURLProtocol 与 InstrumentedWebSocketClient 示例）。
-	LogInstrumentation：自定义 DDLogger + AppLogger 包装 os_log 的完整示例。
-	DebugEventBus 与 DebugBridgeClient（WebSocket 客户端）的核心实现。

3）Mac mini Debug Hub 实现
-	基于 Swift 的 DebugHubServer 主要结构。
-	WebSocket 端点 /debug-bridge 与 DeviceRegistry 的实现示例。
-	EventIngestor + 持久化 + QueryEngine 的主要代码（可基于 SQLite/PostgreSQL）。
-	REST API 与 Realtime WebSocket 流的核心实现。

4）Web UI 示例
-	一个最小但可运行的 HTML+JS 页面（或 React/Vue 组件示例）：
-	展示设备列表；
-	展示单设备的 HTTP 列表 + 详情；
-	展示日志列表 + 基本过滤；
-	使用 WebSocket 订阅实时日志。

5）集成与使用说明
-	如何在 iOS App 中集成这套 Probe（初始化顺序、开关位、示例代码）。
-	如何在 Mac mini 上运行 Debug Hub 与部署 Web UI。
-	如何在浏览器中访问 Web 控制台并调试某台设备。

6）已知限制与扩展方向
-	说明无法抓取其他 App 流量、无法绕过 ATS/HSTS 等限制。
-	提出未来可扩展的方向（如 HAR 导出、脚本化规则、自动回放、链路追踪集成等）。

请确保：你的回答不仅有架构图和文字说明，还要包括关键模块的代码示例，使我可以直接把这些代码拷贝进工程并按需调整后运行。
