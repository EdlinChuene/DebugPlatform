import { useState, useMemo } from 'react'

interface Props {
  base64Data: string
  contentType: string | null
  className?: string
}

/**
 * 图片响应预览组件
 */
export function ImagePreview({ base64Data, contentType, className = '' }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const imageDataUrl = useMemo(() => {
    // 根据 content-type 确定 MIME 类型
    const mimeType = getMimeType(contentType)
    if (!mimeType) return null

    return `data:${mimeType};base64,${base64Data}`
  }, [base64Data, contentType])

  if (!imageDataUrl || loadError) {
    return null
  }

  return (
    <>
      <div className={`relative ${className}`}>
        <img
          src={imageDataUrl}
          alt="Response preview"
          className="image-preview cursor-pointer"
          onClick={() => setIsFullscreen(true)}
          onError={() => setLoadError(true)}
        />
        <div className="absolute bottom-2 right-2 flex gap-2">
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 bg-bg-dark/80 rounded-lg hover:bg-bg-dark transition-colors"
            title="全屏预览"
          >
            <ExpandIcon className="w-4 h-4" />
          </button>
          <a
            href={imageDataUrl}
            download="response-image"
            className="p-1.5 bg-bg-dark/80 rounded-lg hover:bg-bg-dark transition-colors"
            title="下载图片"
          >
            <DownloadIcon className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
            onClick={() => setIsFullscreen(false)}
          >
            <CloseIcon className="w-6 h-6" />
          </button>
          <img
            src={imageDataUrl}
            alt="Response preview fullscreen"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

/**
 * 检测内容是否为图片
 */
export function isImageContentType(contentType: string | null | undefined): boolean {
  if (!contentType) return false
  const normalized = contentType.toLowerCase()
  return (
    normalized.startsWith('image/') ||
    normalized.includes('image/png') ||
    normalized.includes('image/jpeg') ||
    normalized.includes('image/gif') ||
    normalized.includes('image/webp') ||
    normalized.includes('image/svg+xml') ||
    normalized.includes('image/bmp') ||
    normalized.includes('image/ico')
  )
}

/**
 * 从 Content-Type 获取 MIME 类型
 */
function getMimeType(contentType: string | null): string | null {
  if (!contentType) return null

  // 提取 MIME 类型（去掉 charset 等参数）
  const mimeType = contentType.split(';')[0].trim().toLowerCase()

  const supportedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/x-icon',
    'image/ico',
  ]

  if (supportedTypes.some((t) => mimeType.includes(t) || mimeType === t)) {
    return mimeType
  }

  // 尝试从通用 image/* 类型推断
  if (mimeType.startsWith('image/')) {
    return mimeType
  }

  return null
}

// Icons
function ExpandIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
      />
    </svg>
  )
}

function DownloadIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
