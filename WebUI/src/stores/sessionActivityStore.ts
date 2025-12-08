import { create } from 'zustand'
import * as api from '@/services/api'

export interface SessionActivity {
    id: string
    deviceId: string
    sessionId: string
    timestamp: string
    type: 'connected' | 'disconnected'
    deviceName?: string
}

interface SessionActivityState {
    activities: SessionActivity[]
    maxActivities: number
    isLoading: boolean

    // Actions
    addActivity: (activity: SessionActivity) => void
    clearActivities: () => void
    getActivitiesForDevice: (deviceId: string) => SessionActivity[]
    loadDeviceActivities: (deviceId: string) => Promise<void>
}

export const useSessionActivityStore = create<SessionActivityState>((set, get) => ({
    activities: [],
    maxActivities: 100, // 最多保留 100 条记录
    isLoading: false,

    addActivity: (activity) =>
        set((state) => {
            const newActivities = [activity, ...state.activities].slice(0, state.maxActivities)
            return { activities: newActivities }
        }),

    clearActivities: () => set({ activities: [] }),

    getActivitiesForDevice: (deviceId) => {
        return get().activities.filter((a) => a.deviceId === deviceId)
    },

    // 从后端加载设备的连接历史
    loadDeviceActivities: async (deviceId: string) => {
        set({ isLoading: true })
        try {
            const sessions = await api.getDeviceSessions(deviceId, 20)
            const activities: SessionActivity[] = []

            // 将会话历史转换为活动记录
            for (const session of sessions) {
                // 添加连接事件
                activities.push({
                    id: `${session.sessionId}-connected`,
                    deviceId: session.deviceId,
                    sessionId: session.sessionId,
                    timestamp: session.connectedAt,
                    type: 'connected',
                    deviceName: session.deviceName,
                })

                // 如果有断开时间，添加断开事件
                if (session.disconnectedAt) {
                    activities.push({
                        id: `${session.sessionId}-disconnected`,
                        deviceId: session.deviceId,
                        sessionId: session.sessionId,
                        timestamp: session.disconnectedAt,
                        type: 'disconnected',
                        deviceName: session.deviceName,
                    })
                }
            }

            // 按时间倒序排列
            activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

            // 合并到现有活动中（去重）
            set((state) => {
                const existingIds = new Set(state.activities.map((a) => a.id))
                const newActivities = activities.filter((a) => !existingIds.has(a.id))
                const merged = [...state.activities, ...newActivities]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, state.maxActivities)
                return { activities: merged, isLoading: false }
            })
        } catch (error) {
            console.error('[sessionActivityStore] Failed to load activities:', error)
            set({ isLoading: false })
        }
    },
}))
