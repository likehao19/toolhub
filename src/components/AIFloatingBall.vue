<template>
  <div
    v-if="visible"
    class="ai-floating-ball"
    :class="[`style-${style}`, { dragging: isDragging }]"
    :style="ballStyle"
    @mousedown="startDrag"
    @click="handleClick"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: true
  },
  mode: {
    type: String,
    default: 'inApp' // 'inApp' 或 'desktop'
  },
  style: {
    type: String,
    default: 'circle' // 'circle', 'rounded', 'capsule'
  },
  size: {
    type: Number,
    default: 60
  }
})

const emit = defineEmits(['click'])

const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const isHovering = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// 球的样式
const ballStyle = computed(() => {
  return {
    width: `${props.size}px`,
    height: `${props.size}px`,
    left: `${position.value.x}px`,
    top: `${position.value.y}px`
  }
})

// 初始化位置（右下角）
const initPosition = () => {
  if (props.mode === 'inApp') {
    const padding = 20
    position.value = {
      x: window.innerWidth - props.size - padding,
      y: window.innerHeight - props.size - padding
    }
  }
}

// 开始拖拽
const startDrag = (e) => {
  if (e.button !== 0) return // 只响应左键

  isDragging.value = true
  dragStart.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y
  }

  e.preventDefault()
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

// 拖拽中
const onDrag = (e) => {
  if (!isDragging.value) return

  position.value = {
    x: e.clientX - dragStart.value.x,
    y: e.clientY - dragStart.value.y
  }

  // 边界限制
  const maxX = window.innerWidth - props.size
  const maxY = window.innerHeight - props.size

  position.value.x = Math.max(0, Math.min(position.value.x, maxX))
  position.value.y = Math.max(0, Math.min(position.value.y, maxY))
}

// 停止拖拽
const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 点击事件
const handleClick = (e) => {
  if (isDragging.value) return
  emit('click', e)
}

// 监听窗口大小变化
const onResize = () => {
  const maxX = window.innerWidth - props.size
  const maxY = window.innerHeight - props.size

  position.value.x = Math.min(position.value.x, maxX)
  position.value.y = Math.min(position.value.y, maxY)
}

onMounted(() => {
  initPosition()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

// 监听可见性变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    initPosition()
  }
})
</script>

<style scoped>
.ai-floating-ball {
  position: fixed;
  z-index: 9999;
  cursor: pointer;
  user-select: none;
  background: var(--accent-blue);
  box-shadow: var(--shadow-lg);
  transition: box-shadow var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.ai-floating-ball:hover {
  box-shadow: var(--shadow-lg);
}

.ai-floating-ball.dragging {
  transition: none;
  opacity: 0.8;
  cursor: grabbing;
}

.ai-floating-ball.style-circle {
  border-radius: 50%;
}

.ai-floating-ball.style-rounded {
  border-radius: var(--radius-lg);
}

.ai-floating-ball.style-capsule {
  border-radius: 30px;
}

.ball-icon {
  width: 60%;
  height: 60%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ball-icon svg {
  width: 100%;
  height: 100%;
}

.ball-tooltip {
  position: absolute;
  right: 110%;
  top: 50%;
  transform: translateY(-50%);
  background: var(--text-primary);
  color: var(--bg-primary);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-caption);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  animation: tooltip-fade-in 150ms ease forwards;
}

.ball-tooltip::after {
  content: '';
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-left-color: var(--text-primary);
}

@keyframes tooltip-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
