/**
 * BlobCell.tsx
 * BLOB 数据单元格渲染组件
 * 
 * 支持：
 * 1. 配置的列自动检测并匹配 Protobuf 类型（每行独立检测）
 * 2. 使用配置的 Protobuf Schema 解码显示
 * 3. 手动选择 Protobuf 类型
 * 4. 自动 Wire Format 解析
 * 5. 原始 Hex 展示
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import clsx from 'clsx'
import { useProtobufStore } from '@/stores/protobufStore'
import { WarningIcon, PackageIcon, SparklesIcon, ClipboardIcon, CheckIcon } from './icons'
import { tryAutoDecode, formatDecodedMessage } from '@/utils/protobufDescriptor'
import { GroupedFilterSelect } from './GroupedFilterSelect'
import { useDraggable } from '@/hooks/useDraggable'

interface BlobCellProps {
    /** Base64 编码的 BLOB 数据 */
    value: string
    /** 列名 */
    columnName: string
    /** 数据库 ID */
    dbId: string | null
    /** 表名 */
    tableName: string | null
}

type ViewMode = 'decoded' | 'wire' | 'hex'

/** 简化 protobuf 类型名称，移除前缀 */
function simplifyTypeName(fullName: string): string {
    // 只保留最后一个 . 之后的部分
    const lastDot = fullName.lastIndexOf('.')
    return lastDot >= 0 ? fullName.slice(lastDot + 1) : fullName
}

export function BlobCell({
    value,
    columnName,
    dbId,
    tableName,
}: BlobCellProps) {
    const {
        getColumnConfig,
        autoDetectTypeWithDescriptor,
        decodeBlobWithType,
        getDescriptorMessageTypes,
    } = useProtobufStore()

    const [isExpanded, setIsExpanded] = useState(false)
    const [viewMode, setViewMode] = useState<ViewMode>('decoded')
    const [decodedData, setDecodedData] = useState<Record<string, unknown> | null>(null)
    const [decodeError, setDecodeError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // 拖动功能
    const { position, isDragging, dragHandleProps, resetPosition } = useDraggable({
        enabled: isExpanded,
    })

    // 关闭弹窗时重置位置
    const handleClose = useCallback(() => {
        setIsExpanded(false)
        resetPosition()
    }, [resetPosition])

    // 自动检测相关状态
    const [autoDetecting, setAutoDetecting] = useState(false)
    const [autoDetectedType, setAutoDetectedType] = useState<string | null>(null)

    // 用户手动选择的类型（覆盖自动检测）
    const [manualSelectedType, setManualSelectedType] = useState<string>('')

    // 是否禁用描述符解析（用户点击 X 时设为 true）
    const [disableDescriptorDecode, setDisableDescriptorDecode] = useState(false)

    // 获取当前列的配置
    const columnConfig = dbId && tableName ? getColumnConfig(dbId, tableName, columnName) : null
    const descriptorName = columnConfig?.descriptorName || null

    // 获取描述符的所有消息类型
    const availableMessageTypes = descriptorName
        ? getDescriptorMessageTypes(descriptorName)
        : []

    // 当前使用的类型：手动选择 > 自动检测（禁用时都为空）
    const currentMessageType = disableDescriptorDecode ? '' : (manualSelectedType || autoDetectedType || '')

    // 当前显示的简化类型名（用于计算宽度）
    const displayTypeName = currentMessageType ? simplifyTypeName(currentMessageType) : '自动匹配'

    // 展开时自动检测类型（仅当列已配置描述符且未禁用时）
    useEffect(() => {
        if (!isExpanded || !value || !descriptorName) return

        // 禁用描述符解析或手动选择时跳过自动检测
        if (disableDescriptorDecode || manualSelectedType) return

        setAutoDetecting(true)
        autoDetectTypeWithDescriptor(descriptorName, value).then(result => {
            setAutoDetecting(false)
            if (result) {
                setAutoDetectedType(result)
            }
        })
    }, [isExpanded, value, descriptorName, manualSelectedType, disableDescriptorDecode, autoDetectTypeWithDescriptor])

    // 解码数据
    useEffect(() => {
        if (!value || !isExpanded) return
        if (viewMode !== 'decoded') return

        setIsLoading(true)
        setDecodeError(null)
        setDecodedData(null)

        const decodeWithType = async () => {
            const typeToUse = manualSelectedType || autoDetectedType

            if (typeToUse && descriptorName) {
                // 使用 Schema 解码
                const result = await decodeBlobWithType(descriptorName, typeToUse, value)
                setIsLoading(false)
                if (result.success) {
                    setDecodedData(result.data)
                    setDecodeError(null)
                } else {
                    setDecodedData(null)
                    setDecodeError(result.error)
                }
                return
            }

            // 尝试 Wire Format 解析
            const autoDecoded = tryAutoDecode(value)
            setDecodedData(autoDecoded)
            setDecodeError(autoDecoded ? null : '无法自动解析')
            setIsLoading(false)
        }

        decodeWithType()
    }, [value, isExpanded, viewMode, manualSelectedType, autoDetectedType, descriptorName, disableDescriptorDecode, decodeBlobWithType])

    // 处理选择类型（包括选择"自动匹配"选项）
    const handleTypeChange = (type: string) => {
        // 选择空字符串表示选择"自动匹配"选项，启用自动检测
        setManualSelectedType(type)
        setDisableDescriptorDecode(false)
    }

    // 处理点击 X 清除按钮：禁用描述符解析
    const handleClearType = () => {
        setManualSelectedType('')
        setDisableDescriptorDecode(true)
    }

    // 计算 BLOB 大小
    const blobSize = useMemo(() => {
        try {
            const binaryString = atob(value)
            return binaryString.length
        } catch {
            return 0
        }
    }, [value])

    // Hex 视图
    const hexView = useMemo(() => {
        try {
            const binaryString = atob(value)
            const bytes: string[] = []
            for (let i = 0; i < Math.min(binaryString.length, 256); i++) {
                bytes.push(binaryString.charCodeAt(i).toString(16).padStart(2, '0'))
            }
            return bytes
        } catch {
            return []
        }
    }, [value])

    // Wire Format 自动解析结果
    const wireDecoded = useMemo(() => {
        if (viewMode !== 'wire' || !isExpanded) return null
        return tryAutoDecode(value)
    }, [value, viewMode, isExpanded])

    // 计算弹窗宽度：根据当前选择（或自动匹配）的类型名长度自适应
    const dialogWidth = useMemo(() => {
        // 基础宽度用于显示头部和按钮
        const baseWidth = 380
        // 根据当前显示的类型名长度计算宽度
        // 每个字符约 8px，加上 padding (24px)、标签文字 (~90px)、下拉框边框 (2px)
        // X 按钮 (~20px)、下拉箭头 (~20px)、间距 (12px) = ~170px
        const typeWidth = displayTypeName.length * 8 + 170
        // 当处于自动匹配状态且有自动检测结果时，需要额外宽度显示 "✨ 自动匹配" 标签 (~80px)
        // 或者正在检测中时显示 "✨ 检测中..." (~70px)
        const autoMatchLabelWidth = (autoDetecting || (autoDetectedType && !manualSelectedType && !disableDescriptorDecode)) ? 85 : 0
        // 当有选中值时，显示 X 清除按钮需要额外空间
        const clearButtonWidth = currentMessageType ? 24 : 0
        return Math.max(baseWidth, Math.min(typeWidth + autoMatchLabelWidth + clearButtonWidth, 1000))
    }, [displayTypeName, autoDetecting, autoDetectedType, manualSelectedType, disableDescriptorDecode, currentMessageType])

    // ESC 键关闭弹窗
    useEffect(() => {
        if (!isExpanded) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isExpanded, handleClose])

    // 复制状态
    const [copied, setCopied] = useState(false)

    // 复制内容到剪贴板
    const handleCopy = useCallback((content: string) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }, [])

    // 获取当前可复制的内容
    const copyableContent = useMemo(() => {
        if (viewMode === 'decoded' && decodedData) {
            return formatDecodedMessage(decodedData)
        }
        if (viewMode === 'wire' && wireDecoded) {
            return formatDecodedMessage(wireDecoded)
        }
        if (viewMode === 'hex') {
            return hexView.join(' ')
        }
        return ''
    }, [viewMode, decodedData, wireDecoded, hexView])

    // 折叠状态的预览
    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                title="点击展开查看详情"
            >
                <PackageIcon size={14} className="opacity-70" />
                <span className="font-mono">
                    [BLOB {blobSize}B]
                </span>
            </button>
        )
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={handleClose}
        >
            <div
                className={clsx(
                    'bg-bg-dark rounded-lg border border-border shadow-2xl max-h-[80vh] flex flex-col',
                    isDragging ? '' : 'transition-[width] duration-200'
                )}
                style={{
                    width: `${dialogWidth}px`,
                    ...(position ? { transform: `translate(${position.x}px, ${position.y}px)` } : {}),
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 头部 - 可拖动 */}
                <div
                    className="flex items-center justify-between px-4 py-3 border-b border-border select-none"
                    {...dragHandleProps}
                >
                    <div className="flex items-center gap-2">
                        <PackageIcon size={16} className="text-purple-400" />
                        <span className="font-mono text-sm text-text-primary">{columnName}</span>
                        <span className="text-xs text-text-muted">({blobSize} bytes)</span>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 rounded hover:bg-bg-light text-text-muted hover:text-text-secondary transition-colors"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        ✕
                    </button>
                </div>

                {/* 类型选择器 - 仅当列已配置描述符时显示 */}
                {descriptorName && availableMessageTypes.length > 0 && (
                    <div className="px-4 py-2 border-b border-border bg-bg-darker/50">
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-text-muted shrink-0">Protobuf 类型:</span>
                            {disableDescriptorDecode ? (
                                // 禁用状态：显示恢复按钮
                                <button
                                    onClick={() => setDisableDescriptorDecode(false)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted hover:text-primary bg-bg-medium hover:bg-bg-light rounded-lg border border-border transition-colors"
                                >
                                    <SparklesIcon size={12} />
                                    启用 Protobuf 解析
                                </button>
                            ) : (
                                <>
                                    <div className="flex-1 min-w-0">
                                        <GroupedFilterSelect
                                            options={availableMessageTypes}
                                            value={currentMessageType}
                                            placeholder="自动匹配"
                                            formatOption={simplifyTypeName}
                                            showEmptyOption
                                            onChange={handleTypeChange}
                                            onClear={handleClearType}
                                        />
                                    </div>
                                    {autoDetecting && (
                                        <span className="flex items-center gap-1 text-2xs text-primary shrink-0">
                                            <SparklesIcon size={12} className="animate-pulse" />
                                            检测中...
                                        </span>
                                    )}
                                    {autoDetectedType && currentMessageType === autoDetectedType && !manualSelectedType && (
                                        <span className="flex items-center gap-1 text-2xs text-green-400 shrink-0">
                                            <SparklesIcon size={12} />
                                            自动匹配
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* 视图切换 */}
                <div className="flex gap-1 px-4 py-2 border-b border-border">
                    <button
                        onClick={() => setViewMode('decoded')}
                        className={clsx(
                            'px-3 py-1 text-xs rounded transition-colors',
                            viewMode === 'decoded'
                                ? 'bg-primary/20 text-primary'
                                : 'text-text-muted hover:text-text-secondary hover:bg-bg-light'
                        )}
                    >
                        {currentMessageType ? 'Schema 解码' : '自动解析'}
                    </button>
                    <button
                        onClick={() => setViewMode('wire')}
                        className={clsx(
                            'px-3 py-1 text-xs rounded transition-colors',
                            viewMode === 'wire'
                                ? 'bg-primary/20 text-primary'
                                : 'text-text-muted hover:text-text-secondary hover:bg-bg-light'
                        )}
                    >
                        Wire Format
                    </button>
                    <button
                        onClick={() => setViewMode('hex')}
                        className={clsx(
                            'px-3 py-1 text-xs rounded transition-colors',
                            viewMode === 'hex'
                                ? 'bg-primary/20 text-primary'
                                : 'text-text-muted hover:text-text-secondary hover:bg-bg-light'
                        )}
                    >
                        Hex
                    </button>

                    {/* 复制按钮 - 靠右 */}
                    <div className="flex-1" />
                    {copyableContent && (
                        <button
                            onClick={() => handleCopy(copyableContent)}
                            className={clsx(
                                'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
                                copied
                                    ? 'text-green-400 bg-green-400/10'
                                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-light'
                            )}
                            title={copied ? '已复制' : '复制内容'}
                        >
                            {copied ? (
                                <>
                                    <CheckIcon size={12} />
                                    已复制
                                </>
                            ) : (
                                <>
                                    <ClipboardIcon size={12} />
                                    复制
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* 内容 */}
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                    ) : viewMode === 'decoded' ? (
                        decodedData ? (
                            <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-all">
                                {formatDecodedMessage(decodedData)}
                            </pre>
                        ) : decodeError ? (
                            <div className="text-center py-8">
                                <div className="text-yellow-400 mb-2 flex justify-center"><WarningIcon size={24} /></div>
                                <p className="text-sm text-text-muted">{decodeError}</p>
                                {!descriptorName && (
                                    <p className="text-xs text-text-muted/50 mt-2">
                                        请在 Protobuf 配置中添加此列的描述符
                                    </p>
                                )}
                                {descriptorName && !currentMessageType && (
                                    <p className="text-xs text-text-muted/50 mt-2">
                                        请在上方选择 Protobuf 消息类型
                                    </p>
                                )}
                            </div>
                        ) : null
                    ) : viewMode === 'wire' ? (
                        wireDecoded ? (
                            <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-all">
                                {formatDecodedMessage(wireDecoded)}
                            </pre>
                        ) : (
                            <div className="text-center py-8 text-text-muted">
                                无法解析 Wire Format
                            </div>
                        )
                    ) : (
                        // Hex 视图
                        <div className="font-mono text-xs">
                            <div className="flex flex-wrap gap-1">
                                {hexView.map((byte, idx) => (
                                    <span
                                        key={idx}
                                        className={clsx(
                                            'px-1 py-0.5 rounded',
                                            idx % 16 < 8 ? 'bg-bg-light' : 'bg-bg-lighter'
                                        )}
                                    >
                                        {byte}
                                    </span>
                                ))}
                                {blobSize > 256 && (
                                    <span className="text-text-muted px-2">
                                        ... 还有 {blobSize - 256} bytes
                                    </span>
                                )}
                            </div>
                            <div className="mt-4 text-text-muted">
                                共 {blobSize} bytes
                            </div>
                        </div>
                    )}
                </div>

                {/* 底部提示 */}
                {!descriptorName && viewMode === 'decoded' && (
                    <div className="px-4 py-2 border-t border-border text-xs text-text-muted bg-bg-darker">
                        💡 提示：在 Protobuf 配置中为此列添加描述符可启用自动类型检测
                    </div>
                )}
            </div>
        </div>
    )
}

/**
 * 检测值是否是 Base64 编码的 BLOB
 */
export function isBase64Blob(value: string | null): boolean {
    if (!value || typeof value !== 'string') return false

    // 检查是否是有效的 Base64（长度是 4 的倍数，只包含 Base64 字符）
    if (value.length < 4 || value.length % 4 !== 0) return false

    // Base64 字符集
    const base64Regex = /^[A-Za-z0-9+/]+=*$/
    if (!base64Regex.test(value)) return false

    // 尝试解码并检查是否包含非打印字符（表示是二进制数据）
    try {
        const decoded = atob(value)
        let binaryCount = 0
        for (let i = 0; i < Math.min(decoded.length, 100); i++) {
            const code = decoded.charCodeAt(i)
            if (code < 32 || code > 126) {
                binaryCount++
            }
        }
        // 如果超过 30% 是非打印字符，认为是二进制数据
        return binaryCount / Math.min(decoded.length, 100) > 0.3
    } catch {
        return false
    }
}
