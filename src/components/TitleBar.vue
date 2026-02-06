<template>
  <div class="title-bar" data-tauri-drag-region>
    <div class="title-bar-content" data-tauri-drag-region>
      <div class="title-bar-left" data-tauri-drag-region>
        <img v-if="icon" :src="icon" class="app-icon" alt="icon" data-tauri-drag-region />
        <span class="app-title" data-tauri-drag-region>{{ title }}</span>
      </div>

      <div class="title-bar-right">
        <button class="title-bar-button minimize-button" @click="handleMinimize" title="最小化">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M0 6h12" stroke="currentColor" stroke-width="1" />
          </svg>
        </button>

        <button class="title-bar-button maximize-button" @click="handleToggleMaximize" :title="isMaximized ? '还原' : '最大化'">
          <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" stroke="currentColor" stroke-width="1" fill="none" />
          </svg>
          <svg v-else width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="0" width="10" height="10" stroke="currentColor" stroke-width="1" fill="none" />
            <rect x="0" y="2" width="10" height="10" stroke="currentColor" stroke-width="1" fill="none" />
          </svg>
        </button>

        <button class="title-bar-button close-button" @click="handleClose" title="关闭">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1l10 10M11 1l-10 10" stroke="currentColor" stroke-width="1" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { TauriWindow } from '@/utils/tauri'

const props = defineProps({
  title: {
    type: String,
    default: 'Vue3 Tauri App'
  },
  icon: {
    type: String,
    default: ''
  }
})

const isMaximized = ref(false)

// 检查初始窗口状态
onMounted(async () => {
  isMaximized.value = await TauriWindow.isMaximized()

  // 监听窗口状态变化
  TauriWindow.onWindowEvent('tauri://resize', async () => {
    isMaximized.value = await TauriWindow.isMaximized()
  })
})

const handleMinimize = () => {
  TauriWindow.minimize()
}

const handleToggleMaximize = async () => {
  await TauriWindow.toggleMaximize()
  isMaximized.value = await TauriWindow.isMaximized()
}

const handleClose = () => {
  TauriWindow.close()
}
</script>

<style scoped>
.title-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  user-select: none;
  display: flex;
  align-items: center;
  z-index: 9999;
}

.title-bar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: 0 8px;
}

.title-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-icon {
  width: 16px;
  height: 16px;
}

.app-title {
  font-size: 12px;
  font-weight: 500;
  color: #333;
}

.title-bar-right {
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: auto;
}

.title-bar-button {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s, color 0.2s;
  pointer-events: auto;
}

.title-bar-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #000;
}

.close-button:hover {
  background-color: #e81123;
  color: #fff;
}

/* ignore */
@media (prefers-color-scheme: dark) {
  .title-bar {
    background: #2d2d2d;
    border-bottom-color: #3d3d3d;
  }

  .app-title {
    color: #e0e0e0;
  }

  .title-bar-button {
    color: #e0e0e0;
  }

  .title-bar-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .close-button:hover {
    background-color: #e81123;
    color: #fff;
  }
}
</style>
