import { create } from 'zustand'
import * as api from '@/services/api'

// MARK: - Types

export interface CPUMetrics {
    usage: number // 0.0 - 100.0
    userTime: number
    systemTime: number
    threadCount: number
}

export interface MemoryMetrics {
    usedMemory: number // bytes
    peakMemory: number
    freeMemory: number
    memoryPressure: 'low' | 'medium' | 'high' | 'critical'
    footprintRatio: number // 0.0 - 1.0
}

export interface FPSMetrics {
    fps: number
    droppedFrames: number
    jankCount: number
    averageRenderTime: number // ms
}

export interface PerformanceMetrics {
    timestamp: string
    cpu?: CPUMetrics
    memory?: MemoryMetrics
    fps?: FPSMetrics
}

export interface JankEvent {
    id: string
    timestamp: string
    duration: number // ms
    droppedFrames: number
    stackTrace?: string
}

// MARK: - Alert Types

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertMetricType = 'cpu' | 'memory' | 'fps' | 'jank'
export type AlertCondition = 'gt' | 'lt' | 'gte' | 'lte'

export interface AlertRule {
    id: string
    metricType: AlertMetricType
    threshold: number
    condition: AlertCondition
    durationSeconds: number
    severity: AlertSeverity
    isEnabled: boolean
}

export interface Alert {
    id: string
    ruleId: string
    metricType: AlertMetricType
    severity: AlertSeverity
    message: string
    currentValue: number
    threshold: number
    timestamp: string
    isResolved: boolean
    resolvedAt?: string
}

export interface AlertConfig {
    rules: AlertRule[]
    cooldownSeconds: number
    isEnabled: boolean
}

// MARK: - API Responses

interface PerformanceRealtimeResponse {
    metrics: PerformanceMetrics[]
    deviceId: string
    rangeSeconds: number
}

interface PerformanceHistoryResponse {
    metrics: PerformanceMetrics[]
    deviceId: string
    startTime?: string
    endTime: string
    intervalSeconds: number
}

interface JankEventListResponse {
    items: JankEvent[]
    total: number
    page: number
    pageSize: number
}

interface PerformanceStatusResponse {
    deviceId: string
    isMonitoring: boolean
    lastMetrics?: PerformanceMetrics
    recentJankCount: number
}

interface PerformanceConfigInput {
    sampleInterval?: number
    monitorFPS?: boolean
    monitorCPU?: boolean
    monitorMemory?: boolean
}

interface AlertListResponse {
    items: Alert[]
    total: number
    page: number
    pageSize: number
    activeCount: number
}

interface AlertConfigResponse {
    rules: AlertRule[]
    cooldownSeconds: number
    isEnabled: boolean
}

interface AlertRuleInput {
    id?: string
    metricType: AlertMetricType
    threshold: number
    condition: AlertCondition
    durationSeconds?: number
    severity?: AlertSeverity
    isEnabled?: boolean
}

// MARK: - Store State

interface PerformanceState {
    // 实时数据
    realtimeMetrics: PerformanceMetrics[]
    isLoading: boolean
    error: string | null

    // 卡顿事件
    jankEvents: JankEvent[]
    jankTotal: number
    jankPage: number
    jankPageSize: number
    isLoadingJanks: boolean

    // 监控状态
    isMonitoring: boolean
    lastMetrics: PerformanceMetrics | null
    recentJankCount: number

    // 配置
    config: {
        sampleInterval: number
        monitorFPS: boolean
        monitorCPU: boolean
        monitorMemory: boolean
    }

    // 告警
    alerts: Alert[]
    alertRules: AlertRule[]
    alertConfig: {
        cooldownSeconds: number
        isEnabled: boolean
    }
    isLoadingAlerts: boolean
    activeAlertCount: number

    // 显示设置
    timeRange: number // 显示多少秒的数据

    // Actions
    fetchRealtimeMetrics: (deviceId: string) => Promise<void>
    fetchHistoryMetrics: (deviceId: string, startTime?: Date, endTime?: Date, interval?: number) => Promise<void>
    fetchJankEvents: (deviceId: string, page?: number, minDuration?: number) => Promise<void>
    fetchStatus: (deviceId: string) => Promise<void>
    updateConfig: (deviceId: string, config: PerformanceConfigInput) => Promise<void>
    clearMetrics: (deviceId: string) => Promise<void>

    // Alert Actions
    fetchAlerts: (deviceId: string, includeResolved?: boolean) => Promise<void>
    fetchAlertConfig: (deviceId: string) => Promise<void>
    updateAlertConfig: (deviceId: string, config: Partial<AlertConfig>) => Promise<void>
    addAlertRule: (deviceId: string, rule: AlertRuleInput) => Promise<void>
    updateAlertRule: (deviceId: string, ruleId: string, rule: Partial<AlertRuleInput>) => Promise<void>
    deleteAlertRule: (deviceId: string, ruleId: string) => Promise<void>
    resolveAlert: (deviceId: string, alertId: string) => Promise<void>

    // Realtime updates
    addRealtimeMetrics: (metrics: PerformanceMetrics[]) => void
    addJankEvent: (event: JankEvent) => void
    addAlert: (alert: Alert) => void
    updateAlert: (alert: Alert) => void
    handleRealtimeEvent: (event: import('@/types').PerformanceEventData) => void

    // UI
    setTimeRange: (seconds: number) => void
    clearData: () => void
}

// MARK: - API Functions

const API_BASE = '/api'

async function getRealtimeMetrics(deviceId: string, seconds: number = 60): Promise<PerformanceRealtimeResponse> {
    return api.api.get<PerformanceRealtimeResponse>(`${API_BASE}/devices/${deviceId}/performance/realtime?seconds=${seconds}`)
}

async function getHistoryMetrics(
    deviceId: string,
    startTime?: Date,
    endTime?: Date,
    interval: number = 60
): Promise<PerformanceHistoryResponse> {
    const params = new URLSearchParams()
    if (startTime) params.set('startTime', startTime.toISOString())
    if (endTime) params.set('endTime', endTime.toISOString())
    params.set('interval', interval.toString())

    return api.api.get<PerformanceHistoryResponse>(`${API_BASE}/devices/${deviceId}/performance/history?${params}`)
}

async function getJankEvents(
    deviceId: string,
    page: number = 1,
    pageSize: number = 50,
    minDuration?: number
): Promise<JankEventListResponse> {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('pageSize', pageSize.toString())
    if (minDuration) params.set('minDuration', minDuration.toString())

    return api.api.get<JankEventListResponse>(`${API_BASE}/devices/${deviceId}/performance/janks?${params}`)
}

async function getStatus(deviceId: string): Promise<PerformanceStatusResponse> {
    return api.api.get<PerformanceStatusResponse>(`${API_BASE}/devices/${deviceId}/performance/status`)
}

async function postConfig(deviceId: string, config: PerformanceConfigInput): Promise<{ success: boolean; message: string }> {
    return api.api.post(`${API_BASE}/devices/${deviceId}/performance/config`, config)
}

async function deleteMetrics(deviceId: string): Promise<{ deletedMetrics: number; deletedJanks: number }> {
    return api.api.delete(`${API_BASE}/devices/${deviceId}/performance`)
}

// Alert API functions
async function getAlerts(deviceId: string, includeResolved: boolean = false): Promise<AlertListResponse> {
    return api.api.get<AlertListResponse>(
        `${API_BASE}/devices/${deviceId}/performance/alerts?includeResolved=${includeResolved}`
    )
}

async function getAlertConfig(deviceId: string): Promise<AlertConfigResponse> {
    return api.api.get<AlertConfigResponse>(`${API_BASE}/devices/${deviceId}/performance/alerts/config`)
}

async function postAlertConfig(
    deviceId: string,
    config: Partial<AlertConfig>
): Promise<{ success: boolean; message: string }> {
    return api.api.post(`${API_BASE}/devices/${deviceId}/performance/alerts/config`, config)
}

async function postAlertRule(deviceId: string, rule: AlertRuleInput): Promise<{ success: boolean; message: string }> {
    return api.api.post(`${API_BASE}/devices/${deviceId}/performance/alerts/rules`, rule)
}

async function patchAlertRule(
    deviceId: string,
    ruleId: string,
    rule: Partial<AlertRuleInput>
): Promise<{ success: boolean; message: string }> {
    // 使用 PUT 代替 PATCH
    return api.api.put(`${API_BASE}/devices/${deviceId}/performance/alerts/rules/${ruleId}`, rule)
}

async function deleteAlertRule(deviceId: string, ruleId: string): Promise<{ success: boolean; message: string }> {
    return api.api.delete(`${API_BASE}/devices/${deviceId}/performance/alerts/rules/${ruleId}`)
}

async function postResolveAlert(deviceId: string, alertId: string): Promise<{ success: boolean; message: string }> {
    return api.api.post(`${API_BASE}/devices/${deviceId}/performance/alerts/${alertId}/resolve`, {})
}

// MARK: - Store

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
    // Initial state
    realtimeMetrics: [],
    isLoading: false,
    error: null,

    jankEvents: [],
    jankTotal: 0,
    jankPage: 1,
    jankPageSize: 50,
    isLoadingJanks: false,

    isMonitoring: false,
    lastMetrics: null,
    recentJankCount: 0,

    config: {
        sampleInterval: 1.0,
        monitorFPS: true,
        monitorCPU: true,
        monitorMemory: true,
    },

    alerts: [],
    alertRules: [],
    alertConfig: {
        cooldownSeconds: 60,
        isEnabled: true,
    },
    isLoadingAlerts: false,
    activeAlertCount: 0,

    timeRange: 60,

    // Actions
    fetchRealtimeMetrics: async (deviceId: string) => {
        set({ isLoading: true, error: null })
        try {
            const response = await getRealtimeMetrics(deviceId, get().timeRange)
            set({ realtimeMetrics: response.metrics, isLoading: false })
        } catch (error) {
            set({ error: String(error), isLoading: false })
        }
    },

    fetchHistoryMetrics: async (deviceId: string, startTime?: Date, endTime?: Date, interval?: number) => {
        set({ isLoading: true, error: null })
        try {
            const response = await getHistoryMetrics(deviceId, startTime, endTime, interval)
            set({ realtimeMetrics: response.metrics, isLoading: false })
        } catch (error) {
            set({ error: String(error), isLoading: false })
        }
    },

    fetchJankEvents: async (deviceId: string, page: number = 1, minDuration?: number) => {
        set({ isLoadingJanks: true })
        try {
            const response = await getJankEvents(deviceId, page, get().jankPageSize, minDuration)
            set({
                jankEvents: response.items,
                jankTotal: response.total,
                jankPage: response.page,
                isLoadingJanks: false,
            })
        } catch (error) {
            set({ isLoadingJanks: false })
        }
    },

    fetchStatus: async (deviceId: string) => {
        try {
            const response = await getStatus(deviceId)
            set({
                isMonitoring: response.isMonitoring,
                lastMetrics: response.lastMetrics ?? null,
                recentJankCount: response.recentJankCount,
            })
        } catch (error) {
            console.error('Failed to fetch performance status:', error)
        }
    },

    updateConfig: async (deviceId: string, config: PerformanceConfigInput) => {
        try {
            await postConfig(deviceId, config)
            set((state) => ({
                config: { ...state.config, ...config },
            }))
        } catch (error) {
            console.error('Failed to update config:', error)
        }
    },

    clearMetrics: async (deviceId: string) => {
        try {
            await deleteMetrics(deviceId)
            set({
                realtimeMetrics: [],
                jankEvents: [],
                jankTotal: 0,
            })
        } catch (error) {
            console.error('Failed to clear metrics:', error)
        }
    },

    // Realtime updates
    addRealtimeMetrics: (metrics: PerformanceMetrics[]) => {
        set((state) => {
            const combined = [...state.realtimeMetrics, ...metrics]
            // 保持最近 timeRange 秒的数据
            const cutoff = new Date(Date.now() - state.timeRange * 1000)
            const filtered = combined.filter((m) => new Date(m.timestamp) >= cutoff)
            return {
                realtimeMetrics: filtered,
                lastMetrics: metrics[metrics.length - 1] ?? state.lastMetrics,
            }
        })
    },

    addJankEvent: (event: JankEvent) => {
        set((state) => ({
            jankEvents: [event, ...state.jankEvents].slice(0, 100), // 最多保留 100 条
            jankTotal: state.jankTotal + 1,
            recentJankCount: state.recentJankCount + 1,
        }))
    },

    // Alert Actions
    fetchAlerts: async (deviceId: string, includeResolved: boolean = false) => {
        set({ isLoadingAlerts: true })
        try {
            const response = await getAlerts(deviceId, includeResolved)
            set({
                alerts: response.items,
                activeAlertCount: response.activeCount,
                isLoadingAlerts: false,
            })
        } catch (error) {
            console.error('Failed to fetch alerts:', error)
            set({ isLoadingAlerts: false })
        }
    },

    fetchAlertConfig: async (deviceId: string) => {
        try {
            const response = await getAlertConfig(deviceId)
            set({
                alertRules: response.rules,
                alertConfig: {
                    cooldownSeconds: response.cooldownSeconds,
                    isEnabled: response.isEnabled,
                },
            })
        } catch (error) {
            console.error('Failed to fetch alert config:', error)
        }
    },

    updateAlertConfig: async (deviceId: string, config: Partial<AlertConfig>) => {
        try {
            await postAlertConfig(deviceId, config)
            set((state) => ({
                alertConfig: { ...state.alertConfig, ...config },
                alertRules: config.rules ?? state.alertRules,
            }))
        } catch (error) {
            console.error('Failed to update alert config:', error)
        }
    },

    addAlertRule: async (deviceId: string, rule: AlertRuleInput) => {
        try {
            await postAlertRule(deviceId, rule)
            // 刷新配置
            get().fetchAlertConfig(deviceId)
        } catch (error) {
            console.error('Failed to add alert rule:', error)
        }
    },

    updateAlertRule: async (deviceId: string, ruleId: string, rule: Partial<AlertRuleInput>) => {
        try {
            await patchAlertRule(deviceId, ruleId, rule)
            set((state) => ({
                alertRules: state.alertRules.map((r) => (r.id === ruleId ? { ...r, ...rule } : r)),
            }))
        } catch (error) {
            console.error('Failed to update alert rule:', error)
        }
    },

    deleteAlertRule: async (deviceId: string, ruleId: string) => {
        try {
            await deleteAlertRule(deviceId, ruleId)
            set((state) => ({
                alertRules: state.alertRules.filter((r) => r.id !== ruleId),
            }))
        } catch (error) {
            console.error('Failed to delete alert rule:', error)
        }
    },

    resolveAlert: async (deviceId: string, alertId: string) => {
        try {
            await postResolveAlert(deviceId, alertId)
            set((state) => ({
                alerts: state.alerts.map((a) =>
                    a.id === alertId ? { ...a, isResolved: true, resolvedAt: new Date().toISOString() } : a
                ),
                activeAlertCount: Math.max(0, state.activeAlertCount - 1),
            }))
        } catch (error) {
            console.error('Failed to resolve alert:', error)
        }
    },

    addAlert: (alert: Alert) => {
        set((state) => ({
            alerts: [alert, ...state.alerts].slice(0, 100),
            activeAlertCount: alert.isResolved ? state.activeAlertCount : state.activeAlertCount + 1,
        }))
    },

    updateAlert: (alert: Alert) => {
        set((state) => {
            const existing = state.alerts.find((a) => a.id === alert.id)
            const wasActive = existing && !existing.isResolved
            const isNowActive = !alert.isResolved

            let activeCount = state.activeAlertCount
            if (wasActive && !isNowActive) {
                activeCount = Math.max(0, activeCount - 1)
            } else if (!wasActive && isNowActive) {
                activeCount += 1
            }

            return {
                alerts: state.alerts.map((a) => (a.id === alert.id ? alert : a)),
                activeAlertCount: activeCount,
            }
        })
    },

    // 处理实时事件
    handleRealtimeEvent: (event) => {
        switch (event.eventType) {
            case 'metrics':
                if (event.metrics && event.metrics.length > 0) {
                    const metrics: PerformanceMetrics[] = event.metrics.map((m) => ({
                        timestamp: m.timestamp,
                        cpu: m.cpu
                            ? {
                                usage: m.cpu.usage,
                                userTime: m.cpu.userTime,
                                systemTime: m.cpu.systemTime,
                                threadCount: m.cpu.threadCount,
                            }
                            : undefined,
                        memory: m.memory
                            ? {
                                usedMemory: m.memory.usedMemory,
                                peakMemory: m.memory.peakMemory,
                                freeMemory: m.memory.freeMemory,
                                memoryPressure: m.memory.memoryPressure as MemoryMetrics['memoryPressure'],
                                footprintRatio: m.memory.footprintRatio,
                            }
                            : undefined,
                        fps: m.fps
                            ? {
                                fps: m.fps.fps,
                                droppedFrames: m.fps.droppedFrames,
                                jankCount: m.fps.jankCount,
                                averageRenderTime: m.fps.averageRenderTime,
                            }
                            : undefined,
                    }))
                    get().addRealtimeMetrics(metrics)
                    // 设置监控状态为 true（收到数据说明在监控中）
                    set({ isMonitoring: true })
                }
                break

            case 'jank':
                if (event.jank) {
                    get().addJankEvent({
                        id: event.jank.id,
                        timestamp: event.jank.timestamp,
                        duration: event.jank.duration,
                        droppedFrames: event.jank.droppedFrames,
                        stackTrace: event.jank.stackTrace,
                    })
                }
                break

            case 'alert':
                if (event.alert) {
                    get().addAlert({
                        id: event.alert.id,
                        ruleId: event.alert.ruleId,
                        metricType: event.alert.metricType as AlertMetricType,
                        severity: event.alert.severity as AlertSeverity,
                        message: event.alert.message,
                        currentValue: event.alert.currentValue,
                        threshold: event.alert.threshold,
                        timestamp: event.alert.timestamp,
                        isResolved: event.alert.isResolved,
                        resolvedAt: event.alert.resolvedAt,
                    })
                }
                break

            case 'alertResolved':
                if (event.alert) {
                    get().updateAlert({
                        id: event.alert.id,
                        ruleId: event.alert.ruleId,
                        metricType: event.alert.metricType as AlertMetricType,
                        severity: event.alert.severity as AlertSeverity,
                        message: event.alert.message,
                        currentValue: event.alert.currentValue,
                        threshold: event.alert.threshold,
                        timestamp: event.alert.timestamp,
                        isResolved: true,
                        resolvedAt: event.alert.resolvedAt,
                    })
                }
                break
        }
    },

    // UI
    setTimeRange: (seconds: number) => {
        set({ timeRange: seconds })
    },

    clearData: () => {
        // 清除数据但不改变监控状态
        set({
            realtimeMetrics: [],
            jankEvents: [],
            jankTotal: 0,
            jankPage: 1,
            lastMetrics: null,
            recentJankCount: 0,
            alerts: [],
            activeAlertCount: 0,
        })
    },
}))

// MARK: - Helper Functions

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
}

export function getMemoryPressureColor(pressure: string): string {
    switch (pressure) {
        case 'low':
            return 'text-green-400'
        case 'medium':
            return 'text-yellow-400'
        case 'high':
            return 'text-orange-400'
        case 'critical':
            return 'text-red-400'
        default:
            return 'text-zinc-400'
    }
}

export function getCPUUsageColor(usage: number): string {
    if (usage < 30) return 'text-green-400'
    if (usage < 60) return 'text-yellow-400'
    if (usage < 80) return 'text-orange-400'
    return 'text-red-400'
}

export function getFPSColor(fps: number): string {
    if (fps >= 55) return 'text-green-400'
    if (fps >= 40) return 'text-yellow-400'
    if (fps >= 25) return 'text-orange-400'
    return 'text-red-400'
}

export function getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
        case 'info':
            return 'text-blue-400'
        case 'warning':
            return 'text-yellow-400'
        case 'critical':
            return 'text-red-400'
        default:
            return 'text-zinc-400'
    }
}

export function getSeverityBgColor(severity: AlertSeverity): string {
    switch (severity) {
        case 'info':
            return 'bg-blue-500/20 border-blue-500/50'
        case 'warning':
            return 'bg-yellow-500/20 border-yellow-500/50'
        case 'critical':
            return 'bg-red-500/20 border-red-500/50'
        default:
            return 'bg-zinc-500/20 border-zinc-500/50'
    }
}

export function getMetricTypeLabel(type: AlertMetricType): string {
    switch (type) {
        case 'cpu':
            return 'CPU'
        case 'memory':
            return '内存'
        case 'fps':
            return '帧率'
        case 'jank':
            return '卡顿'
        default:
            return type
    }
}

export function getConditionLabel(condition: AlertCondition): string {
    switch (condition) {
        case 'gt':
            return '大于'
        case 'lt':
            return '小于'
        case 'gte':
            return '大于等于'
        case 'lte':
            return '小于等于'
        default:
            return condition
    }
}
