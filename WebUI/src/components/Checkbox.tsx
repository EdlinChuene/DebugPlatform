// Checkbox.tsx
// 统一的复选框组件
//
// Created by Sun on 2025/12/07.
// Copyright © 2025 Sun. All rights reserved.
//

import clsx from 'clsx'

interface CheckboxProps {
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
    className?: string
    id?: string
    'aria-label'?: string
}

/**
 * 统一样式的复选框组件
 * 
 * 使用 checkbox-custom CSS 类实现：
 * - 未选中：灰色填充
 * - 悬停：稍亮的灰色
 * - 选中：主题色（绿色）+ 白色勾选
 */
export function Checkbox({
    checked,
    onChange,
    disabled = false,
    className,
    id,
    'aria-label': ariaLabel,
}: CheckboxProps) {
    return (
        <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className={clsx('checkbox-custom', className)}
            aria-label={ariaLabel}
        />
    )
}
