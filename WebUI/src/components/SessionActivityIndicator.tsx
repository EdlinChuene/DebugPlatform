import { useMemo } from 'react'
import { useSessionActivityStore, type SessionActivity } from '@/stores/sessionActivityStore'
import { formatSmartTime } from '@/utils/format'
import clsx from 'clsx'

interface Props {
    deviceId: string
    isExpanded?: boolean
    onToggleExpand?: () => void
}

export function SessionActivityIndicator({ deviceId, isExpanded = false, onToggleExpand }: Props) {
    const { activities } = useSessionActivityStore()

    const deviceActivities = useMemo(
        () => activities.filter((a) => a.deviceId === deviceId),
        [activities, deviceId]
    )

    const lastActivity = deviceActivities[0]
    const isConnected = lastActivity?.type === 'connected'

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
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/15'
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
                <span className="ml-1">{isExpanded ? '▲' : '▼'}</span>
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

function ActivityRow({ activity, isFirst }: { activity: SessionActivity; isFirst: boolean }) {
    const isConnected = activity.type === 'connected'

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
                <span className="text-sm">{isConnected ? '📱' : '📴'}</span>
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
