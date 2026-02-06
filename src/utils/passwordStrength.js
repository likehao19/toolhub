/**
 * 密码强度分析工具
 */

/**
 * 分析密码强度
 * @param {string} password - 密码
 * @returns {Object} 强度分析结果
 */
export function analyzePasswordStrength(password) {
  if (!password) {
    return {
      strength: 0,
      score: 0,
      level: 'weak',
      levelText: '弱',
      suggestions: ['请输入密码']
    }
  }
  
  let score = 0
  const suggestions = []
  
  // 长度检查
  if (password.length >= 8) {
    score += 1
  } else {
    suggestions.push('密码长度至少8位')
  }
  
  if (password.length >= 12) {
    score += 1
  }
  
  if (password.length >= 16) {
    score += 1
  }
  
  // 包含小写字母
  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    suggestions.push('添加小写字母')
  }
  
  // 包含大写字母
  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    suggestions.push('添加大写字母')
  }
  
  // 包含数字
  if (/[0-9]/.test(password)) {
    score += 1
  } else {
    suggestions.push('添加数字')
  }
  
  // 包含特殊字符
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1
  } else {
    suggestions.push('添加特殊字符（如 !@#$%^&*）')
  }
  
  // 检查常见弱密码模式
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /admin/i,
    /letmein/i,
    /welcome/i,
    /monkey/i,
    /dragon/i,
    /master/i
  ]
  
  let hasCommonPattern = false
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      hasCommonPattern = true
      break
    }
  }
  
  if (hasCommonPattern) {
    score = Math.max(0, score - 2)
    suggestions.push('避免使用常见密码模式')
  }
  
  // 检查重复字符
  const repeatedChars = /(.)\1{2,}/.test(password)
  if (repeatedChars) {
    score = Math.max(0, score - 1)
    suggestions.push('避免使用重复字符')
  }
  
  // 检查连续字符
  const sequentialChars = /(012|123|234|345|456|567|678|789|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)
  if (sequentialChars) {
    score = Math.max(0, score - 1)
    suggestions.push('避免使用连续字符')
  }
  
  // 计算强度等级
  let strength = 0 // 0: 弱, 1: 中, 2: 强
  let level = 'weak'
  let levelText = '弱'
  
  if (score >= 6) {
    strength = 2
    level = 'strong'
    levelText = '强'
  } else if (score >= 4) {
    strength = 1
    level = 'medium'
    levelText = '中'
  } else {
    strength = 0
    level = 'weak'
    levelText = '弱'
  }
  
  // 如果没有建议，说明密码很好
  if (suggestions.length === 0) {
    suggestions.push('密码强度良好')
  }
  
  return {
    strength,
    score,
    level,
    levelText,
    suggestions: suggestions.slice(0, 3) // 最多显示3条建议
  }
}

/**
 * 生成随机密码
 * @param {Object} options - 生成选项
 * @returns {string} 生成的密码
 */
export function generatePassword(options = {}) {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeSimilar = true
  } = options
  
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  const similar = 'il1Lo0O'
  
  let charset = ''
  if (includeUppercase) charset += uppercase
  if (includeLowercase) charset += lowercase
  if (includeNumbers) charset += numbers
  if (includeSymbols) charset += symbols
  
  if (excludeSimilar) {
    charset = charset.split('').filter(c => !similar.includes(c)).join('')
  }
  
  if (charset.length === 0) {
    throw new Error('至少需要选择一种字符类型')
  }
  
  let password = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length]
  }
  
  // 确保至少包含每种选定的字符类型
  if (includeUppercase && !/[A-Z]/.test(password)) {
    const index = Math.floor(Math.random() * length)
    password = password.substring(0, index) + uppercase[Math.floor(Math.random() * uppercase.length)] + password.substring(index + 1)
  }
  if (includeLowercase && !/[a-z]/.test(password)) {
    const index = Math.floor(Math.random() * length)
    password = password.substring(0, index) + lowercase[Math.floor(Math.random() * lowercase.length)] + password.substring(index + 1)
  }
  if (includeNumbers && !/[0-9]/.test(password)) {
    const index = Math.floor(Math.random() * length)
    password = password.substring(0, index) + numbers[Math.floor(Math.random() * numbers.length)] + password.substring(index + 1)
  }
  if (includeSymbols && !/[^a-zA-Z0-9]/.test(password)) {
    const index = Math.floor(Math.random() * length)
    password = password.substring(0, index) + symbols[Math.floor(Math.random() * symbols.length)] + password.substring(index + 1)
  }
  
  return password
}

/**
 * 生成可读密码（密码短语）
 * @param {number} wordCount - 单词数量
 * @returns {string} 生成的密码短语
 */
export function generatePassphrase(wordCount = 4) {
  // 常用单词列表（简化版）
  const words = [
    'apple', 'banana', 'cherry', 'dragon', 'elephant', 'forest', 'garden', 'hammer',
    'island', 'jungle', 'knight', 'lighthouse', 'mountain', 'nature', 'ocean', 'planet',
    'quasar', 'river', 'sunset', 'tiger', 'umbrella', 'valley', 'waterfall', 'xylophone',
    'yacht', 'zebra', 'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot'
  ]
  
  const array = new Uint8Array(wordCount)
  crypto.getRandomValues(array)
  
  const selectedWords = []
  for (let i = 0; i < wordCount; i++) {
    selectedWords.push(words[array[i] % words.length])
  }
  
  // 添加数字和特殊字符
  const number = Math.floor(Math.random() * 100)
  const symbols = ['!', '@', '#', '$', '%']
  const symbol = symbols[Math.floor(Math.random() * symbols.length)]
  
  return selectedWords.join('-') + number + symbol
}

