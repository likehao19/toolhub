<template>
  <div class="mock-service-wrapper">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Connection /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('mockService.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <span :class="['mock-status-dot', mockRunning ? 'running' : '']"></span>
        <span style="font-size:12px">{{ mockRunning ? t('mockService.mockRunning') : t('mockService.mockStopped') }}</span>
        <el-input-number v-model="mockPort" size="small" :min="1024" :max="65535" style="width:100px" />
        <el-button size="small" :type="mockRunning ? 'danger' : 'success'" @click="toggleMock">
          {{ mockRunning ? t('mockService.stop') : t('mockService.start') }}
        </el-button>
      </div>
    </div>

    <!-- Content -->
    <div class="content-area">
      <div class="mock-layout">
        <!-- Rules Panel -->
        <div class="mock-rules-panel">
          <div class="panel-toolbar">
            <span style="font-size:12px;font-weight:600">{{ t('mockService.mockRules') }}</span>
            <el-button size="small" text type="primary" @click="onAddMockRule">+</el-button>
          </div>
          <div v-for="(rule, i) in mockRules" :key="rule.id" class="mock-rule-item"
            :class="{ active: editMockIdx === i }" @click="editMockIdx = i">
            <el-switch v-model="rule.enabled" size="small" @click.stop @change="doSaveMockRules" />
            <span class="method-tag" :style="{ color: METHOD_COLORS[rule.method] }">{{ rule.method }}</span>
            <span class="item-name">{{ rule.path }}</span>
            <span style="font-size:10px;color:var(--text-quaternary)">{{ rule.delay }}ms</span>
            <el-icon class="kv-delete" @click.stop="mockRules.splice(i, 1); doSaveMockRules()"><Close /></el-icon>
          </div>
          <div v-if="!mockRules.length" class="empty-hint">{{ t('mockService.noMockRules') }}</div>
        </div>

        <!-- Edit Panel -->
        <div class="mock-edit-panel">
          <template v-if="editingMock">
            <el-form size="small" label-width="70px">
              <el-form-item :label="t('mockService.method')">
                <el-select v-model="editingMock.method" style="width:100px">
                  <el-option v-for="m in methods" :key="m" :label="m" :value="m" />
                </el-select>
              </el-form-item>
              <el-form-item :label="t('mockService.path')">
                <el-input v-model="editingMock.path" placeholder="/api/users" />
              </el-form-item>
              <el-form-item :label="t('mockService.statusCode')">
                <el-input-number v-model="editingMock.statusCode" :min="100" :max="599" style="width:100px" />
              </el-form-item>
              <el-form-item :label="t('mockService.delay')">
                <el-input-number v-model="editingMock.delay" :min="0" :max="10000" :step="100" style="width:120px" />
                <span style="margin-left:4px;font-size:11px;color:var(--text-tertiary)">ms</span>
              </el-form-item>
              <el-form-item :label="t('mockService.respBody')">
                <div style="width:100%">
                  <div style="display:flex;gap:8px;margin-bottom:6px">
                    <el-button size="small" @click="doSmartMock">{{ t('mockService.smartMock') }}</el-button>
                    <el-button size="small" @click="editingMock.responseBody = tryFormatJson(editingMock.responseBody)">{{ t('mockService.formatJson') }}</el-button>
                  </div>
                  <textarea v-model="editingMock.responseBody" class="body-textarea" style="min-height:200px"
                    placeholder='{ "code": 0, "data": { "list|5": [{ "id": "@id", "name": "@cname" }] } }' spellcheck="false" />
                </div>
              </el-form-item>
            </el-form>
            <el-divider content-position="left">{{ t('mockService.expectations') }}</el-divider>
            <div v-for="(exp, ei) in editingMock.expectations" :key="ei" class="expectation-card">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <el-switch v-model="exp.enabled" size="small" />
                <el-input v-model="exp.name" size="small" style="flex:1" placeholder="期望名称" />
                <el-icon class="kv-delete" @click="editingMock.expectations.splice(ei, 1)"><Close /></el-icon>
              </div>
              <div v-for="(cond, ci) in exp.conditions" :key="ci" class="kv-row">
                <el-input v-model="cond.path" size="small" placeholder="body.username" style="flex:1" />
                <el-select v-model="cond.operator" size="small" style="width:80px">
                  <el-option label="==" value="==" /><el-option label="!=" value="!=" />
                  <el-option label="contains" value="contains" /><el-option label="exists" value="exists" />
                </el-select>
                <el-input v-model="cond.value" size="small" placeholder="value" style="flex:1" />
                <el-icon class="kv-delete" @click="exp.conditions.splice(ci, 1)"><Close /></el-icon>
              </div>
              <el-button size="small" text type="primary"
                @click="exp.conditions.push({ path: '', operator: '==', value: '' })">+ condition</el-button>
              <el-input v-model="exp.responseBody" type="textarea" :rows="3" size="small" style="margin-top:6px"
                placeholder="此期望的响应Body（留空则使用默认响应）" />
            </div>
            <el-button size="small" text type="primary" style="margin-top:8px"
              @click="editingMock.expectations.push({ name: '', enabled: true, conditions: [], responseBody: '' })">
              + {{ t('mockService.addExpectation') }}
            </el-button>
            <div style="margin-top:16px">
              <el-button type="primary" size="small" @click="doSaveMockRules">{{ t('common.save') }}</el-button>
            </div>
          </template>
          <div v-else class="empty-hint" style="display:flex;align-items:center;justify-content:center;flex:1">
            {{ t('mockService.selectMockRule') }}
          </div>

          <!-- Mock Log -->
          <div class="mock-log-section">
            <div style="font-size:12px;font-weight:600;padding:8px 0">{{ t('mockService.mockLog') }} ({{ mockLogs.length }})</div>
            <div class="mock-log-list">
              <div v-for="(log, li) in mockLogs" :key="li" class="mock-log-item">
                <span class="method-tag" :style="{ color: METHOD_COLORS[log.method] }">{{ log.method }}</span>
                <span style="flex:1;font-size:12px">{{ log.path }}</span>
                <span class="status-badge" :class="log.status < 400 ? 'ok' : 'err'" style="font-size:10px">{{ log.status }}</span>
                <span style="font-size:10px;color:var(--text-quaternary)">{{ log.delay }}ms</span>
              </div>
              <div v-if="!mockLogs.length" class="empty-hint" style="padding:12px">{{ t('mockService.noMockLog') }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Connection, Close } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { METHOD_COLORS, tryFormatJson, uuid } from '@/utils/apiWorkbench/shared'
import { generateMockData, loadMockRules, saveMockRules as doSaveMockRulesStorage } from '@/utils/apiWorkbench/mockEngine'
import { inferSchema } from '@/utils/apiWorkbench/apiDocs'

const router = useRouter()
const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

const mockRules = ref([])
const editMockIdx = ref(-1)
const mockRunning = ref(false)
const mockPort = ref(9527)
const mockLogs = ref([])

const editingMock = computed(() => editMockIdx.value >= 0 ? mockRules.value[editMockIdx.value] : null)

function onAddMockRule() {
  mockRules.value.push({
    id: uuid(), method: 'GET', path: '/api/mock', statusCode: 200, delay: 0, enabled: true,
    responseBody: '{\n  "code": 0,\n  "data": {},\n  "message": "success"\n}',
    expectations: [],
  })
  editMockIdx.value = mockRules.value.length - 1
  doSaveMockRulesStorage(mockRules.value)
}

function doSaveMockRules() {
  doSaveMockRulesStorage(mockRules.value)
  if (mockRunning.value) {
    invoke('update_mock_rules', { rules: mockRules.value })
      .then(() => ElMessage.success(t('mockService.saved')))
      .catch(e => ElMessage.error('规则热更新失败: ' + String(e)))
    return
  }
  ElMessage.success(t('mockService.saved'))
}

function doSmartMock() {
  if (!editingMock.value) return
  try {
    const template = JSON.parse(editingMock.value.responseBody)
    const mocked = generateMockData(inferSchema(template))
    editingMock.value.responseBody = JSON.stringify(mocked, null, 2)
  } catch { ElMessage.warning('JSON 解析失败') }
}

async function toggleMock() {
  if (mockRunning.value) {
    try {
      await invoke('stop_mock_server')
      mockRunning.value = false
      ElMessage.info(`Mock ${t('mockService.stop')}`)
    } catch (e) { ElMessage.error(String(e)) }
  } else {
    if (!mockRules.value.filter(r => r.enabled).length) {
      ElMessage.warning('请先添加并启用至少一条 Mock 规则')
      return
    }
    try {
      await invoke('start_mock_server', { port: mockPort.value, rules: mockRules.value })
      mockRunning.value = true
      ElMessage.success(`Mock ${t('mockService.start')} :${mockPort.value}`)
    } catch (e) { ElMessage.error(String(e)) }
  }
}

let mockLogUnlisten = null

onMounted(async () => {
  mockRules.value = loadMockRules()
  mockLogUnlisten = await listen('mock-request-log', (event) => {
    mockLogs.value.unshift(event.payload)
    if (mockLogs.value.length > 50) mockLogs.value.length = 50
  })
})

onBeforeUnmount(() => {
  if (mockLogUnlisten) mockLogUnlisten()
})
</script>

<style scoped>
.mock-service-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #eef2f6 0%, #e7ecf3 100%);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  min-height: 58px;
  box-sizing: border-box;
  flex-shrink: 0;
  backdrop-filter: blur(18px);
}
.header-left { display: flex; align-items: center; min-width: 0; flex: 1; }
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
  display: flex; align-items: center; gap: 6px;
  font-size: 15px; font-weight: 600;
  color: var(--text-primary); white-space: nowrap;
}
.breadcrumb .el-icon { font-size: 15px; color: var(--accent-blue); }
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-tertiary); }
.header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.content-area { flex: 1; overflow: hidden; padding: 14px 18px 0; min-height: 0; }
.mock-layout { flex: 1; display: flex; height: 100%; overflow: hidden; min-height: 0; }
.mock-rules-panel {
  width: 300px;
  min-width: 260px;
  overflow-y: auto;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-right: none;
  border-radius: 18px 0 0 18px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(241, 245, 249, 0.98));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
}
.panel-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid rgba(15, 23, 42, 0.08); }
.mock-rule-item { display: flex; align-items: center; gap: 6px; padding: 10px 12px; cursor: pointer; font-size: 12px; border-bottom: 1px solid rgba(15, 23, 42, 0.05); }
.mock-rule-item:hover { background: rgba(255,255,255,0.62); }
.mock-rule-item.active { background: rgba(64,158,255,0.1); }
.mock-rule-item .kv-delete { display: none; }
.mock-rule-item:hover .kv-delete { display: block; }
.mock-edit-panel {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: linear-gradient(180deg, rgba(252,253,255,0.99), rgba(245,247,250,0.98));
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0 18px 18px 0;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
}
.expectation-card { border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 14px; padding: 10px; margin-bottom: 8px; background: rgba(255,255,255,0.72); }

.mock-status-dot { width: 8px; height: 8px; border-radius: 50%; background: #909399; }
.mock-status-dot.running { background: #67C23A; box-shadow: 0 0 6px #67C23A; }

.mock-log-section { border-top: 1px solid rgba(15, 23, 42, 0.08); padding: 0 0 8px; flex-shrink: 0; margin-top: 12px; }
.mock-log-list { max-height: 180px; overflow-y: auto; }
.mock-log-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(15, 23, 42, 0.08); }

.method-tag { font-size: 10px; font-weight: 700; flex-shrink: 0; width: 40px; }
.item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); }
.empty-hint { text-align: center; color: var(--text-quaternary); font-size: 12px; padding: 24px; border: 1px dashed rgba(15, 23, 42, 0.08); border-radius: 14px; background: rgba(255,255,255,0.5); }
.kv-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.kv-delete { flex-shrink: 0; font-size: 14px; color: var(--text-quaternary); cursor: pointer; }
.kv-delete:hover { color: var(--el-color-danger); }
.body-textarea {
  width: 100%; min-height: 120px; max-height: 200px; padding: 10px 12px;
  border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 12px;
  background: rgba(255,255,255,0.74); color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;
  resize: vertical; outline: none; box-sizing: border-box;
}
.body-textarea:focus { border-color: var(--accent-blue); }
.status-badge { font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.status-badge.ok { color: #67C23A; background: rgba(103,194,58,0.1); }
.status-badge.err { color: #F56C6C; background: rgba(245,108,108,0.1); }

@media (max-width: 960px) {
  .content-area { padding: 14px 14px 0; }
  .mock-layout { flex-direction: column; }
  .mock-rules-panel {
    width: 100%;
    min-width: 0;
    border-right: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 18px 18px 0 0;
    max-height: 300px;
  }
  .mock-edit-panel { border-radius: 0 0 18px 18px; }
}
</style>
