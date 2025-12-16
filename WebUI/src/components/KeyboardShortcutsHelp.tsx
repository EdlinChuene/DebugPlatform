import { useEffect } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const shortcuts = [
  {
    category: '导航', items: [
      { keys: ['↑', '↓'], description: '上/下选择请求' },
      { keys: ['Enter'], description: '查看详情' },
      { keys: ['Esc'], description: '取消选择/关闭面板' },
    ]
  },
  {
    category: '操作', items: [
      { keys: ['⌘/Ctrl', 'K / F'], description: '全局搜索' },
      { keys: ['⌘/Ctrl', 'R'], description: '刷新列表' },
      { keys: ['⌘/Ctrl', 'L'], description: '清屏' },
      { keys: ['⌘/Ctrl', 'E'], description: '导出数据' },
      { keys: ['⌘/Ctrl', 'A'], description: '全选' },
    ]
  },
  {
    category: '收藏与删除', items: [
      { keys: ['F'], description: '收藏/取消收藏选中项' },
      { keys: ['Delete', '/', 'Backspace'], description: '删除选中项' },
    ]
  },
  {
    category: '界面', items: [
      { keys: ['⌘/Ctrl', 'T'], description: '切换主题' },
      { keys: ['⌘/Ctrl', '/'], description: '显示快捷键帮助' },
    ]
  },
]

export function KeyboardShortcutsHelp({ isOpen, onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-dark border border-border rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">键盘快捷键</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-light transition-colors text-text-muted hover:text-text-primary"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-medium text-text-muted mb-3">{section.category}</h3>
                <div className="space-y-2">
                  {section.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm text-text-secondary">{item.description}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center">
                            <kbd className="kbd">{key}</kbd>
                            {keyIndex < item.keys.length - 1 && (
                              <span className="mx-1 text-text-muted text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-bg-medium/50 text-center">
          <span className="text-xs text-text-muted">按 <kbd className="kbd">Esc</kbd> 关闭</span>
        </div>
      </div>
    </div>
  )
}
