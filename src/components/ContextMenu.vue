<template>
  <div
    v-if="visible"
    ref="menuRef"
    class="context-menu"
    :style="menuStyle"
    @click.stop
    @contextmenu.prevent
  >
    <div
      v-for="(item, index) in menuItems"
      :key="index"
      class="context-menu-item"
      :class="{ separator: item.type === 'separator', disabled: item.disabled }"
      @click="handleItemClick(item)"
      @mouseenter="handleItemHover(item, index)"
    >
      <template v-if="item.type !== 'separator'">
        <span class="menu-text">{{ item.text }}</span>
        <span v-if="item.shortcut" class="menu-shortcut">{{ item.shortcut }}</span>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const emit = defineEmits(['close', 'item-click'])

const menuRef = ref(null)
const adjustedPosition = ref({ x: 0, y: 0 })

const menuStyle = computed(() => {
  return {
    left: adjustedPosition.value.x + 'px',
    top: adjustedPosition.value.y + 'px'
  }
})

// 调整菜单位置，确保不超出屏幕
const adjustPosition = async () => {
  await nextTick()
  if (!menuRef.value) return
  
  const menu = menuRef.value
  const rect = menu.getBoundingClientRect()
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  
  let x = props.position.x
  let y = props.position.y
  
  // 如果菜单超出右边界，向左调整
  if (x + rect.width > windowWidth) {
    x = windowWidth - rect.width - 10
  }
  
  // 如果菜单超出下边界，向上调整
  if (y + rect.height > windowHeight) {
    y = windowHeight - rect.height - 10
  }
  
  // 确保不超出左边界和上边界
  x = Math.max(10, x)
  y = Math.max(10, y)
  
  adjustedPosition.value = { x, y }
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    adjustPosition()
  }
})

const menuItems = computed(() => {
  const items = [
    { id: 'copy', text: '复制', shortcut: 'Ctrl+C', type: 'action' },
    { id: 'paste', text: '粘贴', shortcut: 'Ctrl+V', type: 'action' },
    { id: 'cut', text: '剪切', shortcut: 'Ctrl+X', type: 'action' },
    { type: 'separator' },
    { id: 'refresh', text: '刷新', shortcut: 'F5', type: 'action' },
  ]
  
  if (import.meta.env.DEV) {
    items.push({ type: 'separator' })
    items.push({ id: 'inspect', text: '检查', shortcut: 'F12', type: 'action' })
  }
  
  return items
})

const handleItemClick = async (item) => {
  if (item.type === 'separator' || item.disabled) return
  
  emit('item-click', item)
  
  try {
    switch (item.id) {
      case 'copy':
        try {
          const selection = window.getSelection().toString()
          if (selection) {
            await navigator.clipboard.writeText(selection)
          } else {
            document.execCommand('copy')
          }
        } catch (e) {
          document.execCommand('copy')
        }
        break
        
      case 'paste':
        try {
          const text = await navigator.clipboard.readText()
          document.execCommand('insertText', false, text)
        } catch (e) {
          document.execCommand('paste')
        }
        break
        
      case 'cut':
        document.execCommand('cut')
        break
        
      case 'refresh':
        window.__TAURI_RELOADING__ = true
        setTimeout(() => {
          window.location.reload()
        }, 100)
        break
        
      case 'inspect':
        if (window.__TAURI_RELOADING__) return
        try {
          await invoke('toggle_devtools')
        } catch (error) {
          if (!window.__TAURI_RELOADING__ && !error.message?.includes('callback')) {
            ElMessage.error('打开开发者工具失败: ' + (error.message || String(error)))
          }
        }
        break
    }
  } catch (e) { /* ignore */ }
  
  emit('close')
}

const handleItemHover = (item, index) => {
  // 可以在这里添加悬停效果
}

const handleClickOutside = (event) => {
  if (props.visible) {
    emit('close')
  }
}

const handleEscape = (event) => {
  if (event.key === 'Escape' && props.visible) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 10000;
  min-width: 180px;
  padding: 2px 0;
  font-size: 13px;
}

.context-menu-item {
  padding: 4px 12px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.context-menu-item:hover:not(.separator):not(.disabled) {
  background-color: #f3f4f6;
}

.context-menu-item.separator {
  height: 1px;
  padding: 0;
  margin: 2px 0;
  background-color: #e5e7eb;
  cursor: default;
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-text {
  color: #374151;
  white-space: nowrap;
  flex: 1;
}

.menu-shortcut {
  color: #9ca3af;
  font-size: 12px;
  white-space: nowrap;
  font-family: "PingFang SC";
}
</style>

