/**
 * ProtobufConfigPanel.tsx
 * Protobuf 描述符和列配置面板
 * 
 * 功能：
 * - 描述符关联到表（每张表有独立的描述符）
 * - 列配置只保存「列名」和「描述符名」（不保存消息类型）
 * - 消息类型由每条数据自动匹配
 */

import { useState, useRef, useCallback, useMemo } from 'react'
import clsx from 'clsx'
import { useProtobufStore } from '@/stores/protobufStore'
import { TrashIcon, FolderIcon, PackageIcon } from './icons'
import { GroupedFilterSelect } from './GroupedFilterSelect'

interface ProtobufConfigPanelProps {
    className?: string
    /** 当前选中的数据库 ID */
    dbId: string | null
    /** 当前选中的表名 */
    tableName: string | null
    /** 当前表的列列表 */
    columns: Array<{ name: string; type: string | null }>
    /** 关闭面板 */
    onClose: () => void
}

export function ProtobufConfigPanel({
    className,
    dbId,
    tableName,
    columns,
    onClose,
}: ProtobufConfigPanelProps) {
    const {
        loading,
        error,
        descriptorMeta,
        columnConfigs,
        uploadDescriptor,
        removeDescriptor,
        addColumnConfig,
        removeColumnConfig,
        getColumnConfig,
    } = useProtobufStore()

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [activeTab, setActiveTab] = useState<'descriptors' | 'columns'>('descriptors')
    const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
    const [selectedDescriptor, setSelectedDescriptor] = useState<string>('')

    // 获取当前表的描述符和列配置（响应式）
    const tableDescriptors = useMemo(() => {
        if (!dbId || !tableName) return []
        return descriptorMeta.filter(d => d.dbId === dbId && d.tableName === tableName)
    }, [descriptorMeta, dbId, tableName])

    const tableColumnConfigs = useMemo(() => {
        if (!dbId || !tableName) return []
        return columnConfigs.filter(c => c.dbId === dbId && c.tableName === tableName)
    }, [columnConfigs, dbId, tableName])

    // BLOB 类型列
    const blobColumns = columns.filter(col => {
        const type = col.type?.toLowerCase()
        return type === 'blob' || type === null || type === ''
    })

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !dbId || !tableName) return

        await uploadDescriptor(file, dbId, tableName)

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [uploadDescriptor, dbId, tableName])

    const handleAddColumnConfig = useCallback(() => {
        if (!dbId || !tableName || !selectedColumn || !selectedDescriptor) return

        addColumnConfig({
            dbId,
            tableName,
            columnName: selectedColumn,
            descriptorName: selectedDescriptor,
        })

        setSelectedColumn(null)
        setSelectedDescriptor('')
    }, [dbId, tableName, selectedColumn, selectedDescriptor, addColumnConfig])

    return (
        <div className={clsx('bg-bg-dark rounded-lg border border-border shadow-lg', className)}>
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <PackageIcon size={16} className="text-purple-400" />
                    <h3 className="font-medium text-text-primary text-sm">Protobuf 配置</h3>
                </div>
                <button
                    onClick={onClose}
                    className="px-2 py-1 rounded text-xs hover:bg-bg-light text-text-muted hover:text-text-secondary transition-colors"
                >
                    收起
                </button>
            </div>

            {/* 标签页 */}
            <div className="flex border-b border-border">
                <button
                    onClick={() => setActiveTab('descriptors')}
                    className={clsx(
                        'flex-1 px-4 py-2 text-xs font-medium transition-colors',
                        activeTab === 'descriptors'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-text-muted hover:text-text-secondary'
                    )}
                >
                    描述符 ({tableDescriptors.length})
                </button>
                <button
                    onClick={() => setActiveTab('columns')}
                    className={clsx(
                        'flex-1 px-4 py-2 text-xs font-medium transition-colors',
                        activeTab === 'columns'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-text-muted hover:text-text-secondary'
                    )}
                >
                    列配置 ({tableColumnConfigs.length})
                </button>
            </div>

            {/* 内容区 */}
            <div className="p-4">
                {!dbId || !tableName ? (
                    <div className="text-center py-8 text-text-muted">
                        <div className="text-3xl mb-2 opacity-50">👈</div>
                        <p className="text-sm">请先选择一个表</p>
                    </div>
                ) : activeTab === 'descriptors' ? (
                    <div className="space-y-4">
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".desc,.bin"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                                className="w-full px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-medium hover:bg-primary/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? '加载中...' : <><FolderIcon size={16} /> 上传 .desc 文件</>}
                            </button>
                            <p className="text-xs text-text-muted mt-2">
                                使用 <code className="bg-bg-light px-1 rounded">protoc --descriptor_set_out</code> 生成
                            </p>
                        </div>

                        {error && (
                            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                                {error}
                            </div>
                        )}

                        {tableDescriptors.length > 0 ? (
                            <div className="space-y-2">
                                {tableDescriptors.map((desc) => (
                                    <div key={desc.name} className="p-3 bg-bg-light rounded-lg border border-border">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-mono text-sm text-text-primary truncate">{desc.name}</div>
                                                <div className="text-xs text-text-muted mt-1">{desc.messageTypes.length} 个消息类型</div>
                                                <div className="text-2xs text-text-muted/50 mt-0.5">{new Date(desc.uploadedAt).toLocaleString()}</div>
                                            </div>
                                            <button
                                                onClick={() => removeDescriptor(desc.name)}
                                                className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="删除"
                                            >
                                                <TrashIcon size={14} />
                                            </button>
                                        </div>
                                        <div className="mt-2 max-h-24 overflow-auto">
                                            <div className="text-2xs font-mono text-text-muted space-y-0.5">
                                                {desc.messageTypes.slice(0, 10).map((type) => (
                                                    <div key={type} className="truncate">{type}</div>
                                                ))}
                                                {desc.messageTypes.length > 10 && (
                                                    <div className="text-text-muted/50">... 还有 {desc.messageTypes.length - 10} 个</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-text-muted">
                                <div className="text-3xl mb-2 opacity-50">📭</div>
                                <p className="text-sm">此表尚未上传描述符文件</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-xs text-text-muted">
                            当前表: <span className="font-mono text-text-secondary">{tableName}</span>
                        </div>

                        {tableColumnConfigs.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs font-medium text-text-muted">已配置的 BLOB 列:</div>
                                {tableColumnConfigs.map((config) => (
                                    <div key={config.columnName} className="flex items-center justify-between p-2 bg-bg-light rounded border border-border">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-mono text-sm text-primary">{config.columnName}</div>
                                            <div className="text-xs text-text-muted truncate">使用描述符: {config.descriptorName}</div>
                                        </div>
                                        <button
                                            onClick={() => removeColumnConfig(config.dbId, config.tableName, config.columnName)}
                                            className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {tableDescriptors.length > 0 && blobColumns.length > 0 ? (
                            <div className="space-y-3 p-3 bg-bg-lighter rounded-lg border border-border">
                                <div className="text-xs font-medium text-text-muted">添加 BLOB 列配置:</div>
                                <div>
                                    <label className="block text-2xs text-text-muted mb-1">BLOB 列</label>
                                    <GroupedFilterSelect
                                        options={blobColumns.filter(col => !getColumnConfig(dbId, tableName, col.name)).map(col => col.name)}
                                        value={selectedColumn || ''}
                                        placeholder="请选择"
                                        onChange={(value) => setSelectedColumn(value || null)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-2xs text-text-muted mb-1">描述符</label>
                                    <GroupedFilterSelect
                                        options={tableDescriptors.map(desc => desc.name)}
                                        value={selectedDescriptor}
                                        placeholder="请选择"
                                        onChange={setSelectedDescriptor}
                                    />
                                </div>
                                <p className="text-2xs text-text-muted/70">消息类型将在查看每条数据时自动匹配</p>
                                <button
                                    onClick={handleAddColumnConfig}
                                    disabled={!selectedColumn || !selectedDescriptor}
                                    className="w-full px-3 py-1.5 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                >
                                    添加配置
                                </button>
                            </div>
                        ) : tableDescriptors.length === 0 ? (
                            <div className="text-center py-4 text-text-muted text-xs">请先在"描述符"标签页上传描述符文件</div>
                        ) : (
                            <div className="text-center py-4 text-text-muted text-xs">当前表没有 BLOB 类型的列</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
