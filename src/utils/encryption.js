/**
 * 密码加解密。
 *
 * 历史：旧版 encryptPassword 只是 base64 编码,任何拿到 productivity.db
 * 的人都能直接还原所有密码。本文件用 AES-256-CBC + 主密钥做真加密,
 * 主密钥由 Tauri 后端生成并存在 appdata 下的 master_enc.key。
 *
 * 设计要点:
 * - 函数签名保持同步,以兼容大量已有调用点(包括模板里的 {{ decryptPassword(...) }})。
 *   主密钥在应用启动时通过 initEncryption() 异步拉取并缓存到模块变量,之后调用同步即可。
 * - 新密文格式:`enc:v1:<base64-iv>:<base64-ciphertext>`,前缀用于版本辨识。
 * - 解密时若发现旧格式(无 `enc:v1:` 前缀),退化成 base64 解码,保证旧数据仍可读;
 *   读取后业务侧通常会重新保存,落盘时会自动用新格式覆盖,完成懒迁移。
 *   主动迁移由 Passwords.vue 加载列表后的 migrateLegacyPasswords() 调用。
 *
 * 安全模型:威胁是 SQLite 文件被单独 dump(误传云盘 / 备份外发)。
 * 攻击者若同时拿到 SQLite 和 master_enc.key,等同于拿到明文 —— 当前不防这种威胁,
 * 后续可以接 OS keychain (DPAPI / Keychain / secret-service) 升级。
 */

import CryptoJS from 'crypto-js'
import { invoke } from '@tauri-apps/api/core'

const PREFIX = 'enc:v1:'

let masterKey = null
let initPromise = null

function decodeKey(b64) {
  return CryptoJS.enc.Base64.parse(b64)
}

/**
 * 初始化主密钥。在应用启动时尽早调用一次。
 * 多次调用安全(共享同一个 Promise)。
 * 失败时静默,encrypt/decrypt 走兼容路径(旧 base64),
 * 这样在 Tauri 不可用的纯浏览器环境下也不会整个崩。
 */
export async function initEncryption() {
  if (masterKey) return masterKey
  if (initPromise) return initPromise
  initPromise = (async () => {
    try {
      const b64 = await invoke('crypto_get_master_key')
      masterKey = decodeKey(b64)
      return masterKey
    } catch (e) {
      console.warn('[encryption] initEncryption 失败,将以兼容模式运行:', e)
      return null
    } finally {
      initPromise = null
    }
  })()
  return initPromise
}

function legacyEncode(password) {
  return btoa(unescape(encodeURIComponent(password)))
}

function legacyDecode(encoded) {
  try {
    return decodeURIComponent(escape(atob(encoded)))
  } catch {
    return encoded
  }
}

/**
 * 加密密码。
 * 主密钥未就绪时降级为旧 base64 编码,保证业务不中断
 * (initEncryption 在 App 启动时调用,正常流程下密钥总是已就绪)。
 */
export function encryptPassword(password) {
  if (!password) return ''
  if (!masterKey) {
    return legacyEncode(password)
  }
  const iv = CryptoJS.lib.WordArray.random(16)
  const encrypted = CryptoJS.AES.encrypt(password, masterKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  const ivB64 = CryptoJS.enc.Base64.stringify(iv)
  const ctB64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64)
  return `${PREFIX}${ivB64}:${ctB64}`
}

/**
 * 解密密码。
 * 自动识别新旧格式:有 `enc:v1:` 前缀走 AES,否则走旧 base64 兜底。
 * 解密失败一律 fallback 返回原值,避免因为某条记录损坏导致整个列表崩。
 */
export function decryptPassword(encryptedPassword) {
  if (!encryptedPassword) return ''
  if (!encryptedPassword.startsWith(PREFIX)) {
    return legacyDecode(encryptedPassword)
  }
  if (!masterKey) {
    // 新格式但密钥还没就绪:返回空串而非原密文,避免泄露已加密内容到 UI。
    return ''
  }
  try {
    const rest = encryptedPassword.slice(PREFIX.length)
    const sep = rest.indexOf(':')
    if (sep < 0) return ''
    const ivB64 = rest.slice(0, sep)
    const ctB64 = rest.slice(sep + 1)
    const iv = CryptoJS.enc.Base64.parse(ivB64)
    const ciphertext = CryptoJS.enc.Base64.parse(ctB64)
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext },
      masterKey,
      { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    )
    return decrypted.toString(CryptoJS.enc.Utf8)
  } catch {
    return ''
  }
}

/**
 * 判断密文是否已是新格式。Passwords.vue 主动迁移时用来过滤。
 */
export function isEncryptedV1(value) {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

export default {
  initEncryption,
  encryptPassword,
  decryptPassword,
  isEncryptedV1
}
