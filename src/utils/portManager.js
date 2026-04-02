/**
 * 端口管理工具 - Rust 命令封装
 */

import { invoke } from '@tauri-apps/api/core'
import { canUseSystemScope, isPrivilegeRequiredError } from '@/utils/systemPrivilegeManager'

const isWindows = navigator.userAgent.includes('Windows')

function normalizePort(row) {
  return {
    protocol: row.protocol,
    localAddress: row.local_address,
    localPort: row.local_port,
    remoteAddress: row.remote_address,
    remotePort: row.remote_port,
    state: row.state,
    pid: row.pid,
    processName: row.process_name,
    killable: row.killable,
  }
}

export async function getAllPorts() {
  const rows = await invoke('list_ports')
  return Array.isArray(rows) ? rows.map(normalizePort) : []
}

export async function killProcess(pid) {
  if (pid <= 4 && isWindows) {
    return { success: false, message: '不能终止系统关键进程', requiresPrivilege: false }
  }

  try {
    await invoke('kill_process', { pid })
    return { success: true, message: '', requiresPrivilege: false }
  } catch (error) {
    const message = error?.message || String(error) || '终止失败'
    const hasSystemPrivilege = isWindows ? await canUseSystemScope() : false
    const requiresPrivilege = isWindows && isPrivilegeRequiredError(message) && !hasSystemPrivilege

    if (isWindows && isPrivilegeRequiredError(message) && hasSystemPrivilege) {
      try {
        await invoke('kill_process_with_privilege', { pid })
        return { success: true, message: '', requiresPrivilege: false }
      } catch (privilegedError) {
        return {
          success: false,
          message: privilegedError?.message || String(privilegedError),
          requiresPrivilege: false,
        }
      }
    }

    return {
      success: false,
      message,
      requiresPrivilege,
    }
  }
}

export async function getSystemPrivilegeStatus() {
  return await canUseSystemScope()
}
