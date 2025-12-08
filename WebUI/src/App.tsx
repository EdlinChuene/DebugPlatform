import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { DeviceDetailPage } from '@/pages/DeviceDetailPage'
import { DeviceListPage } from '@/pages/DeviceListPage'
import { ApiDocsPage } from '@/pages/ApiDocsPage'
import { HealthPage } from '@/pages/HealthPage'
import { RulesPage } from '@/pages/RulesPage'
import { ToastContainer } from '@/components/ToastContainer'
import { RefreshIndicator } from '@/components/RefreshIndicator'
import { useThemeStore } from '@/stores/themeStore'
import { startHealthCheck, stopHealthCheck } from '@/stores/connectionStore'

// 不显示侧边栏的路由
const noSidebarRoutes = ['/api-docs', '/health']

function AppContent() {
  const location = useLocation()
  const showSidebar = !noSidebarRoutes.includes(location.pathname)
  const [isPageLoading, setIsPageLoading] = useState(true)

  // 页面加载/刷新检测
  useEffect(() => {
    setIsPageLoading(true)
    const timer = setTimeout(() => setIsPageLoading(false), 500)
    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <div className="flex h-screen bg-bg-darkest text-text-primary">
      <RefreshIndicator isRefreshing={isPageLoading} />
      {showSidebar && <Sidebar />}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<DeviceListPage />} />
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
      <ToastContainer />
    </BrowserRouter>
  )
}
