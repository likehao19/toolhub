/**
 * 日程导入导出工具
 */

/**
 * 导出日程为 iCalendar (.ics) 格式
 */
export async function exportEventsToICS(events) {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Productivity Toolbox//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ]

  events.forEach(event => {
    const startDate = new Date(event.start_time)
    const endDate = event.end_time ? new Date(event.end_time) : new Date(startDate.getTime() + 3600000) // 默认1小时

    // 格式化日期为 ICS 格式 (YYYYMMDDTHHmmssZ)
    const formatDate = (date) => {
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      const hours = String(date.getUTCHours()).padStart(2, '0')
      const minutes = String(date.getUTCMinutes()).padStart(2, '0')
      const seconds = String(date.getUTCSeconds()).padStart(2, '0')
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
    }

    // 转义文本内容
    const escapeText = (text) => {
      if (!text) return ''
      return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
    }

    icsContent.push('BEGIN:VEVENT')
    icsContent.push(`UID:${event.id}@productivity-toolbox`)
    icsContent.push(`DTSTART:${formatDate(startDate)}`)
    icsContent.push(`DTEND:${formatDate(endDate)}`)
    icsContent.push(`DTSTAMP:${formatDate(new Date())}`)
    icsContent.push(`SUMMARY:${escapeText(event.title)}`)
    
    if (event.description) {
      icsContent.push(`DESCRIPTION:${escapeText(event.description)}`)
    }
    
    if (event.location) {
      icsContent.push(`LOCATION:${escapeText(event.location)}`)
    }

    // 处理重复规则
    if (event.repeat_rule) {
      // 这里可以解析 repeat_rule 并转换为 RRULE
      // 简化处理：如果有重复规则，添加基本的 RRULE
      icsContent.push(`RRULE:${event.repeat_rule}`)
    }

    // 提醒
    if (event.reminder_minutes) {
      icsContent.push(`BEGIN:VALARM`)
      icsContent.push(`TRIGGER:-PT${event.reminder_minutes}M`)
      icsContent.push(`ACTION:DISPLAY`)
      icsContent.push(`DESCRIPTION:${escapeText(event.title)}`)
      icsContent.push(`END:VALARM`)
    }

    icsContent.push('END:VEVENT')
  })

  icsContent.push('END:VCALENDAR')
  return icsContent.join('\r\n')
}

/**
 * 导出日程为 CSV
 */
export async function exportEventsToCSV(events) {
  const headers = ['标题', '描述', '开始时间', '结束时间', '地点', '提醒(分钟)', '分类', '重复规则', '创建时间', '更新时间']
  const rows = events.map(event => [
    event.title || '',
    event.description || '',
    event.start_time || '',
    event.end_time || '',
    event.location || '',
    event.reminder_minutes || '',
    event.category || '',
    event.repeat_rule || '',
    event.created_at || '',
    event.updated_at || ''
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  // 添加 BOM 以支持中文
  const BOM = '\uFEFF'
  return BOM + csvContent
}

/**
 * 从 CSV 导入日程
 */
export async function importEventsFromCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV 文件格式不正确')
  }

  // 解析表头
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

  const events = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length !== headers.length) continue

    const event = {}
    headers.forEach((header, index) => {
      const value = values[index].replace(/^"|"$/g, '')
      switch (header) {
        case '标题':
          event.title = value
          break
        case '描述':
          event.description = value || null
          break
        case '开始时间':
          event.start_time = value || null
          break
        case '结束时间':
          event.end_time = value || null
          break
        case '地点':
          event.location = value || null
          break
        case '提醒(分钟)':
          event.reminder_minutes = value ? parseInt(value) : null
          break
        case '分类':
          event.category = value || null
          break
        case '重复规则':
          event.repeat_rule = value || null
          break
      }
    })

    if (event.title && event.start_time) {
      events.push(event)
    }
  }

  return events
}

/**
 * 从 iCalendar (.ics) 导入日程
 * 简化版本：只解析基本的 VEVENT 信息
 */
export async function importEventsFromICS(icsText) {
  const events = []
  const lines = icsText.split(/\r?\n/)
  
  let currentEvent = null
  let inEvent = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {}
    } else if (line === 'END:VEVENT') {
      if (currentEvent && currentEvent.title && currentEvent.start_time) {
        events.push(currentEvent)
      }
      inEvent = false
      currentEvent = null
    } else if (inEvent && currentEvent) {
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).split(';')[0] // 忽略参数
        const value = line.substring(colonIndex + 1)
        
        switch (key) {
          case 'SUMMARY':
            currentEvent.title = unescapeText(value)
            break
          case 'DESCRIPTION':
            currentEvent.description = unescapeText(value)
            break
          case 'LOCATION':
            currentEvent.location = unescapeText(value)
            break
          case 'DTSTART':
            currentEvent.start_time = parseICSDate(value)
            break
          case 'DTEND':
            currentEvent.end_time = parseICSDate(value)
            break
          case 'TRIGGER':
            // 解析提醒时间（简化处理）
            const match = value.match(/-PT(\d+)M/)
            if (match) {
              currentEvent.reminder_minutes = parseInt(match[1])
            }
            break
        }
      }
    }
  }

  return events
}

/**
 * 解析 ICS 日期格式
 */
function parseICSDate(icsDate) {
  // 格式: YYYYMMDDTHHmmssZ 或 YYYYMMDD
  if (icsDate.length === 15 && icsDate.endsWith('Z')) {
    const year = icsDate.substring(0, 4)
    const month = icsDate.substring(4, 6)
    const day = icsDate.substring(6, 8)
    const hour = icsDate.substring(9, 11)
    const minute = icsDate.substring(11, 13)
    const second = icsDate.substring(13, 15)
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`
  } else if (icsDate.length === 8) {
    const year = icsDate.substring(0, 4)
    const month = icsDate.substring(4, 6)
    const day = icsDate.substring(6, 8)
    return `${year}-${month}-${day}T00:00:00`
  }
  return null
}

/**
 * 反转义文本
 */
function unescapeText(text) {
  if (!text) return ''
  return String(text)
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

/**
 * 解析 CSV 行（处理引号内的逗号）
 */
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // 跳过下一个引号
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  values.push(current)
  return values
}

