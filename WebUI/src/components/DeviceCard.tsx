import { useNavigate } from 'react-router-dom'
import type { DeviceListItem } from '@/types'
import { formatRelativeTime } from '@/utils/format'
import { useDeviceStore } from '@/stores/deviceStore'
import { getPlatformIcon } from '@/utils/deviceIcons'
import { DeviceIdPopover } from '@/components/DeviceIdPopover'
import { StarIcon, PackageIcon, CheckIcon } from '@/components/icons'
import clsx from 'clsx'
import { type CSSProperties } from 'react'

interface Props {
  device: DeviceListItem
  style?: CSSProperties
  isSelectMode?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
}

export function DeviceCard({ device, style, isSelectMode, isSelected, onToggleSelect }: Props) {
  const navigate = useNavigate()
  const { favoriteDeviceIds, toggleFavorite } = useDeviceStore()
  const isFavorite = favoriteDeviceIds.has(device.deviceId)
  const isOffline = !device.isOnline

  // 是否设置了别名
  const hasAlias = !!device.deviceAlias

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFavorite(device.deviceId)
  }

  const handleClick = () => {
    if (isSelectMode) {
      // 选择模式下，只有离线设备可选中
      if (isOffline) {
        onToggleSelect?.()
      }
    } else {
      navigate(`/device/${device.deviceId}`)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={clsx(
        'p-2.5 cursor-pointer transition-all group animate-fadeIn rounded-xl border',
        // 在线设备：主题色背景
        device.isOnline
          ? 'device-card-online'
          : 'glass-card opacity-60 hover:opacity-80',
        isSelectMode && isOffline && 'cursor-pointer',
        isSelectMode && !isOffline && 'cursor-not-allowed opacity-40',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
      style={style}
    >
      {/* 主要布局：设备图标 + 信息 + 收藏 */}
      <div className="flex items-start gap-2.5">
        {/* 选择模式下的复选框 */}
        {isSelectMode && (
          <div className={clsx(
            'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-2.5',
            isSelected ? 'bg-primary border-primary' : 'border-border',
            !isOffline && 'opacity-30'
          )}>
            {isSelected && <CheckIcon size={12} className="text-white" />}
          </div>
        )}

        {/* 设备图标和模拟器标记 */}
        <div className="flex flex-col items-center flex-shrink-0 gap-1">
          <div className="relative">
            <div className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center border',
              device.isOnline
                ? 'bg-white/20 dark:bg-black/20 border-white/30 dark:border-white/10'
                : 'bg-bg-medium/50 border-border'
            )}>
              {getPlatformIcon(device.platform, 24, undefined, device.isSimulator)}
            </div>
            {/* 状态指示点 - 右下角 */}
            <span className={clsx(
              'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border rounded-full',
              device.isOnline
                ? 'bg-green-500 border-green-400/50 status-dot-online'
                : 'bg-gray-500 border-bg-dark'
            )} />
          </div>
          {/* 模拟器标记 - 图标下方 */}
          {device.isSimulator && (
            <span className={clsx(
              'text-2xs px-1 py-0.5 rounded whitespace-nowrap',
              device.isOnline
                ? 'bg-white/20 dark:bg-black/20 text-yellow-700 dark:text-yellow-300'
                : 'bg-yellow-500/20 text-yellow-400'
            )}>
              模拟器
            </span>
          )}
        </div>

        {/* 设备 + 应用信息 */}
        <div className="flex-1 min-w-0">
          {/* 设备名称区域：两行展示 */}
          <div className="min-h-[36px]">
            {/* 第一行：别名或设备名 + ID 标识 */}
            <div className="flex items-center gap-2">
              <h3 className={clsx(
                'font-medium text-sm transition-colors truncate',
                device.isOnline
                  ? 'text-gray-900 dark:text-white group-hover:text-primary-dark dark:group-hover:text-primary-light'
                  : 'text-text-primary group-hover:text-primary'
              )}>
                {hasAlias ? device.deviceAlias : device.deviceName}
              </h3>
              {/* 设备 ID 后 4 位 - 点击弹出完整 ID */}
              <DeviceIdPopover deviceId={device.deviceId}>
                <span className={clsx(
                  'text-2xs px-1 py-0.5 rounded font-mono flex-shrink-0 transition-colors',
                  device.isOnline
                    ? 'bg-white/30 dark:bg-black/30 text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-black/50'
                    : 'bg-bg-light text-text-muted hover:bg-primary/20 hover:text-primary'
                )}>
                  #{device.deviceId.slice(-4).toUpperCase()}
                </span>
              </DeviceIdPopover>
              {isOffline && (
                <span className="text-2xs px-1 py-0.5 rounded bg-gray-500/20 text-gray-400 flex-shrink-0">
                  离线
                </span>
              )}
            </div>
            {/* 第二行：如果有别名则显示原始设备名 */}
            {hasAlias && (
              <p className={clsx(
                'text-xs truncate mt-0.5',
                device.isOnline
                  ? 'text-gray-700 dark:text-gray-300'
                  : 'text-text-muted'
              )} title={device.deviceName}>
                {device.deviceName}
              </p>
            )}
          </div>

          {/* 设备型号信息 */}
          <p className={clsx(
            'text-xs truncate mt-0.5',
            device.isOnline
              ? 'text-gray-600 dark:text-gray-400'
              : 'text-text-muted'
          )}>
            {device.deviceModel} · {device.platform} {device.systemVersion}
          </p>

          {/* 应用信息 */}
          <div className={clsx(
            'flex items-center gap-1.5 mt-1.5 pt-1.5 border-t',
            device.isOnline
              ? 'border-white/20 dark:border-white/10'
              : 'border-border'
          )}>
            {/* 应用图标 */}
            <div className={clsx(
              'w-4 h-4 rounded overflow-hidden flex items-center justify-center flex-shrink-0',
              device.isOnline
                ? 'bg-white/30 dark:bg-black/30'
                : 'bg-bg-light'
            )} title={device.appName}>
              {device.appIcon ? (
                <img
                  src={`data:image/png;base64,${device.appIcon}`}
                  alt={device.appName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <PackageIcon size={10} className={device.isOnline ? 'text-gray-600 dark:text-gray-400' : 'text-text-muted'} />
              )}
            </div>
            <span className={clsx(
              'text-xs truncate',
              device.isOnline
                ? 'text-gray-700 dark:text-gray-300'
                : 'text-text-secondary'
            )} title={`${device.appName} ${device.appVersion}`}>
              {device.appName}
            </span>
            <span className={clsx(
              'text-xs truncate flex-shrink-0',
              device.isOnline
                ? 'text-gray-500 dark:text-gray-500'
                : 'text-text-muted/60'
            )}>
              {device.appVersion}
            </span>
            <span className="flex-1" />
            <span className={clsx(
              'text-2xs flex-shrink-0',
              device.isOnline
                ? 'text-gray-500 dark:text-gray-500'
                : 'text-text-muted/50'
            )}>
              {formatRelativeTime(device.lastSeenAt)}
            </span>
          </div>
        </div>

        {/* 操作按钮组 - 非选择模式下显示 */}
        {!isSelectMode && (
          <div className="flex items-center gap-0.5">
            {/* 收藏按钮 */}
            <button
              onClick={handleToggleFavorite}
              className={clsx(
                'p-1 rounded transition-all flex-shrink-0',
                isFavorite
                  ? 'text-yellow-500 dark:text-yellow-400 hover:text-yellow-400 dark:hover:text-yellow-300'
                  : device.isOnline
                    ? 'text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 hover:text-yellow-500 dark:hover:text-yellow-400'
                    : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-yellow-400'
              )}
              title={isFavorite ? '取消收藏' : '收藏设备'}
            >
              <StarIcon size={14} filled={isFavorite} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
