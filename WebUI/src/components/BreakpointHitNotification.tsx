import { useEffect, useState, useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useBreakpointStore } from '@/stores/breakpointStore'
import clsx from 'clsx'
import { PauseIcon, XIcon, ArrowRightIcon } from './icons'

/// 全局断点命中通知组件
/// 当有请求命中断点时，在任意页面右上角显示浮动通知
export function BreakpointHitNotification() {
    const { pendingHits } = useBreakpointStore()
    const [dismissed, setDismissed] = useState(false)
    const [lastCount, setLastCount] = useState(0)
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()

    // 当有新断点时重置 dismissed 状态
    useEffect(() => {
        if (pendingHits.length > lastCount) {
            setDismissed(false)
        }
        setLastCount(pendingHits.length)
    }, [pendingHits.length, lastCount])

    // 判断是否已在 breakpoint 插件页面（用户可以直接看到断点面板）
    const isInBreakpointPlugin = location.pathname.includes('/device/') &&
        searchParams.get('plugin') === 'breakpoint'

    const handleNavigate = useCallback(() => {
        // 通过 URL 参数切换到 breakpoint 插件
        setSearchParams({ plugin: 'breakpoint' })
        setDismissed(true)
    }, [setSearchParams])

    const handleDismiss = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        setDismissed(true)
    }, [])

    // 不显示的情况
    if (pendingHits.length === 0 || dismissed) {
        return null
    }

    // 已经在 breakpoint 插件页不显示（用户可以直接看到断点面板）
    if (isInBreakpointPlugin) {
        return null
    }

    const latestHit = pendingHits[pendingHits.length - 1]
    const urlPath = latestHit?.request?.url
        ? (() => {
            try {
                return new URL(latestHit.request.url).pathname
            } catch {
                return latestHit.request.url
            }
        })()
        : ''

    return (
        <div
            className={clsx(
                'fixed top-4 right-4 z-[9999] w-80',
                'bg-orange-500/95 backdrop-blur-sm rounded-lg shadow-2xl',
                'border border-orange-400/50',
                'animate-slideInRight cursor-pointer',
                'hover:bg-orange-500 transition-colors'
            )}
            onClick={handleNavigate}
        >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-shrink-0">
                    <PauseIcon size={24} className="text-white animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium">
                        {pendingHits.length} 个断点等待处理
                    </h4>
                    <p className="text-white/80 text-xs truncate">
                        {latestHit?.request?.method} {urlPath}
                    </p>
                </div>
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
                    title="暂时关闭提示"
                >
                    <XIcon size={16} className="text-white" />
                </button>
            </div>

            {/* Action hint */}
            <div className="px-4 py-2 border-t border-white/20 flex items-center justify-between text-white/90 text-xs">
                <span>点击查看详情并处理</span>
                <ArrowRightIcon size={14} />
            </div>
        </div>
    )
}
