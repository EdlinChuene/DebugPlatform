// 加载更多按钮组件
// 用于 HTTP 和 Log 列表底部，手动触发加载下一页
//
// Created by Sun on 2025/12/15.
// Copyright © 2025 Sun. All rights reserved.
//

import clsx from 'clsx'

interface Props {
    /** 点击回调 */
    onClick: () => void
    /** 是否正在加载 */
    isLoading?: boolean
    /** 是否还有更多数据 */
    hasMore: boolean
    /** 已加载数量 */
    loadedCount: number
    /** 总数量 */
    totalCount: number
}

export function LoadMoreButton({
    onClick,
    isLoading = false,
    hasMore,
    loadedCount,
    totalCount,
}: Props) {
    if (!hasMore) {
        // 没有更多数据时显示提示
        return (
            <div className="py-4 text-center">
                <span className="text-xs text-text-muted">
                    没有更多数据了
                </span>
            </div>
        )
    }

    return (
        <div className="py-4 px-4">
            <button
                onClick={onClick}
                disabled={isLoading}
                className={clsx(
                    'w-full py-2.5 px-4 rounded-lg text-xs font-medium transition-all',
                    'bg-primary/10 text-primary',
                    'hover:bg-primary/20',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24">
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        加载中...
                    </span>
                ) : (
                    <span>
                        点击加载更多（已加载 {loadedCount} / {totalCount}）
                    </span>
                )}
            </button>
        </div>
    )
}
