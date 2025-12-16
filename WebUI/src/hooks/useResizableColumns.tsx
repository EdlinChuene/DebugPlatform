/**
 * 可调整列宽的表格列配置 Hook
 * 
 * 支持：
 * - 拖拽调整列宽
 * - 存储列宽到 localStorage
 * - 最小列宽限制
 */
import { useState, useCallback, useRef, useEffect } from 'react'

export interface ColumnConfig {
    /** 列唯一标识 */
    id: string
    /** 列标题 */
    label: string
    /** 默认宽度（像素），undefined 表示弹性宽度 */
    defaultWidth?: number
    /** 最小宽度（像素） */
    minWidth?: number
    /** 最大宽度（像素） */
    maxWidth?: number
    /** 是否可调整宽度 */
    resizable?: boolean
    /** 是否弹性宽度（占用剩余空间） */
    flex?: boolean
}

export interface ColumnWidths {
    [columnId: string]: number
}

interface UseResizableColumnsOptions {
    /** 存储 key（用于 localStorage） */
    storageKey: string
    /** 列配置 */
    columns: ColumnConfig[]
}

interface UseResizableColumnsReturn {
    /** 当前列宽 */
    columnWidths: ColumnWidths
    /** 获取列样式 */
    getColumnStyle: (columnId: string) => React.CSSProperties
    /** 获取列头样式（与列样式相同） */
    getHeaderStyle: (columnId: string) => React.CSSProperties
    /** 是否正在调整大小 */
    isResizing: boolean
    /** 开始调整大小 */
    startResize: (columnId: string, startX: number) => void
    /** 重置列宽到默认值 */
    resetColumnWidths: () => void
}

/**
 * 可调整列宽的表格 Hook
 */
export function useResizableColumns({
    storageKey,
    columns,
}: UseResizableColumnsOptions): UseResizableColumnsReturn {
    // 计算默认列宽
    const getDefaultWidths = useCallback((): ColumnWidths => {
        const widths: ColumnWidths = {}
        for (const col of columns) {
            if (col.defaultWidth !== undefined) {
                widths[col.id] = col.defaultWidth
            }
        }
        return widths
    }, [columns])

    // 从 localStorage 加载列宽
    const loadStoredWidths = useCallback((): ColumnWidths => {
        try {
            const stored = localStorage.getItem(`column-widths-${storageKey}`)
            if (stored) {
                const parsed = JSON.parse(stored)
                // 合并默认值和存储值
                return { ...getDefaultWidths(), ...parsed }
            }
        } catch {
            // 忽略解析错误
        }
        return getDefaultWidths()
    }, [storageKey, getDefaultWidths])

    // 列宽状态
    const [columnWidths, setColumnWidths] = useState<ColumnWidths>(loadStoredWidths)

    // 调整大小状态
    const [isResizing, setIsResizing] = useState(false)
    const resizeStateRef = useRef<{
        columnId: string
        startX: number
        startWidth: number
    } | null>(null)

    // 保存列宽到 localStorage
    const saveWidths = useCallback((widths: ColumnWidths) => {
        try {
            localStorage.setItem(`column-widths-${storageKey}`, JSON.stringify(widths))
        } catch {
            // 忽略存储错误
        }
    }, [storageKey])

    // 获取列配置
    const getColumnConfig = useCallback((columnId: string): ColumnConfig | undefined => {
        return columns.find(col => col.id === columnId)
    }, [columns])

    // 开始调整大小
    const startResize = useCallback((columnId: string, startX: number) => {
        const config = getColumnConfig(columnId)
        if (!config || config.resizable === false || config.flex) return

        const currentWidth = columnWidths[columnId] ?? config.defaultWidth ?? 100

        resizeStateRef.current = {
            columnId,
            startX,
            startWidth: currentWidth,
        }
        setIsResizing(true)
    }, [columnWidths, getColumnConfig])

    // 处理鼠标移动
    useEffect(() => {
        if (!isResizing) return

        const handleMouseMove = (e: MouseEvent) => {
            if (!resizeStateRef.current) return

            const { columnId, startX, startWidth } = resizeStateRef.current
            const config = getColumnConfig(columnId)
            if (!config) return

            const delta = e.clientX - startX
            let newWidth = startWidth + delta

            // 应用最小/最大宽度限制
            const minWidth = config.minWidth ?? 50
            const maxWidth = config.maxWidth ?? 600

            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))

            setColumnWidths(prev => {
                const updated = { ...prev, [columnId]: newWidth }
                saveWidths(updated)
                return updated
            })
        }

        const handleMouseUp = () => {
            resizeStateRef.current = null
            setIsResizing(false)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isResizing, getColumnConfig, saveWidths])

    // 获取列样式
    const getColumnStyle = useCallback((columnId: string): React.CSSProperties => {
        const config = getColumnConfig(columnId)
        if (!config) return {}

        if (config.flex) {
            return { flex: 1, minWidth: config.minWidth ?? 100 }
        }

        const width = columnWidths[columnId] ?? config.defaultWidth
        if (width !== undefined) {
            return { width, flexShrink: 0 }
        }

        return {}
    }, [columnWidths, getColumnConfig])

    // 重置列宽
    const resetColumnWidths = useCallback(() => {
        const defaults = getDefaultWidths()
        setColumnWidths(defaults)
        saveWidths(defaults)
    }, [getDefaultWidths, saveWidths])

    return {
        columnWidths,
        getColumnStyle,
        getHeaderStyle: getColumnStyle, // 相同样式
        isResizing,
        startResize,
        resetColumnWidths,
    }
}

/**
 * 列调整手柄组件（同时作为列分割线）
 */
interface ResizeHandleProps {
    onMouseDown: (e: React.MouseEvent) => void
    isResizing?: boolean
}

export function ColumnResizeHandle({ onMouseDown, isResizing }: ResizeHandleProps) {
    return (
        <div
            className={`
                absolute right-0 top-0 bottom-0 w-px cursor-col-resize
                bg-border hover:bg-primary/50 transition-colors
                ${isResizing ? 'bg-primary w-0.5' : ''}
            `}
            onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onMouseDown(e)
            }}
        >
            {/* 更大的点击区域 */}
            <div className="absolute -left-1.5 -right-1.5 top-0 bottom-0" />
        </div>
    )
}

/**
 * 列分割线组件（不可调整大小的列使用）
 */
export function ColumnDivider() {
    return (
        <div className="absolute right-0 top-0 bottom-0 w-px bg-border" />
    )
}
