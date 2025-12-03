import type { LogLevel } from '@/types'
import clsx from 'clsx'

interface Props {
  levels: LogLevel[]
  subsystems: string[]
  categories: string[]
  selectedSubsystem: string
  selectedCategory: string
  searchText: string
  onToggleLevel: (level: LogLevel) => void
  onSubsystemChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onSearchChange: (value: string) => void
}

const allLevels: { level: LogLevel; label: string; emoji: string; bgClass: string; textClass: string }[] = [
  { level: 'debug', label: 'Debug', emoji: '🔍', bgClass: 'bg-level-debug/15', textClass: 'text-level-debug' },
  { level: 'info', label: 'Info', emoji: 'ℹ️', bgClass: 'bg-level-info/15', textClass: 'text-level-info' },
  { level: 'warning', label: 'Warn', emoji: '⚠️', bgClass: 'bg-level-warning/15', textClass: 'text-level-warning' },
  { level: 'error', label: 'Error', emoji: '❌', bgClass: 'bg-level-error/15', textClass: 'text-level-error' },
  { level: 'fault', label: 'Fault', emoji: '💥', bgClass: 'bg-level-fault/15', textClass: 'text-level-fault' },
]

export function LogFilters({
  levels,
  subsystems,
  categories,
  selectedSubsystem,
  selectedCategory,
  searchText,
  onToggleLevel,
  onSubsystemChange,
  onCategoryChange,
  onSearchChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Level Filters */}
      <div className="flex gap-1">
        {allLevels.map(({ level, label, emoji, bgClass, textClass }) => {
          const isActive = levels.includes(level)
          return (
            <button
              key={level}
              onClick={() => onToggleLevel(level)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                isActive
                  ? `${bgClass} ${textClass} border border-current/30`
                  : 'bg-bg-light/50 text-text-muted hover:bg-bg-light border border-transparent'
              )}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Subsystem Filter */}
      <select
        value={selectedSubsystem}
        onChange={(e) => onSubsystemChange(e.target.value)}
        className="select text-sm"
      >
        <option value="">所有 Subsystem</option>
        {subsystems.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Category Filter */}
      <select
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="select text-sm"
      >
        <option value="">所有 Category</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Search */}
      <input
        type="text"
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="🔍 搜索日志内容..."
        className="input min-w-[200px]"
      />
    </div>
  )
}
