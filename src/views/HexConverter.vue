<template>
  <div class="hex-converter-wrapper">
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Grid /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('hexConverter.title') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="toolbar">
      <div class="toolbar-group toolbar-group-primary">
        <div class="field-inline">
          <span class="toolbar-label">{{ t('hexConverter.sourceBase') }}</span>
          <el-select v-model="sourceBase" size="small" class="base-select">
            <el-option v-for="base in BASE_OPTIONS" :key="`source-${base}`" :label="baseLabel(base)" :value="base" />
          </el-select>
        </div>

        <el-button size="small" text class="swap-btn toolbar-icon-btn" @click="swapBases" :title="t('hexConverter.swap')">
          <el-icon><Sort /></el-icon>
        </el-button>

        <div class="field-inline">
          <span class="toolbar-label">{{ t('hexConverter.targetBase') }}</span>
          <el-select v-model="targetBase" size="small" class="base-select">
            <el-option v-for="base in BASE_OPTIONS" :key="`target-${base}`" :label="baseLabel(base)" :value="base" />
          </el-select>
        </div>
      </div>

      <div class="toolbar-spacer"></div>

      <div class="toolbar-group toolbar-group-actions">
        <el-checkbox v-model="uppercaseHex">{{ t('hexConverter.uppercase') }}</el-checkbox>
        <div class="toolbar-actions">
          <el-button size="small" text class="toolbar-icon-btn" @click="copyOutput" :disabled="!outputValue">
            <el-icon><CopyDocument /></el-icon>
          </el-button>
          <el-button size="small" text class="toolbar-icon-btn" @click="clearAll" :disabled="!inputValue && !outputValue">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <div class="hint-row">{{ t('hexConverter.uppercaseHint') }}</div>

    <div class="summary-strip">
      <div class="summary-item">
        <span class="summary-label">{{ t('hexConverter.sourceBase') }}</span>
        <strong>{{ baseLabel(sourceBase) }}</strong>
      </div>
      <div class="summary-item summary-arrow">→</div>
      <div class="summary-item">
        <span class="summary-label">{{ t('hexConverter.targetBase') }}</span>
        <strong>{{ baseLabel(targetBase) }}</strong>
      </div>
      <div class="summary-item">
        <span class="summary-label">{{ t('hexConverter.input') }}</span>
        <strong>{{ normalizedInput.length || 0 }}</strong>
      </div>
      <div class="summary-item">
        <span class="summary-label">{{ t('hexConverter.output') }}</span>
        <strong>{{ outputValue.length || 0 }}</strong>
      </div>
    </div>

    <div class="main-area">
      <div class="panel input-panel">
        <div class="panel-title">
          <span>{{ t('hexConverter.input') }}</span>
          <span class="panel-tag">{{ baseLabel(sourceBase) }}</span>
        </div>
        <el-input
          v-model="inputValue"
          type="textarea"
          :autosize="{ minRows: 16 }"
          :placeholder="t('hexConverter.placeholder')"
          class="panel-textarea"
        />
      </div>

      <div class="panel output-panel">
        <div class="panel-title">
          <span>{{ t('hexConverter.output') }}</span>
          <span class="panel-tag">{{ baseLabel(targetBase) }}</span>
        </div>
        <el-input
          :model-value="outputValue"
          type="textarea"
          :autosize="{ minRows: 16 }"
          readonly
          class="panel-textarea"
        />
      </div>
    </div>

    <div class="status-bar">
      <span class="status-msg" :class="statusType">{{ statusText }}</span>
      <span class="status-spacer"></span>
      <span v-if="outputValue">{{ t('hexConverter.outputLength') }}: {{ outputValue.length }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Grid, CopyDocument, Delete, Sort } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { t } from '@/i18n'

const router = useRouter()
const BASE_OPTIONS = [2, 8, 10, 16]
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const sourceBase = ref(10)
const targetBase = ref(16)
const inputValue = ref('')
const uppercaseHex = ref(true)

const normalizedInput = computed(() => normalizeInput(inputValue.value))

const conversionState = computed(() => {
  if (!normalizedInput.value) {
    return { output: '', statusText: t('hexConverter.emptyHint'), statusType: 'idle' }
  }

  const converted = convertBase(normalizedInput.value, sourceBase.value, targetBase.value)
  if (!converted.ok) {
    return { output: '', statusText: converted.message, statusType: 'error' }
  }

  let output = converted.value
  if (targetBase.value === 16 && uppercaseHex.value) {
    output = output.toUpperCase()
  }

  return { output, statusText: t('hexConverter.ready'), statusType: 'ok' }
})

const outputValue = computed(() => conversionState.value.output)
const statusText = computed(() => conversionState.value.statusText)
const statusType = computed(() => conversionState.value.statusType)

function baseLabel(base) {
  return `Base ${base}`
}

function normalizeInput(value) {
  return String(value || '').trim().replace(/\s+/g, '')
}

function stripBasePrefix(value, base) {
  if (base === 2) return value.replace(/^0b/i, '')
  if (base === 8) return value.replace(/^0o/i, '')
  if (base === 16) return value.replace(/^0x/i, '')
  return value
}

function isValidForBase(value, base) {
  const maxDigitIndex = base - 1
  for (const char of value.toUpperCase()) {
    const digitIndex = DIGITS.indexOf(char)
    if (digitIndex < 0 || digitIndex > maxDigitIndex) {
      return false
    }
  }
  return true
}

function convertToBigInt(value, base) {
  let result = 0n
  const bigBase = BigInt(base)
  for (const char of value.toUpperCase()) {
    result = result * bigBase + BigInt(DIGITS.indexOf(char))
  }
  return result
}

function fromBigInt(value, base) {
  if (value === 0n) return '0'

  const bigBase = BigInt(base)
  let current = value
  let output = ''

  while (current > 0n) {
    const remainder = Number(current % bigBase)
    output = DIGITS[remainder] + output
    current /= bigBase
  }

  return output
}

function convertBase(rawValue, fromBase, toBase) {
  let sign = ''
  let value = rawValue

  if (value.startsWith('-')) {
    sign = '-'
    value = value.slice(1)
  }

  value = stripBasePrefix(value, fromBase)
  if (!value) {
    return { ok: false, message: t('hexConverter.emptyHint') }
  }

  if (!isValidForBase(value, fromBase)) {
    return { ok: false, message: t('hexConverter.invalidInput') }
  }

  const decimal = convertToBigInt(value, fromBase)
  return { ok: true, value: sign + fromBigInt(decimal, toBase) }
}

async function copyOutput() {
  if (!outputValue.value) return
  try {
    await writeText(outputValue.value)
    ElMessage.success(t('hexConverter.copied'))
  } catch {
    ElMessage.error(t('hexConverter.copyFail'))
  }
}

function clearAll() {
  inputValue.value = ''
}

function swapBases() {
  const currentSource = sourceBase.value
  sourceBase.value = targetBase.value
  targetBase.value = currentSource
}
</script>

<style scoped>
.hex-converter-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.86);
  border-bottom: 1px solid rgba(60, 40, 20, 0.1);
  min-height: 52px;
  box-sizing: border-box;
  flex-shrink: 0;
}
.header-left { display: flex; align-items: center; min-width: 0; }
.page-title-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.page-eyebrow {
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.breadcrumb .el-icon { font-size: 14px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-tertiary); margin: 0 1px; }

/* 工具栏：去除卡片，仅留底部分割线 */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 18px;
  flex-shrink: 0;
  flex-wrap: wrap;
  min-height: 44px;
  box-sizing: border-box;
  background: transparent;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}
.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}
.toolbar-group-primary { gap: 12px; flex-wrap: wrap; }
.toolbar-group-actions { gap: 8px; }
.field-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 4px;
  background: transparent;
  border: 0;
  border-radius: 0;
}
.swap-btn { min-width: 74px; }
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
}
.toolbar-spacer,
.status-spacer { flex: 1; }
.toolbar-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.base-select { width: 120px; }
.toolbar :deep(.el-button),
.toolbar :deep(.el-select) { --el-border-radius-base: 8px; }
.toolbar :deep(.el-select__wrapper) {
  background: rgba(255, 255, 255, 0.7);
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.12);
}
.toolbar :deep(.el-select__wrapper.is-focused) {
  box-shadow: inset 0 0 0 1px var(--accent-blue);
}
.toolbar-group-actions :deep(.el-checkbox__label) {
  color: var(--text-secondary);
  font-weight: 500;
}
.toolbar-secondary-btn:not(.is-disabled) {
  color: var(--text-primary);
}
.toolbar-icon-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid transparent;
}
.toolbar-icon-btn:hover:not(.is-disabled) {
  color: var(--text-primary);
  background: rgba(60, 40, 20, 0.05);
  border-color: rgba(60, 40, 20, 0.1);
}

/* 提示行：去除卡片，简单灰底文字 */
.hint-row {
  padding: 8px 18px;
  font-size: 11px;
  color: var(--text-tertiary);
  background: transparent;
  border: 0;
  border-radius: 0;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
}

/* 摘要条：去除卡片，分割线分隔条目 */
.summary-strip {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 18px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 0;
  flex-wrap: wrap;
}
.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  font-size: 12px;
  color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace;
}
.summary-label {
  color: var(--text-tertiary);
  font-size: 11px;
  font-family: var(--font-family-base, system-ui);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}
.summary-arrow {
  padding: 0;
  background: transparent;
  border: none;
  color: var(--text-quaternary);
  font-size: 13px;
}

/* 主区：左右两栏用 border-right 分割 */
.main-area {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  min-height: 0;
}
.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: transparent;
  overflow: hidden;
}
.input-panel {
  border-right: 1px solid rgba(60, 40, 20, 0.1);
}
.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  background: transparent;
}
.panel-tag {
  display: inline-flex;
  align-items: center;
  padding: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-blue);
  background: transparent;
  border: 0;
  border-radius: 0;
  letter-spacing: 0;
  text-transform: none;
}
.panel-textarea { flex: 1; padding: 12px 16px; background: transparent; }
.panel-textarea :deep(.el-textarea),
.panel-textarea :deep(.el-textarea__inner) { height: 100%; }
.panel-textarea :deep(.el-textarea__inner) {
  min-height: 100% !important;
  padding: 12px 14px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.7;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(60, 40, 20, 0.12);
  border-radius: 8px;
  box-shadow: none;
  resize: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input-panel .panel-textarea :deep(.el-textarea__inner):focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(47, 111, 228, 0.1);
  background: var(--el-bg-color-overlay);
}
.output-panel .panel-textarea :deep(.el-textarea__inner) { color: var(--text-primary); }

.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
  background: transparent;
  border-top: 1px solid rgba(60, 40, 20, 0.08);
  font-size: 11px;
  color: var(--text-tertiary);
  height: 30px;
  box-sizing: border-box;
  flex-shrink: 0;
}
.status-msg {
  display: inline-flex;
  align-items: center;
  padding: 0;
  background: transparent;
  border: 0;
  font-weight: 600;
}
.status-msg.ok { color: var(--el-color-success); }
.status-msg.error { color: var(--el-color-danger); }
.status-msg.idle { color: var(--text-tertiary); }

@media (max-width: 1100px) {
  .main-area { grid-template-columns: 1fr; }
  .input-panel {
    border-right: 0;
    border-bottom: 1px solid rgba(60, 40, 20, 0.1);
  }
}

@media (max-width: 760px) {
  .toolbar { align-items: flex-start; }
  .toolbar-group,
  .toolbar-group-actions { width: 100%; flex-wrap: wrap; }
  .toolbar-spacer { display: none; }
  .field-inline { flex: 1; min-width: 0; }
  .base-select { flex: 1; }
  .summary-strip { gap: 12px; }
  .summary-arrow { display: none; }
}
</style>
