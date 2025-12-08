import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
    id: string
    type: ToastType
    message: string
}

interface ToastState {
    toasts: Toast[]
    show: (type: ToastType, message: string, duration?: number) => void
    remove: (id: string) => void
}

let toastId = 0

export const useToastStore = create<ToastState>((set, get) => ({
    toasts: [],

    show: (type: ToastType, message: string, duration = 3000) => {
        const id = `toast-${++toastId}`
        set((state) => ({
            toasts: [...state.toasts, { id, type, message }],
        }))

        // 自动移除
        setTimeout(() => {
            get().remove(id)
        }, duration)
    },

    remove: (id: string) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        }))
    },
}))
