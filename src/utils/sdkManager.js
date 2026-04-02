/**
 * SDK 版本管理工具函数
 * 支持 Java JDK、Maven、Node.js、Python、Go 的多版本管理
 * Windows 通过注册表读写环境变量，macOS 通过 ~/.toolhub_env
 * 数据持久化使用 SQLite
 */

import { invoke } from '@tauri-apps/api/core'
import Database from '@tauri-apps/plugin-sql'
import { canUseSystemScope, ensureSystemPrivilege } from '@/utils/systemPrivilegeManager'

const DB_PATH = 'sqlite:productivity.db'

const isMac = navigator.userAgent.includes('Mac')
const SEP = isMac ? '/' : '\\'
const PATH_SEP = isMac ? ':' : ';'

// SDK 类型配置
export const SDK_CONFIG = {
  java: {
    label: 'Java JDK',
    homeVar: 'JAVA_HOME',
    altHomeVar: null,
    binSubPath: 'bin',
    commonPaths: isMac
      ? ['/Library/Java/JavaVirtualMachines', '/usr/local/opt/openjdk', '/opt/homebrew/opt/openjdk']
      : ['C:\\Program Files\\Java', 'C:\\Program Files (x86)\\Java', 'C:\\jdk'],
  },
  maven: {
    label: 'Maven',
    homeVar: 'MAVEN_HOME',
    altHomeVar: 'M2_HOME',
    binSubPath: 'bin',
    commonPaths: isMac
      ? ['/usr/local/opt/maven', '/opt/homebrew/opt/maven']
      : ['C:\\apache-maven', 'C:\\Program Files\\Apache\\Maven'],
  },
  nodejs: {
    label: 'Node.js',
    homeVar: 'NODE_HOME',
    altHomeVar: null,
    binSubPath: isMac ? 'bin' : '',
    commonPaths: isMac
      ? ['/usr/local/opt/node', '/opt/homebrew/opt/node']
      : ['C:\\Program Files\\nodejs', 'C:\\nodejs'],
  },
  python: {
    label: 'Python',
    homeVar: 'PYTHON_HOME',
    altHomeVar: null,
    binSubPath: isMac ? 'bin' : '',
    commonPaths: isMac
      ? ['/usr/local/opt/python', '/opt/homebrew/opt/python', '/Library/Frameworks/Python.framework/Versions']
      : ['C:\\Python', 'C:\\Program Files\\Python'],
  },
  go: {
    label: 'Go',
    homeVar: 'GOROOT',
    altHomeVar: null,
    binSubPath: 'bin',
    commonPaths: isMac
      ? ['/usr/local/go', '/opt/homebrew/opt/go']
      : ['C:\\Go', 'C:\\Program Files\\Go'],
  },
}

// ============ 数据库操作 ============

async function getDb() {
  return await Database.load(DB_PATH)
}

/**
 * 加载指定类型的所有已导入版本
 */
export async function loadVersions(sdkType) {
  const db = await getDb()
  return await db.select(
    'SELECT * FROM sdk_versions WHERE sdk_type = ? ORDER BY added_at DESC',
    [sdkType]
  )
}

/**
 * 添加版本记录到数据库
 */
export async function addVersionRecord(sdkType, path, version, source = 'manual') {
  const db = await getDb()
  await db.execute(
    'INSERT OR IGNORE INTO sdk_versions (sdk_type, version, path, source) VALUES (?, ?, ?, ?)',
    [sdkType, version, path, source]
  )
}

/**
 * 删除版本记录
 */
export async function removeVersionRecord(id) {
  const db = await getDb()
  await db.execute('DELETE FROM sdk_versions WHERE id = ?', [id])
}

/**
 * 更新版本号（重新检测后）
 */
export async function updateVersionNumber(id, version) {
  const db = await getDb()
  await db.execute('UPDATE sdk_versions SET version = ? WHERE id = ?', [version, id])
}

// ============ 环境变量操作（Rust invoke） ============

/**
 * 读取环境变量（用户级+系统级，通过 Rust 注册表 API）
 * 返回 { value, exists, scope }
 */
export async function getEnvVarInfo(varName) {
  try {
    return await invoke('get_user_env_var', { name: varName })
  } catch (e) {
    console.error('getEnvVarInfo failed:', e)
    return { name: varName, value: '', exists: false, scope: 'none' }
  }
}

/**
 * 从指定 scope 读取环境变量
 */
export async function getEnvVarScoped(varName, scope) {
  try {
    return await invoke('get_env_var_scoped', { name: varName, scope })
  } catch (e) {
    console.error('getEnvVarScoped failed:', e)
    return { name: varName, value: '', exists: false, scope: 'none' }
  }
}

/**
 * 读取环境变量值（简便版）
 */
export async function getEnvVar(varName) {
  const info = await getEnvVarInfo(varName)
  return info.exists ? info.value : ''
}

/**
 * 获取合并后的完整 PATH（系统 + 用户）
 */
export async function getMergedPath() {
  try {
    return await invoke('get_merged_path')
  } catch (e) {
    console.error('getMergedPath failed:', e)
    return ''
  }
}

/**
 * 设置环境变量（根据 scope 写入系统级或用户级）
 */
export async function setEnvVar(varName, value, scope = null) {
  const s = scope || getEnvScope()
  await invoke('set_user_env_var', { name: varName, value, scope: s })
}

/**
 * 获取环境变量作用域偏好（默认 'system'）
 */
export function getEnvScope() {
  return localStorage.getItem('sdk_env_scope') || 'system'
}

/**
 * 设置环境变量作用域偏好
 */
export function setEnvScope(scope) {
  localStorage.setItem('sdk_env_scope', scope)
}

/**
 * 批量设置环境变量（系统级时只弹一次 UAC）
 */
export async function setEnvVarsBatch(entries, scope = null) {
  const s = scope || getEnvScope()
  await invoke('set_env_vars_batch', { entries, scope: s })
}

/**
 * 检查系统级写入授权状态
 */
export async function checkElevatedTask() {
  return await canUseSystemScope()
}

/**
 * 申请系统级写入授权（首次会弹一次 UAC）
 */
export async function setupElevatedTask() {
  await ensureSystemPrivilege()
}
export async function broadcastEnvChange() {
  await invoke('broadcast_env_change')
}

// ============ SDK 检测 ============

/**
 * 检测 SDK 版本号（通过 Rust 命令）
 */
export async function detectVersion(sdkType, sdkPath) {
  try {
    const version = await invoke('detect_sdk_version', {
      sdkType,
      sdkPath,
    })
    return version
  } catch (e) {
    console.warn('detectVersion failed:', e)
    return null
  }
}

/**
 * 从 PATH 中查找 SDK（当 HOME 变量未设置时）
 */
export async function findSdkInPath(sdkType) {
  try {
    return await invoke('find_sdk_in_path', { sdkType })
  } catch (e) {
    console.warn('findSdkInPath failed:', e)
    return { found: false, exe_path: '', sdk_path: '', version: '' }
  }
}

/**
 * 获取当前 SDK 环境信息
 */
export async function getCurrentEnv(sdkType) {
  const config = SDK_CONFIG[sdkType]
  if (!config) return { home: '', homeScope: '', inPath: false, version: null, detectedPath: '' }

  // 读取 HOME 变量（用户级+系统级）
  const homeInfo = await getEnvVarInfo(config.homeVar)
  const home = homeInfo.exists ? homeInfo.value : ''
  const homeScope = homeInfo.scope // "user" / "system" / "none"

  // 获取合并后的完整 PATH（系统 + 用户）
  const fullPath = await getMergedPath()

  // 检查 bin 路径是否在完整 PATH 中
  let inPath = false
  if (home) {
    const binPath = config.binSubPath ? `${home}${SEP}${config.binSubPath}` : home
    const pathLower = fullPath.toLowerCase()
    const binLower = binPath.toLowerCase().replace(/[\\/]$/, '')
    const pathEntries = pathLower.split(PATH_SEP).map(p => p.trim().replace(/[\\/]$/, ''))
    inPath = pathEntries.includes(binLower)
      || pathLower.includes(`%${config.homeVar.toLowerCase()}%`)
  }

  // 检测版本号
  let version = null
  let detectedPath = '' // 从 PATH 中检测到的实际路径
  if (home) {
    version = await detectVersion(sdkType, home)
  }

  // 如果 HOME 未设置 或 版本检测失败，尝试从 PATH 中查找
  if (!home || !version) {
    const pathInfo = await findSdkInPath(sdkType)
    if (pathInfo.found) {
      if (!version) version = pathInfo.version || null
      if (!home) {
        detectedPath = pathInfo.sdk_path
        inPath = true
      }
    }
  }

  return { home, homeScope, inPath, version, detectedPath }
}

/**
 * 验证 SDK 路径并检测版本号
 */
export async function validateSdkPath(sdkType, sdkPath) {
  const version = await detectVersion(sdkType, sdkPath)
  if (version) {
    return { valid: true, version, error: null }
  }
  return { valid: false, version: null, error: 'Cannot detect version at this path' }
}

/**
 * 读取对应 scope 的 PATH（用于修改时不污染另一级的 PATH）
 */
async function getUserPath() {
  const scope = getEnvScope()
  const info = await getEnvVarScoped('Path', scope)
  return info.exists ? info.value : ''
}

/**
 * 切换 SDK 版本
 */
export async function switchVersion(sdkType, newPath) {
  const config = SDK_CONFIG[sdkType]
  if (!config) return { success: false, error: 'Unknown SDK type' }

  try {
    // 1. 读取当前 HOME 和当前 scope 的 PATH
    const oldHome = await getEnvVar(config.homeVar)
    const currentPath = await getUserPath()

    // 2. 收集所有需要写入的环境变量
    const entries = []

    // HOME 变量
    entries.push({ name: config.homeVar, value: newPath })

    // altHomeVar（如 M2_HOME）
    if (config.altHomeVar) {
      entries.push({ name: config.altHomeVar, value: newPath })
    }

    // 3. 计算更新后的 PATH
    const newBin = config.binSubPath ? `${newPath}${SEP}${config.binSubPath}` : newPath
    let updatedPath = currentPath

    if (oldHome) {
      // 替换旧的 bin 路径
      const oldBin = config.binSubPath ? `${oldHome}${SEP}${config.binSubPath}` : oldHome
      const regex = new RegExp(escapeRegex(oldBin), 'gi')
      updatedPath = updatedPath.replace(regex, newBin)
    }

    // 如果 PATH 中不包含新 bin 路径，追加到开头
    if (!updatedPath.toLowerCase().includes(newBin.toLowerCase())) {
      updatedPath = updatedPath ? `${newBin}${PATH_SEP}${updatedPath}` : newBin
    }

    // Windows: 也检查 %HOME_VAR%\bin 形式的引用
    if (!isMac) {
      const varRef = config.binSubPath
        ? `%${config.homeVar}%\\${config.binSubPath}`
        : `%${config.homeVar}%`
      if (!updatedPath.toLowerCase().includes(varRef.toLowerCase())
        && !updatedPath.toLowerCase().includes(newBin.toLowerCase())) {
        updatedPath = `${varRef};${updatedPath}`
      }
    }

    entries.push({ name: 'Path', value: updatedPath })

    // 4. 批量写入（系统级只弹一次 UAC）
    await setEnvVarsBatch(entries)

    // 5. 广播环境变量更改
    await broadcastEnvChange()

    return { success: true, error: null }
  } catch (e) {
    return { success: false, error: e.message || String(e) }
  }
}

/**
 * 扫描已安装的 SDK：
 * 1. 环境变量指向的路径（HOME/ALT_HOME）
 * 2. 从 PATH 中检测（where 命令）
 * 3. nvm 管理的 Node.js 多版本目录
 * 4. HOME 变量父目录下的兄弟版本
 * 5. 常见安装路径
 */
export async function detectInstalledSdks(sdkType) {
  const config = SDK_CONFIG[sdkType]
  if (!config) return []

  const found = []
  const checked = new Set()

  async function tryAdd(sdkPath, source = 'detected') {
    const key = sdkPath.toLowerCase().replace(/[\\/]+$/, '')
    if (checked.has(key)) return
    checked.add(key)
    const version = await detectVersion(sdkType, sdkPath)
    if (version) {
      found.push({ path: sdkPath, version, source })
    }
  }

  // 1. 环境变量指向的路径
  const home = await getEnvVar(config.homeVar)
  if (home) await tryAdd(home)

  if (config.altHomeVar) {
    const altHome = await getEnvVar(config.altHomeVar)
    if (altHome) await tryAdd(altHome)
  }

  // 2. 从 PATH 中检测当前使用的 SDK 根目录
  //    仅在 HOME 变量未设置时使用（避免重复）
  if (!home) {
    const pathInfo = await findSdkInPath(sdkType)
    if (pathInfo.found && pathInfo.sdk_path) {
      await tryAdd(pathInfo.sdk_path)
    }
  }

  // 3. nvm 多版本扫描（Node.js 特殊处理）
  if (sdkType === 'nodejs') {
    const nvmHome = await getEnvVar('NVM_HOME')
    if (nvmHome) {
      try {
        const dirs = await invoke('list_subdirs', { path: nvmHome })
        for (const dir of dirs) {
          // nvm 版本目录名通常是 v16.20.2 这种格式
          const dirName = dir.split(/[\\/]/).pop() || ''
          if (/^v?\d+/.test(dirName)) {
            await tryAdd(dir)
          }
        }
      } catch { /* nvm dir not found */ }
    }
  }

  // 3b. Python 多版本扫描
  if (sdkType === 'python') {
    if (isMac) {
      // macOS: /Library/Frameworks/Python.framework/Versions/
      const frameworkDir = '/Library/Frameworks/Python.framework/Versions'
      try {
        const dirs = await invoke('list_subdirs', { path: frameworkDir })
        for (const dir of dirs) {
          const dirName = dir.split(/[\\/]/).pop() || ''
          if (/^\d/.test(dirName) && dirName !== 'Current') {
            await tryAdd(dir)
          }
        }
      } catch { /* dir not found */ }
    } else {
      // Windows: %LOCALAPPDATA%\Programs\Python\
      const localAppData = await getEnvVar('LOCALAPPDATA')
      if (localAppData) {
        const pythonDir = `${localAppData}\\Programs\\Python`
        try {
          const dirs = await invoke('list_subdirs', { path: pythonDir })
          for (const dir of dirs) {
            const dirName = dir.split(/[\\/]/).pop() || ''
            if (/^Python\d/i.test(dirName)) {
              await tryAdd(dir)
            }
          }
        } catch { /* dir not found */ }
      }
    }
  }

  // 4. HOME 变量的父目录下扫描兄弟版本
  //    例如 JAVA_HOME=D:\Env\Java\jdk-1.8 → 扫描 D:\Env\Java\ 下所有子目录
  if (home) {
    const parentDir = home.replace(/[\\/][^\\/]+[\\/]?$/, '')
    if (parentDir && parentDir !== home) {
      try {
        const dirs = await invoke('list_subdirs', { path: parentDir })
        for (const dir of dirs) {
          await tryAdd(dir)
        }
      } catch { /* parent dir not found */ }
    }
  }

  // 5. 常见安装路径
  for (const basePath of config.commonPaths) {
    try {
      const dirs = await invoke('list_subdirs', { path: basePath })
      for (const dir of dirs) {
        await tryAdd(dir)
      }
    } catch { /* directory doesn't exist */ }
  }

  return found
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
