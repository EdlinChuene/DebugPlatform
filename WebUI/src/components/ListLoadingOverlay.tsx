import clsx from 'clsx'

interface Props {
    isLoading: boolean
    /** 显示在加载指示器旁边的文字，默认为 "刷新中..." */
    text?: string
}

/**
 * 列表刷新时的覆盖加载层
 *
 * 用于在列表刷新时提供强烈的视觉反馈，覆盖在列表内容之上。
 */
export function ListLoadingOverlay({ isLoading, text = '刷新中...' }: Props) {
    if (!isLoading) return null

    return (
        <div
            className={clsx(
                'absolute inset-0 z-50 flex items-center justify-center',
                'bg-bg-dark/60 backdrop-blur-sm',
                'animate-fadeIn'
            )}
        >
            <div className="flex items-center gap-3 px-5 py-3 rounded-lg bg-bg-dark/90 border border-border shadow-lg">
                <div className="relative w-5 h-5">
                    {/* 外圈 - 慢速旋转 */}
                    <div className="absolute inset-0 border-2 border-primary/30 rounded-full" />
                    {/* 内圈 - 快速旋转 */}
                    <div className="absolute inset-0 border-2 border-transparent border-t-primary rounded-full animate-spin" />
                </div>
                <span className="text-sm font-medium text-text-secondary">{text}</span>
            </div>
        </div>
    )
}
