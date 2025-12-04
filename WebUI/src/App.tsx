import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { DeviceDetailPage } from '@/pages/DeviceDetailPage'
import { ApiDocsPage } from '@/pages/ApiDocsPage'
import { HealthPage } from '@/pages/HealthPage'
import { RulesPage } from '@/pages/RulesPage'
import { useThemeStore } from '@/stores/themeStore'
import { startHealthCheck, stopHealthCheck } from '@/stores/connectionStore'
import { ThemeToggle } from '@/components/ThemeToggle'

// 不显示侧边栏的路由
const noSidebarRoutes = ['/api-docs', '/health']

function AppContent() {
  const location = useLocation()
  const showSidebar = !noSidebarRoutes.includes(location.pathname)

  return (
    <div className="flex h-screen bg-bg-darkest text-text-primary">
      {showSidebar && <Sidebar />}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Global Top Bar */}
        {showSidebar && (
          <header className="h-12 bg-bg-dark border-b border-border flex items-center justify-between px-5 shrink-0">
            <div className="flex items-center gap-4 text-xs font-medium text-text-secondary">
              {/* Breadcrumbs or Title can go here */}
            </div>
            <div className="flex items-center gap-5">
              <Link to="/api-docs" className="text-xs text-text-muted hover:text-primary transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-bg-light" title="API Documentation">
                <span>📄</span>
                <span>Docs</span>
              </Link>
              <Link to="/health" className="text-xs text-text-muted hover:text-green-400 transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-bg-light" title="System Health">
                <span>💚</span>
                <span>Health</span>
              </Link>
              <div className="h-5 w-px bg-border" />
              <ThemeToggle />
            </div>
          </header>
        )}

        <div className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={
              <div className="h-full flex flex-col items-center justify-center text-text-muted">
                <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center mb-6 border border-border">
                  <span className="text-4xl">📱</span>
                </div>
                <h2 className="text-xl font-semibold text-text-primary mb-2">Select a Device</h2>
                <p className="text-sm text-text-secondary">Choose a device from the sidebar to start debugging.</p>
              </div>
            } />
            <Route path="/device/:deviceId" element={<DeviceDetailPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/api-docs" element={<ApiDocsPage />} />
            <Route path="/health" element={<HealthPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export function App() {
  const { theme, setTheme } = useThemeStore()

  // 初始化主题
  useEffect(() => {
    setTheme(theme)
  }, [])

  // 启动服务健康检查
  useEffect(() => {
    startHealthCheck()
    return () => stopHealthCheck()
  }, [])

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
