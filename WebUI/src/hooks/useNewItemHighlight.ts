// useNewItemHighlight.ts
// 跟踪新增项并提供高亮动画状态
//
// Created by Sun on 2025/12/18.
// Copyright © 2025 Sun. All rights reserved.
//

import { useRef, useEffect, useState, useCallback } from 'react'

interface UseNewItemHighlightOptions {
    /** 高亮持续时间（毫秒），默认 1500ms */
    duration?: number
    /** 是否启用高亮，默认 true */
    enabled?: boolean
}

/**
 * 跟踪新增项并提供高亮状态
 * @param items 包含 id 的项数组
 * @param options 配置选项
 * @returns isNewItem 函数，判断某个 id 是否为新增项
 */
export function useNewItemHighlight<T extends { id: string }>(
    items: T[],
    options: UseNewItemHighlightOptions = {}
) {
    const { duration = 1500, enabled = true } = options

    // 上一次渲染时的 ID 集合
    const prevIdsRef = useRef<Set<string>>(new Set())
    // 是否已初始化（避免首次加载时全部高亮）
    const isInitializedRef = useRef(false)
    // 当前高亮的 ID 集合
    const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (!enabled || items.length === 0) {
            return
        }

        const currentIds = new Set(items.map(item => item.id))
        const prevIds = prevIdsRef.current

        // 首次加载时，记录 ID 但不高亮
        if (!isInitializedRef.current) {
            prevIdsRef.current = currentIds
            isInitializedRef.current = true
            return
        }

        // 找出新增的 ID
        const newIds = new Set<string>()
        currentIds.forEach(id => {
            if (!prevIds.has(id)) {
                newIds.add(id)
            }
        })

        // 如果有新增项，添加到高亮集合
        if (newIds.size > 0) {
            setHighlightedIds(prev => new Set([...prev, ...newIds]))

            // 在指定时间后移除高亮
            setTimeout(() => {
                setHighlightedIds(prev => {
                    const next = new Set(prev)
                    newIds.forEach(id => next.delete(id))
                    return next
                })
            }, duration)
        }

        // 更新引用
        prevIdsRef.current = currentIds
    }, [items, duration, enabled])

    // 判断某个 id 是否为新增项
    const isNewItem = useCallback((id: string): boolean => {
        return highlightedIds.has(id)
    }, [highlightedIds])

    // 重置状态（用于清空数据后）
    const reset = useCallback(() => {
        prevIdsRef.current = new Set()
        isInitializedRef.current = false
        setHighlightedIds(new Set())
    }, [])

    return { isNewItem, highlightedIds, reset }
}


