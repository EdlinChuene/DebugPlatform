import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useConnectionStore } from '@/stores/connectionStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { ThemeToggle } from './ThemeToggle'
import clsx from 'clsx'

const navItems = [
  { path: '/', label: '设备列表', icon: '📱', description: '管理已连接的调试设备' },
]

const quickLinks = [
  { path: '/api-docs', label: 'API 文档', icon: '📚', description: 'RESTful API 接口文档' },
  { path: '/health', label: '健康检查', icon: '💚', description: '查看服务运行状态' },
]


export function Sidebar() {
  const location = useLocation()
  const { isServerOnline, isRealtimeConnected, isInDeviceDetail } = useConnectionStore()
  const devices = useDeviceStore((s) => s.devices)
  const onlineDevices = devices.filter(d => d.isOnline)
  const onlineCount = onlineDevices.length

  // 清空数据库对话框状态
  const [showTruncateDialog, setShowTruncateDialog] = useState(false)
  const [truncateConfirmText, setTruncateConfirmText] = useState('')
  const [isTruncating, setIsTruncating] = useState(false)
  const [truncateResult, setTruncateResult] = useState<{ success: boolean; message: string } | null>(null)

  // 根据当前页面决定显示哪种连接状态
  const isInDetail = location.pathname.startsWith('/device/')
  const showRealtimeStatus = isInDetail && isInDeviceDetail
  
  // 连接状态信息
  const connectionInfo = showRealtimeStatus
    ? {
        isConnected: isRealtimeConnected,
        label: isRealtimeConnected ? '实时流已连接' : '实时流已断开',
        description: isRealtimeConnected ? '正在接收实时数据' : '等待重新连接...',
      }
    : {
        isConnected: isServerOnline,
        label: isServerOnline ? '服务运行正常' : '服务连接失败',
        description: isServerOnline ? 'Debug Hub 在线' : '无法连接到服务器',
      }

  // 清空数据库
  const handleTruncate = async () => {
    if (truncateConfirmText !== 'DELETE') return
    
    setIsTruncating(true)
    setTruncateResult(null)
    
    try {
      const response = await fetch('/api/cleanup/truncate', {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      })
      const data = await response.json()
      setTruncateResult(data)
      
      if (data.success) {
        // 清空成功，3秒后关闭对话框
        setTimeout(() => {
          setShowTruncateDialog(false)
          setTruncateConfirmText('')
          setTruncateResult(null)
        }, 3000)
      }
    } catch (error) {
      setTruncateResult({ success: false, message: '请求失败，请重试' })
    } finally {
      setIsTruncating(false)
    }
  }

  const closeTruncateDialog = () => {
    if (!isTruncating) {
      setShowTruncateDialog(false)
      setTruncateConfirmText('')
      setTruncateResult(null)
    }
  }

  return (
    <aside className="w-72 bg-bg-dark/80 backdrop-blur-xl border-r border-border flex flex-col relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent-blue/10 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-glow">
            <span className="text-xl">🔍</span>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary via-accent-blue to-primary bg-clip-text text-transparent">
              Debug Platform
            </h1>
            <p className="text-2xs text-text-muted">网络和日志调试平台</p>
          </div>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="relative px-4 py-3">
        <div className={clsx(
          'p-4 rounded-xl border transition-all',
          connectionInfo.isConnected 
            ? 'bg-green-500/5 border-green-500/20' 
            : 'bg-red-500/5 border-red-500/20'
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  'w-2.5 h-2.5 rounded-full',
                  connectionInfo.isConnected ? 'bg-green-500 status-dot-online' : 'bg-red-500'
                )}
              />
              <span className={clsx(
                'text-sm font-medium',
                connectionInfo.isConnected ? 'text-green-400' : 'text-red-400'
              )}>
                {connectionInfo.label}
              </span>
            </div>
          </div>
          <p className="text-2xs text-text-muted mb-2">{connectionInfo.description}</p>
          <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border/50">
            <span>在线设备</span>
            <span className="font-mono font-medium text-text-secondary">{onlineCount} / {devices.length}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-3 py-2 overflow-auto">
        <div className="text-xs text-text-muted uppercase tracking-wider px-3 py-2 font-medium">
          导航
        </div>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={clsx(
              'flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all group mb-1',
              location.pathname === item.path
                ? 'bg-gradient-to-r from-primary/20 to-primary/5 text-primary border border-primary/20'
                : 'text-text-secondary hover:bg-bg-light hover:text-text-primary'
            )}
          >
            <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
            <div className="flex-1">
              <div className="font-medium">{item.label}</div>
              <div className="text-2xs text-text-muted">{item.description}</div>
            </div>
            {location.pathname === item.path && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </Link>
        ))}

      </nav>

      {/* Footer */}
      <div className="relative p-4 border-t border-border space-y-3">
        {/* Quick Links */}
        <div className="flex gap-2">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={clsx(
                'flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all',
                'bg-bg-medium/50 border border-border hover:border-primary/30 hover:bg-bg-light',
                location.pathname === link.path && 'border-primary/40 bg-primary/5'
              )}
              title={link.description}
            >
              <span className="text-lg">{link.icon}</span>
              <span className="text-xs font-medium text-text-secondary">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Theme Toggle & Clear Data */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center justify-between px-2 py-2 rounded-xl bg-bg-medium/30">
            <div className="text-xs text-text-muted">主题</div>
            <ThemeToggle />
          </div>
          <button
            onClick={() => setShowTruncateDialog(true)}
            className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 hover:border-red-500/30 transition-all"
            title="清空数据库中的所有数据"
          >
            清空数据库
          </button>
        </div>

        {/* Version Info */}
        <div className="text-center text-2xs text-text-muted pt-2">
          <span className="opacity-70">Debug Platform v1.0.0</span>
        </div>
      </div>

      {/* Truncate Confirmation Dialog */}
      {showTruncateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-dark border border-border rounded-2xl shadow-2xl w-[420px] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-red-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-400">危险操作</h3>
                  <p className="text-sm text-text-muted">此操作不可撤销</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-text-secondary mb-4">
                即将清空数据库中的<strong className="text-text-primary">所有数据</strong>，包括：
              </p>
              <ul className="text-sm text-text-muted space-y-1.5 mb-5 pl-4">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400/60"></span>
                  所有 HTTP 请求记录
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400/60"></span>
                  所有日志事件
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400/60"></span>
                  所有 WebSocket 会话和消息
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400/60"></span>
                  所有设备会话记录
                </li>
              </ul>
              
              <div className="bg-bg-medium/50 rounded-xl p-4 border border-border">
                <p className="text-sm text-text-secondary mb-2">
                  请输入 <code className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded font-mono text-xs">DELETE</code> 确认操作：
                </p>
                <input
                  type="text"
                  value={truncateConfirmText}
                  onChange={(e) => setTruncateConfirmText(e.target.value.toUpperCase())}
                  placeholder="输入 DELETE"
                  disabled={isTruncating}
                  className="w-full px-4 py-2.5 bg-bg-dark border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-red-500/50 font-mono text-center tracking-widest"
                />
              </div>

              {/* Result Message */}
              {truncateResult && (
                <div className={clsx(
                  'mt-4 px-4 py-3 rounded-lg text-sm',
                  truncateResult.success 
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                )}>
                  {truncateResult.success ? '✓' : '✗'} {truncateResult.message}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-bg-medium/30 flex justify-end gap-3">
              <button
                onClick={closeTruncateDialog}
                disabled={isTruncating}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-light transition-all disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleTruncate}
                disabled={truncateConfirmText !== 'DELETE' || isTruncating}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  truncateConfirmText === 'DELETE' && !isTruncating
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-red-500/30 text-red-400/50 cursor-not-allowed'
                )}
              >
                {isTruncating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    清空中...
                  </span>
                ) : (
                  '确认清空'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
