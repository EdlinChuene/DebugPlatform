import { create } from 'zustand'
import type { MockRule } from '@/types'
import { getMockRules, createMockRule, updateMockRule, deleteMockRule } from '@/services/api'

interface MockStore {
  // 规则列表
  rules: MockRule[]
  loading: boolean
  error: string | null

  // 编辑状态
  editingRule: MockRule | null
  isEditorOpen: boolean

  // Actions
  fetchRules: (deviceId: string) => Promise<void>
  createRule: (deviceId: string, rule: Omit<MockRule, 'id' | 'deviceId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateRule: (deviceId: string, ruleId: string, updates: Partial<MockRule>) => Promise<void>
  deleteRule: (deviceId: string, ruleId: string) => Promise<void>
  toggleRuleEnabled: (deviceId: string, ruleId: string) => Promise<void>
  openEditor: (rule?: MockRule) => void
  closeEditor: () => void
  clearRules: () => void
}

// 创建默认的空规则模板
export function createEmptyRule(): Omit<MockRule, 'id' | 'deviceId' | 'createdAt' | 'updatedAt'> {
  return {
    name: '新规则',
    targetType: 'httpResponse',
    condition: {
      urlPattern: '',
      method: null,
      statusCode: null,
      headerContains: null,
      bodyContains: null,
      wsPayloadContains: null,
      enabled: true,
    },
    action: {
      modifyRequestHeaders: null,
      modifyRequestBody: null,
      mockResponseStatusCode: 200,
      mockResponseHeaders: { 'Content-Type': 'application/json' },
      mockResponseBody: btoa(JSON.stringify({ mock: true })),
      mockWebSocketPayload: null,
      delayMilliseconds: null,
    },
    priority: 0,
    enabled: true,
  }
}

export const useMockStore = create<MockStore>((set, get) => ({
  // Initial state
  rules: [],
  loading: false,
  error: null,

  editingRule: null,
  isEditorOpen: false,

  // Actions
  fetchRules: async (deviceId: string) => {
    set({ loading: true, error: null })
    try {
      const rules = await getMockRules(deviceId)
      set({ rules, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '加载失败',
      })
    }
  },

  createRule: async (deviceId: string, rule) => {
    set({ loading: true, error: null })
    try {
      const newRule = await createMockRule(deviceId, rule)
      set((state) => ({
        rules: [newRule, ...state.rules],
        loading: false,
        isEditorOpen: false,
        editingRule: null,
      }))
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '创建失败',
      })
      throw error
    }
  },

  updateRule: async (deviceId: string, ruleId: string, updates) => {
    set({ loading: true, error: null })
    try {
      const updatedRule = await updateMockRule(deviceId, ruleId, updates)
      set((state) => ({
        rules: state.rules.map((r) => (r.id === ruleId ? updatedRule : r)),
        loading: false,
        isEditorOpen: false,
        editingRule: null,
      }))
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '更新失败',
      })
      throw error
    }
  },

  deleteRule: async (deviceId: string, ruleId: string) => {
    set({ loading: true, error: null })
    try {
      await deleteMockRule(deviceId, ruleId)
      set((state) => ({
        rules: state.rules.filter((r) => r.id !== ruleId),
        loading: false,
      }))
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '删除失败',
      })
    }
  },

  toggleRuleEnabled: async (deviceId: string, ruleId: string) => {
    const rule = get().rules.find((r) => r.id === ruleId)
    if (!rule) return

    try {
      await updateMockRule(deviceId, ruleId, { enabled: !rule.enabled })
      set((state) => ({
        rules: state.rules.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)),
      }))
    } catch (error) {
      console.error('Failed to toggle rule:', error)
    }
  },

  openEditor: (rule?: MockRule) => {
    set({
      isEditorOpen: true,
      editingRule: rule || null,
    })
  },

  closeEditor: () => {
    set({
      isEditorOpen: false,
      editingRule: null,
    })
  },

  clearRules: () => {
    set({
      rules: [],
      editingRule: null,
      isEditorOpen: false,
    })
  },
}))
