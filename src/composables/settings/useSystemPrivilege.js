/**
 * 系统权限（管理员/sudo）+ SDK 环境变量作用域
 *
 * Module-level singleton。
 */

import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { getPrivilegeStatus, ensureSystemPrivilege } from '@/utils/systemPrivilegeManager'
import { getEnvScope, setEnvScope } from '@/utils/sdkManager'

const systemPrivilege = reactive({
  authorized: false,
  checking: false,
  authorizing: false,
  envScope: getEnvScope(),
})

/** 查询当前授权状态，刷新到 reactive */
async function loadSystemPrivilegeStatus() {
  systemPrivilege.checking = true
  try {
    const status = await getPrivilegeStatus()
    systemPrivilege.authorized = status.authorized
  } catch (e) {
    console.warn('[Settings] loadSystemPrivilegeStatus failed:', e)
    systemPrivilege.authorized = false
  } finally {
    systemPrivilege.checking = false
  }
}

/** 触发系统授权（弹原生提权对话框）；成功后回写 authorized */
async function authorizeSystemPrivilege() {
  systemPrivilege.authorizing = true
  try {
    const status = await ensureSystemPrivilege()
    systemPrivilege.authorized = status.authorized
    ElMessage.success(t('settings.systemPrivilegeAuthorizeSuccess'))
  } catch (error) {
    ElMessage.error(error?.message || t('settings.systemPrivilegeAuthorizeFailed'))
  } finally {
    systemPrivilege.authorizing = false
    await loadSystemPrivilegeStatus()
  }
}

/** 按钮的 click handler 简单包一层（保留语义化命名，便于 template 绑定） */
const handleSystemPrivilegeAuthorize = () => authorizeSystemPrivilege()

/** SDK 管理用：用户/系统级环境变量作用域切换 */
function handleEnvScopeChange(value) {
  setEnvScope(value)
  systemPrivilege.envScope = value
}

export function useSystemPrivilege() {
  return {
    systemPrivilege,
    loadSystemPrivilegeStatus,
    authorizeSystemPrivilege,
    handleSystemPrivilegeAuthorize,
    handleEnvScopeChange,
  }
}
