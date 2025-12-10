import { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'
import { FilterIcon, ChevronDownIcon } from './icons'
import { Checkbox } from './Checkbox'

interface FilterOption {
    key: string
    label: string
    shortLabel: string
    checked: boolean
    onChange: (checked: boolean) => void
}

interface SelectOption {
    key: string
    label: string
    value: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
}

interface FilterPopoverProps {
    options: FilterOption[]
    selectOptions?: SelectOption[]
    className?: string
}

/// 筛选弹窗组件，用于收拢多个筛选选项
export function FilterPopover({ options, selectOptions = [], className }: FilterPopoverProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    // 获取已选中的筛选项
    const activeFilters = options.filter(opt => opt.checked)
    const activeSelects = selectOptions.filter(opt => opt.value !== '')
    const hasActiveFilters = activeFilters.length > 0 || activeSelects.length > 0

    // 构建显示文本
    const getDisplayText = () => {
        const parts: string[] = []
        activeSelects.forEach(opt => {
            const selectedOption = opt.options.find(o => o.value === opt.value)
            if (selectedOption) {
                parts.push(selectedOption.label)
            }
        })
        activeFilters.forEach(f => parts.push(f.shortLabel))
        return parts.join('、')
    }

    return (
        <div ref={containerRef} className={clsx("relative", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors",
                    hasActiveFilters
                        ? "bg-primary/15 text-primary border-primary hover:bg-primary/20"
                        : "bg-bg-light text-text-secondary border-border hover:text-text-primary hover:border-text-muted"
                )}
            >
                <FilterIcon size={14} />
                {hasActiveFilters ? (
                    <span className="flex items-center gap-1">
                        {getDisplayText()}
                    </span>
                ) : (
                    <span>过滤器</span>
                )}
                <ChevronDownIcon size={12} className={clsx("transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-bg-medium border border-border rounded-lg shadow-lg py-1 min-w-[200px] whitespace-nowrap">
                    {/* 选择选项（按钮组形式） */}
                    {selectOptions.map(opt => (
                        <div key={opt.key} className="px-3 py-2 border-b border-border">
                            <span className="text-xs text-text-muted mb-2 block">{opt.label}</span>
                            <div className="flex flex-wrap gap-1">
                                {opt.options.map(o => (
                                    <button
                                        key={o.value}
                                        onClick={() => opt.onChange(o.value)}
                                        className={clsx(
                                            'px-2 py-1 text-xs rounded transition-colors',
                                            opt.value === o.value
                                                ? 'bg-primary text-white'
                                                : 'bg-bg-light text-text-secondary hover:bg-bg-lighter hover:text-text-primary'
                                        )}
                                    >
                                        {o.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    {/* 复选框选项 */}
                    {options.map(opt => (
                        <label
                            key={opt.key}
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-light transition-colors"
                        >
                            <Checkbox
                                checked={opt.checked}
                                onChange={(checked) => opt.onChange(checked)}
                            />
                            <span className="text-sm text-text-primary">{opt.label}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    )
}
