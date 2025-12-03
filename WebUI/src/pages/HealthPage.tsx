import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'

interface HealthData {
  status: string
  version: string
  timestamp: string
  uptimeSeconds: number
  startTime: string
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const pad = (n: number) => n.toString().padStart(2, '0')

  if (days > 0) {
    return `${days}天 ${pad(hours)}:${pad(minutes)}:${pad(secs)}`
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
}

function formatStartTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return dateString
  }
}

export function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [displayUptime, setDisplayUptime] = useState('--:--:--')

  // 保存 startTime 的时间戳，避免每次重新解析
  const startTimeRef = useRef<number | null>(null)

  // 获取健康状态
  useEffect(() => {
    async function fetchHealth() {
      try {
        const response = await fetch('/api/health', {
          headers: { 'Accept': 'application/json' },
        })
        if (!response.ok) throw new Error('Failed to fetch health status')
        const data = await response.json()
        setHealth(data)
        setError(null)

        // 解析并缓存 startTime
        if (data.startTime) {
          const startDate = new Date(data.startTime)
          startTimeRef.current = startDate.getTime()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 30000) // 每 30 秒刷新
    return () => clearInterval(interval)
  }, [])

  // 每秒更新运行时间和当前时间
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date())

      // 使用缓存的 startTime 计算运行时间
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDisplayUptime(formatUptime(Math.max(0, elapsed)))
      }
    }

    // 立即执行一次
    updateTime()

    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const isHealthy = !error && health?.status === 'healthy'

  return (
    <div className="h-full overflow-auto flex items-center justify-center p-6">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-lg w-full relative">
        <div className="glass-card p-10 text-center">
          {/* Status Icon */}
          <div className={`w-28 h-28 mx-auto mb-8 rounded-full flex items-center justify-center text-5xl relative ${error ? 'bg-red-500/10' : 'bg-green-500/10'
            }`}>
            {/* Pulse ring */}
            <div className={`absolute inset-0 rounded-full animate-ping opacity-25 ${error ? 'bg-red-500' : 'bg-green-500'
              }`} style={{ animationDuration: '2s' }} />
            {/* Icon */}
            <span className="relative z-10">{error ? '❌' : '💚'}</span>
          </div>

          {/* Title */}
          <h1 className={`text-3xl font-bold mb-3 ${error ? 'text-red-400' : 'text-green-400'}`}>
            {error ? '服务异常' : '服务正常运行'}
          </h1>
          <p className="text-text-secondary mb-10">
            {error ? error : 'Debug Hub 所有系统运行正常'}
          </p>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <InfoCard
              label="状态"
              value={health?.status?.toUpperCase() || '--'}
              icon="🟢"
              highlight={isHealthy}
            />
            <InfoCard
              label="版本"
              value={health?.version || '--'}
              icon="📦"
            />
            <InfoCard
              label="运行时间"
              value={displayUptime}
              icon="⏱️"
              mono
            />
            <InfoCard
              label="当前时间"
              value={currentTime.toLocaleTimeString('zh-CN')}
              icon="🕐"
              mono
            />
          </div>

          {/* Start Time */}
          {health?.startTime && (
            <div className="text-xs text-text-muted mb-8 p-3 bg-bg-medium/50 rounded-xl">
              <span className="opacity-70">服务启动于:</span>
              <span className="ml-2 font-mono text-text-secondary">
                {formatStartTime(health.startTime)}
              </span>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex justify-center gap-3">
            <Link
              to="/"
              className="btn btn-secondary"
            >
              📱 设备列表
            </Link>
            <Link
              to="/api-docs"
              className="btn btn-secondary"
            >
              📚 API 文档
            </Link>
          </nav>
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-text-muted text-sm">
          <span className="opacity-70">Debug Hub © 2025 Sun</span>
        </p>
      </div>
    </div>
  )
}

function InfoCard({
  label,
  value,
  icon,
  mono = false,
  highlight = false,
}: {
  label: string
  value: string
  icon: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className={`bg-bg-medium/50 rounded-xl p-4 border border-border transition-all ${highlight ? 'border-green-500/30' : ''
      }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-xl font-semibold text-primary ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  )
}
