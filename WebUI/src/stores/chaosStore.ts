import { create } from 'zustand'
import type { ChaosRule } from '@/types'
import {
    getChaosRules,
    createChaosRule,
    updateChaosRule,
    deleteChaosRule,
    deleteAllChaosRules,
} from '@/services/api'

interface ChaosStore {
    // 规则列表
    rules: ChaosRule[]
    loading: boolean
    error: string | null

    // 编辑状态
    editingRule: ChaosRule | null
    isEditorOpen: boolean

    // Actions
    fetchRules: (deviceId: string) => Promise<void>
    createRule: (deviceId: string, rule: Omit<ChaosRule, 'id'>) => Promise<void>
    updateRule: (deviceId: string, ruleId: string, updates: Partial<ChaosRule>) => Promise<void>
    deleteRule: (deviceId: string, ruleId: string) => Promise<void>
    toggleRuleEnabled: (deviceId: string, ruleId: string) => Promise<void>
    clearAllRules: (deviceId: string) => Promise<void>
    clearRules: () => void

    // 编辑 Actions
    openEditor: (rule?: ChaosRule) => void
    closeEditor: () => void

    // 计算属性
    hasActiveRules: () => boolean
    activeRulesCount: () => number
}

export const useChaosStore = create<ChaosStore>((set, get) => ({
    rules: [],
    loading: false,
    error: null,
    editingRule: null,
    isEditorOpen: false,

    fetchRules: async (deviceId: string) => {
        set({ loading: true, error: null })
        try {
            const rules = await getChaosRules(deviceId)
            // 按创建时间倒序排序
            const sortedRules = [...rules].sort((a, b) => {
                if (!a.createdAt && !b.createdAt) return 0
                if (!a.createdAt) return 1
                if (!b.createdAt) return -1
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            })
            set({ rules: sortedRules, loading: false })
        } catch (error) {
            set({ error: (error as Error).message, loading: false })
        }
    },

    createRule: async (deviceId: string, rule: Omit<ChaosRule, 'id'>) => {
        try {
            await createChaosRule(deviceId, rule)
            await get().fetchRules(deviceId)
        } catch (error) {
            set({ error: (error as Error).message })
        }
    },

    updateRule: async (deviceId: string, ruleId: string, updates: Partial<ChaosRule>) => {
        try {
            await updateChaosRule(deviceId, ruleId, updates)
            await get().fetchRules(deviceId)
        } catch (error) {
            set({ error: (error as Error).message })
        }
    },

    deleteRule: async (deviceId: string, ruleId: string) => {
        try {
            await deleteChaosRule(deviceId, ruleId)
            await get().fetchRules(deviceId)
        } catch (error) {
            set({ error: (error as Error).message })
        }
    },

    toggleRuleEnabled: async (deviceId: string, ruleId: string) => {
        const rule = get().rules.find((r) => r.id === ruleId)
        if (rule) {
            await get().updateRule(deviceId, ruleId, { enabled: !rule.enabled })
        }
    },

    clearAllRules: async (deviceId: string) => {
        try {
            await deleteAllChaosRules(deviceId)
            set({ rules: [] })
        } catch (error) {
            set({ error: (error as Error).message })
        }
    },

    clearRules: () => {
        set({ rules: [], error: null })
    },

    openEditor: (rule?: ChaosRule) => {
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

    // 是否有活跃（启用）的规则
    hasActiveRules: () => {
        return get().rules.some((r) => r.enabled)
    },

    // 活跃规则数量
    activeRulesCount: () => {
        return get().rules.filter((r) => r.enabled).length
    },
}))
