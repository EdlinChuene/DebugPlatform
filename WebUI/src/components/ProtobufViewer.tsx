/**
 * ProtobufViewer.tsx
 * Protobuf 消息解析和展示组件
 *
 * 支持两种模式：
 * 1. Wire Format 解析：无需 .proto 文件，直接解析二进制显示字段编号和值
 * 2. Schema 解析：使用用户提供的 .proto 定义进行友好展示
 */

import { useState, useMemo } from 'react'
import clsx from 'clsx'

// Protobuf wire types
enum WireType {
  Varint = 0,
  Fixed64 = 1,
  LengthDelimited = 2,
  StartGroup = 3, // deprecated
  EndGroup = 4, // deprecated
  Fixed32 = 5,
}

// 解析后的字段
interface ProtobufField {
  fieldNumber: number
  wireType: WireType
  value: unknown
  rawBytes: Uint8Array
  offset: number
  length: number
}

// 解析结果
interface ParseResult {
  fields: ProtobufField[]
  errors: string[]
}

/**
 * 检测内容是否为 Protobuf
 */
export function isProtobufContentType(contentType: string | null | undefined): boolean {
  if (!contentType) return false
  const lower = contentType.toLowerCase()
  return (
    lower.includes('application/x-protobuf') ||
    lower.includes('application/protobuf') ||
    lower.includes('application/grpc') ||
    lower.includes('application/grpc+proto') ||
    lower.includes('application/octet-stream') // 可能是 protobuf
  )
}

/**
 * 从 base64 解码为 Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/**
 * 读取 Varint（变长整数）
 */
function readVarint(data: Uint8Array, offset: number): { value: bigint; bytesRead: number } {
  let result = 0n
  let shift = 0n
  let bytesRead = 0

  while (offset + bytesRead < data.length) {
    const byte = data[offset + bytesRead]
    result |= BigInt(byte & 0x7f) << shift
    bytesRead++

    if ((byte & 0x80) === 0) {
      break
    }
    shift += 7n

    if (bytesRead > 10) {
      throw new Error('Varint too long')
    }
  }

  return { value: result, bytesRead }
}

/**
 * 解析 Protobuf 消息（Wire Format）
 */
function parseProtobufWireFormat(data: Uint8Array): ParseResult {
  const fields: ProtobufField[] = []
  const errors: string[] = []
  let offset = 0

  while (offset < data.length) {
    try {
      const startOffset = offset

      // 读取 field tag (field_number << 3 | wire_type)
      const { value: tag, bytesRead: tagBytes } = readVarint(data, offset)
      offset += tagBytes

      const fieldNumber = Number(tag >> 3n)
      const wireType = Number(tag & 0x7n) as WireType

      if (fieldNumber === 0) {
        errors.push(`Invalid field number 0 at offset ${startOffset}`)
        break
      }

      let value: unknown
      let fieldLength: number

      switch (wireType) {
        case WireType.Varint: {
          const { value: varintValue, bytesRead } = readVarint(data, offset)
          value = varintValue
          offset += bytesRead
          fieldLength = offset - startOffset
          break
        }

        case WireType.Fixed64: {
          if (offset + 8 > data.length) {
            throw new Error('Unexpected end of data for Fixed64')
          }
          const view = new DataView(data.buffer, data.byteOffset + offset, 8)
          value = view.getBigUint64(0, true) // little-endian
          offset += 8
          fieldLength = offset - startOffset
          break
        }

        case WireType.LengthDelimited: {
          const { value: length, bytesRead: lengthBytes } = readVarint(data, offset)
          offset += lengthBytes
          const len = Number(length)

          if (offset + len > data.length) {
            throw new Error(`Length-delimited field extends beyond data: ${len} bytes at offset ${offset}`)
          }

          const fieldData = data.slice(offset, offset + len)

          // 尝试解析为嵌套消息、字符串或原始字节
          value = tryParseNestedOrString(fieldData)
          offset += len
          fieldLength = offset - startOffset
          break
        }

        case WireType.Fixed32: {
          if (offset + 4 > data.length) {
            throw new Error('Unexpected end of data for Fixed32')
          }
          const view = new DataView(data.buffer, data.byteOffset + offset, 4)
          value = view.getUint32(0, true) // little-endian
          offset += 4
          fieldLength = offset - startOffset
          break
        }

        case WireType.StartGroup:
        case WireType.EndGroup:
          errors.push(`Deprecated wire type ${wireType} at field ${fieldNumber}`)
          // 跳过，无法确定长度
          offset = data.length
          fieldLength = 0
          break

        default:
          throw new Error(`Unknown wire type ${wireType}`)
      }

      fields.push({
        fieldNumber,
        wireType,
        value,
        rawBytes: data.slice(startOffset, offset),
        offset: startOffset,
        length: fieldLength,
      })
    } catch (e) {
      errors.push(`Parse error at offset ${offset}: ${e instanceof Error ? e.message : String(e)}`)
      break
    }
  }

  return { fields, errors }
}

/**
 * 尝试将 length-delimited 数据解析为嵌套消息或字符串
 */
function tryParseNestedOrString(data: Uint8Array): unknown {
  // 1. 尝试解析为 UTF-8 字符串
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    const str = decoder.decode(data)
    // 检查是否是有效的可打印字符串
    if (isPrintableString(str)) {
      return { type: 'string', value: str }
    }
  } catch {
    // 不是有效的 UTF-8
  }

  // 2. 尝试解析为嵌套的 protobuf 消息
  if (data.length > 0) {
    try {
      const nested = parseProtobufWireFormat(data)
      if (nested.fields.length > 0 && nested.errors.length === 0) {
        // 验证嵌套解析结果是否合理
        const totalParsedBytes = nested.fields.reduce((sum, f) => sum + f.length, 0)
        if (totalParsedBytes === data.length) {
          return { type: 'nested', value: nested.fields }
        }
      }
    } catch {
      // 解析失败
    }
  }

  // 3. 返回原始字节
  return { type: 'bytes', value: data }
}

/**
 * 检查字符串是否主要由可打印字符组成
 */
function isPrintableString(str: string): boolean {
  if (str.length === 0) return false

  let printableCount = 0
  for (const char of str) {
    const code = char.charCodeAt(0)
    // 可打印 ASCII + 常见 Unicode
    if ((code >= 32 && code < 127) || code > 127) {
      printableCount++
    }
  }

  return printableCount / str.length > 0.9
}

/**
 * 格式化字节为 hex 字符串
 */
function formatBytes(bytes: Uint8Array, maxLength = 32): string {
  const hex = Array.from(bytes.slice(0, maxLength))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')
  return bytes.length > maxLength ? `${hex} ... (${bytes.length} bytes)` : hex
}

/**
 * 格式化 Varint 值（显示多种可能的解释）
 */
function formatVarintValue(value: bigint): React.ReactNode {
  const num = Number(value)
  const interpretations: string[] = []

  // 无符号整数
  interpretations.push(`uint: ${value}`)

  // 有符号整数 (zigzag decoded)
  const zigzag = Number((value >> 1n) ^ -(value & 1n))
  if (zigzag !== num) {
    interpretations.push(`sint: ${zigzag}`)
  }

  // 布尔值
  if (value === 0n || value === 1n) {
    interpretations.push(`bool: ${value === 1n}`)
  }

  // 时间戳猜测（秒或毫秒）
  if (num > 1000000000 && num < 2000000000) {
    const date = new Date(num * 1000)
    interpretations.push(`timestamp(s): ${date.toISOString()}`)
  } else if (num > 1000000000000 && num < 2000000000000) {
    const date = new Date(num)
    interpretations.push(`timestamp(ms): ${date.toISOString()}`)
  }

  return (
    <span className="text-xs">
      {interpretations.map((interp, i) => (
        <span key={i} className={i === 0 ? 'text-green-400' : 'text-text-muted ml-2'}>
          {interp}
        </span>
      ))}
    </span>
  )
}

/**
 * Wire Type 名称
 */
function getWireTypeName(wireType: WireType): string {
  switch (wireType) {
    case WireType.Varint:
      return 'Varint'
    case WireType.Fixed64:
      return 'Fixed64'
    case WireType.LengthDelimited:
      return 'Length-Delimited'
    case WireType.Fixed32:
      return 'Fixed32'
    case WireType.StartGroup:
      return 'StartGroup (deprecated)'
    case WireType.EndGroup:
      return 'EndGroup (deprecated)'
    default:
      return 'Unknown'
  }
}

// 组件 Props
interface ProtobufViewerProps {
  base64Data: string
  contentType?: string | null
  className?: string
}

/**
 * Protobuf 查看器组件
 */
export function ProtobufViewer({ base64Data, contentType, className }: ProtobufViewerProps) {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'parsed' | 'hex'>('parsed')

  const parseResult = useMemo(() => {
    try {
      const bytes = base64ToUint8Array(base64Data)
      return parseProtobufWireFormat(bytes)
    } catch (e) {
      return {
        fields: [],
        errors: [`Failed to decode base64: ${e instanceof Error ? e.message : String(e)}`],
      }
    }
  }, [base64Data])

  const rawBytes = useMemo(() => {
    try {
      return base64ToUint8Array(base64Data)
    } catch {
      return new Uint8Array()
    }
  }, [base64Data])

  const toggleField = (key: string) => {
    const newExpanded = new Set(expandedFields)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedFields(newExpanded)
  }

  return (
    <div className={clsx('bg-bg-dark rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-bg-darker border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-purple-400">📦 Protobuf</span>
          {contentType && <span className="text-xs text-text-muted">{contentType}</span>}
          <span className="text-xs text-text-muted">({rawBytes.length} bytes)</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('parsed')}
            className={clsx(
              'px-2 py-1 text-xs rounded transition-colors',
              viewMode === 'parsed' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text-primary'
            )}
          >
            Parsed
          </button>
          <button
            onClick={() => setViewMode('hex')}
            className={clsx(
              'px-2 py-1 text-xs rounded transition-colors',
              viewMode === 'hex' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text-primary'
            )}
          >
            Hex
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 max-h-96 overflow-auto">
        {parseResult.errors.length > 0 && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
            {parseResult.errors.map((error, i) => (
              <div key={i}>{error}</div>
            ))}
          </div>
        )}

        {viewMode === 'parsed' ? (
          parseResult.fields.length > 0 ? (
            <FieldList fields={parseResult.fields} expandedFields={expandedFields} toggleField={toggleField} />
          ) : (
            <div className="text-text-muted text-xs">无法解析为有效的 Protobuf 消息</div>
          )
        ) : (
          <HexView bytes={rawBytes} />
        )}
      </div>
    </div>
  )
}

/**
 * 字段列表组件
 */
function FieldList({
  fields,
  expandedFields,
  toggleField,
  prefix = '',
}: {
  fields: ProtobufField[]
  expandedFields: Set<string>
  toggleField: (key: string) => void
  prefix?: string
}) {
  return (
    <div className="space-y-1 font-mono text-xs">
      {fields.map((field, index) => {
        const key = `${prefix}${field.fieldNumber}-${index}`
        const isExpanded = expandedFields.has(key)
        const hasNested =
          typeof field.value === 'object' &&
          field.value !== null &&
          'type' in field.value &&
          field.value.type === 'nested'

        return (
          <div key={key} className="border-l-2 border-border pl-2">
            {/* Field header */}
            <div
              className={clsx('flex items-start gap-2 py-1', hasNested && 'cursor-pointer hover:bg-bg-lighter rounded')}
              onClick={hasNested ? () => toggleField(key) : undefined}
            >
              {hasNested && <span className="text-text-muted">{isExpanded ? '▼' : '▶'}</span>}
              <span className="text-yellow-400">field {field.fieldNumber}</span>
              <span className="text-text-muted">({getWireTypeName(field.wireType)})</span>
              <span className="text-text-muted">=</span>
              <FieldValue field={field} expanded={isExpanded} />
            </div>

            {/* Nested fields */}
            {hasNested && isExpanded && (
              <div className="ml-4 mt-1">
                <FieldList
                  fields={(field.value as { type: 'nested'; value: ProtobufField[] }).value}
                  expandedFields={expandedFields}
                  toggleField={toggleField}
                  prefix={`${key}-`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * 字段值显示组件
 */
function FieldValue({ field, expanded }: { field: ProtobufField; expanded: boolean }) {
  const { wireType, value } = field

  if (wireType === WireType.Varint) {
    return formatVarintValue(value as bigint)
  }

  if (wireType === WireType.Fixed32) {
    const num = value as number
    const float = new DataView(new Uint32Array([num]).buffer).getFloat32(0, true)
    return (
      <span className="text-xs">
        <span className="text-green-400">uint32: {num}</span>
        {!isNaN(float) && isFinite(float) && <span className="text-text-muted ml-2">float: {float.toFixed(4)}</span>}
      </span>
    )
  }

  if (wireType === WireType.Fixed64) {
    const bigNum = value as bigint
    return (
      <span className="text-xs">
        <span className="text-green-400">uint64: {bigNum.toString()}</span>
      </span>
    )
  }

  if (wireType === WireType.LengthDelimited && typeof value === 'object' && value !== null && 'type' in value) {
    const typedValue = value as { type: string; value: unknown }

    if (typedValue.type === 'string') {
      const strValue = String(typedValue.value)
      return (
        <span className="text-green-400">
          "{strValue.length > 100 ? strValue.slice(0, 100) + '...' : strValue}"
        </span>
      )
    }

    if (typedValue.type === 'nested') {
      const nestedFields = typedValue.value as ProtobufField[]
      if (!expanded) {
        return <span className="text-blue-400">{`{ ${nestedFields.length} fields }`}</span>
      }
      return null // Content is rendered separately
    }

    if (typedValue.type === 'bytes') {
      const bytes = typedValue.value as Uint8Array
      return <span className="text-text-muted">[{formatBytes(bytes)}]</span>
    }
  }

  return <span className="text-text-muted">?</span>
}

/**
 * Hex 视图组件
 */
function HexView({ bytes }: { bytes: Uint8Array }) {
  const rows: React.ReactNode[] = []
  const bytesPerRow = 16

  for (let i = 0; i < bytes.length; i += bytesPerRow) {
    const rowBytes = bytes.slice(i, i + bytesPerRow)
    const hex = Array.from(rowBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ')
    const ascii = Array.from(rowBytes)
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
      .join('')

    rows.push(
      <div key={i} className="flex gap-4 font-mono text-xs">
        <span className="text-text-muted w-12">{i.toString(16).padStart(8, '0')}</span>
        <span className="text-green-400 flex-1">{hex.padEnd(47, ' ')}</span>
        <span className="text-yellow-400">{ascii}</span>
      </div>
    )
  }

  return <div className="space-y-0.5">{rows}</div>
}

export default ProtobufViewer
