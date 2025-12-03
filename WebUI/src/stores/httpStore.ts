import { create } from 'zustand'
import type { HTTPEventSummary, HTTPEventDetail } from '@/types'
import * as api from '@/services/api'

// 会话分隔符类型
export interface SessionDivider {
  type: 'session-divider'
  sessionId: string
  timestamp: string
  isConnected: boolean
}

// 列表项类型（请求或分隔符）
export type ListItem = HTTPEventSummary | SessionDivider

export function isSessionDivider(item: ListItem): item is SessionDivider {
  return (item as SessionDivider).type === 'session-divider'
}

interface HTTPState {
  events: HTTPEventSummary[]
  listItems: ListItem[] // 包含会话分隔符的列表
  selectedEventId: string | null
  selectedEvent: HTTPEventDetail | null
  total: number
  page: number
  pageSize: number
  isLoading: boolean
  autoScroll: boolean
  currentSessionId: string | null

  // 批量选择
  selectedIds: Set<string>
  isSelectMode: boolean

  // Filters
  filters: {
    method: string
    statusRange: string
    urlContains: string
    mockedOnly: boolean
    favoritesOnly: boolean
  }

  // Actions
  fetchEvents: (deviceId: string) => Promise<void>
  fetchSessionHistory: (deviceId: string) => Promise<void>
  selectEvent: (deviceId: string, eventId: string) => Promise<void>
  clearSelection: () => void
  addRealtimeEvent: (event: HTTPEventSummary) => void
  clearEvents: () => void
  setFilter: (key: string, value: string | boolean) => void
  setAutoScroll: (value: boolean) => void

  // 会话管理
  addSessionDivider: (sessionId: string, isConnected: boolean) => void

  // 收藏
  updateEventFavorite: (eventId: string, isFavorite: boolean) => void

  // 批量选择
  toggleSelectMode: () => void
  toggleSelectId: (id: string) => void
  selectAll: () => void
  clearSelectedIds: () => void
  batchDelete: (deviceId: string) => Promise<void>
  batchFavorite: (deviceId: string, isFavorite: boolean) => Promise<void>
}

export const useHTTPStore = create<HTTPState>((set, get) => ({
  events: [],
  listItems: [],
  selectedEventId: null,
  selectedEvent: null,
  total: 0,
  page: 1,
  pageSize: 100,
  isLoading: false,
  autoScroll: true,
  selectedIds: new Set(),
  isSelectMode: false,
  currentSessionId: null,

  filters: {
    method: '',
    statusRange: '',
    urlContains: '',
    mockedOnly: false,
    favoritesOnly: false,
  },

  fetchEvents: async (deviceId: string) => {
    const { pageSize, filters } = get()
    set({ isLoading: true })

    try {
      const response = await api.getHTTPEvents(deviceId, {
        pageSize,
        method: filters.method || undefined,
        urlContains: filters.urlContains || undefined,
        isMocked: filters.mockedOnly ? true : undefined,
      })

      let events = response.items

      // 客户端过滤收藏（如果后端不支持）
      if (filters.favoritesOnly) {
        events = events.filter((e) => e.isFavorite)
      }

      set({
        events,
        listItems: events, // 从 API 加载时不包含分隔符
        total: response.total,
        page: response.page,
        isLoading: false,
      })

      // 加载完事件后，再加载会话历史来插入分隔符
      get().fetchSessionHistory(deviceId)
    } catch (error) {
      console.error('Failed to fetch HTTP events:', error)
      set({ isLoading: false })
    }
  },

  fetchSessionHistory: async (deviceId: string) => {
    try {
      const sessions = await api.getDeviceSessions(deviceId, 20)

      // 将会话记录转换为分隔符并按时间插入到列表中
      const { events } = get()
      const dividers: SessionDivider[] = []

      for (const session of sessions) {
        // 添加连接分隔符
        dividers.push({
          type: 'session-divider',
          sessionId: session.sessionId,
          timestamp: session.connectedAt,
          isConnected: true,
        })

        // 如果有断开时间，添加断开分隔符
        if (session.disconnectedAt) {
          dividers.push({
            type: 'session-divider',
            sessionId: session.sessionId,
            timestamp: session.disconnectedAt,
            isConnected: false,
          })
        }
      }

      // 合并事件和分隔符，按时间排序（最新在前）
      const allItems: ListItem[] = [...events, ...dividers]
      allItems.sort((a, b) => {
        const timeA = isSessionDivider(a) ? a.timestamp : a.startTime
        const timeB = isSessionDivider(b) ? b.timestamp : b.startTime
        return new Date(timeB).getTime() - new Date(timeA).getTime()
      })

      set({ listItems: allItems })
    } catch (error) {
      console.error('Failed to fetch session history:', error)
    }
  },

  selectEvent: async (deviceId: string, eventId: string) => {
    set({ selectedEventId: eventId })

    try {
      const detail = await api.getHTTPEventDetail(deviceId, eventId)
      set({ selectedEvent: detail })
    } catch (error) {
      console.error('Failed to fetch HTTP event detail:', error)
    }
  },

  clearSelection: () => {
    set({ selectedEventId: null, selectedEvent: null })
  },

  addRealtimeEvent: (event: HTTPEventSummary) => {
    set((state) => {
      const events = [event, ...state.events].slice(0, 1000)
      const listItems = [event as ListItem, ...state.listItems].slice(0, 1000)
      return { events, listItems, total: state.total + 1 }
    })
  },

  clearEvents: () => {
    set({
      events: [],
      listItems: [],
      total: 0,
      selectedEventId: null,
      selectedEvent: null,
      selectedIds: new Set(),
      currentSessionId: null,
    })
  },

  addSessionDivider: (sessionId: string, isConnected: boolean) => {
    set((state) => {
      const divider: SessionDivider = {
        type: 'session-divider',
        sessionId,
        timestamp: new Date().toISOString(),
        isConnected,
      }
      const listItems = [divider as ListItem, ...state.listItems]
      return {
        listItems,
        currentSessionId: isConnected ? sessionId : state.currentSessionId,
      }
    })
  },

  setFilter: (key: string, value: string | boolean) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }))
  },

  setAutoScroll: (value: boolean) => {
    set({ autoScroll: value })
  },

  updateEventFavorite: (eventId: string, isFavorite: boolean) => {
    set((state) => ({
      events: state.events.map((e) => (e.id === eventId ? { ...e, isFavorite } : e)),
      selectedEvent:
        state.selectedEvent?.id === eventId
          ? { ...state.selectedEvent, isFavorite }
          : state.selectedEvent,
    }))
  },

  // 批量选择
  toggleSelectMode: () => {
    set((state) => ({
      isSelectMode: !state.isSelectMode,
      selectedIds: state.isSelectMode ? new Set() : state.selectedIds,
    }))
  },

  toggleSelectId: (id: string) => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedIds)
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id)
      } else {
        newSelectedIds.add(id)
      }
      return { selectedIds: newSelectedIds }
    })
  },

  selectAll: () => {
    set((state) => {
      const allIds = new Set(state.events.map((e) => e.id))
      const allSelected = state.selectedIds.size === state.events.length
      return { selectedIds: allSelected ? new Set() : allIds }
    })
  },

  clearSelectedIds: () => {
    set({ selectedIds: new Set() })
  },

  batchDelete: async (deviceId: string) => {
    const { selectedIds, events } = get()
    if (selectedIds.size === 0) return

    try {
      await api.batchDeleteHTTPEvents(deviceId, Array.from(selectedIds))
      set({
        events: events.filter((e) => !selectedIds.has(e.id)),
        selectedIds: new Set(),
        total: get().total - selectedIds.size,
      })
    } catch (error) {
      console.error('Failed to batch delete:', error)
    }
  },

  batchFavorite: async (deviceId: string, isFavorite: boolean) => {
    const { selectedIds, events } = get()
    if (selectedIds.size === 0) return

    try {
      await api.batchFavoriteHTTPEvents(deviceId, Array.from(selectedIds), isFavorite)
      set({
        events: events.map((e) => (selectedIds.has(e.id) ? { ...e, isFavorite } : e)),
        selectedIds: new Set(),
      })
    } catch (error) {
      console.error('Failed to batch favorite:', error)
    }
  },
}))
