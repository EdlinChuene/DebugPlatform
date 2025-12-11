import { useNavigate } from 'react-router-dom'
import type { DeviceListItem } from '@/types'
import { formatRelativeTime } from '@/utils/format'
import { useDeviceStore } from '@/stores/deviceStore'
import { getPlatformIcon } from '@/utils/deviceIcons'
import { StarIcon, PackageIcon, CheckIcon, PencilIcon } from '@/components/icons'
import clsx from 'clsx'
import { useState, type CSSProperties } from 'react'

interface Props {
  device: DeviceListItem
  style?: CSSProperties
  isSelectMode?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
}

export function DeviceCard({ device, style, isSelectMode, isSelected, onToggleSelect }: Props) {
  const navigate = useNavigate()
  const { favoriteDeviceIds, toggleFavorite, deviceNicknames, setNickname } = useDeviceStore()
  const isFavorite = favoriteDeviceIds.has(device.deviceId)
  const isOffline = !device.isOnline
  const nickname = deviceNicknames[device.deviceId]

  // 编辑备注状态
  const [isEditingNickname, setIsEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState(nickname || '')

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFavorite(device.deviceId)
  }

  const handleEditNickname = (e: React.MouseEvent) => {
    e.stopPropagation()
    setNicknameInput(nickname || '')
    setIsEditingNickname(true)
  }

  const handleSaveNickname = () => {
    setNickname(device.deviceId, nicknameInput.trim())
    setIsEditingNickname(false)
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
        'glass-card p-2.5 cursor-pointer transition-all group animate-fadeIn card-interactive',
        device.isOnline ? 'hover:border-primary' : 'opacity-60 hover:opacity-80',
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

        {/* 设备图标 - 与侧边栏样式一致 */}
        <div className="relative flex-shrink-0">
          <div className={clsx(
            'w-10 h-10 rounded-lg flex items-center justify-center border border-border',
            device.isOnline ? 'bg-primary/20' : 'bg-bg-medium/50'
          )}>
            {getPlatformIcon(device.platform, 24, undefined, device.isSimulator)}
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
              {nickname || device.deviceName}
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
          {/* 如果有备注名，显示原设备名 */}
          {nickname && (
            <p className="text-xs text-text-muted truncate">
              {device.deviceName}
            </p>
          )}
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

        {/* 操作按钮组 - 非选择模式下显示 */}
        {!isSelectMode && (
          <div className="flex items-center gap-0.5">
            {/* 编辑备注按钮 */}
            <button
              onClick={handleEditNickname}
              className={clsx(
                'p-1 rounded transition-all flex-shrink-0',
                nickname
                  ? 'text-primary hover:text-primary/80'
                  : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-primary'
              )}
              title="编辑备注"
            >
              <PencilIcon size={14} />
            </button>
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
        )}
      </div>

      {/* 编辑备注弹框 */}
      {isEditingNickname && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditingNickname(false)
            }}
          />
          <div
            className="absolute right-2 top-2 z-50 bg-bg-dark border border-border rounded-lg shadow-xl p-3 min-w-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <label className="block text-xs text-text-secondary mb-1.5">设备备注</label>
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="输入备注名称"
              className="w-full px-2 py-1.5 text-sm bg-bg-medium border border-border rounded text-text-primary focus:outline-none focus:border-primary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveNickname()
                } else if (e.key === 'Escape') {
                  setIsEditingNickname(false)
                }
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setIsEditingNickname(false)}
                className="flex-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary bg-bg-light rounded"
              >
                取消
              </button>
              <button
                onClick={handleSaveNickname}
                className="flex-1 px-2 py-1 text-xs text-white bg-primary hover:bg-primary/90 rounded"
              >
                保存
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
