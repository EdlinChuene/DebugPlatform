import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { RealtimeMessage, ServerStats } from '@/types'
import { deviceEventHandlers } from './deviceStore'

interface ConnectionState {
  // 与 DebugHub 服务的连接状态（通过 WebSocket 检测）
  isServerOnline: boolean
  // 实时流 WebSocket 连接状态（仅在设备详情页有效）
  isRealtimeConnected: boolean
  // 当前是否在设备详情页
  isInDeviceDetail: boolean
  // 服务器统计数据
  serverStats: ServerStats | null

  setServerOnline: (value: boolean) => void
  setRealtimeConnected: (value: boolean) => void
  setInDeviceDetail: (value: boolean) => void
  setServerStats: (stats: ServerStats | null) => void

  // 兼容旧 API
  isConnected: boolean
  setConnected: (value: boolean) => void
}

export const useConnectionStore = create<ConnectionState>()(
  subscribeWithSelector((set) => ({
    isServerOnline: true, // 默认假设服务在线
    isRealtimeConnected: false,
    isInDeviceDetail: false,
    serverStats: null,
    // 兼容旧 API - 直接映射到 isRealtimeConnected
    isConnected: false,

    setServerOnline: (value: boolean) => set({ isServerOnline: value }),
    setRealtimeConnected: (value: boolean) => set({
      isRealtimeConnected: value,
      isConnected: value  // 同步更新兼容属性
    }),
    setInDeviceDetail: (value: boolean) => set({ isInDeviceDetail: value }),
    setServerStats: (stats: ServerStats | null) => set({ serverStats: stats }),
    setConnected: (value: boolean) => set({
      isRealtimeConnected: value,
      isConnected: value  // 同步更新
    }),
  }))
)

// 全局 WebSocket 实例
let globalWs: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10
const RECONNECT_INTERVAL = 3000 // 3秒

// 服务离线时的回调函数
let onServerOfflineCallback: (() => void) | null = null

/**
 * 设置服务离线时的回调（由 App 初始化时调用，避免循环依赖）
 */
export function setOnServerOfflineCallback(callback: () => void) {
  onServerOfflineCallback = callback
}

/**
 * 处理 WebSocket 消息
 */
function handleGlobalMessage(event: MessageEvent) {
  try {
    const message: RealtimeMessage = JSON.parse(event.data)

    // 忽略没有 payload 或不是我们关心的消息类型
    if (!message.payload || !['stats', 'deviceConnected', 'deviceDisconnected', 'deviceReconnected', 'deviceInfoUpdated'].includes(message.type)) {
      return
    }

    const payload = JSON.parse(message.payload)

    switch (message.type) {
      case 'stats':
        // 更新服务器统计数据
        useConnectionStore.getState().setServerStats(payload as ServerStats)
        break

      case 'deviceConnected':
        deviceEventHandlers.handleDeviceConnected({
          deviceId: payload.deviceId,
          deviceName: payload.deviceName,
          sessionId: payload.sessionId,
          timestamp: payload.timestamp,
          pluginStates: payload.pluginStates,
        })
        break

      case 'deviceDisconnected':
        deviceEventHandlers.handleDeviceDisconnected({
          deviceId: payload.deviceId,
          timestamp: payload.timestamp,
        })
        break

      case 'deviceReconnected':
        deviceEventHandlers.handleDeviceReconnected({
          deviceId: payload.deviceId,
          deviceName: payload.deviceName,
          sessionId: payload.sessionId,
          timestamp: payload.timestamp,
        })
        break

      case 'deviceInfoUpdated':
        deviceEventHandlers.handleDeviceInfoUpdated({
          deviceId: payload.deviceId,
          deviceName: payload.deviceName,
          timestamp: payload.timestamp,
        })
        break
    }
  } catch (error) {
    console.error('[GlobalWS] Failed to parse message:', error)
  }
}

/**
 * 连接全局 WebSocket
 */
function connectGlobalWebSocket() {
  if (globalWs?.readyState === WebSocket.OPEN) return

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/ws/live?type=all`

  globalWs = new WebSocket(wsUrl)

  globalWs.onopen = () => {
    console.log('[GlobalWS] Connected')
    useConnectionStore.getState().setServerOnline(true)
    reconnectAttempts = 0
  }

  globalWs.onmessage = handleGlobalMessage

  globalWs.onclose = () => {
    console.log('[GlobalWS] Disconnected')
    const wasOnline = useConnectionStore.getState().isServerOnline
    useConnectionStore.getState().setServerOnline(false)

    // 触发离线回调
    if (wasOnline && onServerOfflineCallback) {
      onServerOfflineCallback()
    }

    // 自动重连
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++
      console.log(`[GlobalWS] Reconnecting in ${RECONNECT_INTERVAL}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
      reconnectTimer = setTimeout(connectGlobalWebSocket, RECONNECT_INTERVAL)
    }
  }

  globalWs.onerror = (error) => {
    console.error('[GlobalWS] Error:', error)
  }
}

/**
 * 启动服务健康检查（现在使用 WebSocket）
 */
export function startHealthCheck() {
  connectGlobalWebSocket()
}

/**
 * 停止服务健康检查
 */
export function stopHealthCheck() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (globalWs) {
    globalWs.close()
    globalWs = null
  }
}
