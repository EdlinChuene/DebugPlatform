/**
 * ProtobufConfigPanel.tsx
 * Protobuf 配置面板 - 步骤式引导
 * 
 * 配置流程：
 * 1. 上传 .desc 描述符文件（必需）
 * 2. 上传 CSV 映射表并配置（可选）
 * 3. 选择需要解析的 BLOB 列
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import clsx from 'clsx'
import { useProtobufStore, type ColumnConfig, type TypeMapping, type MappingTableMeta } from '@/stores/protobufStore'
import { TrashIcon, FolderIcon, PackageIcon, ChevronDownIcon, ChevronRightIcon, CheckIcon } from './icons'
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
        mappingTables,
        columnConfigs,
        uploadDescriptor,
        removeDescriptor,
        uploadMappingTable,
        configureMappingTableColumns,
        removeMappingTable,
        addColumnConfig,
        removeColumnConfig,
        getColumnConfig,
    } = useProtobufStore()

    const fileInputRef = useRef<HTMLInputElement>(null)
    const mappingFileInputRef = useRef<HTMLInputElement>(null)

    // 新增列配置的选择状态
    const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
    const [selectedDescriptor, setSelectedDescriptor] = useState<string>('')
    const [selectedMappingTable, setSelectedMappingTable] = useState<string>('')

    // 展开状态
    const [expandedDescriptor, setExpandedDescriptor] = useState<string | null>(null)
    const [expandedMappingTable, setExpandedMappingTable] = useState<string | null>(null)

    // 获取当前表的描述符、映射表和列配置（响应式）
    const tableDescriptors = useMemo(() => {
        if (!dbId || !tableName) return []
        return descriptorMeta.filter(d => d.dbId === dbId && d.tableName === tableName)
    }, [descriptorMeta, dbId, tableName])

    // 直接过滤，不使用 useMemo，确保响应式更新
    const tableMappingTables = (!dbId || !tableName) 
        ? [] 
        : mappingTables.filter(t => t.dbId === dbId && t.tableName === tableName)

    // 已配置好的映射表（可用于列配置）
    const configuredMappingTables = tableMappingTables.filter(
        t => t.keyColumn && t.valueColumn && t.dbSourceColumn
    )

    const tableColumnConfigs = useMemo(() => {
        if (!dbId || !tableName) return []
        return columnConfigs.filter(c => c.dbId === dbId && c.tableName === tableName)
    }, [columnConfigs, dbId, tableName])

    // BLOB 类型列
    const blobColumns = columns.filter(col => {
        const type = col.type?.toLowerCase()
        return type === 'blob' || type === null || type === ''
    })

    // 非 BLOB 列（可作为类型来源列）
    const nonBlobColumns = columns.filter(col => {
        const type = col.type?.toLowerCase()
        return type !== 'blob' && type !== null && type !== ''
    })

    // 未配置的 BLOB 列
    const unconfiguredBlobColumns = blobColumns.filter(
        col => !getColumnConfig(dbId || '', tableName || '', col.name)
    )

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !dbId || !tableName) return

        await uploadDescriptor(file, dbId, tableName)

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [uploadDescriptor, dbId, tableName])

    const handleMappingFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !dbId || !tableName) return

        await uploadMappingTable(file, dbId, tableName)

        if (mappingFileInputRef.current) {
            mappingFileInputRef.current.value = ''
        }
    }, [uploadMappingTable, dbId, tableName])

    // 添加列配置
    const handleAddColumnConfig = useCallback(() => {
        if (!dbId || !tableName || !selectedColumn || !selectedDescriptor) return

        // 找到选中的映射表
        const mappingTable = selectedMappingTable
            ? configuredMappingTables.find(t => t.name === selectedMappingTable)
            : null

        // 获取描述符的消息类型列表
        const descriptor = tableDescriptors.find(d => d.name === selectedDescriptor)
        const availableMessageTypes = descriptor?.messageTypes || []

        // 如果选择了映射表，自动生成 typeMappings
        let typeMappings: TypeMapping[] | undefined
        let typeSourceColumn: string | undefined

        if (mappingTable && mappingTable.keyColumn && mappingTable.valueColumn && mappingTable.dbSourceColumn) {
            typeSourceColumn = mappingTable.dbSourceColumn
            typeMappings = []

            for (const row of mappingTable.rows) {
                const key = row[mappingTable.keyColumn]
                const valueInTable = row[mappingTable.valueColumn]
                if (key && valueInTable) {
                    // 尝试在消息类型中匹配
                    const matchedType = availableMessageTypes.find(t => {
                        const shortName = t.split('.').pop() || t
                        return t === valueInTable ||
                            shortName.toLowerCase() === valueInTable.toLowerCase() ||
                            t.toLowerCase().endsWith('.' + valueInTable.toLowerCase())
                    })
                    if (matchedType) {
                        typeMappings!.push({
                            sourceValue: key,
                            messageType: matchedType,
                        })
                    }
                }
            }
        }

        addColumnConfig({
            dbId,
            tableName,
            columnName: selectedColumn,
            descriptorName: selectedDescriptor,
            mappingTableName: selectedMappingTable || undefined,
            typeSourceColumn,
            typeMappings,
        })

        // 重置选择
        setSelectedColumn(null)
        setSelectedDescriptor('')
        setSelectedMappingTable('')
    }, [dbId, tableName, selectedColumn, selectedDescriptor, selectedMappingTable, configuredMappingTables, tableDescriptors, addColumnConfig])

    // 步骤完成状态
    const step1Complete = tableDescriptors.length > 0
    const step3Complete = tableColumnConfigs.length > 0

    if (!dbId || !tableName) {
        return (
            <div className={clsx('bg-bg-dark rounded-lg border border-border shadow-lg', className)}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                        <PackageIcon size={16} className="text-purple-400" />
                        <h3 className="font-medium text-purple-400 text-sm">Protobuf 配置</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-2 py-1 rounded text-xs hover:bg-bg-light text-text-muted hover:text-text-secondary transition-colors"
                    >
                        收起
                    </button>
                </div>
                <div className="text-center py-12 text-text-muted">
                    <div className="text-3xl mb-2 opacity-50">👈</div>
                    <p className="text-sm">请先选择一个数据表</p>
                </div>
            </div>
        )
    }

    return (
        <div className={clsx('bg-bg-dark rounded-lg border border-border shadow-lg', className)}>
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <PackageIcon size={16} className="text-purple-400" />
                    <h3 className="font-medium text-purple-400 text-sm">Protobuf 配置</h3>
                    <span className="text-xs text-text-muted">· {tableName}</span>
                </div>
                <button
                    onClick={onClose}
                    className="px-2 py-1 rounded text-xs hover:bg-bg-light text-text-muted hover:text-text-secondary transition-colors"
                >
                    收起
                </button>
            </div>

            <div className="p-4 space-y-4">
                {error && (
                    <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                        {error}
                    </div>
                )}

                {/* ========== 步骤 1: 上传描述符 ========== */}
                <StepSection
                    step={1}
                    title="上传 Protobuf 描述符"
                    subtitle="使用 protoc --descriptor_set_out 生成 .desc 文件"
                    isComplete={step1Complete}
                    isRequired
                >
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
                        className="w-full px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? '加载中...' : <><FolderIcon size={16} /> 选择 .desc 文件</>}
                    </button>

                    {tableDescriptors.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {tableDescriptors.map((desc) => (
                                <DescriptorCard
                                    key={desc.name}
                                    descriptor={desc}
                                    isExpanded={expandedDescriptor === desc.name}
                                    onToggle={() => setExpandedDescriptor(
                                        expandedDescriptor === desc.name ? null : desc.name
                                    )}
                                    onRemove={() => removeDescriptor(desc.name)}
                                />
                            ))}
                        </div>
                    )}
                </StepSection>

                {/* ========== 步骤 2: 配置类型映射（可选） ========== */}
                <StepSection
                    step={2}
                    title="配置类型映射"
                    subtitle="上传 CSV 定义数据列值与 Protobuf 类型的对应关系"
                    isComplete={configuredMappingTables.length > 0}
                    isOptional
                >
                    <input
                        ref={mappingFileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleMappingFileUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => mappingFileInputRef.current?.click()}
                        disabled={loading}
                        className="w-full px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? '加载中...' : <><FolderIcon size={16} /> 选择 CSV 文件</>}
                    </button>

                    {tableMappingTables.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {tableMappingTables.map((table) => (
                                <MappingTableCard
                                    key={table.name}
                                    table={table}
                                    dbTableColumns={nonBlobColumns.map(c => c.name)}
                                    isExpanded={expandedMappingTable === table.name}
                                    onToggle={() => setExpandedMappingTable(
                                        expandedMappingTable === table.name ? null : table.name
                                    )}
                                    onConfigure={(keyCol, valCol, dbCol) => {
                                        configureMappingTableColumns(
                                            table.name,
                                            keyCol,
                                            valCol,
                                            tableDescriptors.flatMap(d => d.messageTypes),
                                            dbCol
                                        )
                                    }}
                                    onRemove={() => removeMappingTable(table.name)}
                                />
                            ))}
                        </div>
                    )}

                    {tableMappingTables.length === 0 && (
                        <p className="text-2xs text-text-muted/60 mt-2 text-center">
                            不配置映射表时，将使用自动类型检测
                        </p>
                    )}
                </StepSection>

                {/* ========== 步骤 3: 配置 BLOB 列 ========== */}
                <StepSection
                    step={3}
                    title="配置 BLOB 列"
                    subtitle="选择需要解析的 BLOB 列并关联描述符"
                    isComplete={step3Complete}
                    isRequired
                    disabled={!step1Complete}
                >
                    {!step1Complete ? (
                        <div className="text-center py-4 text-text-muted text-xs">
                            请先完成步骤 1
                        </div>
                    ) : blobColumns.length === 0 ? (
                        <div className="text-center py-4 text-text-muted text-xs">
                            当前表没有 BLOB 类型的列
                        </div>
                    ) : (
                        <>
                            {/* 已配置的列 */}
                            {tableColumnConfigs.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    <div className="text-xs text-text-muted">已配置:</div>
                                    {tableColumnConfigs.map((config) => (
                                        <ConfiguredColumnCard
                                            key={config.columnName}
                                            config={config}
                                            onRemove={() => removeColumnConfig(config.dbId, config.tableName, config.columnName)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* 添加新配置 */}
                            {unconfiguredBlobColumns.length > 0 && (
                                <div className="space-y-3 p-3 bg-bg-lighter rounded-lg border border-border">
                                    <div className="text-xs font-medium text-text-muted">添加配置:</div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-2xs text-text-muted mb-1">BLOB 列</label>
                                            <GroupedFilterSelect
                                                options={unconfiguredBlobColumns.map(col => col.name)}
                                                value={selectedColumn || ''}
                                                placeholder="选择列"
                                                onChange={(value) => setSelectedColumn(value || null)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-2xs text-text-muted mb-1">描述符</label>
                                            <GroupedFilterSelect
                                                options={tableDescriptors.map(desc => desc.name)}
                                                value={selectedDescriptor}
                                                placeholder="选择描述符"
                                                onChange={setSelectedDescriptor}
                                            />
                                        </div>
                                    </div>

                                    {/* 可选：选择映射表 */}
                                    {configuredMappingTables.length > 0 && (
                                        <div>
                                            <label className="block text-2xs text-text-muted mb-1">
                                                类型映射 <span className="text-text-muted/50">(可选)</span>
                                            </label>
                                            <GroupedFilterSelect
                                                options={configuredMappingTables.map(t => t.name)}
                                                value={selectedMappingTable}
                                                placeholder="不使用映射（自动检测）"
                                                showEmptyOption
                                                onChange={setSelectedMappingTable}
                                            />
                                        </div>
                                    )}

                                    <button
                                        onClick={handleAddColumnConfig}
                                        disabled={!selectedColumn || !selectedDescriptor}
                                        className="w-full px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        添加列配置
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </StepSection>

                {/* 配置摘要 */}
                {step3Complete && (
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                            <CheckIcon size={16} />
                            配置完成
                        </div>
                        <p className="text-xs text-text-muted mt-1">
                            已为 {tableColumnConfigs.length} 个 BLOB 列配置了 Protobuf 解析
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============================================================================
// StepSection - 步骤区块
// ============================================================================

interface StepSectionProps {
    step: number
    title: string
    subtitle: string
    isComplete: boolean
    isRequired?: boolean
    isOptional?: boolean
    disabled?: boolean
    children: React.ReactNode
}

function StepSection({
    step,
    title,
    subtitle,
    isComplete,
    isRequired,
    isOptional,
    disabled,
    children,
}: StepSectionProps) {
    return (
        <div className={clsx(
            'rounded-lg border border-border transition-colors overflow-hidden',
            disabled ? 'bg-bg-darker/50 opacity-60' : 'bg-bg-darker'
        )}>
            {/* 步骤头部 */}
            <div className="flex items-start gap-3 p-3 border-b border-border">
                <div className={clsx(
                    'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0',
                    isComplete
                        ? 'bg-green-500 text-white'
                        : 'bg-bg-light text-text-muted'
                )}>
                    {isComplete ? <CheckIcon size={14} /> : step}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-text-primary">{title}</span>
                        {isRequired && (
                            <span className="text-2xs text-red-400">*必需</span>
                        )}
                        {isOptional && (
                            <span className="text-2xs text-text-muted/50">可选</span>
                        )}
                    </div>
                    <p className="text-2xs text-text-muted mt-0.5">{subtitle}</p>
                </div>
            </div>

            {/* 步骤内容 */}
            <div className="p-3">
                {children}
            </div>
        </div>
    )
}

// ============================================================================
// DescriptorCard - 描述符卡片
// ============================================================================

interface DescriptorCardProps {
    descriptor: {
        name: string
        messageTypes: string[]
        uploadedAt: string
    }
    isExpanded: boolean
    onToggle: () => void
    onRemove: () => void
}

function DescriptorCard({ descriptor, isExpanded, onToggle, onRemove }: DescriptorCardProps) {
    return (
        <div className="bg-bg-light rounded-lg border border-border overflow-hidden">
            <div
                className="flex items-center p-2 cursor-pointer hover:bg-bg-lighter/50 transition-colors"
                onClick={onToggle}
            >
                <div className="p-1 text-text-muted">
                    {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
                </div>
                <div className="flex-1 min-w-0 ml-1">
                    <div className="font-mono text-sm text-text-primary truncate">{descriptor.name}</div>
                    <div className="text-2xs text-text-muted">
                        {descriptor.messageTypes.length} 个消息类型
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                    title="删除"
                >
                    <TrashIcon size={14} />
                </button>
            </div>

            {isExpanded && (
                <div className="border-t border-border p-2 bg-bg-darker/50">
                    <div className="max-h-32 overflow-auto">
                        <div className="text-2xs font-mono text-text-muted space-y-0.5">
                            {descriptor.messageTypes.map((type) => (
                                <div key={type} className="truncate hover:text-text-secondary">
                                    {type}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ============================================================================
// MappingTableCard - 映射表卡片
// ============================================================================

interface MappingTableCardProps {
    table: MappingTableMeta
    dbTableColumns: string[]
    isExpanded: boolean
    onToggle: () => void
    onConfigure: (keyColumn: string, valueColumn: string, dbColumn: string) => void
    onRemove: () => void
}

function MappingTableCard({
    table,
    dbTableColumns,
    isExpanded,
    onToggle,
    onConfigure,
    onRemove,
}: MappingTableCardProps) {
    // 直接从 store 获取最新的映射表状态，确保响应式更新
    const latestTable = useProtobufStore(
        state => state.mappingTables.find(t => t.name === table.name)
    ) || table
    
    const [selectedKeyColumn, setSelectedKeyColumn] = useState(latestTable.keyColumn || '')
    const [selectedValueColumn, setSelectedValueColumn] = useState(latestTable.valueColumn || '')
    const [selectedDbColumn, setSelectedDbColumn] = useState(latestTable.dbSourceColumn || '')
    const [configStatus, setConfigStatus] = useState<'idle' | 'success'>('idle')

    // 使用最新的表数据判断配置状态
    const isConfigured = !!latestTable.keyColumn && !!latestTable.valueColumn && !!latestTable.dbSourceColumn

    // 同步最新状态到本地
    useEffect(() => {
        if (latestTable.keyColumn) setSelectedKeyColumn(latestTable.keyColumn)
        if (latestTable.valueColumn) setSelectedValueColumn(latestTable.valueColumn)
        if (latestTable.dbSourceColumn) setSelectedDbColumn(latestTable.dbSourceColumn)
    }, [latestTable.keyColumn, latestTable.valueColumn, latestTable.dbSourceColumn])

    const handleApply = () => {
        if (selectedKeyColumn && selectedValueColumn && selectedDbColumn) {
            onConfigure(selectedKeyColumn, selectedValueColumn, selectedDbColumn)
            setConfigStatus('success')
            setTimeout(() => setConfigStatus('idle'), 1500)
        }
    }

    // 预览数据
    const previewData = useMemo(() => {
        if (!selectedKeyColumn || !selectedValueColumn) return []
        return table.rows.slice(0, 3).map(row => ({
            key: row[selectedKeyColumn] || '',
            value: row[selectedValueColumn] || '',
        }))
    }, [table.rows, selectedKeyColumn, selectedValueColumn])

    return (
        <div className="bg-bg-light rounded-lg border border-border overflow-hidden">
            <div
                className="flex items-center p-2 cursor-pointer hover:bg-bg-lighter/50 transition-colors"
                onClick={onToggle}
            >
                <div className="p-1 text-text-muted">
                    {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
                </div>
                <div className="flex-1 min-w-0 ml-1">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-blue-400">{table.name}</span>
                        <span className={clsx(
                            "px-1.5 py-0.5 text-2xs rounded",
                            isConfigured
                                ? "bg-green-500/20 text-green-400"
                                : "bg-yellow-500/20 text-yellow-400"
                        )}>
                            {isConfigured ? '已配置' : '待配置'}
                        </span>
                    </div>
                    <div className="text-2xs text-text-muted">
                        {table.rows.length} 行 · {table.columns.length} 列
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                    title="删除"
                >
                    <TrashIcon size={14} />
                </button>
            </div>

            {isExpanded && (
                <div className="border-t border-border p-3 space-y-3 bg-bg-darker/50">
                    {/* CSV 列配置 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-2xs text-text-muted mb-1">CSV 键列</label>
                            <GroupedFilterSelect
                                options={table.columns}
                                value={selectedKeyColumn}
                                placeholder="选择列"
                                onChange={setSelectedKeyColumn}
                            />
                        </div>
                        <div>
                            <label className="block text-2xs text-text-muted mb-1">CSV 值列</label>
                            <GroupedFilterSelect
                                options={table.columns}
                                value={selectedValueColumn}
                                placeholder="选择列"
                                onChange={setSelectedValueColumn}
                            />
                        </div>
                    </div>

                    {/* 数据库列关联 */}
                    <div>
                        <label className="block text-2xs text-text-muted mb-1">关联数据库列</label>
                        <GroupedFilterSelect
                            options={dbTableColumns}
                            value={selectedDbColumn}
                            placeholder="选择要关联的数据库列"
                            onChange={setSelectedDbColumn}
                        />
                        <p className="text-2xs text-text-muted/60 mt-1">
                            此列的值将在 CSV 键列中查找对应的 Protobuf 类型
                        </p>
                    </div>

                    {/* 预览 */}
                    {previewData.length > 0 && (
                        <div className="space-y-1">
                            <div className="text-2xs text-text-muted">预览:</div>
                            {previewData.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-bg-light rounded text-xs">
                                    <span className="font-mono text-yellow-400">{item.key}</span>
                                    <span className="text-text-muted">→</span>
                                    <span className="font-mono text-green-400 truncate">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 应用按钮 */}
                    <button
                        onClick={handleApply}
                        disabled={!selectedKeyColumn || !selectedValueColumn || !selectedDbColumn}
                        className={clsx(
                            "w-full px-3 py-1.5 rounded text-xs font-medium transition-colors",
                            configStatus === 'success'
                                ? "bg-green-500 text-white"
                                : "bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        {configStatus === 'success' ? '✓ 配置成功' : '保存配置'}
                    </button>
                </div>
            )}
        </div>
    )
}

// ============================================================================
// ConfiguredColumnCard - 已配置的列卡片
// ============================================================================

interface ConfiguredColumnCardProps {
    config: ColumnConfig
    onRemove: () => void
}

function ConfiguredColumnCard({ config, onRemove }: ConfiguredColumnCardProps) {
    // 计算有效映射数量（排除 sourceValue 为空的情况）
    const validMappingCount = config.typeMappings?.filter(
        m => m.sourceValue && m.sourceValue.trim() !== '' && m.messageType
    ).length || 0
    const hasMappingTable = !!config.mappingTableName && validMappingCount > 0

    return (
        <div className="flex items-center gap-2 p-2 bg-bg-light rounded-lg border border-border">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-primary">{config.columnName}</span>
                    {hasMappingTable ? (
                        <span className="px-1.5 py-0.5 text-2xs bg-green-500/20 text-green-400 rounded">
                            可匹配 {validMappingCount} 种类型
                        </span>
                    ) : (
                        <span className="px-1.5 py-0.5 text-2xs bg-blue-500/20 text-blue-400 rounded">
                            自动检测
                        </span>
                    )}
                </div>
                <div className="text-2xs text-text-muted truncate">
                    {config.descriptorName}
                    {config.mappingTableName && ` · ${config.mappingTableName}`}
                </div>
            </div>
            <button
                onClick={onRemove}
                className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                title="删除"
            >
                <TrashIcon size={14} />
            </button>
        </div>
    )
}
