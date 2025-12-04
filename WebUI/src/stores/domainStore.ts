import { create } from 'zustand'
import { DomainPolicy } from '@/types'
import { api } from '@/services/api'

interface DomainStore {
  policies: DomainPolicy[]
  devicePolicies: DomainPolicy[] // Filtered by current device
  isLoading: boolean
  
  // Actions
  fetchPolicies: () => Promise<void>
  fetchDevicePolicies: (deviceId: string) => Promise<void>
  createOrUpdatePolicy: (policy: Partial<DomainPolicy>) => Promise<void>
  deletePolicy: (id: string) => Promise<void>
  
  // Getters
  getPolicyForDomain: (domain: string, deviceId?: string) => DomainPolicy | undefined
}

export const useDomainStore = create<DomainStore>((set, get) => ({
  policies: [],
  devicePolicies: [],
  isLoading: false,

  fetchPolicies: async () => {
    set({ isLoading: true })
    try {
      const policies = await api.get<DomainPolicy[]>('/api/domain-policies')
      set({ policies })
    } catch (error) {
      console.error('Failed to fetch domain policies', error)
    } finally {
      set({ isLoading: false })
    }
  },

  fetchDevicePolicies: async (deviceId: string) => {
    set({ isLoading: true })
    try {
      // Backend API supports getting all policies (global + device) via this endpoint
      const policies = await api.get<DomainPolicy[]>(`/api/devices/${deviceId}/domain-policies`)
      set({ devicePolicies: policies })
    } catch (error) {
      console.error('Failed to fetch device policies', error)
    } finally {
      set({ isLoading: false })
    }
  },

  createOrUpdatePolicy: async (policy) => {
    try {
      const saved = await api.post<DomainPolicy>('/api/domain-policies', policy)
      set((state) => {
        // Update in global list
        const exists = state.policies.find(p => p.domain === saved.domain && p.deviceId === saved.deviceId)
        let newPolicies = state.policies
        if (exists) {
            newPolicies = state.policies.map(p => (p.id === saved.id ? saved : p))
        } else {
            newPolicies = [...state.policies, saved]
        }
        
        // Update in device list if applicable
        let newDevicePolicies = state.devicePolicies
        const existsInDevice = state.devicePolicies.find(p => p.domain === saved.domain && p.deviceId === saved.deviceId)
        if (existsInDevice) {
            newDevicePolicies = state.devicePolicies.map(p => (p.id === saved.id ? saved : p))
        } else if (saved.deviceId === null || state.devicePolicies.some(p => p.deviceId === saved.deviceId)) {
             // Add if it's global or matches current list's device context
             // (Simplified logic: ideally we know the current view context)
             newDevicePolicies = [...state.devicePolicies, saved]
        }

        return {
            policies: newPolicies,
            devicePolicies: newDevicePolicies
        }
      })
    } catch (error) {
      console.error('Failed to save domain policy', error)
      throw error
    }
  },

  deletePolicy: async (id) => {
    try {
      await api.delete(`/api/domain-policies/${id}`)
      set((state) => ({
        policies: state.policies.filter(p => p.id !== id),
        devicePolicies: state.devicePolicies.filter(p => p.id !== id)
      }))
    } catch (error) {
      console.error('Failed to delete domain policy', error)
      throw error
    }
  },
  
  getPolicyForDomain: (domain: string, deviceId?: string) => {
    const { policies } = get()
    // Priority: Device Specific -> Global
    if (deviceId) {
        const devicePolicy = policies.find(p => p.domain === domain && p.deviceId === deviceId)
        if (devicePolicy) return devicePolicy
    }
    return policies.find(p => p.domain === domain && p.deviceId === null)
  }
}))
