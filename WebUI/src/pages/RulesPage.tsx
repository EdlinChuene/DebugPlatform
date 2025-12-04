import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRuleStore } from '@/stores/ruleStore'
import { TrafficRule } from '@/types'
import clsx from 'clsx'

export function RulesPage() {
    const { rules, fetchRules, createOrUpdateRule, deleteRule, isLoading } = useRuleStore()
    const [editingRule, setEditingRule] = useState<Partial<TrafficRule> | null>(null)
    const [showEditor, setShowEditor] = useState(false)

    useEffect(() => {
        fetchRules()
    }, [])

    const handleCreateNew = () => {
        setEditingRule({
            name: '',
            matchType: 'domain',
            matchValue: '',
            action: 'highlight',
            isEnabled: true,
            priority: 0,
        })
        setShowEditor(true)
    }

    const handleEdit = (rule: TrafficRule) => {
        setEditingRule({ ...rule })
        setShowEditor(true)
    }

    const handleSave = async () => {
        if (!editingRule) return
        try {
            await createOrUpdateRule(editingRule)
            setShowEditor(false)
            setEditingRule(null)
        } catch (error) {
            console.error('Failed to save rule', error)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('确定要删除这条规则吗？')) {
            await deleteRule(id)
        }
    }

    const handleToggleEnabled = async (rule: TrafficRule) => {
        await createOrUpdateRule({ ...rule, isEnabled: !rule.isEnabled })
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <header className="px-6 py-4 bg-bg-dark border-b border-border">
                <div className="flex items-center gap-4">
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors group"
                    >
                        <span className="group-hover:-translate-x-1 transition-transform">←</span>
                        <span>返回</span>
                    </Link>

                    <div className="h-6 w-px bg-border" />

                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-border">
                            <span className="text-lg">⚙️</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-text-primary">Traffic Rules</h1>
                            <p className="text-xs text-text-muted">管理域名高亮、隐藏等过滤规则</p>
                        </div>
                    </div>

                    <button
                        onClick={handleCreateNew}
                        className="btn btn-primary"
                    >
                        + 新建规则
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-text-muted">
                        加载中...
                    </div>
                ) : rules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted">
                        <div className="text-4xl mb-4">📋</div>
                        <h2 className="text-lg font-medium text-text-primary mb-2">暂无规则</h2>
                        <p className="text-sm mb-4">点击"新建规则"添加流量过滤规则</p>
                        <button onClick={handleCreateNew} className="btn btn-primary">
                            + 新建规则
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rules.map((rule) => (
                            <div
                                key={rule.id}
                                className={clsx(
                                    "p-4 bg-bg-dark border border-border rounded-xl transition-all",
                                    !rule.isEnabled && "opacity-50"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleToggleEnabled(rule)}
                                            className={clsx(
                                                "w-10 h-6 rounded-full transition-colors relative",
                                                rule.isEnabled ? "bg-primary" : "bg-bg-light"
                                            )}
                                        >
                                            <span
                                                className={clsx(
                                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                                                    rule.isEnabled ? "left-5" : "left-1"
                                                )}
                                            />
                                        </button>
                                        <div>
                                            <div className="font-medium text-text-primary">{rule.name || rule.matchValue}</div>
                                            <div className="text-xs text-text-muted">
                                                {rule.matchType === 'domain' && '域名匹配'}
                                                {rule.matchType === 'urlRegex' && '正则匹配'}
                                                {rule.matchType === 'header' && '请求头匹配'}
                                                : <code className="text-text-secondary">{rule.matchValue}</code>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span
                                            className={clsx(
                                                "badge",
                                                rule.action === 'highlight' && "badge-warning",
                                                rule.action === 'hide' && "badge-danger",
                                                rule.action === 'mark' && "badge-info"
                                            )}
                                        >
                                            {rule.action === 'highlight' && '⭐ 高亮'}
                                            {rule.action === 'hide' && '🚫 隐藏'}
                                            {rule.action === 'mark' && '🏷️ 标记'}
                                        </span>
                                        <button
                                            onClick={() => handleEdit(rule)}
                                            className="btn btn-ghost px-3"
                                            title="编辑"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => rule.id && handleDelete(rule.id)}
                                            className="btn btn-ghost px-3 text-red-400 hover:bg-red-500/10"
                                            title="删除"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Rule Editor Modal */}
            {showEditor && editingRule && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setShowEditor(false)}
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <div className="bg-bg-dark border border-border rounded-2xl shadow-2xl w-full max-w-md">
                            <div className="p-4 border-b border-border">
                                <h2 className="text-lg font-semibold text-text-primary">
                                    {editingRule.id ? '编辑规则' : '新建规则'}
                                </h2>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">规则名称</label>
                                    <input
                                        type="text"
                                        value={editingRule.name || ''}
                                        onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                                        placeholder="例如：隐藏广告域名"
                                        className="w-full px-3 py-2 bg-bg-medium border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">匹配类型</label>
                                    <select
                                        value={editingRule.matchType || 'domain'}
                                        onChange={(e) => setEditingRule({ ...editingRule, matchType: e.target.value as any })}
                                        className="w-full px-3 py-2 bg-bg-medium border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                                    >
                                        <option value="domain">域名</option>
                                        <option value="urlRegex">URL 正则</option>
                                        <option value="header">请求头</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">匹配值</label>
                                    <input
                                        type="text"
                                        value={editingRule.matchValue || ''}
                                        onChange={(e) => setEditingRule({ ...editingRule, matchValue: e.target.value })}
                                        placeholder={editingRule.matchType === 'domain' ? 'example.com' : '.*\\.example\\.com'}
                                        className="w-full px-3 py-2 bg-bg-medium border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">动作</label>
                                    <select
                                        value={editingRule.action || 'highlight'}
                                        onChange={(e) => setEditingRule({ ...editingRule, action: e.target.value as any })}
                                        className="w-full px-3 py-2 bg-bg-medium border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
                                    >
                                        <option value="highlight">⭐ 高亮显示</option>
                                        <option value="hide">🚫 隐藏</option>
                                        <option value="mark">🏷️ 标记</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-4 border-t border-border flex justify-end gap-2">
                                <button
                                    onClick={() => setShowEditor(false)}
                                    className="btn btn-ghost"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="btn btn-primary"
                                    disabled={!editingRule.matchValue}
                                >
                                    保存
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
