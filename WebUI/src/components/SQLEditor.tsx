/**
 * SQLEditor.tsx
 * 基于 Monaco Editor 的 SQL 编辑器
 * 
 * 功能：
 * - SQL 语法高亮
 * - 自动补全（表名、列名、SQL 关键字）
 * - 错误提示
 * - 快捷键支持（Ctrl/Cmd + Enter 执行）
 */

import { useRef, useCallback, useEffect } from 'react'
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react'
import type { editor, languages, IDisposable } from 'monaco-editor'
import type * as Monaco from 'monaco-editor'

interface SQLEditorProps {
    /** SQL 语句内容 */
    value: string
    /** 内容变化回调 */
    onChange: (value: string) => void
    /** 执行 SQL 回调（Ctrl/Cmd + Enter） */
    onExecute?: () => void
    /** 占位符文本 */
    placeholder?: string
    /** 编辑器高度 */
    height?: string | number
    /** 可用的表名列表（用于自动补全） */
    tables?: string[]
    /** 表的列信息（用于自动补全） */
    tableColumns?: Record<string, string[]>
    /** 是否只读 */
    readOnly?: boolean
    /** 是否禁用 */
    disabled?: boolean
}

// SQL 关键字
const SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
    'IS', 'NULL', 'TRUE', 'FALSE', 'AS', 'ON', 'JOIN', 'LEFT', 'RIGHT',
    'INNER', 'OUTER', 'CROSS', 'FULL', 'UNION', 'ALL', 'DISTINCT',
    'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'GROUP', 'HAVING',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE',
    'TABLE', 'DROP', 'ALTER', 'ADD', 'COLUMN', 'INDEX', 'PRIMARY', 'KEY',
    'FOREIGN', 'REFERENCES', 'CONSTRAINT', 'DEFAULT', 'UNIQUE', 'CHECK',
    'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST', 'COALESCE',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'SUBSTR', 'LENGTH', 'UPPER', 'LOWER',
    'TRIM', 'REPLACE', 'INSTR', 'IFNULL', 'NULLIF', 'TYPEOF', 'ABS', 'ROUND',
    'DATE', 'TIME', 'DATETIME', 'STRFTIME', 'JULIANDAY',
]

// SQL 函数
const SQL_FUNCTIONS = [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'TOTAL', 'GROUP_CONCAT',
    'ABS', 'ROUND', 'RANDOM', 'SUBSTR', 'LENGTH', 'UPPER', 'LOWER',
    'TRIM', 'LTRIM', 'RTRIM', 'REPLACE', 'INSTR', 'PRINTF', 'UNICODE',
    'TYPEOF', 'COALESCE', 'IFNULL', 'NULLIF', 'IIF', 'CASE',
    'DATE', 'TIME', 'DATETIME', 'JULIANDAY', 'STRFTIME',
    'HEX', 'UNHEX', 'ZEROBLOB', 'QUOTE', 'GLOB', 'LIKE',
]

export function SQLEditor({
    value,
    onChange,
    onExecute,
    placeholder = 'SELECT * FROM table_name LIMIT 100',
    height = 120,
    tables = [],
    tableColumns = {},
    readOnly = false,
    disabled = false,
}: SQLEditorProps) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
    const monacoRef = useRef<typeof import('monaco-editor') | null>(null)
    const completionDisposableRef = useRef<IDisposable | null>(null)

    // 配置 Monaco 编辑器（在加载前）
    const handleBeforeMount: BeforeMount = useCallback((monaco) => {
        // 定义自定义主题（匹配深色 UI）
        monaco.editor.defineTheme('sql-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
                { token: 'string', foreground: 'ce9178' },
                { token: 'number', foreground: 'b5cea8' },
                { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
                { token: 'operator', foreground: 'd4d4d4' },
                { token: 'identifier', foreground: '9cdcfe' },
            ],
            colors: {
                'editor.background': '#1a1a2e',
                'editor.foreground': '#e0e0e0',
                'editor.lineHighlightBackground': '#2a2a3e',
                'editor.selectionBackground': '#3a3a5e',
                'editorCursor.foreground': '#7c3aed',
                'editorLineNumber.foreground': '#4a4a6a',
                'editorLineNumber.activeForeground': '#8a8aaa',
                'editor.inactiveSelectionBackground': '#2a2a4e',
            },
        })
    }, [])

    // 编辑器挂载完成
    const handleMount: OnMount = useCallback((editor, monaco) => {
        editorRef.current = editor
        monacoRef.current = monaco

        // 注册自定义补全提供者
        completionDisposableRef.current = monaco.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
                const word = model.getWordUntilPosition(position)
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                }

                const suggestions: languages.CompletionItem[] = []

                // SQL 关键字
                SQL_KEYWORDS.forEach(keyword => {
                    suggestions.push({
                        label: keyword,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: keyword,
                        range,
                        detail: 'SQL Keyword',
                    })
                })

                // SQL 函数
                SQL_FUNCTIONS.forEach(func => {
                    suggestions.push({
                        label: func,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: `${func}($0)`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range,
                        detail: 'SQL Function',
                    })
                })

                // 表名
                tables.forEach(table => {
                    suggestions.push({
                        label: table,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: table,
                        range,
                        detail: 'Table',
                    })
                })

                // 列名（根据上下文判断当前表）
                // 简单实现：提供所有表的列名
                Object.entries(tableColumns).forEach(([tableName, columns]) => {
                    columns.forEach(column => {
                        suggestions.push({
                            label: column,
                            kind: monaco.languages.CompletionItemKind.Field,
                            insertText: column,
                            range,
                            detail: `Column (${tableName})`,
                        })
                    })
                })

                return { suggestions }
            },
        })

        // 添加快捷键：Ctrl/Cmd + Enter 执行
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            onExecute?.()
        })

        // 聚焦编辑器
        editor.focus()
    }, [tables, tableColumns, onExecute])

    // 清理
    useEffect(() => {
        return () => {
            completionDisposableRef.current?.dispose()
        }
    }, [])

    // 当 tables 或 tableColumns 变化时，重新注册补全提供者
    useEffect(() => {
        if (!monacoRef.current || !editorRef.current) return

        // 清理旧的
        completionDisposableRef.current?.dispose()

        const monaco = monacoRef.current

        // 注册新的
        completionDisposableRef.current = monaco.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
                const word = model.getWordUntilPosition(position)
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                }

                const suggestions: languages.CompletionItem[] = []

                // SQL 关键字
                SQL_KEYWORDS.forEach(keyword => {
                    suggestions.push({
                        label: keyword,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: keyword,
                        range,
                        detail: 'SQL Keyword',
                    })
                })

                // SQL 函数
                SQL_FUNCTIONS.forEach(func => {
                    suggestions.push({
                        label: func,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: `${func}($0)`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range,
                        detail: 'SQL Function',
                    })
                })

                // 表名
                tables.forEach(table => {
                    suggestions.push({
                        label: table,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: table,
                        range,
                        detail: 'Table',
                    })
                })

                // 列名
                Object.entries(tableColumns).forEach(([tableName, columns]) => {
                    columns.forEach(column => {
                        suggestions.push({
                            label: column,
                            kind: monaco.languages.CompletionItemKind.Field,
                            insertText: column,
                            range,
                            detail: `Column (${tableName})`,
                        })
                    })
                })

                return { suggestions }
            },
        })
    }, [tables, tableColumns])

    return (
        <div className="relative rounded-lg overflow-hidden border border-border">
            <Editor
                height={height}
                language="sql"
                theme="sql-dark"
                value={value}
                onChange={(val) => onChange(val || '')}
                beforeMount={handleBeforeMount}
                onMount={handleMount}
                options={{
                    minimap: { enabled: false },
                    lineNumbers: 'off',
                    glyphMargin: false,
                    folding: false,
                    lineDecorationsWidth: 8,
                    lineNumbersMinChars: 0,
                    renderLineHighlight: 'none',
                    scrollBeyondLastLine: false,
                    overviewRulerBorder: false,
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto',
                        verticalScrollbarSize: 8,
                        horizontalScrollbarSize: 8,
                    },
                    fontSize: 12,
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
                    tabSize: 2,
                    wordWrap: 'on',
                    automaticLayout: true,
                    suggest: {
                        showKeywords: true,
                        showSnippets: true,
                        showClasses: true,
                        showFunctions: true,
                        showFields: true,
                    },
                    quickSuggestions: {
                        other: true,
                        comments: false,
                        strings: false,
                    },
                    readOnly: readOnly || disabled,
                    domReadOnly: disabled,
                    placeholder,
                }}
                loading={
                    <div className="flex items-center justify-center h-full bg-bg-light text-text-muted text-xs">
                        加载编辑器...
                    </div>
                }
            />
            {/* 占位符（Monaco 不原生支持） */}
            {!value && (
                <div className="absolute top-2 left-2 text-text-muted text-xs pointer-events-none opacity-50 font-mono">
                    {placeholder}
                </div>
            )}
        </div>
    )
}

