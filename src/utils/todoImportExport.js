/**
 * 待办导入导出工具
 */

/**
 * 导出待办为 CSV
 */
export async function exportTodosToCSV(todos) {
  const headers = ['标题', '描述', '截止日期', '优先级', '状态', '分类', '进度', '创建时间', '更新时间']
  const rows = todos.map(todo => [
    todo.title || '',
    todo.description || '',
    todo.due_date || '',
    todo.priority === 2 ? '高' : todo.priority === 1 ? '中' : '低',
    todo.status === 2 ? '已完成' : todo.status === 1 ? '进行中' : '待办',
    todo.category || '',
    `${Math.round((todo.progress || 0) * 100)}%`,
    todo.created_at || '',
    todo.updated_at || ''
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
 * 导出待办为 JSON
 */
export async function exportTodosToJSON(todos) {
  return JSON.stringify(todos, null, 2)
}

/**
 * 从 CSV 导入待办
 */
export async function importTodosFromCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV 文件格式不正确')
  }

  // 解析表头
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  
  // 状态和优先级映射
  const statusMap = { '待办': 0, '进行中': 1, '已完成': 2 }
  const priorityMap = { '低': 0, '中': 1, '高': 2 }

  const todos = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length !== headers.length) continue

    const todo = {}
    headers.forEach((header, index) => {
      const value = values[index].replace(/^"|"$/g, '')
      switch (header) {
        case '标题':
          todo.title = value
          break
        case '描述':
          todo.description = value
          break
        case '截止日期':
          todo.due_date = value || null
          break
        case '优先级':
          todo.priority = priorityMap[value] !== undefined ? priorityMap[value] : 0
          break
        case '状态':
          todo.status = statusMap[value] !== undefined ? statusMap[value] : 0
          break
        case '分类':
          todo.category = value || null
          break
        case '进度':
          const progressMatch = value.match(/(\d+)%/)
          todo.progress = progressMatch ? parseFloat(progressMatch[1]) / 100 : 0
          break
      }
    })

    if (todo.title) {
      todos.push(todo)
    }
  }

  return todos
}

/**
 * 从 JSON 导入待办
 */
export async function importTodosFromJSON(jsonText) {
  const data = JSON.parse(jsonText)
  return Array.isArray(data) ? data : []
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

