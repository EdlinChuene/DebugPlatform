// DeviceDetailPage.tsx
// 设备详情页 - 直接使用插件视图

import React from 'react'
import DevicePluginView from '@/pages/DevicePluginView'

/**
 * 设备详情页入口
 * 基于插件系统渲染各功能模块
 */
export function DeviceDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center h-full text-text-tertiary">
          加载中...
        </div>
      }
    >
      <DevicePluginView />
    </React.Suspense>
  )
}
