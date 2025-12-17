/**
 * typeMappingTable.ts
 * 类型映射表解析工具
 * 
 * 支持上传 CSV 文件，解析其中的映射关系（如 msgType -> protoTypeName）
 * 然后与 desc 中的 Protobuf 类型进行自动匹配
 */

export interface MappingTableRow {
    /** 原始行数据 */
    raw: Record<string, string>
    /** 映射键值（如 msgType 的值 "1"） */
    key: string
    /** 映射值（如 protoTypeName "MsgText"） */
    value: string
}

export interface ParsedMappingTable {
    /** 表名（通常是文件名） */
    name: string
    /** 所有列名 */
    columns: string[]
    /** 原始数据行 */
    rows: Record<string, string>[]
    /** 上传时间 */
    uploadedAt: Date
}

export interface ConfiguredMappingTable extends ParsedMappingTable {
    /** 选择作为键的列名（如 "msgType"） */
    keyColumn: string
    /** 选择作为值的列名（如 "protoTypeName"） */
    valueColumn: string
    /** 解析后的映射关系（key -> value） */
    mappings: Map<string, string>
}

/**
 * 解析 CSV 文件内容
 */
export function parseCSV(content: string): { columns: string[]; rows: Record<string, string>[] } {
    const lines = content.trim().split(/\r?\n/)
    if (lines.length < 2) {
        throw new Error('CSV 文件至少需要包含标题行和一行数据')
    }
    
    // 解析标题行
    const rawColumns = parseCSVLine(lines[0])
    
    // 过滤空列名，并记录有效列的索引
    const validColumnIndices: number[] = []
    const columns: string[] = []
    rawColumns.forEach((col, idx) => {
        if (col.trim()) {
            validColumnIndices.push(idx)
            columns.push(col.trim())
        }
    })
    
    if (columns.length === 0) {
        throw new Error('CSV 文件没有有效的列名')
    }
    
    // 解析数据行（只保留有效列）
    const rows: Record<string, string>[] = []
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const values = parseCSVLine(line)
        
        // 检查是否为空行（所有有效列都是空的）
        const hasData = validColumnIndices.some(idx => values[idx]?.trim())
        if (!hasData) continue
        
        const row: Record<string, string> = {}
        validColumnIndices.forEach((originalIdx, newIdx) => {
            row[columns[newIdx]] = values[originalIdx]?.trim() || ''
        })
        rows.push(row)
    }
    
    return { columns, rows }
}

/**
 * 解析单行 CSV（处理引号和逗号）
 */
function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // 转义的引号
                current += '"'
                i++
            } else {
                // 切换引号状态
                inQuotes = !inQuotes
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
        } else {
            current += char
        }
    }
    
    result.push(current.trim())
    return result
}

/**
 * 从文件加载并解析映射表
 */
export async function loadMappingTableFromFile(file: File): Promise<ParsedMappingTable> {
    const name = file.name.replace(/\.(csv|xlsx?)$/i, '')
    
    // 检查文件类型
    if (file.name.toLowerCase().endsWith('.csv')) {
        const content = await file.text()
        const { columns, rows } = parseCSV(content)
        
        return {
            name,
            columns,
            rows,
            uploadedAt: new Date(),
        }
    } else if (file.name.toLowerCase().match(/\.xlsx?$/)) {
        // 对于 xlsx 文件，提示用户转换为 CSV
        // 或者后续可以通过安装 xlsx 库来支持
        throw new Error('暂不支持 Excel 文件，请将其转换为 CSV 格式后上传')
    } else {
        throw new Error('不支持的文件格式，请上传 CSV 文件')
    }
}

/**
 * 配置映射表的键值列，生成映射关系
 */
export function configureMappingTable(
    table: ParsedMappingTable,
    keyColumn: string,
    valueColumn: string
): ConfiguredMappingTable {
    if (!table.columns.includes(keyColumn)) {
        throw new Error(`列 "${keyColumn}" 不存在`)
    }
    if (!table.columns.includes(valueColumn)) {
        throw new Error(`列 "${valueColumn}" 不存在`)
    }
    
    const mappings = new Map<string, string>()
    for (const row of table.rows) {
        const key = row[keyColumn]
        const value = row[valueColumn]
        if (key && value) {
            mappings.set(key, value)
        }
    }
    
    return {
        ...table,
        keyColumn,
        valueColumn,
        mappings,
    }
}

/**
 * 智能匹配映射表中的值与 Protobuf 消息类型
 * 
 * 匹配规则：
 * 1. 精确匹配全名（如 "im_proto.MsgText"）
 * 2. 匹配简短名（如 "MsgText" -> "im_proto.MsgText"）
 * 3. 忽略大小写匹配
 * 
 * @returns 映射表值到实际 Protobuf 类型名的映射
 */
export function matchWithProtobufTypes(
    mappingValues: string[],
    protoTypes: string[]
): Map<string, string> {
    const result = new Map<string, string>()
    
    // 构建简短名到全名的索引
    const shortNameIndex = new Map<string, string[]>()
    for (const fullName of protoTypes) {
        const shortName = fullName.split('.').pop() || fullName
        const existing = shortNameIndex.get(shortName.toLowerCase()) || []
        existing.push(fullName)
        shortNameIndex.set(shortName.toLowerCase(), existing)
    }
    
    for (const value of mappingValues) {
        // 1. 精确匹配
        if (protoTypes.includes(value)) {
            result.set(value, value)
            continue
        }
        
        // 2. 简短名匹配（忽略大小写）
        const matches = shortNameIndex.get(value.toLowerCase())
        if (matches && matches.length === 1) {
            result.set(value, matches[0])
            continue
        }
        
        // 3. 包含匹配（如 "MsgText" 匹配 "im_proto.MsgText"）
        const containsMatch = protoTypes.find(t => 
            t.toLowerCase().endsWith('.' + value.toLowerCase()) ||
            t.toLowerCase() === value.toLowerCase()
        )
        if (containsMatch) {
            result.set(value, containsMatch)
        }
    }
    
    return result
}

/**
 * 序列化映射表用于持久化存储
 */
export function serializeMappingTable(table: ConfiguredMappingTable): string {
    return JSON.stringify({
        name: table.name,
        columns: table.columns,
        rows: table.rows,
        uploadedAt: table.uploadedAt.toISOString(),
        keyColumn: table.keyColumn,
        valueColumn: table.valueColumn,
    })
}

/**
 * 反序列化映射表
 */
export function deserializeMappingTable(json: string): ConfiguredMappingTable {
    const data = JSON.parse(json)
    const table: ParsedMappingTable = {
        name: data.name,
        columns: data.columns,
        rows: data.rows,
        uploadedAt: new Date(data.uploadedAt),
    }
    return configureMappingTable(table, data.keyColumn, data.valueColumn)
}

