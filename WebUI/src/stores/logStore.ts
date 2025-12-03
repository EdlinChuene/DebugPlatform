import { create } from 'zustand'
import type { LogEvent, LogLevel } from '@/types'
import * as api from '@/services/api'

interface LogState {
  events: LogEvent[]
  total: number
  page: number
  pageSize: number
  isLoading: boolean
  autoScroll: boolean

  // Filter options
  subsystems: string[]
  categories: string[]

  // Filters
  filters: {
    levels: LogLevel[]
    subsystem: string
    category: string
    text: string
    traceId: string
  }

  // Actions
  fetchEvents: (deviceId: string) => Promise<void>
  fetchFilterOptions: (deviceId: string) => Promise<void>
  addRealtimeEvent: (event: LogEvent) => void
  clearEvents: () => void
  setFilter: (key: string, value: unknown) => void
  toggleLevel: (level: LogLevel) => void
  setAutoScroll: (value: boolean) => void
}

const ALL_LEVELS: LogLevel[] = ['debug', 'info', 'warning', 'error', 'fault']

export const useLogStore = create<LogState>((set, get) => ({
  events: [],
  total: 0,
  page: 1,
  pageSize: 500,
  isLoading: false,
  autoScroll: true,

  subsystems: [],
  categories: [],

  filters: {
    levels: [...ALL_LEVELS],
    subsystem: '',
    category: '',
    text: '',
    traceId: '',
  },

  fetchEvents: async (deviceId: string) => {
    const { pageSize, filters } = get()
    set({ isLoading: true })

    try {
      const response = await api.getLogEvents(deviceId, {
        pageSize,
        levels: filters.levels,
        subsystem: filters.subsystem || undefined,
        category: filters.category || undefined,
        text: filters.text || undefined,
        traceId: filters.traceId || undefined,
      })
      set({
        events: response.items,
        total: response.total,
        page: response.page,
        isLoading: false,
      })
    } catch (error) {
      console.error('Failed to fetch log events:', error)
      set({ isLoading: false })
    }
  },

  fetchFilterOptions: async (deviceId: string) => {
    try {
      const [subsystems, categories] = await Promise.all([
        api.getLogSubsystems(deviceId),
        api.getLogCategories(deviceId),
      ])
      set({ subsystems, categories })
    } catch (error) {
      console.error('Failed to fetch filter options:', error)
    }
  },

  addRealtimeEvent: (event: LogEvent) => {
    const { filters } = get()

    // 检查是否符合过滤条件
    if (!filters.levels.includes(event.level)) return
    if (filters.subsystem && event.subsystem !== filters.subsystem) return
    if (filters.category && event.category !== filters.category) return
    if (filters.text && !event.message.toLowerCase().includes(filters.text.toLowerCase())) return

    set((state) => {
      const events = [event, ...state.events].slice(0, 5000)
      return { events, total: state.total + 1 }
    })
  },

  clearEvents: () => {
    set({ events: [], total: 0 })
  },

  setFilter: (key: string, value: unknown) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }))
  },

  toggleLevel: (level: LogLevel) => {
    set((state) => {
      const levels = state.filters.levels.includes(level)
        ? state.filters.levels.filter((l) => l !== level)
        : [...state.filters.levels, level]
      return { filters: { ...state.filters, levels } }
    })
  },

  setAutoScroll: (value: boolean) => {
    set({ autoScroll: value })
  },
}))

