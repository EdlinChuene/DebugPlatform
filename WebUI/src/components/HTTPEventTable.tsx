import { useEffect, useRef } from 'react'
import type { HTTPEventSummary } from '@/types'
import { type ListItem, isSessionDivider } from '@/stores/httpStore'
import {
  formatSmartTime,
  formatDuration,
  getDurationClass,
  getStatusClass,
  getMethodClass,
  truncateUrl,
  extractDomain,
} from '@/utils/format'
import clsx from 'clsx'
import { MockIcon, StarIcon, HttpIcon } from './icons'

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

  // 过滤掉会话分隔符，只显示 HTTP 事件
  const httpEvents = items.filter((item) => !isSessionDivider(item)) as HTTPEventSummary[]

  // 当有新事件添加到列表头部时自动滚动到顶部
  useEffect(() => {
    const firstEvent = httpEvents[0]
    const firstId = firstEvent?.id ?? null
    const hasNewItem = firstId !== null && firstId !== lastFirstItemRef.current

    if (autoScroll && containerRef.current && hasNewItem) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }

    lastFirstItemRef.current = firstId
  }, [httpEvents, autoScroll])

  const handleRowClick = (event: HTTPEventSummary, e: React.MouseEvent) => {
    if (isSelectMode && onToggleSelect) {
      e.preventDefault()
      onToggleSelect(event.id)
    } else {
      onSelect(event.id)
    }
  }

  const renderEventRow = (event: HTTPEventSummary) => {
    const isError = !event.statusCode || event.statusCode >= 400
    const isSelected = event.id === selectedId
    const isChecked = selectedIds.has(event.id)

    return (
      <tr
        key={event.id}
        onClick={(e) => handleRowClick(event, e)}
        className={clsx(
          'cursor-pointer transition-all duration-150 group',
          isError && !isSelected && 'bg-red-500/5 hover:bg-red-500/10',
          isSelected && 'bg-accent-blue/15 border-l-2 border-l-accent-blue',
          isChecked && !isSelected && 'bg-primary/15',
          !isSelected && !isChecked && !isError && 'hover:bg-bg-light/60'
        )}
      >
        {isSelectMode && (
          <td className="px-3 py-3.5 w-10" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggleSelect?.(event.id)}
              className="w-4 h-4 rounded border-border cursor-pointer accent-primary"
            />
          </td>
        )}

        {/* Time */}
        <td className={clsx(
          'px-4 py-3.5 whitespace-nowrap',
          isSelected ? 'text-accent-blue' : 'text-text-muted'
        )}>
          <span className="text-sm font-mono">{formatSmartTime(event.startTime)}</span>
        </td>

        {/* Method */}
        <td className="px-4 py-3.5">
          <span
            className={clsx(
              'inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-mono font-bold min-w-[60px] shadow-sm',
              getMethodClass(event.method)
            )}
          >
            {event.method}
          </span>
        </td>

        {/* Status */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1.5">
            <span
              className={clsx(
                'inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-mono font-semibold min-w-[44px] shadow-sm',
                getStatusClass(event.statusCode)
              )}
            >
              {event.statusCode ?? 'ERR'}
            </span>
          </div>
        </td>

        {/* URL */}
        <td className="px-4 py-3.5 max-w-md">
          <div className="flex flex-col gap-0.5">
            <span className={clsx(
              'text-sm truncate transition-colors',
              isSelected ? 'text-accent-blue font-medium' : 'text-text-primary group-hover:text-primary'
            )} title={event.url}>
              {truncateUrl(event.url)}
            </span>
            <span className={clsx(
              'text-xs truncate font-mono',
              isSelected ? 'text-accent-blue/70' : 'text-text-muted opacity-70'
            )}>
              {extractDomain(event.url)}
            </span>
          </div>
        </td>

        {/* Duration */}
        <td className="px-4 py-3.5 whitespace-nowrap">
          <span className={clsx(
            'text-sm font-mono font-medium',
            getDurationClass(event.duration)
          )}>
            {formatDuration(event.duration)}
          </span>
        </td>

        {/* Tags */}
        <td className="px-4 py-3.5 text-center">
          <div className="flex items-center justify-center gap-2">
            {event.isMocked && (
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 shadow-sm shadow-purple-500/10" title="已 Mock">
                <MockIcon size={14} />
              </span>
            )}
            {event.isFavorite && (
              <span className="badge-favorite text-base" title="已收藏">
                <StarIcon size={14} />
              </span>
            )}
            {!event.isMocked && !event.isFavorite && (
              <span className="w-7 h-7" />
            )}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-bg-medium z-10 border-b border-border">
          <tr className="text-left text-text-secondary">
            {isSelectMode && (
              <th className="px-3 py-3.5 w-10">
                <span className="sr-only">选择</span>
              </th>
            )}
            <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider">时间</th>
            <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider">方法</th>
            <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider">状态</th>
            <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider">URL / 域名</th>
            <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider">耗时</th>
            <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider w-20 text-center">标记</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {httpEvents.map((event) => renderEventRow(event))}
        </tbody>
      </table>

      {httpEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-text-muted py-20">
          <div className="w-16 h-16 rounded-lg bg-bg-light flex items-center justify-center mb-4 border border-border">
            <HttpIcon size={32} className="opacity-60" />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">暂无 HTTP 请求</p>
          <p className="text-xs text-text-muted">等待网络请求被捕获...</p>
        </div>
      )}
    </div>
  )
}
