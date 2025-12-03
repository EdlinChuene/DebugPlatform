import { useEffect, useRef } from 'react'
import type { WSSessionSummary } from '@/types'
import { formatSmartTime, extractDomain } from '@/utils/format'
import clsx from 'clsx'

interface WSSessionListProps {
  sessions: WSSessionSummary[]
  selectedId: string | null
  onSelect: (sessionId: string) => void
  loading?: boolean
  autoScroll?: boolean
}

export function WSSessionList({
  sessions,
  selectedId,
  onSelect,
  loading,
  autoScroll,
}: WSSessionListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const prevFirstIdRef = useRef<string | null>(null)

  // 自动滚动逻辑
  useEffect(() => {
    if (!autoScroll || sessions.length === 0) return

    const firstId = sessions[0]?.id
    if (firstId && firstId !== prevFirstIdRef.current && containerRef.current) {
      containerRef.current.scrollTop = 0
    }
    prevFirstIdRef.current = firstId
  }, [sessions, autoScroll])

  if (sessions.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted py-12">
        <span className="text-4xl mb-3 opacity-50">🔌</span>
        <p className="text-sm">暂无 WebSocket 会话</p>
        <p className="text-xs mt-1 text-text-muted">当设备建立 WebSocket 连接时会显示在这里</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="overflow-auto h-full">
      {/* 表头 */}
      <div className="sticky top-0 z-10 bg-bg-dark/95 backdrop-blur-sm border-b border-border">
        <div className="grid grid-cols-[1fr_120px_100px] gap-2 px-4 py-2 text-xs font-medium text-text-muted uppercase tracking-wider">
          <span>URL</span>
          <span>连接时间</span>
          <span>状态</span>
        </div>
      </div>

      {/* 会话列表 */}
      <div className="divide-y divide-border/50">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={clsx(
              'grid grid-cols-[1fr_120px_100px] gap-2 px-4 py-3 cursor-pointer transition-all',
              'hover:bg-bg-light/50',
              selectedId === session.id
                ? 'bg-primary/10 border-l-2 border-l-primary'
                : 'border-l-2 border-l-transparent'
            )}
          >
            {/* URL */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🔌</span>
                <span className="font-mono text-sm text-text-primary truncate">
                  {extractDomain(session.url)}
                </span>
              </div>
              <div className="text-xs text-text-muted truncate font-mono">
                {session.url}
              </div>
            </div>

            {/* 连接时间 */}
            <div className="text-xs text-text-secondary self-center">
              {formatSmartTime(session.connectTime)}
            </div>

            {/* 状态 */}
            <div className="self-center">
              <StatusBadge session={session} />
            </div>
          </div>
        ))}
      </div>

      {/* 加载指示器 */}
      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  )
}

function StatusBadge({ session }: { session: WSSessionSummary }) {
  if (session.isOpen) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        连接中
      </span>
    )
  }

  const closeCodeText = session.closeCode ? ` (${session.closeCode})` : ''

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full bg-text-muted/10 text-text-muted border border-border">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
      已关闭{closeCodeText}
    </span>
  )
}
