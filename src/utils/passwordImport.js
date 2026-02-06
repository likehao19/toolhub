/**
 * 密码导入工具
 * 支持多种格式的密码导入
 */

import CryptoJS from 'crypto-js'

/**
 * 解析 CSV 文件内容
 */
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []
  
  // 解析表头
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  
  // 解析数据行
  const data = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }
  
  return data
}

/**
 * 导入通用 CSV 格式
 */
export function importGenericCSV(content) {
  const data = parseCSV(content)
  const passwords = []
  
  for (const row of data) {
    // 尝试映射常见字段名
    const title = row.title || row.name || row.网站 || row.标题 || ''
    const username = row.username || row.user || row.用户名 || row.user || ''
    const password = row.password || row.pwd || row.密码 || ''
    const website = row.website || row.url || row.site || row.网站 || ''
    const notes = row.notes || row.note || row.备注 || row.description || ''
    
    if (password) {
      passwords.push({
        title: title || website || '未命名',
        username,
        password,
        website,
        notes
      })
    }
  }
  
  return passwords
}

/**
 * 导入 Google Chrome 密码
 * Chrome 导出格式：name,url,username,password
 */
export function importChromePasswords(content) {
  const data = parseCSV(content)
  const passwords = []
  
  for (const row of data) {
    const name = row.name || ''
    const url = row.url || ''
    const username = row.username || ''
    const password = row.password || ''
    
    if (password) {
      passwords.push({
        title: name || url || '未命名',
        username,
        password,
        website: url,
        notes: ''
      })
    }
  }
  
  return passwords
}

/**
 * 导入 Microsoft Edge 密码
 * Edge 导出格式与 Chrome 相同：name,url,username,password
 */
export function importEdgePasswords(content) {
  // Edge 格式与 Chrome 相同
  return importChromePasswords(content)
}

/**
 * 导入 1Password CSV 格式
 * 1Password 导出格式：Title, URL, Username, Password, Notes, Group, etc.
 */
export function import1PasswordCSV(content) {
  const data = parseCSV(content)
  const passwords = []
  
  for (const row of data) {
    const title = row.Title || row.title || ''
    const url = row.URL || row.url || ''
    const username = row.Username || row.username || row.UserName || ''
    const password = row.Password || row.password || ''
    const notes = row.Notes || row.notes || row.Note || ''
    const group = row.Group || row.group || ''
    
    if (password) {
      passwords.push({
        title: title || url || '未命名',
        username,
        password,
        website: url,
        notes: notes ? (group ? `[${group}] ${notes}` : notes) : (group ? `分组: ${group}` : '')
      })
    }
  }
  
  return passwords
}

/**
 * 导入 LastPass CSV 格式
 * LastPass 导出格式：url,username,password,extra,name,grouping
 */
export function importLastPassCSV(content) {
  const data = parseCSV(content)
  const passwords = []
  
  for (const row of data) {
    const url = row.url || ''
    const username = row.username || ''
    const password = row.password || ''
    const extra = row.extra || ''
    const name = row.name || ''
    const grouping = row.grouping || row.group || ''
    
    if (password) {
      passwords.push({
        title: name || url || '未命名',
        username,
        password,
        website: url,
        notes: extra ? (grouping ? `[${grouping}] ${extra}` : extra) : (grouping ? `分组: ${grouping}` : '')
      })
    }
  }
  
  return passwords
}

/**
 * 导入 JSON 数组格式
 */
export function importJSONArray(jsonArray) {
  const passwords = []
  
  for (const item of jsonArray) {
    if (item.password) {
      passwords.push({
        title: item.title || item.name || item.网站 || item.标题 || '',
        username: item.username || item.user || item.用户名 || '',
        password: item.password || item.pwd || item.密码 || '',
        website: item.website || item.url || item.site || item.网站 || '',
        notes: item.notes || item.note || item.备注 || item.description || ''
      })
    }
  }
  
  return passwords
}

/**
 * 从加密 JSON 导入
 */
export function importFromEncryptedJSON(jsonData, password) {
  if (!password) {
    throw new Error('导入加密 JSON 需要提供密码')
  }
  
  try {
    const decrypted = CryptoJS.AES.decrypt(jsonData.data, password).toString(CryptoJS.enc.Utf8)
    if (!decrypted) {
      throw new Error('密码错误或数据已损坏')
    }
    const passwords = JSON.parse(decrypted)
    return importJSONArray(passwords)
  } catch (error) {
    throw new Error(`解密失败: ${error.message}`)
  }
}

/**
 * 导出为加密 JSON 格式
 */
export function exportToEncryptedJSON(passwords, password) {
  if (!password) {
    throw new Error('导出加密 JSON 需要提供密码')
  }
  
  try {
    const data = JSON.stringify(passwords, null, 2)
    const encrypted = CryptoJS.AES.encrypt(data, password).toString()
    
    return JSON.stringify({
      version: '1.0',
      encrypted: true,
      algorithm: 'AES',
      data: encrypted,
      createdAt: new Date().toISOString()
    }, null, 2)
  } catch (error) {
    throw new Error(`加密失败: ${error.message}`)
  }
}

/**
 * 检测并导入密码文件
 * @param {string|Object} fileOrContent - 文件路径、File 对象或包含 name 和 content 的对象
 * @returns {Promise<Object>} 导入结果
 */
export async function importPasswordFile(fileOrContent) {
  let content = ''
  let fileName = ''
  
  // 处理不同的输入类型
  if (typeof fileOrContent === 'string') {
    // 如果是字符串，假设是文件内容
    content = fileOrContent
    fileName = 'import.csv'
  } else if (fileOrContent.content) {
    // 如果是包含 content 的对象
    content = fileOrContent.content
    fileName = fileOrContent.name || 'import.csv'
  } else if (fileOrContent instanceof File) {
    // 如果是 File 对象
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const result = parsePasswordContent(e.target.result, fileOrContent.name)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => {
        reject(new Error('读取文件失败'))
      }
      
      reader.readAsText(fileOrContent)
    })
  } else {
    throw new Error('不支持的文件格式')
  }
  
  return parsePasswordContent(content, fileName)
}

/**
 * 解析密码内容
 */
function parsePasswordContent(content, fileName) {
  let passwords = []
  
  // 检测文件格式
  if (fileName.endsWith('.json') || content.trim().startsWith('{') || content.trim().startsWith('[')) {
    // JSON 格式
    try {
      const jsonData = JSON.parse(content)
      
      // 检查是否为加密 JSON 格式
      if (jsonData.encrypted && jsonData.data) {
        // 加密 JSON 格式，需要解密
        passwords = importEncryptedJSON(jsonData)
      } else if (Array.isArray(jsonData)) {
        // 普通 JSON 数组格式
        passwords = importJSONArray(jsonData)
      } else if (jsonData.passwords) {
        // 包含 passwords 字段的对象
        passwords = importJSONArray(jsonData.passwords)
      } else {
        throw new Error('不支持的 JSON 格式')
      }
    } catch (error) {
      throw new Error(`解析 JSON 失败: ${error.message}`)
    }
  } else if (fileName.endsWith('.csv') || content.includes(',')) {
    // 尝试检测格式
    const lines = content.split('\n')
    if (lines.length > 0) {
      const header = lines[0].toLowerCase()
      
      // 检测 1Password 格式（Title, URL, Username, Password）
      if (header.includes('title') && header.includes('url') && 
          header.includes('username') && header.includes('password')) {
        passwords = import1PasswordCSV(content)
      }
      // 检测 LastPass 格式（url, username, password, name, grouping）
      else if (header.includes('url') && header.includes('username') && 
               header.includes('password') && (header.includes('name') || header.includes('grouping'))) {
        passwords = importLastPassCSV(content)
      }
      // 检测 Chrome/Edge 格式（name, url, username, password）
      else if (header.includes('name') && header.includes('url') && 
               header.includes('username') && header.includes('password')) {
        if (fileName.includes('chrome') || content.includes('Chrome')) {
          passwords = importChromePasswords(content)
        } else if (fileName.includes('edge') || content.includes('Edge')) {
          passwords = importEdgePasswords(content)
        } else {
          // 默认尝试 Chrome 格式
          passwords = importChromePasswords(content)
        }
      } else {
        // 通用 CSV 格式
        passwords = importGenericCSV(content)
      }
    }
  } else {
    throw new Error('不支持的文件格式，请使用 CSV 或 JSON 文件')
  }
  
  return {
    success: true,
    passwords,
    total: passwords.length
  }
}

/**
 * 验证导入的密码数据
 */
export function validatePasswords(passwords) {
  const errors = []
  const warnings = []
  const validPasswords = []
  
  for (let i = 0; i < passwords.length; i++) {
    const pwd = passwords[i]
    const row = i + 2 // CSV 行号（从第2行开始）
    
    // 验证必填字段
    if (!pwd.password) {
      errors.push(`第 ${row} 行：缺少密码`)
      continue
    }
    
    // 验证 URL 格式（如果提供）
    if (pwd.website && !isValidURL(pwd.website)) {
      warnings.push(`第 ${row} 行：网站 URL 格式可能不正确`)
    }
    
    // 检查重复
    const duplicate = validPasswords.find(
      v => v.title === pwd.title && v.username === pwd.username && v.password === pwd.password
    )
    if (duplicate) {
      warnings.push(`第 ${row} 行：检测到重复密码（标题：${pwd.title}）`)
    }
    
    validPasswords.push(pwd)
  }
  
  return {
    valid: validPasswords,
    errors,
    warnings
  }
}

/**
 * 验证 URL 格式
 */
function isValidURL(url) {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`)
    return true
  } catch {
    return false
  }
}

