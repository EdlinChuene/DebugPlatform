import { useEffect, useState, useMemo } from 'react'
import { useDeviceStore } from '@/stores/deviceStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { DeviceCard } from '@/components/DeviceCard'
import { ListLoadingOverlay } from '@/components/ListLoadingOverlay'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { IPhoneIcon, ClearIcon, StarIcon, CheckIcon, UnhealthyXIcon } from '@/components/icons'
import clsx from 'clsx'

type FilterType = 'all' | 'favorites'

export function DeviceListPage() {
  const {
    devices,
    isLoading,
    fetchDevices,
    isSelectMode,
    selectedIds,
    toggleSelectMode,
    toggleSelectId,
    selectAllOffline,
    batchRemoveSelected,
    favoriteDeviceIds,
  } = useDeviceStore()
  const { isServerOnline } = useConnectionStore()
  const [filter, setFilter] = useState<FilterType>('all')
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const onlineCount = devices.filter(d => d.isOnline).length
  const offlineCount = devices.filter(d => !d.isOnline).length
  const favoriteCount = devices.filter(d => favoriteDeviceIds.has(d.deviceId)).length

  // 计算是否全选了所有离线设备
  const offlineDeviceIds = devices.filter(d => !d.isOnline).map(d => d.deviceId)
  const isAllOfflineSelected = offlineDeviceIds.length > 0 && offlineDeviceIds.every(id => selectedIds.has(id))

  const filteredDevices = useMemo(() => {
    switch (filter) {
      case 'favorites':
        return devices.filter(d => favoriteDeviceIds.has(d.deviceId))
      default:
        return devices
    }
  }, [devices, filter, favoriteDeviceIds])

  useEffect(() => {
    // 初始加载设备列表
    // 全局 WebSocket (connectionStore) 已经处理设备事件订阅
    fetchDevices()
  }, [fetchDevices])

  const handleBatchRemove = async () => {
    setIsRemoving(true)
    try {
      await batchRemoveSelected()
      setShowRemoveConfirm(false)
    } catch {
      // 错误已在 store 中处理
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="px-6 py-5 bg-bg-dark border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              设备列表
            </h1>
            <p className="text-sm text-text-muted mt-1">
              管理已连接的调试设备 · {onlineCount} 在线 / {devices.length} 总计
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 筛选按钮组 - 服务在线时显示 */}
            {isServerOnline && (
              <div className="flex items-center gap-0.5 p-0.5 bg-bg-medium rounded-lg border border-border">
                <button
                  onClick={() => setFilter('all')}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                    filter === 'all'
                      ? 'bg-primary text-bg-darkest'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-light'
                  )}
                >
                  全部 ({devices.length})
                </button>
                <button
                  onClick={() => setFilter('favorites')}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1',
                    filter === 'favorites'
                      ? 'bg-yellow-500 text-bg-darkest'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-light'
                  )}
                >
                  <StarIcon size={12} filled={filter === 'favorites'} />
                  仅收藏 ({favoriteCount})
                </button>
              </div>
            )}

            {/* 批量选择相关按钮 - 服务在线时显示 */}
            {isServerOnline && isSelectMode ? (
              <>
                {/* 全选按钮 */}
                <button
                  onClick={selectAllOffline}
                  disabled={offlineCount === 0}
                  className={clsx(
                    'btn btn-secondary flex items-center gap-2',
                    offlineCount === 0 && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <CheckIcon size={16} />
                  <span>{isAllOfflineSelected ? '取消全选' : '全选离线'}</span>
                </button>
                {/* 移除选中按钮 */}
                <button
                  onClick={() => setShowRemoveConfirm(true)}
                  disabled={selectedIds.size === 0}
                  className={clsx(
                    'btn btn-secondary text-red-400 hover:text-red-300 flex items-center gap-2',
                    selectedIds.size === 0 && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <ClearIcon size={16} />
                  <span>移除选中 ({selectedIds.size})</span>
                </button>
                {/* 取消选择 */}
                <button
                  onClick={toggleSelectMode}
                  className="btn btn-secondary"
                >
                  取消
                </button>
              </>
            ) : isServerOnline && offlineCount > 0 ? (
              <button
                onClick={toggleSelectMode}
                className="btn btn-secondary flex items-center gap-2"
              >
                <CheckIcon size={16} />
                <span>批量选择</span>
              </button>
            ) : null}

            {/* 刷新按钮 - 始终显示 */}
            <button
              onClick={fetchDevices}
              disabled={isLoading}
              className="btn btn-primary disabled:opacity-50"
            >
              刷新
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 relative">
        {/* 刷新加载覆盖层 - 仅在有设备时显示 */}
        {filteredDevices.length > 0 && isServerOnline && (
          <ListLoadingOverlay isLoading={isLoading} text="刷新设备列表..." />
        )}

        {/* 服务未启动时显示服务状态 */}
        {!isServerOnline ? (
          <ServerOfflineState onRetry={fetchDevices} isLoading={isLoading} />
        ) : filteredDevices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDevices.map((device, index) => (
              <DeviceCard
                key={device.deviceId}
                device={device}
                style={{ animationDelay: `${index * 50}ms` }}
                isSelectMode={isSelectMode}
                isSelected={selectedIds.has(device.deviceId)}
                onToggleSelect={() => toggleSelectId(device.deviceId)}
              />
            ))}
          </div>
        ) : (
          <EmptyState isLoading={isLoading} filter={filter} totalCount={devices.length} />
        )}
      </div>

      {/* 批量移除确认对话框 */}
      <ConfirmDialog
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        onConfirm={handleBatchRemove}
        title="移除设备"
        message={`确定要移除选中的 ${selectedIds.size} 个离线设备吗？\n\n此操作将从列表中移除这些设备，但不会删除它们的历史数据。`}
        confirmText="确认移除"
        cancelText="取消"
        type="danger"
        loading={isRemoving}
      />
    </div>
  )
}

function EmptyState({ isLoading, filter, totalCount }: { isLoading: boolean; filter: FilterType; totalCount: number }) {
  // 如果有设备但当前筛选结果为空
  if (totalCount > 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="glass-card p-12 text-center max-w-md">
          <IPhoneIcon size={48} className="mx-auto mb-4 text-text-muted opacity-50" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            没有{filter === 'favorites' ? '收藏的' : ''}设备
          </h2>
          <p className="text-text-muted">
            {filter === 'favorites' ? '点击设备卡片上的星标收藏设备' : '当前没有可显示的设备'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="glass-card p-12 text-center max-w-md">
        {isLoading ? (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-bg-light animate-pulse" />
            <div className="h-6 bg-bg-light rounded w-48 mx-auto mb-3 animate-pulse" />
            <div className="h-4 bg-bg-light rounded w-64 mx-auto animate-pulse" />
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-bg-light flex items-center justify-center text-text-muted">
              <IPhoneIcon size={40} />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              暂无在线设备
            </h2>
            <p className="text-sm text-text-muted mb-6">
              请确保 App 已集成 DebugProbe 并连接到 Debug Platform
            </p>
            <div className="text-left bg-bg-medium rounded-xl p-4 text-xs font-mono text-text-secondary overflow-x-auto">
              <p className="text-text-muted mb-2">// 在 AppDelegate 中初始化</p>
              <p><span className="text-purple-400">let</span> settings = <span className="text-primary">DebugProbeSettings</span>.shared</p>
              <p>settings.hubHost = <span className="text-green-400">"{'<'}host{'>'}"</span></p>
              <p>settings.hubPort = <span className="text-green-400">{'<'}port{'>'}</span></p>
              <p className="mt-1"><span className="text-primary">DebugProbe</span>.shared.start()</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// 服务离线状态组件
function ServerOfflineState({ onRetry, isLoading }: { onRetry: () => void; isLoading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-red-500/3 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-yellow-500/3 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-md w-full relative">
        <div className="glass-card p-8 text-center">
          {/* Status Icon with pulse effect */}
          <div className="w-20 h-20 mx-auto mb-6 relative">
            {/* Pulse rings */}
            <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-2 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
            {/* Icon container */}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30">
              <UnhealthyXIcon size={40} className="text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold mb-2 text-text-primary">
            服务未启动
          </h2>
          <p className="text-sm text-text-muted mb-6">
            无法连接到 Debug Platform 服务
          </p>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-400">OFFLINE</span>
          </div>

          {/* Hint */}
          <div className="text-xs text-text-muted mb-6 p-3 bg-bg-medium/30 rounded-lg border border-border">
            <span className="text-yellow-400/80">💡</span>
            <span className="ml-2">
              请确保 Debug Platform 服务已启动并运行在正确的端口上
            </span>
          </div>

          {/* Retry Button */}
          <button
            onClick={onRetry}
            disabled={isLoading}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>连接中...</span>
              </>
            ) : (
              <span>重试连接</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
