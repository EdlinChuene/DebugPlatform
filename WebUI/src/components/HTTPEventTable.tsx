import { useEffect, useRef } from 'react'
import type { HTTPEventSummary } from '@/types'
import { type ListItem, type SessionDivider, isSessionDivider } from '@/stores/httpStore'
import {
  formatSmartTime,
  formatDuration,
  getDurationClass,
  getStatusClass,
  getStatusText,
  getMethodClass,
  truncateUrl,
  extractDomain,
} from '@/utils/format'
import clsx from 'clsx'

interface Props {
  items: ListItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  autoScroll: boolean
  // 批量选择
  isSelectMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

export function HTTPEventTable({
  items,
  selectedId,
  onSelect,
  autoScroll,
  isSelectMode = false,
  selectedIds = new Set(),
  onToggleSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastFirstItemRef = useRef<string | null>(null)

  // 当有新事件添加到列表头部时自动滚动到顶部
  useEffect(() => {
    const firstItem = items[0]
    const firstId = firstItem
      ? isSessionDivider(firstItem)
        ? `divider-${firstItem.sessionId}`
        : firstItem.id
      : null
    const hasNewItem = firstId !== null && firstId !== lastFirstItemRef.current

    if (autoScroll && containerRef.current && hasNewItem) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }

    lastFirstItemRef.current = firstId
  }, [items, autoScroll])

  const handleRowClick = (event: HTTPEventSummary, e: React.MouseEvent) => {
    if (isSelectMode && onToggleSelect) {
      e.preventDefault()
      onToggleSelect(event.id)
    } else {
      onSelect(event.id)
    }
  }

  const renderSessionDivider = (divider: SessionDivider) => (
    <tr
      key={`divider-${divider.sessionId}-${divider.timestamp}`}
      className="bg-gradient-to-r from-transparent via-bg-medium to-transparent"
    >
      <td colSpan={isSelectMode ? 8 : 7} className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center',
            divider.isConnected ? 'bg-green-500/10' : 'bg-red-500/10'
          )}>
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                divider.isConnected ? 'bg-green-500 status-dot-online' : 'bg-red-500'
              )}
            />
          </div>
          <div className="flex-1">
            <span className={clsx(
              'text-sm font-medium',
              divider.isConnected ? 'text-green-400' : 'text-red-400'
            )}>
              {divider.isConnected ? '📱 设备已连接' : '📴 设备已断开'}
            </span>
            <span className="text-xs text-text-muted ml-3">
              {formatSmartTime(divider.timestamp)}
            </span>
          </div>
          {divider.isConnected && divider.sessionId && (
            <span className="text-xs text-text-muted font-mono bg-bg-light px-2 py-1 rounded">
              会话 {divider.sessionId.slice(0, 8)}
            </span>
          )}
        </div>
      </td>
    </tr>
  )

  const renderEventRow = (event: HTTPEventSummary) => {
    const isError = !event.statusCode || event.statusCode >= 400
    const isSelected = event.id === selectedId
    const isChecked = selectedIds.has(event.id)

    return (
      <tr
        key={event.id}
        onClick={(e) => handleRowClick(event, e)}
        className={clsx(
          'cursor-pointer border-b border-border-light transition-all group',
          isError && 'bg-red-500/5',
          isSelected && 'bg-bg-hover border-l-2 border-l-primary',
          isChecked && 'bg-primary/10',
          !isSelected && !isChecked && 'hover:bg-bg-light'
        )}
      >
        {isSelectMode && (
          <td className="px-3 py-3 w-10" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggleSelect?.(event.id)}
              className="w-4 h-4 rounded border-border cursor-pointer"
            />
          </td>
        )}
        
        {/* Time */}
        <td className="px-4 py-3 text-text-muted whitespace-nowrap">
          <span className="text-xs">{formatSmartTime(event.startTime)}</span>
        </td>
        
        {/* Method */}
        <td className="px-4 py-3">
          <span
            className={clsx(
              'inline-flex items-center justify-center px-2 py-0.5 rounded-md text-2xs font-mono font-bold min-w-[52px]',
              getMethodClass(event.method)
            )}
          >
            {event.method}
          </span>
        </td>
        
        {/* Status */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span
              className={clsx(
                'inline-flex items-center justify-center px-2 py-0.5 rounded-md text-2xs font-mono font-medium min-w-[36px]',
                getStatusClass(event.statusCode)
              )}
            >
              {event.statusCode ?? 'ERR'}
            </span>
            {event.statusCode && (
              <span className="text-2xs text-text-muted hidden group-hover:inline">
                {getStatusText(event.statusCode)}
              </span>
            )}
          </div>
        </td>
        
        {/* URL */}
        <td className="px-4 py-3 max-w-xs">
          <div className="flex flex-col">
            <span className="text-xs text-text-primary truncate" title={event.url}>
              {truncateUrl(event.url)}
            </span>
            <span className="text-2xs text-text-muted truncate">
              {extractDomain(event.url)}
            </span>
          </div>
        </td>
        
        {/* Duration */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={clsx('text-xs font-mono', getDurationClass(event.duration))}>
            {formatDuration(event.duration)}
          </span>
        </td>
        
        {/* Tags */}
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5">
            {event.isMocked && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-purple-500/10 text-purple-400" title="已 Mock">
                🎭
              </span>
            )}
            {event.isFavorite && (
              <span className="badge-favorite text-sm" title="已收藏">
                ★
              </span>
            )}
            {!event.isMocked && !event.isFavorite && (
              <span className="w-6 h-6" />
            )}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gradient-to-b from-bg-medium to-bg-dark z-10 border-b border-border">
          <tr className="text-left text-text-secondary">
            {isSelectMode && (
              <th className="px-3 py-3 w-10">
                <span className="sr-only">选择</span>
              </th>
            )}
            <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">时间</th>
            <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">方法</th>
            <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">状态</th>
            <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">URL / 域名</th>
            <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">耗时</th>
            <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider w-20 text-center">标记</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) =>
            isSessionDivider(item)
              ? renderSessionDivider(item)
              : renderEventRow(item)
          )}
        </tbody>
      </table>

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-text-muted py-20">
          <span className="text-4xl mb-4 opacity-50">🌐</span>
          <p className="text-sm">暂无 HTTP 请求</p>
          <p className="text-xs mt-1 text-text-muted">等待网络请求被捕获...</p>
        </div>
      )}
    </div>
  )
}
