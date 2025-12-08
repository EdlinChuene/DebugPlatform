import { useToastStore } from '@/stores/toastStore'
import clsx from 'clsx'

export function ToastContainer() {
    const { toasts, remove } = useToastStore()

    if (toasts.length === 0) return null

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={clsx(
                        'px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 min-w-[200px] max-w-[400px] animate-slide-in-up',
                        {
                            'bg-green-500/90 text-white': toast.type === 'success',
                            'bg-red-500/90 text-white': toast.type === 'error',
                            'bg-blue-500/90 text-white': toast.type === 'info',
                            'bg-yellow-500/90 text-black': toast.type === 'warning',
                        }
                    )}
                    onClick={() => remove(toast.id)}
                >
                    <span className="text-base">
                        {toast.type === 'success' && '✓'}
                        {toast.type === 'error' && '✕'}
                        {toast.type === 'info' && 'ℹ'}
                        {toast.type === 'warning' && '⚠'}
                    </span>
                    <span>{toast.message}</span>
                </div>
            ))}
        </div>
    )
}
