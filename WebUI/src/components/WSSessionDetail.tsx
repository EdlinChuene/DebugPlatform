import { useState } from 'react'
import type { WSSessionDetail as WSSessionDetailType, WSFrame } from '@/types'
import { formatSmartTime } from '@/utils/format'
import { JSONTree } from './JSONTree'
import clsx from 'clsx'

interface WSSessionDetailProps {
  session: WSSessionDetailType | null
  frames: WSFrame[]
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  frameDirection: string
  onFrameDirectionChange: (direction: string) => void
}

export function WSSessionDetail({
  session,
  frames,
  loading,
  onLoadMore,
  hasMore,
  frameDirection,
  onFrameDirectionChange,
}: WSSessionDetailProps) {
  const [activeTab, setActiveTab] = useState<'frames' | 'info'>('frames')
  const [expandedFrameId, setExpandedFrameId] = useState<string | null>(null)

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted">
        <span className="text-4xl mb-3 opacity-50">👈</span>
        <p className="text-sm">选择一个 WebSocket 会话查看详情</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 会话头部 */}
      <div className="px-4 py-3 border-b border-border bg-bg-dark/50">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🔌</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-mono text-sm text-text-primary truncate">{session.url}</h3>
            <p className="text-xs text-text-muted">
              {session.frameCount} 帧 • 连接于 {formatSmartTime(session.connectTime)}
            </p>
          </div>
          <SessionStatusBadge
            isOpen={!session.disconnectTime}
            closeCode={session.closeCode}
          />
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="px-4 py-2 border-b border-border bg-bg-dark flex gap-2">
        <button
          onClick={() => setActiveTab('frames')}
          className={clsx(
            'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
            activeTab === 'frames'
              ? 'bg-primary/20 text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-light'
          )}
        >
          📨 消息帧 ({session.frameCount})
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={clsx(
            'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
            activeTab === 'info'
              ? 'bg-primary/20 text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-light'
          )}
        >
          ℹ️ 连接信息
        </button>
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'frames' && (
          <FramesTab
            frames={frames}
            loading={loading}
            onLoadMore={onLoadMore}
            hasMore={hasMore}
            expandedFrameId={expandedFrameId}
            onToggleExpand={setExpandedFrameId}
            direction={frameDirection}
            onDirectionChange={onFrameDirectionChange}
          />
        )}
        {activeTab === 'info' && <InfoTab session={session} />}
      </div>
    </div>
  )
}

function SessionStatusBadge({ isOpen, closeCode }: { isOpen: boolean; closeCode?: number | null }) {
  if (isOpen) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        连接中
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full bg-text-muted/10 text-text-muted border border-border">
      已关闭{closeCode ? ` (${closeCode})` : ''}
    </span>
  )
}

function FramesTab({
  frames,
  loading,
  onLoadMore,
  hasMore,
  expandedFrameId,
  onToggleExpand,
  direction,
  onDirectionChange,
}: {
  frames: WSFrame[]
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  expandedFrameId: string | null
  onToggleExpand: (id: string | null) => void
  direction: string
  onDirectionChange: (direction: string) => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* 筛选栏 */}
      <div className="px-4 py-2 border-b border-border/50 flex items-center gap-3">
        <select
          value={direction}
          onChange={(e) => onDirectionChange(e.target.value)}
          className="select text-xs"
        >
          <option value="">全部方向</option>
          <option value="send">发送 ↑</option>
          <option value="receive">接收 ↓</option>
        </select>
        <span className="text-xs text-text-muted">{frames.length} 条消息</span>
      </div>

      {/* 帧列表 */}
      <div className="flex-1 overflow-auto">
        {frames.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted py-8">
            <span className="text-3xl mb-2 opacity-50">📭</span>
            <p className="text-sm">暂无消息帧</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {frames.map((frame) => (
              <FrameItem
                key={frame.id}
                frame={frame}
                isExpanded={expandedFrameId === frame.id}
                onToggle={() => onToggleExpand(expandedFrameId === frame.id ? null : frame.id)}
              />
            ))}
          </div>
        )}

        {/* 加载更多 */}
        {hasMore && (
          <div className="px-4 py-3 text-center">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="btn btn-secondary text-xs"
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function FrameItem({
  frame,
  isExpanded,
  onToggle,
}: {
  frame: WSFrame
  isExpanded: boolean
  onToggle: () => void
}) {
  const isSend = frame.direction === 'send'
  const isText = frame.opcode === 'text'

  // 尝试解析 JSON
  let parsedPayload: unknown = null
  let isJson = false
  if (isText && frame.payloadPreview) {
    try {
      parsedPayload = JSON.parse(frame.payloadPreview)
      isJson = true
    } catch {
      // Not JSON
    }
  }

  return (
    <div
      className={clsx(
        'px-4 py-2 cursor-pointer transition-all',
        'hover:bg-bg-light/30',
        isExpanded && 'bg-bg-light/50'
      )}
      onClick={onToggle}
    >
      {/* 帧头部 */}
      <div className="flex items-center gap-3">
        {/* 方向图标 */}
        <span
          className={clsx(
            'w-6 h-6 rounded-full flex items-center justify-center text-xs',
            isSend ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
          )}
        >
          {isSend ? '↑' : '↓'}
        </span>

        {/* 预览 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-mono uppercase">{frame.opcode}</span>
            <span className="text-xs text-text-muted">{frame.payloadSize} bytes</span>
            {frame.isMocked && (
              <span className="text-2xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                MOCK
              </span>
            )}
          </div>
          {!isExpanded && (
            <p className="text-xs text-text-secondary truncate font-mono mt-0.5">
              {frame.payloadPreview || '(binary data)'}
            </p>
          )}
        </div>

        {/* 时间 */}
        <span className="text-xs text-text-muted">{formatSmartTime(frame.timestamp)}</span>

        {/* 展开指示 */}
        <span className={clsx('text-xs text-text-muted transition-transform', isExpanded && 'rotate-90')}>
          ▶
        </span>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="mt-3 ml-9">
          {isJson && parsedPayload ? (
            <div className="bg-bg-dark rounded-lg p-3 max-h-80 overflow-auto">
              <JSONTree data={parsedPayload} />
            </div>
          ) : (
            <pre className="bg-bg-dark rounded-lg p-3 text-xs font-mono text-text-secondary overflow-auto max-h-60 whitespace-pre-wrap break-all">
              {frame.payloadPreview || '(binary data)'}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

function InfoTab({ session }: { session: WSSessionDetailType }) {
  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      {/* 基本信息 */}
      <div className="glass-card p-4">
        <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
          连接信息
        </h4>
        <dl className="space-y-2 text-sm">
          <InfoRow label="URL" value={session.url} mono />
          <InfoRow label="连接时间" value={formatSmartTime(session.connectTime)} />
          {session.disconnectTime && (
            <InfoRow label="断开时间" value={formatSmartTime(session.disconnectTime)} />
          )}
          {session.closeCode && <InfoRow label="关闭码" value={String(session.closeCode)} />}
          {session.closeReason && <InfoRow label="关闭原因" value={session.closeReason} />}
          {session.subprotocols.length > 0 && (
            <InfoRow label="子协议" value={session.subprotocols.join(', ')} />
          )}
        </dl>
      </div>

      {/* 请求头 */}
      {Object.keys(session.requestHeaders).length > 0 && (
        <div className="glass-card p-4">
          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
            请求头
          </h4>
          <dl className="space-y-1.5">
            {Object.entries(session.requestHeaders).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-xs">
                <span className="text-primary font-medium">{key}:</span>
                <span className="text-text-secondary font-mono break-all">{value}</span>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="text-text-muted w-20 flex-shrink-0">{label}</dt>
      <dd className={clsx('text-text-primary break-all', mono && 'font-mono text-xs')}>{value}</dd>
    </div>
  )
}
