import type { MockRule, MockTargetType } from '@/types'
import { formatSmartTime } from '@/utils/format'
import clsx from 'clsx'

interface MockRuleListProps {
  rules: MockRule[]
  loading?: boolean
  onEdit: (rule: MockRule) => void
  onDelete: (ruleId: string) => void
  onToggleEnabled: (ruleId: string) => void
  onCreateNew: () => void
}

const targetTypeConfig: Record<MockTargetType, { label: string; icon: string; color: string }> = {
  httpRequest: { label: 'HTTP 请求', icon: '📤', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  httpResponse: { label: 'HTTP 响应', icon: '📥', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  wsOutgoing: { label: 'WS 发送', icon: '↑', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  wsIncoming: { label: 'WS 接收', icon: '↓', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
}

export function MockRuleList({
  rules,
  loading,
  onEdit,
  onDelete,
  onToggleEnabled,
  onCreateNew,
}: MockRuleListProps) {
  if (rules.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted py-12">
        <span className="text-5xl mb-4 opacity-50">🎭</span>
        <p className="text-lg font-medium mb-2">暂无 Mock 规则</p>
        <p className="text-sm mb-6">创建规则来模拟 API 响应或修改请求</p>
        <button onClick={onCreateNew} className="btn bg-primary text-white hover:bg-primary-dark">
          ✨ 创建第一条规则
        </button>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border/50">
      {rules.map((rule) => (
        <RuleItem
          key={rule.id}
          rule={rule}
          onEdit={() => onEdit(rule)}
          onDelete={() => onDelete(rule.id)}
          onToggleEnabled={() => onToggleEnabled(rule.id)}
        />
      ))}

      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  )
}

function RuleItem({
  rule,
  onEdit,
  onDelete,
  onToggleEnabled,
}: {
  rule: MockRule
  onEdit: () => void
  onDelete: () => void
  onToggleEnabled: () => void
}) {
  const config = targetTypeConfig[rule.targetType]
  const conditionSummary = getConditionSummary(rule)
  const actionSummary = getActionSummary(rule)

  return (
    <div
      className={clsx(
        'px-4 py-4 transition-all group',
        rule.enabled ? 'bg-transparent' : 'bg-bg-medium/30 opacity-60'
      )}
    >
      <div className="flex items-start gap-4">
        {/* 启用开关 */}
        <button
          onClick={onToggleEnabled}
          className={clsx(
            'w-10 h-6 rounded-full relative transition-all flex-shrink-0 mt-1',
            rule.enabled
              ? 'bg-primary'
              : 'bg-bg-light border border-border'
          )}
        >
          <span
            className={clsx(
              'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all',
              rule.enabled ? 'left-5' : 'left-1'
            )}
          />
        </button>

        {/* 规则内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题行 */}
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-medium text-text-primary">{rule.name}</h4>
            <span
              className={clsx(
                'inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border',
                config.color
              )}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
            </span>
            {!rule.deviceId && (
              <span className="text-2xs px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded">
                全局
              </span>
            )}
          </div>

          {/* 条件摘要 */}
          <div className="text-xs text-text-muted mb-1.5 space-y-0.5">
            {conditionSummary.map((item, i) => (
              <p key={i}>
                <span className="text-text-secondary">{item.label}:</span>{' '}
                <span className="font-mono">{item.value}</span>
              </p>
            ))}
          </div>

          {/* 动作摘要 */}
          <div className="text-xs text-text-muted">
            <span className="text-primary">→</span> {actionSummary}
          </div>

          {/* 元信息 */}
          <div className="flex items-center gap-3 mt-2 text-2xs text-text-muted">
            <span>优先级: {rule.priority}</span>
            {rule.updatedAt && <span>更新于 {formatSmartTime(rule.updatedAt)}</span>}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-bg-light text-text-muted hover:text-text-primary transition-all"
            title="编辑"
          >
            ✏️
          </button>
          <button
            onClick={() => {
              if (confirm('确定要删除这条规则吗？')) {
                onDelete()
              }
            }}
            className="p-2 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all"
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}

function getConditionSummary(rule: MockRule): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = []
  const c = rule.condition

  if (c.urlPattern) {
    items.push({ label: 'URL', value: c.urlPattern })
  }
  if (c.method) {
    items.push({ label: '方法', value: c.method })
  }
  if (c.statusCode) {
    items.push({ label: '状态码', value: String(c.statusCode) })
  }
  if (c.bodyContains) {
    items.push({ label: '包含', value: c.bodyContains })
  }
  if (c.wsPayloadContains) {
    items.push({ label: 'WS包含', value: c.wsPayloadContains })
  }

  if (items.length === 0) {
    items.push({ label: '匹配', value: '所有请求' })
  }

  return items
}

function getActionSummary(rule: MockRule): string {
  const a = rule.action
  const parts: string[] = []

  if (a.mockResponseStatusCode) {
    parts.push(`返回 ${a.mockResponseStatusCode}`)
  }
  if (a.modifyRequestHeaders && Object.keys(a.modifyRequestHeaders).length > 0) {
    parts.push('修改请求头')
  }
  if (a.modifyRequestBody) {
    parts.push('修改请求体')
  }
  if (a.mockResponseBody) {
    parts.push('自定义响应体')
  }
  if (a.mockWebSocketPayload) {
    parts.push('替换 WS 消息')
  }
  if (a.delayMilliseconds) {
    parts.push(`延迟 ${a.delayMilliseconds}ms`)
  }

  return parts.length > 0 ? parts.join(', ') : '无动作'
}
