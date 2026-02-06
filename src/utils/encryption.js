/**
 * 加密工具
 * 使用简单的 Base64 编码（生产环境应使用更安全的加密方法）
 */

/**
 * 加密密码
 */
export function encryptPassword(password) {
  if (!password) return ''
  // 简单的 Base64 编码（实际应用中应使用 AES 等加密算法）
  return btoa(unescape(encodeURIComponent(password)))
}

/**
 * 解密密码
 */
export function decryptPassword(encryptedPassword) {
  if (!encryptedPassword) return ''
  try {
    return decodeURIComponent(escape(atob(encryptedPassword)))
  } catch (error) {
    return encryptedPassword
  }
}

export default {
  encryptPassword,
  decryptPassword
}

