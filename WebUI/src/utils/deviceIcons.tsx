// deviceIcons.tsx
// 设备图标工具函数
//
// Created by Sun on 2025/12/05.
// Copyright © 2025 Sun. All rights reserved.
//

import React from 'react'
import {
    IPhoneIcon,
    IPadIcon,
    MacIcon,
    WatchIcon,
    TVIcon,
    SimulatorIcon
} from '../components/icons'

/**
 * 根据平台获取设备图标组件
 */
export const getPlatformIcon = (platform: string, size: number = 24, className?: string): React.ReactNode => {
    const props = { className, size }

    // 检查是否是模拟器
    if (platform.toLowerCase().includes('simulator')) {
        return <SimulatorIcon {...props} />
    }

    switch (platform) {
        case 'iOS':
            return <IPhoneIcon {...props} />
        case 'iPadOS':
            return <IPadIcon {...props} />
        case 'macOS':
            return <MacIcon {...props} />
        case 'watchOS':
            return <WatchIcon {...props} />
        case 'tvOS':
            return <TVIcon {...props} />
        default:
            // 默认显示手机图标
            return <IPhoneIcon {...props} />
    }
}


