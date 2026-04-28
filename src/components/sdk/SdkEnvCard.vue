<template>
  <div class="env-card" v-loading="loading" element-loading-background="transparent">
    <!-- 顶栏：变量名 + scope -->
    <div class="env-head">
      <span class="env-var-name">{{ config.homeVar }}</span>
      <el-tag v-if="info.homeScope === 'system'" size="small" type="warning" effect="plain">System</el-tag>
      <el-tag v-else-if="info.homeScope === 'user'" size="small" type="success" effect="plain">User</el-tag>
      <el-tag v-else-if="info.detectedPath" size="small" type="info" effect="plain">PATH</el-tag>
    </div>

    <!-- 路径值 -->
    <code class="env-path" :class="{ empty: !info.home && !info.detectedPath }">
      {{ info.home || info.detectedPath || t('sdkManager.notSet') }}
    </code>

    <!-- 底部状态栏 -->
    <div class="env-status">
      <span class="status-chip" :class="info.inPath ? 'ok' : 'warn'">
        <span class="chip-dot"></span>
        {{ info.inPath ? t('sdkManager.inPath') : t('sdkManager.notInPath') }}
      </span>
      <span class="status-chip version">
        {{ t('sdkManager.currentVersion') }}
        <strong v-if="info.version">{{ info.version }}</strong>
        <span v-else class="ver-unknown">{{ t('sdkManager.unknown') }}</span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { t } from '@/i18n'

defineProps({
  config: { type: Object, required: true },
  info: { type: Object, required: true },
  loading: { type: Boolean, default: false },
})
</script>

<style scoped>
.env-card {
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(100, 116, 139, 0.14);
  border-radius: 0;
  padding: 14px 18px;
  margin: 0;
}

/* 顶栏 */
.env-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.env-var-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

/* 路径 */
.env-path {
  display: block;
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
  font-size: 13px;
  color: var(--text-primary);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(247, 251, 255, 0.44));
  border: 1px solid rgba(100, 116, 139, 0.12);
  padding: 6px 10px;
  border-radius: 8px;
  word-break: break-all;
  line-height: 1.5;
  margin-bottom: 10px;
}

.env-path.empty {
  color: var(--text-tertiary);
  font-style: italic;
}

/* 底部状态 */
.env-status {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.42);
}

.status-chip.ok .chip-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #67c23a;
}

.status-chip.warn .chip-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #e6a23c;
}

.status-chip.version strong {
  color: var(--text-primary);
  font-weight: 600;
}

.ver-unknown {
  color: var(--text-tertiary);
}
</style>
