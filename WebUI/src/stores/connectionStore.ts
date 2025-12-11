import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface ConnectionState {
  // 与 DebugHub 服务的连接状态（通过 health API 检测）
  isServerOnline: boolean
  // 实时流 WebSocket 连接状态（仅在设备详情页有效）
  isRealtimeConnected: boolean
  // 当前是否在设备详情页
  isInDeviceDetail: boolean

  setServerOnline: (value: boolean) => void
  setRealtimeConnected: (value: boolean) => void
  setInDeviceDetail: (value: boolean) => void

  // 兼容旧 API
  isConnected: boolean
  setConnected: (value: boolean) => void
}

export const useConnectionStore = create<ConnectionState>()(
  subscribeWithSelector((set) => ({
    isServerOnline: true, // 默认假设服务在线
    isRealtimeConnected: false,
    isInDeviceDetail: false,
    // 兼容旧 API - 直接映射到 isRealtimeConnected
    isConnected: false,

    setServerOnline: (value: boolean) => set({ isServerOnline: value }),
    setRealtimeConnected: (value: boolean) => set({
      isRealtimeConnected: value,
      isConnected: value  // 同步更新兼容属性
    }),
    setInDeviceDetail: (value: boolean) => set({ isInDeviceDetail: value }),
    setConnected: (value: boolean) => set({
      isRealtimeConnected: value,
      isConnected: value  // 同步更新
    }),
  }))
)

// 定期检查服务健康状态
let healthCheckInterval: ReturnType<typeof setInterval> | null = null

// 服务离线时的回调函数
let onServerOfflineCallback: (() => void) | null = null

/**
 * 设置服务离线时的回调（由 App 初始化时调用，避免循环依赖）
 */
export function setOnServerOfflineCallback(callback: () => void) {
  onServerOfflineCallback = callback
}

export function startHealthCheck() {
  if (healthCheckInterval) return

  let previousServerOnline = true

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health', {
        headers: { 'Accept': 'application/json' },
      })
      const isOnline = response.ok
      useConnectionStore.getState().setServerOnline(isOnline)

      // 当服务从在线变为离线时，触发回调
      if (previousServerOnline && !isOnline && onServerOfflineCallback) {
        onServerOfflineCallback()
      }
      previousServerOnline = isOnline
    } catch {
      const wasOnline = previousServerOnline
      useConnectionStore.getState().setServerOnline(false)
      // 当服务从在线变为离线时，触发回调
      if (wasOnline && onServerOfflineCallback) {
        onServerOfflineCallback()
      }
      previousServerOnline = false
    }
  }

  // 立即检查一次
  checkHealth()

  // 每 10 秒检查一次
  healthCheckInterval = setInterval(checkHealth, 10000)
}

export function stopHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }
}
