import { invoke } from '@tauri-apps/api/core'

export async function getPrivilegeStatus() {
  try {
    const authorized = await invoke('check_system_privilege')
    return {
      authorized: !!authorized,
      scope: 'system',
    }
  } catch {
    return {
      authorized: false,
      scope: 'system',
    }
  }
}

export async function ensureSystemPrivilege() {
  const status = await getPrivilegeStatus()
  if (status.authorized) return status

  await invoke('setup_system_privilege')
  return await getPrivilegeStatus()
}

export async function canUseSystemScope() {
  const status = await getPrivilegeStatus()
  return status.authorized
}

export function isPrivilegeRequiredError(error) {
  const message = typeof error === 'string' ? error : (error?.message || String(error || ''))
  const normalized = message.toLowerCase()
  return normalized.includes('need_auth')
    || normalized.includes('access is denied')
    || normalized.includes('拒绝访问')
    || normalized.includes('requires elevation')
    || normalized.includes('access denied')
}

export default {
  getPrivilegeStatus,
  ensureSystemPrivilege,
  canUseSystemScope,
  isPrivilegeRequiredError,
}
