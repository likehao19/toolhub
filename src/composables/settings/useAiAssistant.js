/**
 * AI 助手悬浮球设置（aiAssistantSettings）
 *
 * Module-level singleton。
 * 持久化：由 useSettingsCore.persistSettings 统一处理（它直接读这里 export 的 aiAssistantSettings）。
 * 这里只暴露 reactive state、localStorage 同步与 toggle / change 事件分发。
 */

import { reactive, ref } from 'vue'

const aiAssistantSettings = reactive({
  enableFloatingBall: false,
  floatingBallMode: 'inApp', // 'inApp' / 'desktop'
  floatingBallStyle: 'circle', // 'circle' / 'rounded' / 'capsule'
  floatingBallSize: 60,
})

/** 持久化快照（用于 dirty / 回滚） */
const savedAiAssistantSettings = ref(null)

/**
 * 同步 aiAssistantSettings 到 localStorage 并广播 ai-floating-ball-toggle 事件。
 * Settings 页内即时预览悬浮球状态用。
 */
function emitFloatingBallToggle(enabled = aiAssistantSettings.enableFloatingBall) {
  localStorage.setItem('aiAssistantSettings', JSON.stringify(aiAssistantSettings))
  window.dispatchEvent(new CustomEvent('ai-floating-ball-toggle', {
    detail: {
      enabled,
      mode: aiAssistantSettings.floatingBallMode,
      style: aiAssistantSettings.floatingBallStyle,
      size: aiAssistantSettings.floatingBallSize,
    },
  }))
}

/** 开关切换：v-model 后触发 */
function handleFloatingBallToggle(enabled) {
  emitFloatingBallToggle(enabled)
}

/** 模式 / 样式 / 大小变化：触发同样的事件，让悬浮球即时响应 */
function handleFloatingBallChange() {
  emitFloatingBallToggle()
}

export { aiAssistantSettings, savedAiAssistantSettings }

export function useAiAssistant() {
  return {
    aiAssistantSettings,
    savedAiAssistantSettings,
    handleFloatingBallToggle,
    handleFloatingBallChange,
  }
}
