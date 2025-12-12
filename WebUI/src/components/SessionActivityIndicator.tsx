import { useMemo, useState } from 'react'
import { useSessionActivityStore, type SessionActivity } from '@/stores/sessionActivityStore'
import { formatSmartTime } from '@/utils/format'
import clsx from 'clsx'
import { IPhoneIcon, PhoneOffIcon, ArrowUpIcon, ArrowDownIcon } from './icons'

interface Props {
    deviceId: string
    /** 是否常驻显示（显示在侧边栏而非下拉） */
    alwaysShow?: boolean
    isExpanded?: boolean
    onToggleExpand?: () => void
}

export function SessionActivityIndicator({
    deviceId,
    alwaysShow = false,
    isExpanded = false,
    onToggleExpand,
}: Props) {
    const { activities } = useSessionActivityStore()
    const [localExpanded, setLocalExpanded] = useState(false)

    const deviceActivities = useMemo(
        () => activities.filter((a) => a.deviceId === deviceId),
        [activities, deviceId]
    )

    const lastActivity = deviceActivities[0]
    const isConnected = lastActivity?.type === 'connected'

    // 常驻模式：始终显示按钮，点击展开浮窗
    if (alwaysShow) {
        return (
            <div className="relative">
                {/* 触发按钮 */}
                <button
                    onClick={() => setLocalExpanded(!localExpanded)}
                    className={clsx(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        deviceActivities.length === 0
                            ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/15'
                            : isConnected
                                ? 'bg-status-success-bg text-status-success border border-green-500/20 hover:bg-green-500/15'
                                : 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/15'
                    )}
                >
                    <span
                        className={clsx(
                            'w-2 h-2 rounded-full',
                            deviceActivities.length === 0
                                ? 'bg-gray-500'
                                : isConnected
                                    ? 'bg-green-500'
                                    : 'bg-orange-500'
                        )}
                    />
                    <span>连接活动</span>
                    {deviceActivities.length > 0 && (
                        <span className="text-2xs opacity-60">({deviceActivities.length})</span>
                    )}
                    <span className="ml-1">{localExpanded ? <ArrowUpIcon size={10} /> : <ArrowDownIcon size={10} />}</span>
                </button>

                {/* 浮窗 */}
                {localExpanded && (
                    <>
                        {/* 点击外部关闭 */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setLocalExpanded(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-72 bg-bg-dark border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-fadeIn">
                            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                <span className="text-sm font-medium text-text-primary">连接活动</span>
                                {deviceActivities.length > 0 && (
                                    <span className="text-2xs text-text-muted">{deviceActivities.length} 条记录</span>
                                )}
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {deviceActivities.length === 0 ? (
                                    <div className="px-3 py-6 text-center text-xs text-text-muted">
                                        暂无连接活动记录
                                    </div>
                                ) : (
                                    deviceActivities.slice(0, 20).map((activity, index) => (
                                        <ActivityRow key={activity.id} activity={activity} isFirst={index === 0} />
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        )
    }

    // 下拉模式：没有活动时不显示
    if (deviceActivities.length === 0) {
        return null
    }
    return (
        <div className="relative">
            {/* Compact Status Badge */}
            <button
                onClick={onToggleExpand}
                className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    isConnected
                        ? 'bg-status-success-bg text-status-success border border-green-500/20 hover:bg-green-500/15'
                        : 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/15'
                )}
            >
                <span
                    className={clsx(
                        'w-2 h-2 rounded-full',
                        isConnected ? 'bg-green-500' : 'bg-orange-500'
                    )}
                />
                <span>{isConnected ? '已连接' : '重连中...'}</span>
                {deviceActivities.length > 1 && (
                    <span className="text-2xs opacity-60">({deviceActivities.length})</span>
                )}
                <span className="ml-1">{isExpanded ? <ArrowUpIcon size={10} /> : <ArrowDownIcon size={10} />}</span>
            </button>

            {/* Expanded Activity List */}
            {isExpanded && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-bg-dark border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-fadeIn">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary">连接活动</span>
                        <span className="text-2xs text-text-muted">{deviceActivities.length} 条记录</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {deviceActivities.slice(0, 20).map((activity, index) => (
                            <ActivityRow key={activity.id} activity={activity} isFirst={index === 0} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function ActivityRow({
    activity,
    isFirst,
    compact = false,
}: {
    activity: SessionActivity
    isFirst: boolean
    compact?: boolean
}) {
    const isConnected = activity.type === 'connected'

    if (compact) {
        return (
            <div
                className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 border-b border-border-light transition-colors',
                    isFirst && 'bg-bg-light/30'
                )}
            >
                <span
                    className={clsx(
                        'w-1.5 h-1.5 rounded-full flex-shrink-0',
                        isConnected ? 'bg-green-500' : 'bg-red-500'
                    )}
                />
                <span
                    className={clsx(
                        'text-2xs',
                        isConnected ? 'text-green-400' : 'text-red-400'
                    )}
                >
                    {isConnected ? '已连接' : '已断开'}
                </span>
                <span className="text-2xs text-text-muted flex-1 text-right">
                    {formatSmartTime(activity.timestamp)}
                </span>
            </div>
        )
    }

    return (
        <div
            className={clsx(
                'flex items-center gap-3 px-4 py-2.5 border-b border-border-light transition-colors',
                isFirst && 'bg-bg-light/30'
            )}
        >
            <div
                className={clsx(
                    'w-8 h-8 rounded flex items-center justify-center flex-shrink-0',
                    isConnected ? 'bg-green-500/15' : 'bg-red-500/15'
                )}
            >
                {isConnected ? <IPhoneIcon size={14} /> : <PhoneOffIcon size={14} />}
            </div>
            <div className="flex-1 min-w-0">
                <div
                    className={clsx(
                        'text-xs font-medium',
                        isConnected ? 'text-green-400' : 'text-red-400'
                    )}
                >
                    {isConnected ? '设备已连接' : '设备已断开'}
                </div>
                <div className="text-2xs text-text-muted font-mono truncate">
                    {formatSmartTime(activity.timestamp)}
                    {activity.sessionId && (
                        <span className="ml-2 opacity-60">#{activity.sessionId.slice(0, 6)}</span>
                    )}
                </div>
            </div>
        </div>
    )
}
