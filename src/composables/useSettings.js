/**
 * 应用设置 Composable
 */

import { ElMessage } from 'element-plus'
import { useAppStore } from '@/store'
import { CLOSE_ACTION_LABELS } from '@/constants'

/**
 * 使用应用设置功能
 * @returns {Object} 设置相关的状态和方法
 */
export function useSettings() {
  const appStore = useAppStore()

  /**
   * 切换主题
   */
  const toggleTheme = () => {
    appStore.toggleTheme()
    const themeName = appStore.theme === 'dark' ? '暗色' : '亮色'
    ElMessage.success(`已切换到${themeName}主题`)
  }

  /**
   * 切换侧边栏
   */
  const toggleSidebar = () => {
    appStore.toggleSidebar()
  }

  /**
   * 修改关闭行为
   * @param {string} action - 关闭动作
   */
  const changeCloseAction = (action) => {
    appStore.setCloseAction(action)
    const actionText = getCloseActionText(action)
    ElMessage.success(`已更新关闭行为设置: ${actionText}`)
  }

  /**
   * 重置设置
   */
  const resetSettings = () => {
    appStore.setCloseAction('ask')
    appStore.setRememberCloseChoice(false)
    ElMessage.success('已重置为默认设置')
  }

  /**
   * 获取关闭行为文本
   * @param {string} action - 关闭动作
   * @returns {string} 文本描述
   */
  const getCloseActionText = (action) => {
    return CLOSE_ACTION_LABELS[action] || '未知'
  }

  return {
    // 状态
    theme: computed(() => appStore.theme),
    sidebarCollapsed: computed(() => appStore.sidebarCollapsed),
    closeAction: computed(() => appStore.closeAction),

    // 方法
    toggleTheme,
    toggleSidebar,
    changeCloseAction,
    resetSettings,
    getCloseActionText,
  }
}
