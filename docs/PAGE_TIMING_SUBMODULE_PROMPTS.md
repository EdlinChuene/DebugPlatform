# 实现 Performance 插件的 Page Timing 子模块（严格对齐现有结构）

你是一个资深全栈工程师（iOS + Vapor + React/TS），正在一个三层插件化调试平台中实现功能：
 **Mobile App 内 DebugProbe SDK → DebugHub（Vapor 后端）→ WebUI（React 前端）**。平台已有多个插件（HTTP/Log/WS/Mock/Breakpoint/Chaos/Database/Performance），你要在 **Performance 插件**下新增 **Page Timing（页面耗时）**子模块，做到“可采集、可存储、可查询、可展示、可聚合”。

## 0）硬性约束

1. **严格对齐现有目录结构与命名模式**：
   - 不允许自创“第四套结构”。
   - 先在仓库里找到其它插件（例如 HTTP / Log / Database）在三层分别怎么组织、怎么注册、怎么暴露 API、怎么接 WebSocket/live stream、怎么做 Zustand store、怎么做路由与页面。然后 **按同样的套路**做 Performance/PageTiming。
2. **不破坏既有插件**：只增量新增文件与最小修改点（registry、路由、schema、index 导出等）。
3. **一致的事件模型**：Probe 发事件 → Hub 入库/广播 → WebUI 渲染，字段命名、序列化方式、版本兼容策略要统一。
4. **兼容 SQLite / PostgreSQL 两种后端模式**（项目已有此设计）。
5. **性能开销可控**：Probe 侧采集必须轻量，默认采样/节流策略要有（例如 100% 可配，默认 10%）。

------

## 1）业务目标

在 WebUI 的 Performance 插件里新增一个 Tab/页面：**Page Timing**，用于查看每个设备上各页面的耗时分布，并支持：

- 按 device、时间范围、页面名/路由、版本筛选
- 列表：每条页面访问的耗时详情
- 聚合：p50/p90/p95、平均值、最大值、次数、错误率
- 详情：单次页面访问的分段耗时（至少包含：`viewDidLoad → firstLayout → viewDidAppear`；以及可选的自定义 marker）
- Live：支持实时流（如果现有体系支持 live ws stream，就复用）

------

## 2）概念定义

### 2.1 页面一次“访问”（Page Visit）的生命周期

- `start`: 触发页面展示意图（push/present/tab切换导致的新 VC 出现）
- `firstLayout`: 首次 layout 完成（可用 `viewDidLayoutSubviews` 首次触发近似）
- `appear`: `viewDidAppear`
- `end`: 默认 = `appear`，但允许业务通过 API 手动标记 `end`

### 2.2 核心指标

- `loadDuration = firstLayout - start`
- `appearDuration = appear - start`（主指标）
- `customDurations[]`: 自定义 marker 两两差（如 `startFetch → dataReady`）

### 2.3 页面标识

- `pageId`: 稳定 ID（建议 = VC 类名 + 可选业务 route）
- `pageName`: 展示名（可从业务注册表或默认类名）
- `route`: 可选（SwiftUI/Router/自研路由时由业务上报）

------

## 3）三层实现拆解（按现有插件套路做）

### A）DebugProbe（iOS SDK）侧：采集 + 上报

**目标**：在 App 内自动采集页面耗时事件，并通过既有 DebugProbe 通道上报给 Hub。

#### A.1 代码落点（必须按仓库真实结构放）

- 在 `DebugProbe/Sources/...` 中找到其它插件（如 Http/Log/DB）的目录与注册方式，新增同级的 **Performance 子模块**目录，并在其下新增 `PageTiming` 相关文件。
- 文件命名参考现有：`XXXPlugin`, `XXXEvent`, `XXXRecorder`, `XXXService` 等。

#### A.2 采集方式（UIKit 优先，兼容 SwiftUI）

1. **UIKit 自动采集（默认开启，可配置关闭）**
   - 采用 method swizzling 或基类 hook（以你们项目现有方式为准；HTTP 捕获已提到会用 swizzling 风格）
   - Hook 点（至少）：`viewWillAppear`（start）、`viewDidLayoutSubviews` 首次（firstLayout）、`viewDidAppear`（appear/end）
   - 过滤：系统 VC、白名单/黑名单、重复 appear（例如 child VC / container）
2. **SwiftUI 支持（可选但建议）**
   - 提供 `ViewModifier`：`debugPageTiming(pageId:pageName:)`
   - 或提供手动 API：`Performance.markPageStart(...) / markPageEnd(...)`
3. **采样、节流、去重**
   - 同一 VC 重复 appear 的策略（例如只记录第一次，或按 visitId 区分）
   - 高频页面（如滚动复用容器）要防爆

#### A.3 事件模型（建议字段）

定义 `PageTimingEvent`（建议命名）：

- `eventId`, `deviceId`, `timestamp`
- `pageId`, `pageName`, `route`
- `visitId`（一次访问唯一）
- `startAt`, `firstLayoutAt`, `appearAt`, `endAt`
- `durations`: `loadMs`, `appearMs`, `totalMs`
- `markers`: `[ { name, ts, deltaMs? } ]`
- `context`: appVersion/build, osVersion, deviceModel, isColdStart?（如已有 device info 体系则复用）

通过 DebugProbe 现有“事件发送”接口发给 Hub（找到现有事件通道，复用，不另起炉灶）。

------

### B）DebugHub（Vapor 后端）侧：入库 + API + live

**目标**：接收 PageTimingEvent，持久化，并暴露查询与聚合接口；必要时接入 live ws 流。

#### B.1 插件落点（必须按仓库真实结构放）

- 在 `DebugHub` 内找到 `PerformanceBackendPlugin` 的现有实现位置与注册方式（README 已明确存在该插件）。
- 在 PerformanceBackendPlugin 下新增 `PageTiming` 子模块：models / migrations / service / controller / routes。

#### B.2 数据库表设计（SQLite/Postgres 双兼容）

至少两张表（或一张 JSONB 表也行，但要可查询聚合）：

- `page_timing_events`：明细（visit 粒度）
- （可选）`page_timing_markers`：marker 明细（或 JSON 存 events 表）

索引：`deviceId + timestamp`，`pageId + timestamp`，`pageName`（如需要模糊搜索）

#### B.3 API 设计（遵循现有 REST 风格）

- `GET /api/devices/{id}/performance/page-timings`
   支持 query：`from,to,pageId,pageName,route,limit,offset,sort`
- `GET /api/devices/{id}/performance/page-timings/summary`
   返回聚合：按 pageId/pageName 分组的 count/avg/p50/p90/p95/max
- `GET /api/devices/{id}/performance/page-timings/{eventId}`
   返回单条明细（含 markers）

聚合 percentile 的实现：

- Postgres 用 `percentile_cont` 或近似方案；SQLite 用应用层排序计算（注意性能与分页）。

#### B.4 Live（如果现有 WebUI 订阅 live ws）

- 如果已有 `/ws/live?deviceId=xxx` 或类似统一 live 通道，则在 Hub 侧把 PageTimingEvent 也广播出去（按现有 event type/tag 机制扩展）。

------

### C）WebUI（React + TS）侧：页面 + store + 接口

**目标**：在 PerformancePlugin 下增加 `Page Timing` 页面，支持列表/聚合/详情/实时。

#### C.1 目录落点（必须按仓库真实结构放）

- 在 `WebUI` 内找到 `PerformancePlugin` 真实目录；参照 `HttpPlugin`/`DatabasePlugin` 的组织方式：
  - `plugin.ts`（元信息/注册）
  - `routes.tsx`（子路由）
  - `api.ts`（请求封装）
  - `store.ts`（Zustand）
  - `pages/` `components/` `types.ts`
- 严格复用现有 UI 基建（表格、筛选器、时间范围选择、空态、loading、错误态）。

#### C.2 UI 规格

1. **Summary 页（默认）**
   - 表格：pageName | count | avg | p50 | p90 | p95 | max
   - 点击某行进入该 page 的事件列表
2. **List 页（明细）**
   - 支持筛选：时间范围、pageName 搜索、route、耗时阈值（例如 `duration > 500ms`）
   - 列表字段：时间、pageName、appearMs、loadMs、route、是否异常（比如缺 endAt）
3. **Detail 弹窗/页**
   - 展示时间点与分段（最简单：一个 timeline/步骤列表；高级可做瀑布图）
   - markers 列表
4. **Live 模式（可选）**
   - toggle：实时开关
   - 实时追加到列表顶部，带“暂停滚动/自动滚动”

#### C.3 类型与协议

- 定义 `PageTimingEventDTO`、`PageTimingSummaryDTO`
- 与后端字段 1:1 对齐（别搞前端自嗨式重命名）

------

## 4）注册与集成点清单（交付时必须逐项打钩）

- DebugProbe：Performance 插件 registry 注册了 PageTiming 采集器；settings 有开关与采样率配置入口
- DebugHub：PerformanceBackendPlugin 接入了 PageTiming 路由与 event handler；migration 完整；SQLite/Postgres 都能跑
- WebUI：PerformancePlugin 增加子路由与菜单项；能正常请求 API；页面可用

------

## 5）验收用例（写成可执行 checklist）

1. iOS Demo App 打开 A 页面 → 返回 → 再打开 A 页面
   - WebUI 能看到两条 visit 事件，visitId 不同
2. 人为制造慢页面（sleep/大图解码）
   - appearMs 明显变大，summary p90/p95 能反映
3. 断网/Hub 不可达
   - Probe 不应卡主线程；如有本地缓存机制则按现有策略
4. SQLite 模式 & Postgres 模式都能查到数据

------

## 6）输出要求（你必须交付的内容）

1. **文件级改动清单**：新增/修改了哪些文件（按三层分别列出路径）
2. **关键代码实现**：Probe 采集核心、Hub 入库与聚合、WebUI store + 页面
3. **协议文档**：PageTimingEvent 字段说明 + 版本兼容策略
4. **本地跑通说明**：如何启动、如何触发数据、如何在 WebUI 看到结果

------

### 你现在就开始做：

- 第一步：在仓库中定位 **HTTP 插件**在三层的实现路径与注册方式，输出你找到的路径与注册点，然后按同样模式实现 **Performance/PageTiming**。
- 过程中任何“我猜目录叫 XXX”的行为都不允许：必须以仓库真实结构为准，找不到就搜索关键字（PluginRegistry / PerformancePlugin / BackendPluginRegistry 等）。

（把上面当“契约”，照着做，别整花活。性能监控本来就够玄学了，你不能在目录结构上再整玄学）