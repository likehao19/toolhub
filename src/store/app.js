import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  // State
  const theme = ref('light')
  const sidebarCollapsed = ref(false)
  const windowMaximized = ref(false)

  // 关闭行为偏好：'ask' | 'minimize' | 'exit'
  const closeAction = ref('ask')
  const rememberCloseChoice = ref(false)

  // Getters
  const isDarkMode = computed(() => theme.value === 'dark')
  const isSidebarCollapsed = computed(() => sidebarCollapsed.value)

  // Actions
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setWindowMaximized(maximized) {
    windowMaximized.value = maximized
  }

  function setCloseAction(action) {
    closeAction.value = action
  }

  function setRememberCloseChoice(remember) {
    rememberCloseChoice.value = remember
  }

  return {
    theme,
    sidebarCollapsed,
    windowMaximized,
    closeAction,
    rememberCloseChoice,
    isDarkMode,
    isSidebarCollapsed,
    toggleTheme,
    toggleSidebar,
    setWindowMaximized,
    setCloseAction,
    setRememberCloseChoice
  }
}, {
  persist: true
})
