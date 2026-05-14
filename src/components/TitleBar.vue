<template>
  <div class="title-bar" data-tauri-drag-region>
    <div class="title-bar-content" data-tauri-drag-region>
      <div class="title-bar-left" data-tauri-drag-region>
        <img v-if="icon" :src="icon" class="app-icon" alt="icon" data-tauri-drag-region />
        <span class="app-title" data-tauri-drag-region>{{ title }}</span>
      </div>

      <div class="title-bar-right">
        <button class="title-bar-button minimize-button" @click="handleMinimize" :title="t('titleBar.minimize')">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M0 6h12" stroke="currentColor" stroke-width="1" />
          </svg>
        </button>

        <button class="title-bar-button maximize-button" @click="handleToggleMaximize" :title="isMaximized ? t('titleBar.restore') : t('titleBar.maximize')">
          <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" stroke="currentColor" stroke-width="1" fill="none" />
          </svg>
          <svg v-else width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="0" width="10" height="10" stroke="currentColor" stroke-width="1" fill="none" />
            <rect x="0" y="2" width="10" height="10" stroke="currentColor" stroke-width="1" fill="none" />
          </svg>
        </button>

        <button class="title-bar-button close-button" @click="handleClose" :title="t('titleBar.close')">
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
import { t } from '@/i18n'

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

// 妫€鏌ュ垵濮嬬獥鍙ｇ姸鎬?
onMounted(async () => {
  isMaximized.value = await TauriWindow.isMaximized()

  // 鐩戝惉绐楀彛鐘舵€佸彉鍖?
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
  height: 36px;
  background: linear-gradient(180deg, var(--surface-panel) 0%, rgba(247, 251, 255, 0.86) 100%);
  border-bottom: 1px solid #dfe8f4;
  backdrop-filter: blur(12px);
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
  border-radius: 4px;
}

.app-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  letter-spacing: 0.02em;
}

.title-bar-right {
  display: flex;
  align-items: center;
  gap: 5px;
  pointer-events: auto;
}

.title-bar-button {
  width: 28px;
  height: 28px;
  border: 1px solid #dbe5f2;
  border-radius: 8px;
  background: var(--surface-panel-soft);
  color: var(--el-text-color-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s, color 0.2s, box-shadow 0.2s, transform 0.2s;
  pointer-events: auto;
}

.title-bar-button:hover {
  background: var(--surface-panel);
  color: var(--el-text-color-primary);
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(60, 40, 20, 0.12);
}

.close-button:hover {
  background-color: #e81123;
  border-color: transparent;
  color: var(--el-color-white);
}

@media (prefers-color-scheme: dark) {
  .title-bar {
    background: linear-gradient(180deg, rgba(25, 35, 50, 0.92) 0%, rgba(18, 26, 38, 0.9) 100%);
    border-bottom-color: #2e3d52;
  }

  .app-title {
    color: #dbe7f8;
  }

  .title-bar-button {
    border-color: #35506f;
    background: rgba(24, 36, 52, 0.72);
    color: #9db2cd;
  }

  .title-bar-button:hover {
    background-color: rgba(40, 59, 84, 0.86);
    color: #e6f0ff;
  }

  .close-button:hover {
    background-color: #e81123;
    color: var(--el-color-white);
    border-color: transparent;
  }
}
</style>

