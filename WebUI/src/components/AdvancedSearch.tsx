import { useState, useCallback, useRef, useEffect } from 'react'
import clsx from 'clsx'

interface Props {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  placeholder?: string
}

// 搜索语法提示
const SEARCH_HINTS = [
  { syntax: 'method:POST', description: '按 HTTP 方法筛选' },
  { syntax: 'status:4xx', description: '按状态码范围筛选 (2xx, 3xx, 4xx, 5xx)' },
  { syntax: 'status:>400', description: '状态码大于 400' },
  { syntax: 'url:/api/users', description: 'URL 包含指定字符串' },
  { syntax: 'duration:>500ms', description: '耗时大于 500ms' },
  { syntax: 'duration:>1s', description: '耗时大于 1 秒' },
  { syntax: 'is:error', description: '仅显示错误请求 (4xx/5xx)' },
  { syntax: 'is:slow', description: '仅显示慢请求 (>1s)' },
  { syntax: 'is:mocked', description: '仅显示 Mock 请求' },
  { syntax: 'traceid:xxx', description: '按 TraceId 筛选' },
  { syntax: 'AND / OR', description: '组合多个条件' },
]

// 快捷筛选按钮
const QUICK_FILTERS = [
  { label: '错误', value: 'is:error' },
  { label: '慢请求', value: 'is:slow' },
  { label: 'Mock', value: 'is:mocked' },
  { label: 'POST', value: 'method:POST' },
  { label: 'GET', value: 'method:GET' },
  { label: '4xx', value: 'status:4xx' },
  { label: '5xx', value: 'status:5xx' },
]

export function AdvancedSearch({ value, onChange, onSearch, placeholder = '搜索请求...' }: Props) {
  const [showHints, setShowHints] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch()
      setShowHints(false)
    } else if (e.key === 'Escape') {
      setShowHints(false)
    }
  }, [onSearch])

  const handleFocus = () => {
    if (value.length === 0) {
      setShowHints(true)
    }
  }

  const handleBlur = () => {
    // 延迟关闭以允许点击提示
    setTimeout(() => setShowHints(false), 200)
  }

  const addFilter = (filter: string) => {
    const newValue = value ? `${value} ${filter}` : filter
    onChange(newValue)
    inputRef.current?.focus()
  }

  const insertSyntax = (syntax: string) => {
    const colonIndex = syntax.indexOf(':')
    if (colonIndex > 0) {
      const prefix = syntax.substring(0, colonIndex + 1)
      const newValue = value ? `${value} ${prefix}` : prefix
      onChange(newValue)
    } else {
      addFilter(syntax)
    }
    inputRef.current?.focus()
    setShowHints(false)
  }

  // 点击外部关闭帮助
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showHelp && !(e.target as Element).closest('.search-help-modal')) {
        setShowHelp(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showHelp])

  return (
    <div className="relative">
      {/* 搜索输入框 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-bg-dark border border-border rounded text-sm focus:outline-none focus:border-primary"
          />
          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={onSearch}
          className="px-4 py-2 bg-primary text-white rounded text-sm hover:bg-primary/80 transition-colors"
        >
          搜索
        </button>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="px-3 py-2 bg-bg-dark border border-border rounded text-sm hover:bg-bg-light transition-colors"
          title="搜索语法帮助"
        >
          ?
        </button>
      </div>

      {/* 快捷筛选 */}
      <div className="flex flex-wrap gap-2 mt-2">
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => addFilter(filter.value)}
            className={clsx(
              'px-2 py-1 text-xs rounded border transition-colors',
              value.includes(filter.value)
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-bg-dark border-border text-text-muted hover:bg-bg-light'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* 语法提示下拉 */}
      {showHints && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-dark border border-border rounded shadow-lg z-10 max-h-64 overflow-auto">
          <div className="p-2 text-xs text-text-muted border-b border-border">
            输入搜索语法或点击下方提示
          </div>
          {SEARCH_HINTS.map((hint) => (
            <button
              key={hint.syntax}
              onClick={() => insertSyntax(hint.syntax)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-bg-light flex items-center justify-between"
            >
              <code className="text-primary">{hint.syntax}</code>
              <span className="text-text-muted text-xs">{hint.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* 帮助弹窗 */}
      {showHelp && (
        <div className="search-help-modal absolute top-full left-0 mt-1 w-96 bg-bg-dark border border-border rounded shadow-lg z-20 p-4">
          <h3 className="font-medium mb-3">搜索语法帮助</h3>
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="text-text-muted mb-1">基础过滤</h4>
              <code className="text-xs bg-bg-light px-2 py-1 rounded block">
                method:POST status:4xx url:/api/users
              </code>
            </div>
            <div>
              <h4 className="text-text-muted mb-1">组合条件</h4>
              <code className="text-xs bg-bg-light px-2 py-1 rounded block">
                method:GET AND status:200
              </code>
              <code className="text-xs bg-bg-light px-2 py-1 rounded block mt-1">
                method:POST OR method:PUT
              </code>
            </div>
            <div>
              <h4 className="text-text-muted mb-1">数值比较</h4>
              <code className="text-xs bg-bg-light px-2 py-1 rounded block">
                duration:&gt;500ms status:&gt;=400
              </code>
            </div>
            <div>
              <h4 className="text-text-muted mb-1">快捷别名</h4>
              <ul className="text-xs space-y-1 text-text-muted">
                <li><code className="text-primary">is:error</code> → status 4xx 或 5xx</li>
                <li><code className="text-primary">is:slow</code> → duration &gt; 1s</li>
                <li><code className="text-primary">is:mocked</code> → Mock 请求</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
