import { useState, useEffect, useCallback } from 'react'
import type { BreakpointRule, BreakpointPhase, BreakpointAction, BreakpointHit } from '@/types'
import {
    getBreakpointRules,
    createBreakpointRule,
    updateBreakpointRule,
    deleteBreakpointRule,
    getPendingBreakpoints,
    resumeBreakpoint,
} from '@/services/api'
import { BreakpointHitPanel } from './BreakpointHitPanel'
import clsx from 'clsx'
import { PauseIcon, EditIcon, TrashIcon } from './icons'

interface BreakpointManagerProps {
    deviceId: string
    pendingHits?: BreakpointHit[]
    onResumeBreakpoint?: (requestId: string, action: BreakpointAction) => void
}

export function BreakpointManager({ deviceId, pendingHits: externalHits, onResumeBreakpoint }: BreakpointManagerProps) {
    const [rules, setRules] = useState<BreakpointRule[]>([])
    const [loading, setLoading] = useState(false)
    const [editingRule, setEditingRule] = useState<Partial<BreakpointRule> | null>(null)
    const [showEditor, setShowEditor] = useState(false)
    const [activeTab, setActiveTab] = useState<'rules' | 'pending'>('rules')

    // 内部管理的 pending hits（如果外部没有提供）
    const [internalHits, setInternalHits] = useState<BreakpointHit[]>([])
    const [resuming, setResuming] = useState(false)

    const pendingHits = externalHits ?? internalHits

    const fetchRules = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getBreakpointRules(deviceId)
            setRules(data)
        } catch (error) {
            console.error('Failed to fetch breakpoint rules:', error)
        } finally {
            setLoading(false)
        }
    }, [deviceId])

    const fetchPendingHits = useCallback(async () => {
        if (externalHits !== undefined) return // 使用外部管理的 hits
        try {
            const data = await getPendingBreakpoints(deviceId)
            setInternalHits(data)
        } catch (error) {
            console.error('Failed to fetch pending breakpoints:', error)
        }
    }, [deviceId, externalHits])

    useEffect(() => {
        fetchRules()
        fetchPendingHits()

        // 定期轮询 pending hits
        const interval = setInterval(fetchPendingHits, 2000)
        return () => clearInterval(interval)
    }, [fetchRules, fetchPendingHits])

    // 当有 pending hits 时自动切换到 pending tab
    useEffect(() => {
        if (pendingHits.length > 0) {
            setActiveTab('pending')
        }
    }, [pendingHits.length])

    const handleCreate = () => {
        setEditingRule({
            name: '',
            urlPattern: '',
            method: '',
            phase: 'request',
            enabled: true,
            priority: 0,
        })
        setShowEditor(true)
    }

    const handleEdit = (rule: BreakpointRule) => {
        setEditingRule({ ...rule })
        setShowEditor(true)
    }

    const handleSave = async () => {
        if (!editingRule) return

        try {
            if (editingRule.id) {
                await updateBreakpointRule(deviceId, editingRule.id, editingRule)
            } else {
                await createBreakpointRule(deviceId, editingRule as Omit<BreakpointRule, 'id'>)
            }
            setShowEditor(false)
            setEditingRule(null)
            fetchRules()
        } catch (error) {
            console.error('Failed to save breakpoint rule:', error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这条断点规则吗？')) return
        try {
            await deleteBreakpointRule(deviceId, id)
            fetchRules()
        } catch (error) {
            console.error('Failed to delete breakpoint rule:', error)
        }
    }

    const handleToggleEnabled = async (rule: BreakpointRule) => {
        try {
            await updateBreakpointRule(deviceId, rule.id, { enabled: !rule.enabled })
            fetchRules()
        } catch (error) {
            console.error('Failed to toggle breakpoint rule:', error)
        }
    }

    const handleResumeBreakpoint = async (requestId: string, action: BreakpointAction) => {
        setResuming(true)
        try {
            if (onResumeBreakpoint) {
                onResumeBreakpoint(requestId, action)
            } else {
                await resumeBreakpoint(deviceId, requestId, action)
                // 移除已处理的 hit
                setInternalHits(prev => prev.filter(h => h.requestId !== requestId))
            }
        } catch (error) {
            console.error('Failed to resume breakpoint:', error)
        } finally {
            setResuming(false)
        }
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header with Tabs */}
            <div className="px-4 py-3 border-b border-border bg-bg-dark/50">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <PauseIcon size={24} className="text-text-primary" />
                        <div>
                            <h3 className="font-medium text-text-primary">断点管理</h3>
                            <p className="text-xs text-text-muted">拦截请求/响应并等待手动操作</p>
                        </div>
                    </div>
                    {activeTab === 'rules' && (
                        <button onClick={handleCreate} className="btn btn-primary text-sm">
                            + 新建规则
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1">
                    <button
                        onClick={() => setActiveTab('rules')}
                        className={clsx(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                            activeTab === 'rules'
                                ? 'bg-bg-light text-text-primary'
                                : 'text-text-muted hover:text-text-secondary hover:bg-bg-light/50'
                        )}
                    >
                        规则列表 ({rules.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={clsx(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-colors relative',
                            activeTab === 'pending'
                                ? 'bg-bg-light text-text-primary'
                                : 'text-text-muted hover:text-text-secondary hover:bg-bg-light/50'
                        )}
                    >
                        等待处理
                        {pendingHits.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                                {pendingHits.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'rules' ? (
                    /* Rule List */
                    <div className="h-full overflow-auto p-4">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-text-muted">加载中...</div>
                        ) : rules.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-text-muted">
                                <PauseIcon size={48} className="mb-3 opacity-50" />
                                <p className="text-sm mb-3">暂无断点规则</p>
                                <button onClick={handleCreate} className="btn btn-primary text-sm">
                                    + 新建规则
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rules.map((rule) => (
                                    <BreakpointRuleCard
                                        key={rule.id}
                                        rule={rule}
                                        onEdit={() => handleEdit(rule)}
                                        onDelete={() => handleDelete(rule.id)}
                                        onToggle={() => handleToggleEnabled(rule)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Pending Hits Panel */
                    <BreakpointHitPanel
                        hits={pendingHits}
                        onResume={handleResumeBreakpoint}
                        loading={resuming}
                    />
                )}
            </div>

            {/* Editor Modal */}
            {showEditor && editingRule && (
                <BreakpointRuleEditor
                    rule={editingRule}
                    onChange={setEditingRule}
                    onSave={handleSave}
                    onCancel={() => {
                        setShowEditor(false)
                        setEditingRule(null)
                    }}
                />
            )}
        </div>
    )
}

function BreakpointRuleCard({
    rule,
    onEdit,
    onDelete,
    onToggle,
}: {
    rule: BreakpointRule
    onEdit: () => void
    onDelete: () => void
    onToggle: () => void
}) {
    const phaseLabels: Record<BreakpointPhase, string> = {
        request: '请求阶段',
        response: '响应阶段',
        both: '双向拦截',
    }

    return (
        <div
            className={clsx(
                'p-4 bg-bg-dark border border-border rounded-xl transition-all',
                !rule.enabled && 'opacity-50'
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Toggle */}
                    <button
                        onClick={onToggle}
                        className={clsx(
                            'w-10 h-6 rounded-full transition-colors relative',
                            rule.enabled ? 'bg-primary' : 'bg-bg-light'
                        )}
                    >
                        <span
                            className={clsx(
                                'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                                rule.enabled ? 'left-5' : 'left-1'
                            )}
                        />
                    </button>

                    <div>
                        <div className="font-medium text-text-primary">{rule.name || '未命名规则'}</div>
                        <div className="text-xs text-text-muted flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-2xs">
                                {phaseLabels[rule.phase]}
                            </span>
                            {rule.method && (
                                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-2xs">
                                    {rule.method}
                                </span>
                            )}
                            {rule.urlPattern && (
                                <code className="text-text-secondary truncate max-w-[200px]">{rule.urlPattern}</code>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onEdit}
                        className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-light rounded-lg transition-colors"
                    >
                        <EditIcon size={16} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <TrashIcon size={16} />
                    </button>
                </div>
            </div>
        </div>
    )
}

function BreakpointRuleEditor({
    rule,
    onChange,
    onSave,
    onCancel,
}: {
    rule: Partial<BreakpointRule>
    onChange: (rule: Partial<BreakpointRule>) => void
    onSave: () => void
    onCancel: () => void
}) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-bg-dark border border-border rounded-2xl w-full max-w-lg p-6">
                <h3 className="text-lg font-medium text-text-primary mb-4">
                    {rule.id ? '编辑断点规则' : '新建断点规则'}
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-text-muted mb-1">规则名称</label>
                        <input
                            type="text"
                            value={rule.name || ''}
                            onChange={(e) => onChange({ ...rule, name: e.target.value })}
                            placeholder="例如：拦截登录接口"
                            className="input w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-text-muted mb-1">URL 匹配模式</label>
                        <input
                            type="text"
                            value={rule.urlPattern || ''}
                            onChange={(e) => onChange({ ...rule, urlPattern: e.target.value })}
                            placeholder="例如：*/api/login* 或留空匹配所有"
                            className="input w-full font-mono"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-text-muted mb-1">HTTP 方法</label>
                            <select
                                value={rule.method || ''}
                                onChange={(e) => onChange({ ...rule, method: e.target.value || null })}
                                className="select w-full"
                            >
                                <option value="">全部方法</option>
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                                <option value="PATCH">PATCH</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-text-muted mb-1">拦截阶段</label>
                            <select
                                value={rule.phase || 'request'}
                                onChange={(e) => onChange({ ...rule, phase: e.target.value as BreakpointPhase })}
                                className="select w-full"
                            >
                                <option value="request">请求阶段</option>
                                <option value="response">响应阶段</option>
                                <option value="both">双向拦截</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-text-muted mb-1">优先级</label>
                        <input
                            type="number"
                            value={rule.priority || 0}
                            onChange={(e) => onChange({ ...rule, priority: parseInt(e.target.value) || 0 })}
                            className="input w-full"
                        />
                        <p className="text-xs text-text-muted mt-1">数值越大优先级越高</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onCancel} className="btn btn-secondary">
                        取消
                    </button>
                    <button onClick={onSave} className="btn btn-primary">
                        保存
                    </button>
                </div>
            </div>
        </div>
    )
}
