import { create } from 'zustand'
import type { DeviceListItem, DeviceDetail } from '@/types'
import * as api from '@/services/api'
import { useHTTPStore } from './httpStore'
import { useLogStore } from './logStore'

// localStorage key for favorite devices
const FAVORITE_DEVICES_KEY = 'debug-hub-favorite-devices'

// localStorage key for device nicknames
const DEVICE_NICKNAMES_KEY = 'debug-hub-device-nicknames'

// Load favorites from localStorage
const loadFavorites = (): Set<string> => {
  try {
    const saved = localStorage.getItem(FAVORITE_DEVICES_KEY)
    if (saved) {
      return new Set(JSON.parse(saved))
    }
  } catch (e) {
    console.error('Failed to load favorite devices:', e)
  }
  return new Set()
}

// Save favorites to localStorage
const saveFavorites = (favorites: Set<string>) => {
  try {
    localStorage.setItem(FAVORITE_DEVICES_KEY, JSON.stringify([...favorites]))
  } catch (e) {
    console.error('Failed to save favorite devices:', e)
  }
}

// Load device nicknames from localStorage
const loadNicknames = (): Record<string, string> => {
  try {
    const saved = localStorage.getItem(DEVICE_NICKNAMES_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load device nicknames:', e)
  }
  return {}
}

// Save device nicknames to localStorage
const saveNicknames = (nicknames: Record<string, string>) => {
  try {
    localStorage.setItem(DEVICE_NICKNAMES_KEY, JSON.stringify(nicknames))
  } catch (e) {
    console.error('Failed to save device nicknames:', e)
  }
}

interface DeviceState {
  devices: DeviceListItem[]
  currentDeviceId: string | null
  currentDevice: DeviceDetail | null
  isLoading: boolean
  error: string | null
  favoriteDeviceIds: Set<string>
  deviceNicknames: Record<string, string>

  // 批量选择状态
  isSelectMode: boolean
  selectedIds: Set<string>

  // Actions
  fetchDevices: () => Promise<void>
  selectDevice: (deviceId: string) => Promise<void>
  refreshDevice: () => Promise<void>
  clearSelection: () => void
  clearDeviceData: () => Promise<void>
  removeDevice: (deviceId: string) => Promise<void>
  removeAllOfflineDevices: () => Promise<void>
  toggleFavorite: (deviceId: string) => void
  isFavorite: (deviceId: string) => boolean

  // 备注名相关
  setNickname: (deviceId: string, nickname: string) => void
  getNickname: (deviceId: string) => string | undefined
  clearNickname: (deviceId: string) => void

  // 批量选择相关
  toggleSelectMode: () => void
  toggleSelectId: (deviceId: string) => void
  selectAllOffline: () => void
  clearSelectedIds: () => void
  batchRemoveSelected: () => Promise<void>

  // 服务离线时更新设备状态
  setAllDevicesOffline: () => void
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  currentDeviceId: null,
  currentDevice: null,
  isLoading: false,
  error: null,
  favoriteDeviceIds: loadFavorites(),
  deviceNicknames: loadNicknames(),

  // 批量选择状态
  isSelectMode: false,
  selectedIds: new Set(),

  fetchDevices: async () => {
    set({ isLoading: true, error: null })
    try {
      const devices = await api.getDevices()
      set({ devices, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  selectDevice: async (deviceId: string) => {
    set({ currentDeviceId: deviceId, isLoading: true, error: null })
    try {
      const detail = await api.getDevice(deviceId)
      set({ currentDevice: detail, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  refreshDevice: async () => {
    const { currentDeviceId } = get()
    if (!currentDeviceId) return
    try {
      const detail = await api.getDevice(currentDeviceId)
      set({ currentDevice: detail })
    } catch (error) {
      console.error('Failed to refresh device:', error)
    }
  },

  clearSelection: () => {
    set({ currentDeviceId: null, currentDevice: null })
  },

  clearDeviceData: async () => {
    const { currentDeviceId } = get()
    if (!currentDeviceId) return

    try {
      // 清空设备数据（HTTP、日志、WebSocket 等）
      await api.clearDeviceData(currentDeviceId)

      // 清空规则（Mock 规则、断点规则、故障注入规则）
      await Promise.all([
        api.deleteAllMockRules(currentDeviceId),
        api.deleteAllBreakpointRules(currentDeviceId),
        api.deleteAllChaosRules(currentDeviceId),
      ])

      // 清除前端 store 状态（包括会话分隔符）
      useHTTPStore.getState().clearEvents()
      useLogStore.getState().clearEvents()
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  removeDevice: async (deviceId: string) => {
    try {
      await api.removeDevice(deviceId)
      // 从列表中移除
      set(state => ({
        devices: state.devices.filter(d => d.deviceId !== deviceId)
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  removeAllOfflineDevices: async () => {
    try {
      await api.removeAllOfflineDevices()
      // 从列表中移除所有离线设备
      set(state => ({
        devices: state.devices.filter(d => d.isOnline)
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  toggleFavorite: (deviceId: string) => {
    const { favoriteDeviceIds } = get()
    const newFavorites = new Set(favoriteDeviceIds)

    if (newFavorites.has(deviceId)) {
      newFavorites.delete(deviceId)
    } else {
      newFavorites.add(deviceId)
    }

    saveFavorites(newFavorites)
    set({ favoriteDeviceIds: newFavorites })
  },

  isFavorite: (deviceId: string) => {
    return get().favoriteDeviceIds.has(deviceId)
  },

  // 备注名相关
  setNickname: (deviceId: string, nickname: string) => {
    const { deviceNicknames } = get()
    const newNicknames = { ...deviceNicknames }
    if (nickname.trim()) {
      newNicknames[deviceId] = nickname.trim()
    } else {
      delete newNicknames[deviceId]
    }
    saveNicknames(newNicknames)
    set({ deviceNicknames: newNicknames })
  },

  getNickname: (deviceId: string) => {
    return get().deviceNicknames[deviceId]
  },

  clearNickname: (deviceId: string) => {
    const { deviceNicknames } = get()
    const newNicknames = { ...deviceNicknames }
    delete newNicknames[deviceId]
    saveNicknames(newNicknames)
    set({ deviceNicknames: newNicknames })
  },

  // 批量选择相关
  toggleSelectMode: () => {
    const { isSelectMode } = get()
    set({
      isSelectMode: !isSelectMode,
      selectedIds: new Set(), // 切换模式时清空选择
    })
  },

  toggleSelectId: (deviceId: string) => {
    const { selectedIds, devices } = get()
    // 检查设备是否在线，在线设备不可选中
    const device = devices.find(d => d.deviceId === deviceId)
    if (device?.isOnline) return

    const newSelected = new Set(selectedIds)
    if (newSelected.has(deviceId)) {
      newSelected.delete(deviceId)
    } else {
      newSelected.add(deviceId)
    }
    set({ selectedIds: newSelected })
  },

  selectAllOffline: () => {
    const { devices, selectedIds } = get()
    const offlineDeviceIds = devices.filter(d => !d.isOnline).map(d => d.deviceId)
    // 如果已全选则取消全选，否则全选
    const allSelected = offlineDeviceIds.every(id => selectedIds.has(id))
    if (allSelected) {
      set({ selectedIds: new Set() })
    } else {
      set({ selectedIds: new Set(offlineDeviceIds) })
    }
  },

  clearSelectedIds: () => {
    set({ selectedIds: new Set() })
  },

  batchRemoveSelected: async () => {
    const { selectedIds } = get()
    if (selectedIds.size === 0) return

    try {
      // 逐个移除选中的设备
      const idsToRemove = Array.from(selectedIds)
      await Promise.all(idsToRemove.map(id => api.removeDevice(id)))

      // 从列表中移除
      set(state => ({
        devices: state.devices.filter(d => !idsToRemove.includes(d.deviceId)),
        selectedIds: new Set(),
        isSelectMode: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  // 服务离线时将所有设备设置为离线状态
  setAllDevicesOffline: () => {
    set(state => ({
      devices: state.devices.map(device => ({
        ...device,
        isOnline: false
      })),
      // 同时更新当前设备详情
      currentDevice: state.currentDevice ? {
        ...state.currentDevice,
        isOnline: false
      } : null
    }))
  },
}))

