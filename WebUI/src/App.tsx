import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { DeviceListPage } from '@/pages/DeviceListPage'
import { DeviceDetailPage } from '@/pages/DeviceDetailPage'
import { ApiDocsPage } from '@/pages/ApiDocsPage'
import { HealthPage } from '@/pages/HealthPage'
import { useThemeStore } from '@/stores/themeStore'
import { startHealthCheck, stopHealthCheck } from '@/stores/connectionStore'

// 不显示侧边栏的路由
const noSidebarRoutes = ['/api-docs', '/health']

function AppContent() {
  const location = useLocation()
  const showSidebar = !noSidebarRoutes.includes(location.pathname)

  return (
    <div className="flex h-screen bg-bg-darkest text-text-primary">
      {showSidebar && <Sidebar />}
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<DeviceListPage />} />
          <Route path="/device/:deviceId" element={<DeviceDetailPage />} />
          <Route path="/api-docs" element={<ApiDocsPage />} />
          <Route path="/health" element={<HealthPage />} />
        </Routes>
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
