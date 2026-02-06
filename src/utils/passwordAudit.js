/**
 * 密码安全审计工具
 */

import Database from '@tauri-apps/plugin-sql'
import { decryptPassword } from '@/utils/encryption'
import { analyzePasswordStrength } from '@/utils/passwordStrength'

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

/**
 * 执行安全审计
 */
export async function performSecurityAudit() {
  try {
    const db = await getDatabase()
    const passwords = await db.select('SELECT * FROM passwords')
    
    const audit = {
      total: passwords.length,
      weakPasswords: [],
      duplicatePasswords: [],
      expiredPasswords: [],
      recommendations: []
    }
    
    // 检测弱密码
    for (const pwd of passwords) {
      const decrypted = decryptPassword(pwd.password)
      const strength = analyzePasswordStrength(decrypted)
      
      if (strength.strength === 0) {
        audit.weakPasswords.push({
          id: pwd.id,
          title: pwd.title,
          username: pwd.username,
          website: pwd.website,
          strength: strength,
          reason: '密码强度为弱'
        })
      }
    }
    
    // 检测重复密码
    const passwordMap = new Map()
    for (const pwd of passwords) {
      const decrypted = decryptPassword(pwd.password)
      if (!passwordMap.has(decrypted)) {
        passwordMap.set(decrypted, [])
      }
      passwordMap.get(decrypted).push({
        id: pwd.id,
        title: pwd.title,
        username: pwd.username,
        website: pwd.website
      })
    }
    
    for (const [password, entries] of passwordMap.entries()) {
      if (entries.length > 1) {
        audit.duplicatePasswords.push({
          password: '••••••••', // 不显示真实密码
          count: entries.length,
          entries: entries
        })
      }
    }
    
    // 检测过期密码
    const now = new Date()
    for (const pwd of passwords) {
      if (pwd.expires_at) {
        const expiresAt = new Date(pwd.expires_at)
        if (expiresAt < now) {
          audit.expiredPasswords.push({
            id: pwd.id,
            title: pwd.title,
            username: pwd.username,
            website: pwd.website,
            expiresAt: pwd.expires_at,
            daysOverdue: Math.floor((now - expiresAt) / (1000 * 60 * 60 * 24))
          })
        }
      }
    }
    
    // 生成建议
    if (audit.weakPasswords.length > 0) {
      audit.recommendations.push({
        type: 'weak',
        priority: 'high',
        message: `发现 ${audit.weakPasswords.length} 个弱密码，建议立即修改`
      })
    }
    
    if (audit.duplicatePasswords.length > 0) {
      audit.recommendations.push({
        type: 'duplicate',
        priority: 'high',
        message: `发现 ${audit.duplicatePasswords.length} 组重复密码，存在安全风险`
      })
    }
    
    if (audit.expiredPasswords.length > 0) {
      audit.recommendations.push({
        type: 'expired',
        priority: 'medium',
        message: `发现 ${audit.expiredPasswords.length} 个过期密码，建议更新`
      })
    }
    
    if (audit.weakPasswords.length === 0 && 
        audit.duplicatePasswords.length === 0 && 
        audit.expiredPasswords.length === 0) {
      audit.recommendations.push({
        type: 'good',
        priority: 'low',
        message: '密码安全状况良好'
      })
    }
    
    // 计算安全分数（0-100）
    let score = 100
    score -= audit.weakPasswords.length * 5
    score -= audit.duplicatePasswords.length * 3
    score -= audit.expiredPasswords.length * 2
    audit.securityScore = Math.max(0, Math.min(100, score))
    
    return audit
  } catch (error) {
    throw error
  }
}

/**
 * 生成安全报告
 */
export async function generateSecurityReport() {
  const audit = await performSecurityAudit()
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPasswords: audit.total,
      securityScore: audit.securityScore,
      weakCount: audit.weakPasswords.length,
      duplicateCount: audit.duplicatePasswords.length,
      expiredCount: audit.expiredPasswords.length
    },
    details: {
      weakPasswords: audit.weakPasswords,
      duplicatePasswords: audit.duplicatePasswords,
      expiredPasswords: audit.expiredPasswords
    },
    recommendations: audit.recommendations
  }
  
  return report
}

