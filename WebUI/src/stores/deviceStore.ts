import { create } from 'zustand'
import type { DeviceListItem, DeviceDetail } from '@/types'
import * as api from '@/services/api'
import { useHTTPStore } from './httpStore'
import { useLogStore } from './logStore'

// localStorage key for favorite devices
const FAVORITE_DEVICES_KEY = 'debug-hub-favorite-devices'

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

interface DeviceState {
  devices: DeviceListItem[]
  currentDeviceId: string | null
  currentDevice: DeviceDetail | null
  isLoading: boolean
  error: string | null
  favoriteDeviceIds: Set<string>

  // Actions
  fetchDevices: () => Promise<void>
  selectDevice: (deviceId: string) => Promise<void>
  clearSelection: () => void
  toggleCapture: (network: boolean, log: boolean) => Promise<void>
  clearDeviceData: () => Promise<void>
  toggleFavorite: (deviceId: string) => void
  isFavorite: (deviceId: string) => boolean
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  currentDeviceId: null,
  currentDevice: null,
  isLoading: false,
  error: null,
  favoriteDeviceIds: loadFavorites(),

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

  clearSelection: () => {
    set({ currentDeviceId: null, currentDevice: null })
  },

  toggleCapture: async (network: boolean, log: boolean) => {
    const { currentDeviceId } = get()
    if (!currentDeviceId) return

    try {
      await api.toggleCapture(currentDeviceId, network, log)
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  clearDeviceData: async () => {
    const { currentDeviceId } = get()
    if (!currentDeviceId) return

    try {
      await api.clearDeviceData(currentDeviceId)
      // 清除前端 store 状态（包括会话分隔符）
      useHTTPStore.getState().clearEvents()
      useLogStore.getState().clearEvents()
    } catch (error) {
      set({ error: (error as Error).message })
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
}))

