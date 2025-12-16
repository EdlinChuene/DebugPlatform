/**
 * useDraggable.ts
 * 拖动功能 Hook
 */

import { useState, useCallback, useRef, useEffect } from 'react'

interface Position {
    x: number
    y: number
}

interface UseDraggableOptions {
    /** 初始位置，默认居中 */
    initialPosition?: Position
    /** 是否启用拖动 */
    enabled?: boolean
}

interface UseDraggableReturn {
    /** 当前位置 */
    position: Position | null
    /** 拖动状态 */
    isDragging: boolean
    /** 绑定到拖动手柄的属性 */
    dragHandleProps: {
        onMouseDown: (e: React.MouseEvent) => void
        style: { cursor: string }
    }
    /** 重置位置到居中 */
    resetPosition: () => void
}

export function useDraggable(options: UseDraggableOptions = {}): UseDraggableReturn {
    const { initialPosition = null, enabled = true } = options

    const [position, setPosition] = useState<Position | null>(initialPosition)
    const [isDragging, setIsDragging] = useState(false)
    const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null)

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!enabled) return

        e.preventDefault()
        setIsDragging(true)

        // 如果还没有位置，使用当前元素的位置
        const currentX = position?.x ?? 0
        const currentY = position?.y ?? 0

        dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            posX: currentX,
            posY: currentY,
        }
    }, [enabled, position])

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !dragStartRef.current) return

        const deltaX = e.clientX - dragStartRef.current.mouseX
        const deltaY = e.clientY - dragStartRef.current.mouseY

        setPosition({
            x: dragStartRef.current.posX + deltaX,
            y: dragStartRef.current.posY + deltaY,
        })
    }, [isDragging])

    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
        dragStartRef.current = null
    }, [])

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
            return () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
            }
        }
    }, [isDragging, handleMouseMove, handleMouseUp])

    const resetPosition = useCallback(() => {
        setPosition(null)
    }, [])

    return {
        position,
        isDragging,
        dragHandleProps: {
            onMouseDown: handleMouseDown,
            style: { cursor: enabled ? 'move' : 'default' },
        },
        resetPosition,
    }
}
