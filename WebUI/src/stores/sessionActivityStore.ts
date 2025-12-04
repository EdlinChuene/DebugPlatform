import { create } from 'zustand'

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

    // Actions
    addActivity: (activity: SessionActivity) => void
    clearActivities: () => void
    getActivitiesForDevice: (deviceId: string) => SessionActivity[]
}

export const useSessionActivityStore = create<SessionActivityState>((set, get) => ({
    activities: [],
    maxActivities: 100, // 最多保留 100 条记录

    addActivity: (activity) =>
        set((state) => {
            const newActivities = [activity, ...state.activities].slice(0, state.maxActivities)
            return { activities: newActivities }
        }),

    clearActivities: () => set({ activities: [] }),

    getActivitiesForDevice: (deviceId) => {
        return get().activities.filter((a) => a.deviceId === deviceId)
    },
}))
