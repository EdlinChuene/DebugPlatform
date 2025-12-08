import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
  /** 是否在输入框中也生效 */
  allowInInput?: boolean
}

/**
 * 全局键盘快捷键 Hook
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 检查是否在输入框中
      const target = event.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
        const altMatch = shortcut.alt ? event.altKey : !event.altKey

        // 对于 Ctrl/Cmd 快捷键，两个都允许
        const ctrlOrMeta = shortcut.ctrl
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey

        if (keyMatch && ctrlOrMeta && shiftMatch && altMatch) {
          if (isInput && !shortcut.allowInInput) {
            continue
          }

          event.preventDefault()
          shortcut.action()
          return
        }
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * 获取快捷键显示文本
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = []
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')

  if (shortcut.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl')
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift')
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt')
  }

  // 特殊按键映射
  const keyMap: Record<string, string> = {
    escape: 'Esc',
    enter: '↵',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    backspace: '⌫',
    delete: 'Del',
    ' ': 'Space',
  }

  const displayKey = keyMap[shortcut.key.toLowerCase()] || shortcut.key.toUpperCase()
  parts.push(displayKey)

  return parts.join(isMac ? '' : '+')
}

/**
 * 预定义的全局快捷键
 */
export const defaultShortcuts = {
  search: { key: 'k', ctrl: true, description: '搜索' },
  refresh: { key: 'r', ctrl: true, description: '刷新' },
  clear: { key: 'l', ctrl: true, description: '清屏' },
  export: { key: 'e', ctrl: true, description: '导出' },
  escape: { key: 'Escape', description: '取消/关闭' },
  selectAll: { key: 'a', ctrl: true, description: '全选' },
  delete: { key: 'Backspace', description: '删除选中' },
  favorite: { key: 'f', description: '收藏/取消收藏' },
  up: { key: 'ArrowUp', description: '上一条' },
  down: { key: 'ArrowDown', description: '下一条' },
  toggleTheme: { key: 't', ctrl: true, description: '切换主题' },
  help: { key: '/', ctrl: true, description: '显示快捷键帮助' },
}
