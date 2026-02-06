/**
 * 窗口状态管理 Composable
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { TauriWindow } from '@/utils/tauri'

export function useWindowState() {
  const isMaximized = ref(false)
  const isFocused = ref(true)
  const isFullscreen = ref(false)

  let unlistenResize = null
  let unlistenFocus = null
  let unlistenBlur = null

  const updateState = async () => {
    isMaximized.value = await TauriWindow.isMaximized()
    isFullscreen.value = await TauriWindow.isFullscreen()
  }

  onMounted(async () => {
    // 初始化状态
    await updateState()

    // 监听窗口事件
    unlistenResize = await TauriWindow.onWindowEvent('tauri://resize', updateState)
    unlistenFocus = await TauriWindow.onWindowEvent('tauri://focus', () => {
      isFocused.value = true
    })
    unlistenBlur = await TauriWindow.onWindowEvent('tauri://blur', () => {
      isFocused.value = false
    })
  })

  onUnmounted(() => {
    // 清理事件监听器
    if (unlistenResize) unlistenResize()
    if (unlistenFocus) unlistenFocus()
    if (unlistenBlur) unlistenBlur()
  })

  return {
    isMaximized,
    isFocused,
    isFullscreen,
    updateState
  }
}
