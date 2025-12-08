import { useNavigate } from 'react-router-dom'
import type { DeviceListItem } from '@/types'
import { formatRelativeTime } from '@/utils/format'
import { useDeviceStore } from '@/stores/deviceStore'
import { getPlatformIcon } from '@/utils/deviceIcons'
import { StarIcon, PackageIcon, ClearIcon } from '@/components/icons'
import clsx from 'clsx'
import type { CSSProperties } from 'react'

interface Props {
  device: DeviceListItem
  style?: CSSProperties
}

export function DeviceCard({ device, style }: Props) {
  const navigate = useNavigate()
  const { favoriteDeviceIds, toggleFavorite, removeDevice } = useDeviceStore()
  const isFavorite = favoriteDeviceIds.has(device.deviceId)
  const isOffline = !device.isOnline

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFavorite(device.deviceId)
  }

  const handleRemoveDevice = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`确定要移除设备 "${device.deviceName}" 吗？`)) {
      await removeDevice(device.deviceId)
    }
  }

  return (
    <div
      onClick={() => navigate(`/device/${device.deviceId}`)}
      className={clsx(
        'glass-card p-2.5 cursor-pointer transition-all group animate-fadeIn card-interactive',
        device.isOnline ? 'hover:border-primary' : 'opacity-60 hover:opacity-80'
      )}
      style={style}
    >
      {/* 主要布局：设备图标 + 信息 + 收藏 */}
      <div className="flex items-start gap-2.5">
        {/* 设备图标 - 与侧边栏样式一致 */}
        <div className="relative flex-shrink-0">
          <div className={clsx(
            'w-10 h-10 rounded-lg flex items-center justify-center border border-border',
            device.isOnline ? 'bg-primary/20' : 'bg-bg-medium/50'
          )}>
            {getPlatformIcon(device.platform)}
          </div>
          {/* 状态指示点 - 右下角 */}
          <span className={clsx(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-bg-dark rounded-full',
            device.isOnline ? 'bg-green-500 status-dot-online' : 'bg-gray-500'
          )} />
        </div>

        {/* 设备 + 应用信息 */}
        <div className="flex-1 min-w-0">
          {/* 第一行：设备信息 */}
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-text-primary group-hover:text-primary transition-colors truncate">
              {device.deviceName}
            </h3>
            {device.isSimulator && (
              <span className="text-2xs px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 flex-shrink-0">
                模拟器
              </span>
            )}
            {isOffline && (
              <span className="text-2xs px-1 py-0.5 rounded bg-gray-500/20 text-gray-400 flex-shrink-0">
                离线
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted truncate mt-0.5">
            {device.deviceModel} · {device.platform} {device.systemVersion}
          </p>

          {/* 第二行：应用信息 */}
          <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-border">
            {/* 应用图标 */}
            <div className="w-4 h-4 rounded overflow-hidden bg-bg-light flex items-center justify-center flex-shrink-0" title={device.appName}>
              {device.appIcon ? (
                <img
                  src={`data:image/png;base64,${device.appIcon}`}
                  alt={device.appName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <PackageIcon size={10} className="text-text-muted" />
              )}
            </div>
            <span className="text-xs text-text-secondary truncate" title={`${device.appName} ${device.appVersion}`}>
              {device.appName}
            </span>
            <span className="text-xs text-text-muted/60 truncate flex-shrink-0">
              {device.appVersion}
            </span>
            <span className="flex-1" />
            <span className="text-2xs text-text-muted/50 flex-shrink-0">
              {formatRelativeTime(device.lastSeenAt)}
            </span>
          </div>
        </div>

        {/* 操作按钮组 */}
        <div className="flex items-center gap-0.5">
          {/* 离线设备显示移除按钮 */}
          {isOffline && (
            <button
              onClick={handleRemoveDevice}
              className="p-1 rounded transition-all text-red-400/50 opacity-0 group-hover:opacity-100 hover:text-red-400"
              title="移除设备"
            >
              <ClearIcon size={14} />
            </button>
          )}
          {/* 收藏按钮 */}
          <button
            onClick={handleToggleFavorite}
            className={clsx(
              'p-1 rounded transition-all flex-shrink-0',
              isFavorite
                ? 'text-yellow-400 hover:text-yellow-300'
                : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-yellow-400'
            )}
            title={isFavorite ? '取消收藏' : '收藏设备'}
          >
            <StarIcon size={14} filled={isFavorite} />
          </button>
        </div>
      </div>
    </div>
  )
}
