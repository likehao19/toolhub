<template>
  <div class="versions-panel">
    <div class="panel-header">
      <span class="panel-title">{{ t('sdkManager.installedVersions') }}</span>
      <div class="header-btns">
        <el-button size="small" :loading="scanning" @click="$emit('scan')">
          <el-icon><Search /></el-icon>
          {{ t('sdkManager.scanCommon') }}
        </el-button>
        <el-button size="small" type="primary" @click="$emit('add')">
          <el-icon><FolderOpened /></el-icon>
          {{ t('sdkManager.addVersion') }}
        </el-button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!versions || versions.length === 0" class="empty-state">
      <p class="empty-text">{{ t('sdkManager.noVersions') }}</p>
      <p class="empty-hint">{{ t('sdkManager.noVersionsHint') }}</p>
    </div>

    <!-- 版本列表 -->
    <div v-else class="version-list">
      <div
        v-for="item in versions"
        :key="item.id"
        class="version-row"
        :class="{ active: isActive(item) }"
      >
        <div class="row-left">
          <span class="ver-indicator" :class="isActive(item) ? 'current' : ''"></span>
          <span class="ver-number">{{ item.version || t('sdkManager.unknown') }}</span>
          <el-tag v-if="isActive(item)" size="small" type="success" effect="dark" class="ver-tag">
            {{ t('sdkManager.active') }}
          </el-tag>
          <el-tag size="small" effect="plain" class="ver-tag"
            :type="item.source === 'detected' ? 'warning' : 'info'"
          >
            {{ item.source === 'detected' ? t('sdkManager.sourceDetected') : t('sdkManager.sourceManual') }}
          </el-tag>
        </div>
        <div class="row-path" :title="item.path">{{ item.path }}</div>
        <div class="row-actions">
          <el-button
            v-if="!isActive(item)"
            size="small" type="primary" link :loading="switching"
            @click="$emit('switch', item)"
          >
            {{ t('sdkManager.switchBtn') }}
          </el-button>
          <el-button size="small" type="danger" link @click="$emit('remove', item)">
            {{ t('sdkManager.removeBtn') }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { t } from '@/i18n'
import { Search, FolderOpened } from '@element-plus/icons-vue'

const props = defineProps({
  versions: { type: Array, default: () => [] },
  envInfo: { type: Object, required: true },
  scanning: { type: Boolean, default: false },
  switching: { type: Boolean, default: false },
})

defineEmits(['scan', 'add', 'switch', 'remove'])

function isActive(item) {
  const home = props.envInfo?.home || props.envInfo?.detectedPath || ''
  return home && item.path.toLowerCase() === home.toLowerCase()
}
</script>

<style scoped>
.versions-panel {
  width: 100%;
  min-width: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 18px 10px;
  border-bottom: 1px solid rgba(100, 116, 139, 0.12);
  background: transparent;
}
.panel-title {
  font-size: 12px; font-weight: 600;
  color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.3px;
}
.header-btns { display: flex; gap: 6px; }

.empty-state { padding: 32px 18px; text-align: center; }
.empty-text { font-size: 13px; color: var(--text-secondary); margin: 0 0 4px; }
.empty-hint { font-size: 12px; color: var(--text-tertiary); margin: 0; }

.version-list { display: flex; flex: 1 1 auto; min-height: 0; flex-direction: column; }

.version-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 18px;
  border-bottom: 1px solid rgba(100, 116, 139, 0.1);
  transition: background var(--transition-fast);
}
.version-row:last-child { border-bottom: none; }
.version-row:hover { background-color: rgba(255, 255, 255, 0.32); }
.version-row.active {
  background: linear-gradient(90deg, rgba(47, 111, 228, 0.08), transparent);
}

.row-left {
  display: flex; align-items: center; gap: 6px;
  flex-shrink: 0; min-width: 200px;
}

.ver-indicator {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--border-color); flex-shrink: 0;
}
.ver-indicator.current { background: var(--accent-blue); }

.ver-number {
  font-weight: 600; font-size: 13px;
  color: var(--text-primary);
}

.ver-tag { transform: scale(0.9); }

.row-path {
  flex: 1; min-width: 0;
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
  font-size: 12px; color: var(--text-tertiary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.row-actions {
  display: flex; gap: 4px; flex-shrink: 0;
}
</style>
