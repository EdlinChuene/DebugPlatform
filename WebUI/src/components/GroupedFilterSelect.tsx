/**
 * 通用分组筛选选择器
 * 支持首字母分组、排序、关键字搜索
 */
import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { SearchIcon, XMarkIcon, ChevronDownIcon, CheckIcon } from './icons'

interface Props {
    /** 选项列表 */
    options: string[]
    /** 当前选中的值 */
    value: string
    /** 占位符文本（未选择时显示，同时也作为空选项的显示文本） */
    placeholder: string
    /** 值改变回调 */
    onChange: (value: string) => void
    /** 点击清除按钮的回调（如果不传，则调用 onChange('')） */
    onClear?: () => void
    /** 自定义选项显示文本，接收原始值返回显示文本 */
    formatOption?: (value: string) => string
    /** 是否显示空选项（即 placeholder 作为可选项），默认 false */
    showEmptyOption?: boolean
    /** 自定义样式类 */
    className?: string
}

/** 按首字母分组（使用格式化后的显示文本取首字母） */
function groupByFirstLetter(items: string[], formatFn?: (val: string) => string): Map<string, string[]> {
    const groups = new Map<string, string[]>()

    // 使用格式化后的文本进行排序
    const sorted = [...items].sort((a, b) => {
        const displayA = formatFn ? formatFn(a) : a
        const displayB = formatFn ? formatFn(b) : b
        return displayA.localeCompare(displayB, undefined, { sensitivity: 'base' })
    })

    for (const item of sorted) {
        // 获取格式化后文本的首字符，转大写
        const displayText = formatFn ? formatFn(item) : item
        const firstChar = displayText.charAt(0).toUpperCase()
        // 判断是否是字母
        const key = /^[A-Z]$/.test(firstChar) ? firstChar : '#'

        if (!groups.has(key)) {
            groups.set(key, [])
        }
        groups.get(key)!.push(item)
    }

    // 按字母顺序排序分组（# 放最后）
    const sortedGroups = new Map<string, string[]>()
    const keys = Array.from(groups.keys()).sort((a, b) => {
        if (a === '#') return 1
        if (b === '#') return -1
        return a.localeCompare(b)
    })
    for (const key of keys) {
        sortedGroups.set(key, groups.get(key)!)
    }

    return sortedGroups
}

export function GroupedFilterSelect({
    options,
    value,
    placeholder,
    onChange,
    onClear,
    formatOption,
    showEmptyOption = false,
    className,
}: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
    const containerRef = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // 格式化显示文本
    const formatDisplay = (val: string) => formatOption ? formatOption(val) : val

    // 计算下拉菜单位置
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            setDropdownPosition({
                top: rect.bottom + 4, // 4px margin
                left: rect.left,
                width: Math.max(rect.width, 256), // 最小宽度 256px
            })
        }
    }, [isOpen])

    // 点击外部关闭
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node
            if (
                containerRef.current && !containerRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // 打开时聚焦搜索框
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isOpen])

    // 筛选后的选项（同时搜索原始值和格式化后的显示文本）
    const filteredOptions = useMemo(() => {
        if (!searchText.trim()) return options
        const lowerSearch = searchText.toLowerCase()
        return options.filter(opt => {
            const displayVal = formatOption ? formatOption(opt) : opt
            return opt.toLowerCase().includes(lowerSearch) ||
                displayVal.toLowerCase().includes(lowerSearch)
        })
    }, [options, searchText, formatOption])

    // 分组后的选项（使用格式化函数取首字母）
    const groupedOptions = useMemo(() =>
        groupByFirstLetter(filteredOptions, formatOption),
        [filteredOptions, formatOption]
    )

    // 显示文本（当 showEmptyOption 时，空值也显示为选中状态）
    const displayText = value ? formatDisplay(value) : placeholder
    const isValueSelected = showEmptyOption || !!value

    // 处理选择
    const handleSelect = (opt: string) => {
        onChange(opt)
        setIsOpen(false)
        setSearchText('')
    }

    // 清除选择（点击 X 按钮）
    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onClear) {
            onClear()
        } else {
            onChange('')
        }
        setSearchText('')
    }

    // 处理键盘事件
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false)
            setSearchText('')
        }
    }

    return (
        <div ref={containerRef} className={clsx('relative', className)}>
            {/* 触发按钮 */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors w-full',
                    'bg-bg-medium border border-border hover:bg-bg-light',
                    isValueSelected ? 'text-text-primary' : 'text-text-muted',
                    isOpen && 'ring-1 ring-primary'
                )}
            >
                <span className="flex-1 text-left">{displayText}</span>
                <div className="flex items-center gap-1 shrink-0">
                    {/* 仅当有实际选中值且不是 showEmptyOption 模式下的空值时显示清除按钮 */}
                    {value && (
                        <span
                            onClick={handleClear}
                            className="p-0.5 rounded hover:bg-bg-dark text-text-muted hover:text-text-secondary cursor-pointer"
                        >
                            <XMarkIcon size={12} />
                        </span>
                    )}
                    <ChevronDownIcon
                        size={14}
                        className={clsx(
                            'text-text-muted transition-transform',
                            isOpen && 'rotate-180'
                        )}
                    />
                </div>
            </button>

            {/* 下拉面板 - 使用 Portal 渲染到 body，避免被父容器 overflow 裁切 */}
            {isOpen && createPortal(
                <div 
                    ref={dropdownRef}
                    className="fixed bg-bg-dark border border-border rounded-lg shadow-xl overflow-hidden"
                    style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                        zIndex: 9999,
                    }}
                >
                    {/* 搜索框 */}
                    <div className="p-2 border-b border-border">
                        <div className="relative">
                            <SearchIcon
                                size={14}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                            />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="搜索..."
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-bg-medium border border-border rounded-md focus:outline-none focus:border-primary"
                            />
                            {searchText && (
                                <button
                                    onClick={() => setSearchText('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                                >
                                    <XMarkIcon size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 选项列表 */}
                    <div className="max-h-64 overflow-y-auto">
                        {/* 默认选项（空值） */}
                        <button
                            onClick={() => handleSelect('')}
                            className={clsx(
                                'w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2',
                                !value
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-text-secondary hover:bg-bg-medium'
                            )}
                        >
                            {showEmptyOption && !value && (
                                <CheckIcon size={14} className="shrink-0" />
                            )}
                            <span className={showEmptyOption && value ? 'ml-[22px]' : ''}>{placeholder}</span>
                        </button>

                        {/* 分组列表 */}
                        {groupedOptions.size > 0 ? (
                            Array.from(groupedOptions.entries()).map(([letter, items]) => (
                                <div key={letter}>
                                    {/* 分组标题 */}
                                    <div className="sticky top-0 px-3 py-1 text-xs font-semibold text-text-muted bg-bg-dark border-y border-border">
                                        {letter}
                                    </div>
                                    {/* 分组内选项 */}
                                    {items.map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => handleSelect(opt)}
                                            className={clsx(
                                                'w-full px-3 py-1.5 text-left text-sm transition-colors truncate flex items-center gap-2',
                                                opt === value
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-text-primary hover:bg-bg-medium'
                                            )}
                                        >
                                            {showEmptyOption && opt === value && (
                                                <CheckIcon size={14} className="shrink-0" />
                                            )}
                                            <span className={showEmptyOption && opt !== value ? 'ml-[22px]' : ''}>{formatDisplay(opt)}</span>
                                        </button>
                                    ))}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-sm text-text-muted">
                                无匹配结果
                            </div>
                        )}
                    </div>

                    {/* 统计信息 */}
                    <div className="px-3 py-1.5 border-t border-border text-xs text-text-muted">
                        共 {options.length} 项
                        {searchText && filteredOptions.length !== options.length && (
                            <span>，已筛选 {filteredOptions.length} 项</span>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
