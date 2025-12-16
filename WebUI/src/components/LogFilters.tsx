import { useState, useRef, useEffect } from 'react'
import type { LogLevel } from '@/types'
import { SEARCH_HELP } from '@/utils/logSearch'
import clsx from 'clsx'
import { XMarkIcon, WarningIcon, InfoIcon, BugIcon, FileTextIcon } from './icons'
import { GroupedFilterSelect } from './GroupedFilterSelect'

interface Props {
  minLevel: LogLevel
  subsystems: string[]
  categories: string[]
  selectedSubsystem: string
  selectedCategory: string
  searchText: string
  searchQuery: string
  onMinLevelChange: (level: LogLevel) => void
  onSubsystemChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onSearchChange: (value: string) => void
  onSearchQueryChange: (value: string) => void
}

// 日志级别配置（从高到低排列，符合用户预期）
const logLevels: { level: LogLevel; label: string; icon: React.ReactNode; bgClass: string; textClass: string }[] = [
  { level: 'error', label: 'Error', icon: <XMarkIcon size={14} />, bgClass: 'bg-level-error', textClass: 'text-white' },
  { level: 'warning', label: 'Warning', icon: <WarningIcon size={14} />, bgClass: 'bg-level-warning', textClass: 'text-white' },
  { level: 'info', label: 'Info', icon: <InfoIcon size={14} />, bgClass: 'bg-level-info', textClass: 'text-white' },
  { level: 'debug', label: 'Debug', icon: <BugIcon size={14} />, bgClass: 'bg-level-debug', textClass: 'text-white' },
  { level: 'verbose', label: 'Verbose', icon: <FileTextIcon size={14} />, bgClass: 'bg-level-verbose', textClass: 'text-white' },
]

export function LogFilters({
  minLevel,
  subsystems,
  categories,
  selectedSubsystem,
  selectedCategory,
  searchText,
  searchQuery,
  onMinLevelChange,
  onSubsystemChange,
  onCategoryChange,
  onSearchChange,
  onSearchQueryChange,
}: Props) {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const helpRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭帮助
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelp(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Level Filters - 单选层级模式 */}
      <div className="flex gap-0.5">
        {logLevels.map(({ level, label, icon, bgClass, textClass }) => {
          const isActive = level === minLevel

          return (
            <button
              key={level}
              onClick={() => onMinLevelChange(level)}
              title={`显示 ${label} 及更高级别日志`}
              className={clsx(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap',
                isActive
                  ? `${bgClass} ${textClass} shadow-sm`
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-light'
              )}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Subsystem Filter - 使用分组筛选器 */}
      <GroupedFilterSelect
        options={subsystems}
        value={selectedSubsystem}
        placeholder="所有 Subsystem"
        onChange={onSubsystemChange}
      />

      {/* Category Filter - 使用分组筛选器 */}
      <GroupedFilterSelect
        options={categories}
        value={selectedCategory}
        placeholder="所有 Category"
        onChange={onCategoryChange}
      />

      {/* Search */}
      <div className="flex-1 flex items-center gap-2 min-w-[200px] max-w-[600px]">
        {/* 高级搜索切换 */}
        <button
          onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
          className={clsx(
            'px-2 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
            showAdvancedSearch
              ? 'bg-primary text-white'
              : 'bg-bg-light text-text-muted hover:text-text-secondary'
          )}
          title="切换高级搜索"
        >
          {showAdvancedSearch ? '高级' : '简单'}
        </button>

        {showAdvancedSearch ? (
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="level:error subsystem:Network message:timeout..."
              className="input w-full font-mono text-sm"
            />
            {/* 帮助按钮 */}
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              title="搜索语法帮助"
            >
              ?
            </button>

            {/* 帮助弹出框 */}
            {showHelp && (
              <div
                ref={helpRef}
                className="absolute top-full right-0 mt-2 w-80 p-3 bg-bg-dark border border-border rounded-lg shadow-xl z-50"
              >
                <h4 className="text-sm font-semibold text-text-primary mb-2">搜索语法</h4>
                <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono">
                  {SEARCH_HELP}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <input
            type="text"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索日志内容..."
            className="input flex-1"
          />
        )}
      </div>
    </div>
  )
}
