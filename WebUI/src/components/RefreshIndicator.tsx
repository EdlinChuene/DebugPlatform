import { useEffect, useState } from 'react'

interface RefreshIndicatorProps {
    isRefreshing: boolean
}

/**
 * 页面刷新指示器 - 顶部进度条
 */
export function RefreshIndicator({ isRefreshing }: RefreshIndicatorProps) {
    const [visible, setVisible] = useState(false)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        if (isRefreshing) {
            setVisible(true)
            setProgress(0)

            // 模拟进度
            const timer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev
                    return prev + Math.random() * 10
                })
            }, 100)

            return () => clearInterval(timer)
        } else {
            // 完成时快速到 100%
            setProgress(100)
            const timer = setTimeout(() => {
                setVisible(false)
                setProgress(0)
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [isRefreshing])

    if (!visible) return null

    return (
        <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-primary/10">
            <div
                className="h-full bg-primary transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
            />
        </div>
    )
}

/**
 * 列表闪烁效果组件 - 用于标识列表正在刷新
 */
export function ListRefreshOverlay({ isRefreshing }: { isRefreshing: boolean }) {
    if (!isRefreshing) return null

    return (
        <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none z-10" />
    )
}
