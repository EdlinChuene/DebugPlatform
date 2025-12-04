import { useState, useEffect } from 'react'
import clsx from 'clsx'

interface DangerConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmWord?: string  // 需要输入的确认词，默认 "DELETE"
    confirmText?: string
    cancelText?: string
    loading?: boolean
}

export function DangerConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmWord = 'DELETE',
    confirmText = '确认删除',
    cancelText = '取消',
    loading = false,
}: DangerConfirmDialogProps) {
    const [inputValue, setInputValue] = useState('')
    const isConfirmEnabled = inputValue === confirmWord

    // Reset input when dialog opens/closes
    useEffect(() => {
        if (!isOpen) {
            setInputValue('')
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleConfirm = () => {
        if (isConfirmEnabled && !loading) {
            onConfirm()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && isConfirmEnabled) {
            handleConfirm()
        }
        if (e.key === 'Escape') {
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-bg-dark border border-border rounded-lg shadow-lg w-[440px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border bg-red-500/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-500/15">
                            <span className="text-xl">⚠️</span>
                        </div>
                        <h3 className="text-lg font-bold text-red-400">{title}</h3>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <p className="text-text-secondary whitespace-pre-line mb-4">{message}</p>

                    {/* Confirm Input */}
                    <div className="bg-bg-medium rounded-lg p-4 border border-border">
                        <p className="text-sm text-text-muted mb-2">
                            请输入 <code className="px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded font-mono font-bold">{confirmWord}</code> 以确认操作：
                        </p>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={confirmWord}
                            autoFocus
                            className={clsx(
                                "w-full px-3 py-2 bg-bg-dark border rounded text-text-primary font-mono focus:outline-none transition-colors",
                                inputValue === confirmWord
                                    ? "border-green-500 focus:border-green-400"
                                    : inputValue.length > 0
                                        ? "border-red-500/50 focus:border-red-400"
                                        : "border-border focus:border-primary"
                            )}
                        />
                        {inputValue.length > 0 && inputValue !== confirmWord && (
                            <p className="text-xs text-red-400 mt-1">输入不匹配</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-bg-medium/30 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-light transition-all disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isConfirmEnabled || loading}
                        className={clsx(
                            'px-4 py-2 rounded-lg text-sm font-medium text-white transition-all',
                            isConfirmEnabled
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-red-500/30 cursor-not-allowed',
                            loading && 'opacity-50'
                        )}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                处理中...
                            </span>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
