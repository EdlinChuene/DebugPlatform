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
    SimulatorIcon,
    AndroidPhoneIcon,
    AndroidSimulatorIcon
} from '../components/icons'

/**
 * 根据平台和设备类型获取设备图标组件
 *
 * 图标设计规则：
 * - iOS 真机：iPhone 精细外观
 * - iOS 模拟器：Mac 显示器内嵌 iPhone
 * - Android 真机：Android 手机外观（方正设计 + 三键指示）
 * - Android 模拟器：Mac 显示器内嵌 Android 手机
 * - iPadOS：iPad 图标
 * - macOS：Mac 电脑图标
 * - watchOS：Apple Watch 图标
 * - tvOS：Apple TV 图标
 *
 * @param platform 平台标识（iOS, Android, iPadOS, macOS, watchOS, tvOS）
 * @param size 图标尺寸
 * @param className CSS 类名
 * @param isSimulator 是否为模拟器设备
 */
export const getPlatformIcon = (
    platform: string,
    size: number = 24,
    className?: string,
    isSimulator?: boolean
): React.ReactNode => {
    const props = { className, size }
    const platformLower = platform.toLowerCase()

    // 模拟器设备 - 使用 Mac 显示器样式
    if (isSimulator) {
        // Android 模拟器
        if (platformLower.includes('android')) {
            return <AndroidSimulatorIcon {...props} />
        }
        // iOS/其他平台模拟器 - 使用 iOS 模拟器图标
        return <SimulatorIcon {...props} />
    }

    // 兼容旧逻辑：检查 platform 字符串是否包含 'simulator'
    if (platformLower.includes('simulator')) {
        if (platformLower.includes('android')) {
            return <AndroidSimulatorIcon {...props} />
        }
        return <SimulatorIcon {...props} />
    }

    // Android 真机
    if (platformLower.includes('android')) {
        return <AndroidPhoneIcon {...props} />
    }

    // Apple 平台
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
            // 默认显示 iPhone 图标
            return <IPhoneIcon {...props} />
    }
}


