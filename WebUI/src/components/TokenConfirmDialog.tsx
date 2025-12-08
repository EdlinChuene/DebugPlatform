import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { WarningIcon, KeyIcon } from './icons'
import { verifyToken } from '@/services/api'

interface TokenConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    loading?: boolean
}

/**
 * 需要 Token 验证的危险操作确认对话框
 *
 * 用户必须输入正确的服务器 Token 才能执行操作。
 */
export function TokenConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = '确认执行',
    cancelText = '取消',
    loading = false,
}: TokenConfirmDialogProps) {
    const [tokenInput, setTokenInput] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message: string } | null>(null)
    const [isTokenValid, setIsTokenValid] = useState(false)

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (!isOpen) {
            setTokenInput('')
            setVerifyResult(null)
            setIsTokenValid(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleVerify = async () => {
        if (!tokenInput.trim()) {
            setVerifyResult({ valid: false, message: '请输入 Token' })
            return
        }

        setIsVerifying(true)
        setVerifyResult(null)

        try {
            const result = await verifyToken(tokenInput.trim())
            setVerifyResult(result)
            setIsTokenValid(result.valid)
        } catch (err) {
            setVerifyResult({
                valid: false,
                message: '验证失败: ' + (err instanceof Error ? err.message : '未知错误'),
            })
            setIsTokenValid(false)
        } finally {
            setIsVerifying(false)
        }
    }

    const handleConfirm = () => {
        if (isTokenValid && !loading) {
            onConfirm()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (isTokenValid) {
                handleConfirm()
            } else {
                handleVerify()
            }
        }
        if (e.key === 'Escape') {
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-bg-dark border border-border rounded-lg shadow-lg w-[480px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border bg-red-500/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-500/15">
                            <WarningIcon size={24} className="text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-400">{title}</h3>
                            <p className="text-xs text-text-muted">此操作需要 Token 验证</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <p className="text-text-secondary whitespace-pre-line mb-4">{message}</p>

                    {/* Token Input */}
                    <div className="bg-bg-medium rounded-lg p-4 border border-border">
                        <p className="text-sm text-text-muted mb-2 flex items-center gap-2">
                            <KeyIcon size={14} />
                            请输入服务器 Token 以验证身份：
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value={tokenInput}
                                onChange={(e) => {
                                    setTokenInput(e.target.value)
                                    setVerifyResult(null)
                                    setIsTokenValid(false)
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="输入 Token..."
                                autoFocus
                                disabled={isTokenValid}
                                className={clsx(
                                    'flex-1 px-3 py-2 bg-bg-dark border rounded text-text-primary font-mono focus:outline-none transition-colors',
                                    isTokenValid
                                        ? 'border-green-500 bg-green-500/5'
                                        : verifyResult && !verifyResult.valid
                                            ? 'border-red-500/50 focus:border-red-400'
                                            : 'border-border focus:border-primary'
                                )}
                            />
                            <button
                                onClick={handleVerify}
                                disabled={isVerifying || isTokenValid || !tokenInput.trim()}
                                className={clsx(
                                    'px-4 py-2 rounded text-sm font-medium transition-all',
                                    isTokenValid
                                        ? 'bg-green-500 text-white'
                                        : 'bg-primary text-bg-darkest hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
                                )}
                            >
                                {isVerifying ? (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                                ) : isTokenValid ? (
                                    '已验证 ✓'
                                ) : (
                                    '验证'
                                )}
                            </button>
                        </div>

                        {/* 验证结果提示 */}
                        {verifyResult && (
                            <p
                                className={clsx(
                                    'text-xs mt-2',
                                    verifyResult.valid ? 'text-green-400' : 'text-red-400'
                                )}
                            >
                                {verifyResult.message}
                            </p>
                        )}
                    </div>

                    {/* Token Valid Message */}
                    {isTokenValid && (
                        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <p className="text-sm text-green-400">
                                ✓ Token 验证通过，您现在可以执行此操作。
                            </p>
                        </div>
                    )}
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
                        disabled={!isTokenValid || loading}
                        className={clsx(
                            'px-4 py-2 rounded-lg text-sm font-medium text-white transition-all',
                            isTokenValid
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-red-500/30 cursor-not-allowed',
                            loading && 'opacity-50'
                        )}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
