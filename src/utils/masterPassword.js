/**
 * 主密码管理工具
 * 使用 PBKDF2 进行密码哈希
 */

import CryptoJS from 'crypto-js'

/**
 * 生成随机盐值
 */
export function generateSalt() {
  return CryptoJS.lib.WordArray.random(128/8).toString()
}

/**
 * 使用 PBKDF2 哈希密码
 * @param {string} password - 明文密码
 * @param {string} salt - 盐值
 * @returns {string} - 哈希后的密码
 */
export function hashPassword(password, salt) {
  const hash = CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  })
  return hash.toString()
}

/**
 * 验证密码
 * @param {string} password - 输入的密码
 * @param {string} hash - 存储的哈希值
 * @param {string} salt - 盐值
 * @returns {boolean} - 是否匹配
 */
export function verifyPassword(password, hash, salt) {
  const inputHash = hashPassword(password, salt)
  return inputHash === hash
}

/**
 * 生成会话密钥（用于临时存储解锁状态）
 */
export function generateSessionKey() {
  return CryptoJS.lib.WordArray.random(256/8).toString()
}
