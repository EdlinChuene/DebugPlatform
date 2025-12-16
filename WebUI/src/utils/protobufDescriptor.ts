/**
 * protobufDescriptor.ts
 * Protobuf Descriptor Set 解析和 BLOB 解码工具
 * 
 * 使用 .desc 文件（protoc --descriptor_set_out 生成）解析数据库中的 BLOB 字段
 */

import protobuf from 'protobufjs'

// 动态导入 descriptor 扩展以添加 Root.fromDescriptor 方法
// 这个导入有副作用，会给 Root 添加 fromDescriptor 静态方法
import 'protobufjs/ext/descriptor'

// 扩展 Root 类型以包含 fromDescriptor 方法
declare module 'protobufjs' {
    namespace Root {
        function fromDescriptor(descriptor: Uint8Array | ArrayBuffer | unknown): protobuf.Root
    }
}

export interface ProtobufDescriptor {
    /** 描述符名称（通常是文件名） */
    name: string
    /** 所有可用的消息类型 */
    messageTypes: string[]
    /** protobufjs Root 对象 */
    root: protobuf.Root
    /** 上传时间 */
    uploadedAt: Date
}

export interface ColumnProtobufConfig {
    /** 数据库 ID */
    dbId: string
    /** 表名 */
    tableName: string
    /** 列名 */
    columnName: string
    /** 消息类型全名（如 "im.proto.Message"） */
    messageType: string
    /** 描述符名称 */
    descriptorName: string
}

/**
 * 从 .desc 文件加载 Protobuf 描述符
 */
export async function loadDescriptorFromFile(file: File): Promise<ProtobufDescriptor> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = async () => {
            try {
                const buffer = reader.result as ArrayBuffer
                const bytes = new Uint8Array(buffer)

                // 使用 Root.fromDescriptor 解析 FileDescriptorSet
                // 该方法由 protobufjs/ext/descriptor 扩展提供
                const root = protobuf.Root.fromDescriptor(bytes)

                // 收集所有消息类型
                const messageTypes = collectMessageTypes(root)

                resolve({
                    name: file.name,
                    messageTypes,
                    root,
                    uploadedAt: new Date(),
                })
            } catch (error) {
                reject(new Error(`解析描述符文件失败: ${error instanceof Error ? error.message : String(error)}`))
            }
        }

        reader.onerror = () => {
            reject(new Error('读取文件失败'))
        }

        reader.readAsArrayBuffer(file)
    })
}

/**
 * 从 Base64 编码的 .desc 数据加载描述符
 */
export async function loadDescriptorFromBase64(base64Data: string, name: string): Promise<ProtobufDescriptor> {
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }

    // 使用 Root.fromDescriptor 解析
    const root = protobuf.Root.fromDescriptor(bytes)
    const messageTypes = collectMessageTypes(root)

    return {
        name,
        messageTypes,
        root,
        uploadedAt: new Date(),
    }
}/**
 * 递归收集所有消息类型
 */
function collectMessageTypes(root: protobuf.Root): string[] {
    const types: string[] = []

    function traverse(namespace: protobuf.NamespaceBase, prefix: string) {
        for (const nested of namespace.nestedArray) {
            const fullName = prefix ? `${prefix}.${nested.name}` : nested.name

            if (nested instanceof protobuf.Type) {
                types.push(fullName)
                // 递归检查嵌套类型
                traverse(nested, fullName)
            } else if (nested instanceof protobuf.Namespace) {
                traverse(nested, fullName)
            }
        }
    }

    traverse(root, '')
    return types.sort()
}

/**
 * 解码 BLOB 数据为 Protobuf 消息
 */
export function decodeBlob(
    descriptor: ProtobufDescriptor,
    messageType: string,
    blobData: string | Uint8Array
): { success: true; data: Record<string, unknown> } | { success: false; error: string } {
    try {
        // 查找消息类型
        const MessageType = descriptor.root.lookupType(messageType)

        // 转换数据
        let bytes: Uint8Array
        if (typeof blobData === 'string') {
            // Base64 编码
            const binaryString = atob(blobData)
            bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i)
            }
        } else {
            bytes = blobData
        }

        // 解码
        const message = MessageType.decode(bytes)
        const object = MessageType.toObject(message, {
            longs: String,      // 将 long 转为字符串
            enums: String,      // 将枚举转为字符串
            bytes: Array,       // 将嵌套 bytes 转为数组（后续手动处理）
            defaults: false,    // 不包含默认值
            arrays: true,       // 始终初始化数组
            objects: true,      // 始终初始化对象
        })

        // 后处理：将 bytes 字段转为友好格式
        const processed = processDecodedObject(object)

        return { success: true, data: processed }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        }
    }
}

/**
 * 后处理解码对象，将 bytes 数组转为友好格式
 */
function processDecodedObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
            result[key] = value
            continue
        }

        // 检查是否是 bytes 数组（Uint8Array 或普通数组）
        if (value instanceof Uint8Array || (Array.isArray(value) && isLikelyBytesArray(value))) {
            result[key] = formatBytesValue(value as number[] | Uint8Array)
        } else if (Array.isArray(value)) {
            // 处理数组中的每个元素
            result[key] = value.map(item => {
                if (item instanceof Uint8Array || (Array.isArray(item) && isLikelyBytesArray(item))) {
                    return formatBytesValue(item as number[] | Uint8Array)
                } else if (typeof item === 'object' && item !== null) {
                    return processDecodedObject(item as Record<string, unknown>)
                }
                return item
            })
        } else if (typeof value === 'object') {
            result[key] = processDecodedObject(value as Record<string, unknown>)
        } else {
            result[key] = value
        }
    }

    return result
}

/**
 * 检查数组是否像 bytes 数组（所有元素是 0-255 的数字）
 */
function isLikelyBytesArray(arr: unknown[]): boolean {
    if (arr.length === 0) return false
    // 检查前几个元素
    const checkCount = Math.min(arr.length, 10)
    for (let i = 0; i < checkCount; i++) {
        const item = arr[i]
        if (typeof item !== 'number' || item < 0 || item > 255 || !Number.isInteger(item)) {
            return false
        }
    }
    return true
}

/**
 * 格式化 bytes 值为友好格式
 */
function formatBytesValue(bytes: number[] | Uint8Array): string {
    const arr = bytes instanceof Uint8Array ? Array.from(bytes) : bytes

    // 尝试作为 UTF-8 字符串解码
    try {
        const uint8 = new Uint8Array(arr)
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(uint8)
        // 检查是否是可打印字符串
        const { nonPrintableRatio } = analyzeString(decoded)
        if (nonPrintableRatio < 0.1) {
            // 超过 90% 可打印，作为字符串返回
            return decoded
        }
    } catch {
        // 解码失败，不是有效 UTF-8
    }

    // 作为二进制数据显示
    if (arr.length <= 32) {
        // 短数据显示 hex
        return `[Bytes: ${arr.map(b => b.toString(16).padStart(2, '0')).join(' ')}]`
    } else {
        // 长数据只显示长度和前几个字节
        const preview = arr.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join(' ')
        return `[Bytes: ${arr.length} bytes, hex: ${preview}...]`
    }
}

/**
 * 尝试自动检测并解码 BLOB（使用 wire format）
 */
export function tryAutoDecode(blobData: string | Uint8Array): Record<string, unknown> | null {
    try {
        let bytes: Uint8Array
        if (typeof blobData === 'string') {
            const binaryString = atob(blobData)
            bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i)
            }
        } else {
            bytes = blobData
        }

        // 使用通用 Reader 尝试解析
        const reader = new protobuf.Reader(bytes)
        const result: Record<string, unknown> = {}

        while (reader.pos < reader.len) {
            const tag = reader.uint32()
            const fieldNumber = tag >>> 3
            const wireType = tag & 7

            let value: unknown
            switch (wireType) {
                case 0: // Varint
                    value = reader.int64().toString()
                    break
                case 1: // Fixed64
                    value = reader.fixed64().toString()
                    break
                case 2: // Length-delimited
                    const data = reader.bytes()
                    // 尝试解析为字符串
                    try {
                        const str = new TextDecoder('utf-8', { fatal: true }).decode(data)
                        if (isPrintable(str)) {
                            value = str
                        } else {
                            value = `[${data.length} bytes]`
                        }
                    } catch {
                        value = `[${data.length} bytes]`
                    }
                    break
                case 5: // Fixed32
                    value = reader.fixed32()
                    break
                default:
                    reader.skipType(wireType)
                    continue
            }

            const key = `field_${fieldNumber}`
            if (key in result) {
                // 重复字段
                if (Array.isArray(result[key])) {
                    (result[key] as unknown[]).push(value)
                } else {
                    result[key] = [result[key], value]
                }
            } else {
                result[key] = value
            }
        }

        return Object.keys(result).length > 0 ? result : null
    } catch {
        return null
    }
}

function isPrintable(str: string): boolean {
    return /^[\x20-\x7E\u4E00-\u9FFF\u3000-\u303F\s]+$/.test(str)
}

/**
 * 自动检测 BLOB 数据匹配的 protobuf 消息类型
 * 遍历所有可用类型，返回第一个成功解析的类型
 * @returns 匹配的消息类型，若无匹配返回 null
 */
export function autoDetectMessageType(
    descriptor: ProtobufDescriptor,
    blobData: string | Uint8Array
): string | null {
    // 转换数据
    let bytes: Uint8Array
    if (typeof blobData === 'string') {
        try {
            const binaryString = atob(blobData)
            bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i)
            }
        } catch {
            return null
        }
    } else {
        bytes = blobData
    }

    // 空数据无法检测
    if (bytes.length === 0) {
        return null
    }

    // 遍历所有消息类型尝试解析
    for (const messageType of descriptor.messageTypes) {
        try {
            const MessageType = descriptor.root.lookupType(messageType)
            const message = MessageType.decode(bytes)

            // 验证解码结果不为空对象
            const object = MessageType.toObject(message, {
                longs: String,
                enums: String,
                bytes: String,
                defaults: false,
                arrays: true,
                objects: true,
            })

            // 检查解码后的对象是否有有意义的数据
            // 空对象或者只有默认值的对象不算匹配
            const keys = Object.keys(object)
            if (keys.length > 0) {
                // 进一步验证：重新编码后长度应该接近原始数据
                // 这可以排除一些误报
                const reEncoded = MessageType.encode(message).finish()
                // 允许 50% 的误差（因为 defaults 可能不同）
                if (reEncoded.length > 0 && reEncoded.length <= bytes.length * 2) {
                    return messageType
                }
            }
        } catch {
            // 解析失败，继续尝试下一个类型
            continue
        }
    }

    return null
}

/**
 * 格式化解码后的消息为可读字符串
 */
export function formatDecodedMessage(data: Record<string, unknown>, indent = 0): string {
    const spaces = '  '.repeat(indent)
    const lines: string[] = []

    for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) {
            continue
        }

        if (Array.isArray(value)) {
            if (value.length === 0) continue
            lines.push(`${spaces}${key}: [`)
            for (const item of value) {
                if (typeof item === 'object' && item !== null) {
                    lines.push(`${spaces}  {`)
                    lines.push(formatDecodedMessage(item as Record<string, unknown>, indent + 2))
                    lines.push(`${spaces}  }`)
                } else {
                    lines.push(`${spaces}  ${formatValue(item)}`)
                }
            }
            lines.push(`${spaces}]`)
        } else if (typeof value === 'object') {
            lines.push(`${spaces}${key}: {`)
            lines.push(formatDecodedMessage(value as Record<string, unknown>, indent + 1))
            lines.push(`${spaces}}`)
        } else {
            lines.push(`${spaces}${key}: ${formatValue(value)}`)
        }
    }

    return lines.join('\n')
}

function formatValue(value: unknown): string {
    if (typeof value === 'string') {
        // 检查是否是 Base64 编码的二进制数据
        if (isLikelyBase64Binary(value)) {
            const byteLength = Math.floor(value.length * 3 / 4)
            return `[Binary: ${byteLength} bytes, Base64: ${value.slice(0, 50)}${value.length > 50 ? '...' : ''}]`
        }

        // 检查字符串是否主要是乱码（非打印字符比例过高）
        const { nonPrintableRatio, totalChecked } = analyzeString(value)
        if (nonPrintableRatio > 0.2 && totalChecked > 10) {
            // 如果超过 20% 是非打印字符，当作二进制处理
            return `[Binary string: ${value.length} chars, contains ${Math.round(nonPrintableRatio * 100)}% non-printable]`
        }

        // 检查是否包含非打印字符，需要转义
        if (nonPrintableRatio > 0) {
            // 转义非打印字符
            const escaped = escapeNonPrintable(value)
            // 如果转义后太长，截断显示
            if (escaped.length > 200) {
                return `"${escaped.slice(0, 200)}..." (${value.length} chars)`
            }
            return `"${escaped}"`
        }

        // 检查是否是时间戳
        const num = Number(value)
        if (!isNaN(num)) {
            if (num > 1000000000000 && num < 2000000000000) {
                return `${value} (${new Date(num).toISOString()})`
            }
            if (num > 1000000000 && num < 2000000000) {
                return `${value} (${new Date(num * 1000).toISOString()})`
            }
        }

        // 如果字符串太长，截断显示
        if (value.length > 500) {
            return `"${value.slice(0, 500)}..." (${value.length} chars)`
        }
        return `"${value}"`
    }
    return String(value)
}

/** 分析字符串中的非打印字符比例 */
function analyzeString(str: string): { nonPrintableRatio: number; totalChecked: number } {
    const sampleSize = Math.min(str.length, 500)
    let nonPrintable = 0

    for (let i = 0; i < sampleSize; i++) {
        const code = str.charCodeAt(i)
        // 非打印字符：控制字符（除了换行、回车、制表符）
        if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
            nonPrintable++
        }
        // 非法 Unicode 代理对
        else if (code >= 0xD800 && code <= 0xDFFF) {
            nonPrintable++
        }
        // 私用区和特殊字符
        else if (code >= 0xE000 && code <= 0xF8FF) {
            nonPrintable++
        }
    }

    return {
        nonPrintableRatio: sampleSize > 0 ? nonPrintable / sampleSize : 0,
        totalChecked: sampleSize,
    }
}

/** 检测字符串是否可能是 Base64 编码的二进制数据 */
function isLikelyBase64Binary(str: string): boolean {
    // 太短不可能是有意义的 Base64
    if (str.length < 20) return false
    // 检查是否是有效的 Base64 字符
    if (!/^[A-Za-z0-9+/]+=*$/.test(str)) return false
    // 长度必须是 4 的倍数
    if (str.length % 4 !== 0) return false

    // 尝试解码并检查是否包含大量非打印字符
    try {
        const decoded = atob(str)
        let nonPrintable = 0
        const sampleSize = Math.min(decoded.length, 100)
        for (let i = 0; i < sampleSize; i++) {
            const code = decoded.charCodeAt(i)
            if (code < 32 || code > 126) {
                nonPrintable++
            }
        }
        // 如果超过 30% 是非打印字符，认为是二进制
        return nonPrintable / sampleSize > 0.3
    } catch {
        return false
    }
}

/** 转义非打印字符 */
function escapeNonPrintable(str: string): string {
    let result = ''
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i)
        if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
            result += `\\x${code.toString(16).padStart(2, '0')}`
        } else if (code >= 0xD800 && code <= 0xDFFF) {
            result += `\\u${code.toString(16).padStart(4, '0')}`
        } else if (code >= 0xE000 && code <= 0xF8FF) {
            // 私用区字符用 Unicode 转义
            result += `\\u${code.toString(16).padStart(4, '0')}`
        } else {
            result += str[i]
        }
    }
    return result
}
