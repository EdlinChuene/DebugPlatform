import clsx from 'clsx'

interface Props {
  selectedCount: number
  totalCount: number
  isVisible: boolean
  onSelectAll: () => void
  onClearSelection: () => void
  onDelete: () => void
  onFavorite: () => void
  onUnfavorite: () => void
  onExport?: () => void
}

export function BatchSelectionBar({
  selectedCount,
  totalCount,
  isVisible,
  onSelectAll,
  onClearSelection,
  onDelete,
  onFavorite,
  onUnfavorite,
  onExport,
}: Props) {
  const allSelected = selectedCount === totalCount && totalCount > 0

  return (
    <div
      className={clsx(
        'batch-selection-bar',
        isVisible && 'visible'
      )}
    >
      {/* Left: Selection info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20">
          <span className="text-2xl">✓</span>
          <div>
            <span className="text-sm font-medium text-text-primary">
              已选择 <span className="text-primary font-bold">{selectedCount}</span> 项
            </span>
            <span className="text-xs text-text-muted ml-2">
              / 共 {totalCount} 项
            </span>
          </div>
        </div>
        
        <button
          onClick={allSelected ? onClearSelection : onSelectAll}
          className="btn btn-ghost text-primary"
        >
          {allSelected ? '取消全选' : '全选'}
        </button>
        <button
          onClick={onClearSelection}
          className="btn btn-ghost"
        >
          清除选择
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onFavorite}
          className="btn bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20"
        >
          <StarIcon className="w-4 h-4" />
          收藏
        </button>
        <button
          onClick={onUnfavorite}
          className="btn btn-secondary"
        >
          <StarOutlineIcon className="w-4 h-4" />
          取消收藏
        </button>
        {onExport && (
          <button
            onClick={onExport}
            className="btn btn-secondary"
          >
            <ExportIcon className="w-4 h-4" />
            导出
          </button>
        )}
        <button
          onClick={onDelete}
          className="btn bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
        >
          <TrashIcon className="w-4 h-4" />
          删除
        </button>
      </div>
    </div>
  )
}

// Icons
function StarIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

function StarOutlineIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  )
}

function TrashIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

function ExportIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  )
}
