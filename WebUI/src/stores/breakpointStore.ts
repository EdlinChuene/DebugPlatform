import { create } from 'zustand'
import type { BreakpointHit, BreakpointAction, BreakpointRule } from '@/types'
import { getPendingBreakpoints, resumeBreakpoint as resumeBreakpointAPI, getBreakpointRules } from '@/services/api'

interface BreakpointStore {
    // State - 规则
    rules: BreakpointRule[]
    rulesLoading: boolean

    // State - 编辑
    editingRule: BreakpointRule | null
    isEditorOpen: boolean

    // State - 待处理断点
    pendingHits: BreakpointHit[]
    loading: boolean

    // Actions - 规则
    fetchRules: (deviceId: string) => Promise<void>
    clearRules: () => void

    // Actions - 编辑
    openEditor: (rule?: BreakpointRule) => void
    closeEditor: () => void

    // 计算属性 - 规则
    activeRulesCount: () => number
    hasActiveRules: () => boolean

    // Actions - 待处理断点
    fetchPendingHits: (deviceId: string) => Promise<void>
    addHit: (hit: BreakpointHit) => void
    removeHit: (requestId: string) => void
    resumeBreakpoint: (deviceId: string, requestId: string, action: BreakpointAction) => Promise<void>
    clear: () => void
}

export const useBreakpointStore = create<BreakpointStore>((set, get) => ({
    rules: [],
    rulesLoading: false,
    editingRule: null,
    isEditorOpen: false,
    pendingHits: [],
    loading: false,

    fetchRules: async (deviceId: string) => {
        set({ rulesLoading: true })
        try {
            const rules = await getBreakpointRules(deviceId)
            // 按创建时间倒序排序
            const sortedRules = [...rules].sort((a, b) => {
                if (!a.createdAt && !b.createdAt) return 0
                if (!a.createdAt) return 1
                if (!b.createdAt) return -1
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            })
            set({ rules: sortedRules, rulesLoading: false })
        } catch (error) {
            console.error('Failed to fetch breakpoint rules:', error)
            set({ rulesLoading: false })
        }
    },

    clearRules: () => {
        set({ rules: [] })
    },

    openEditor: (rule?: BreakpointRule) => {
        set({
            editingRule: rule || null,
            isEditorOpen: true,
        })
    },

    closeEditor: () => {
        set({
            editingRule: null,
            isEditorOpen: false,
        })
    },

    activeRulesCount: () => {
        return get().rules.filter((r) => r.enabled).length
    },

    hasActiveRules: () => {
        return get().rules.some((r) => r.enabled)
    },

    fetchPendingHits: async (deviceId: string) => {
        set({ loading: true })
        try {
            const hits = await getPendingBreakpoints(deviceId)
            set({ pendingHits: hits })
        } catch (error) {
            console.error('Failed to fetch pending breakpoints:', error)
        } finally {
            set({ loading: false })
        }
    },

    addHit: (hit: BreakpointHit) => {
        set((state) => {
            // 避免重复添加
            if (state.pendingHits.some(h => h.requestId === hit.requestId)) {
                return state
            }
            return { pendingHits: [...state.pendingHits, hit] }
        })
    },

    removeHit: (requestId: string) => {
        set((state) => ({
            pendingHits: state.pendingHits.filter(h => h.requestId !== requestId)
        }))
    },

    resumeBreakpoint: async (deviceId: string, requestId: string, action: BreakpointAction) => {
        try {
            await resumeBreakpointAPI(deviceId, requestId, action)
            // 移除已处理的断点
            get().removeHit(requestId)
        } catch (error) {
            console.error('Failed to resume breakpoint:', error)
            throw error
        }
    },

    clear: () => {
        set({ pendingHits: [], rules: [] })
    },
}))
