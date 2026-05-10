<template>
  <div 
    class="ai-floating-ball"
    :class="`style-${style}`"
    data-tauri-drag-region
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <div class="ball-icon">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.5"/>
        <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    
    <div v-if="isHovering" class="ball-tooltip">AI 助手</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const style = ref('circle')
const isHovering = ref(false)
const mouseDownPos = ref({ x: 0, y: 0 })
const mouseDownTime = ref(0)
const isDragging = ref(false)

let activeMove = null
let activeUp = null

const onMouseDown = (e) => {
  mouseDownPos.value = { x: e.clientX, y: e.clientY }
  mouseDownTime.value = Date.now()
  isDragging.value = false

  const handleMove = (moveEvent) => {
    const deltaX = Math.abs(moveEvent.clientX - mouseDownPos.value.x)
    const deltaY = Math.abs(moveEvent.clientY - mouseDownPos.value.y)
    if (deltaX > 5 || deltaY > 5) {
      isDragging.value = true
    }
  }

  const handleUp = () => {
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleUp)
    activeMove = null
    activeUp = null
  }

  activeMove = handleMove
  activeUp = handleUp
  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleUp)
}

// 鼠标抬起 - 判断是点击还是拖拽
const onMouseUp = (e) => {
  const deltaX = Math.abs(e.clientX - mouseDownPos.value.x)
  const deltaY = Math.abs(e.clientY - mouseDownPos.value.y)
  const deltaTime = Date.now() - mouseDownTime.value
  // 未标记为拖拽 且 移动距离小于 3px 且时间小于 500ms → 视为点击
  if (!isDragging.value && deltaX < 3 && deltaY < 3 && deltaTime < 500) {
    handleClick()
  }
  
  isDragging.value = false
}

// 点击事件 - 打开 AI 助手窗口
const handleClick = async () => {
  try {
    const { WebviewWindow, getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow')
    
    // 检查窗口是否已存在
    const allWindows = await getAllWebviewWindows()
    const existingWindow = allWindows.find(w => w.label === 'ai-assistant')
    
    if (existingWindow) {
      await existingWindow.show()
      await existingWindow.setFocus()
      return
    }
    
    // 创建新窗口
    const assistantUrl = `${window.location.origin}/ai-assistant-window`
    new WebviewWindow('ai-assistant', {
      url: assistantUrl,
      title: 'AI 智能助手',
      width: 450,
      height: 650,
      resizable: true,
      center: true,
      decorations: false,
      alwaysOnTop: true,
      skipTaskbar: false,
      focus: true
    })
  } catch (e) { /* ignore */ }
}

onMounted(async () => {
  // 从 localStorage 获取配置
  try {
    const savedConfig = localStorage.getItem('aiAssistantSettings')
    if (savedConfig) {
      const config = JSON.parse(savedConfig)
      style.value = config.floatingBallStyle || 'circle'
    }
  } catch (e) { /* ignore */ }
})

onUnmounted(() => {
  if (activeMove) document.removeEventListener('mousemove', activeMove)
  if (activeUp) document.removeEventListener('mouseup', activeUp)
  activeMove = null
  activeUp = null
})
</script>

<style scoped>
:global(html), :global(body), :global(#app) {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent !important;
  border: none !important;
  outline: none !important;
}

.ai-floating-ball,
.ai-floating-ball * {
  box-sizing: border-box;
}

.ai-floating-ball {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.ball-icon,
.ball-icon * {
  background: transparent;
}

.ball-tooltip,
.ball-tooltip::after {
  background: transparent;
}

.ball-tooltip {
  background: rgba(0, 0, 0, 0.85);
}

.ball-tooltip::after {
  border-left-color: rgba(0, 0, 0, 0.85);
}

/* ignore */
.ai-floating-ball {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  user-select: none;
  cursor: pointer;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

/* ignore */
.ai-floating-ball.style-circle {
  border-radius: 50%;
}

.ai-floating-ball.style-rounded {
  border-radius: 15px;
}

.ai-floating-ball.style-capsule {
  border-radius: 30px;
}

/* ignore */
.ball-icon {
  width: 60%;
  height: 60%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.ball-icon svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

/* ignore */
.ball-tooltip {
  position: absolute;
  right: 110%;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  animation: tooltip-fade-in 0.2s ease;
}

.ball-tooltip::after {
  content: '';
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-left-color: rgba(0, 0, 0, 0.85);
}

@keyframes tooltip-fade-in {
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
}
</style>
