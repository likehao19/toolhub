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
        <el-input-number v-model="mockPort" size="small" :min="1024" :max="65535"
          controls-position="right" class="port-input" />
        <el-button size="small" :type="mockRunning ? 'danger' : 'success'" @click="toggleMock">
          <el-icon style="margin-right: 6px;">
            <VideoPause v-if="mockRunning" /><VideoPlay v-else />
          </el-icon>{{ mockRunning ? t('mockService.stop') : t('mockService.start') }}
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
            <el-button size="small" text type="primary" @click="onAddMockRule" :title="t('common.add')">
              <el-icon><Plus /></el-icon>
            </el-button>
          </div>
          <div v-for="(rule, i) in mockRules" :key="rule.id" class="mock-rule-item"
            :class="{ active: editMockIdx === i }" @click="editMockIdx = i">
            <el-switch v-model="rule.enabled" size="small"
              @click.stop @mousedown.stop @change="doSaveMockRules" />
            <span class="method-tag" :style="{ color: METHOD_COLORS[rule.method] }">{{ rule.method }}</span>
            <span class="item-name">{{ rule.path }}</span>
            <span style="font-size:10px;color:var(--text-quaternary)">{{ rule.delay }}ms</span>
            <el-icon class="kv-delete" @click.stop="removeMockRule(i)"><Close /></el-icon>
          </div>
          <div v-if="!mockRules.length" class="empty-hint">{{ t('mockService.noMockRules') }}</div>
        </div>

        <!-- Edit Panel -->
        <div class="mock-edit-panel">
          <template v-if="editingMock">
            <!-- 顶栏：method + path + 状态码 chip -->
            <div class="form-header">
              <el-select v-model="editingMock.method" class="method-select"
                :style="{ '--method-color': METHOD_COLORS[editingMock.method] }" @change="doSaveMockRules">
                <el-option v-for="m in methods" :key="m" :label="m" :value="m">
                  <span :style="{ color: METHOD_COLORS[m], fontWeight: 700 }">{{ m }}</span>
                </el-option>
              </el-select>
              <el-input v-model="editingMock.path" class="path-input" placeholder="/api/users" @input="doSaveMockRules" />
              <span class="status-pill" :class="editingMock.statusCode < 400 ? 'ok' : 'err'" :title="t('mockService.statusCode')">
                {{ editingMock.statusCode }}
              </span>
            </div>

            <!-- 滚动主体 -->
            <div class="form-scroll">
              <!-- Section: 基本响应 -->
              <section class="form-section">
                <div class="section-head">
                  <span class="section-eyebrow">Basic</span>
                  <span class="section-title">{{ t('mockService.basicResponse') }}</span>
                </div>
                <div class="form-rows">
                  <div class="form-row">
                    <span class="row-label">{{ t('mockService.statusCode') }}</span>
                    <el-input-number v-model="editingMock.statusCode" :min="100" :max="599" size="small"
                      controls-position="right" class="row-input" @change="doSaveMockRules" />
                  </div>
                  <div class="form-row">
                    <span class="row-label">{{ t('mockService.delay') }}</span>
                    <div class="row-inline">
                      <el-input-number v-model="editingMock.delay" :min="0" :max="10000" :step="100" size="small"
                        controls-position="right" class="row-input" @change="doSaveMockRules" />
                      <span class="row-unit">ms</span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Section: 响应 Body -->
              <section class="form-section">
                <div class="section-head">
                  <span class="section-eyebrow">Response</span>
                  <span class="section-title">{{ t('mockService.respBody') }}</span>
                  <div class="section-actions">
                    <el-button class="section-action" size="small" text type="primary" @click="doSmartMock">
                      <el-icon><MagicStick /></el-icon>{{ t('mockService.smartMock') }}
                    </el-button>
                    <el-button class="section-action" size="small" text
                      @click="editingMock.responseBody = tryFormatJson(editingMock.responseBody); doSaveMockRules()">
                      <el-icon><Brush /></el-icon>{{ t('mockService.formatJson') }}
                    </el-button>
                  </div>
                </div>
                <textarea v-model="editingMock.responseBody" class="resp-textarea"
                  placeholder='{ "code": 0, "data": { "list|5": [{ "id": "@id", "name": "@cname" }] } }'
                  spellcheck="false"
                  @input="doSaveMockRules" />
              </section>

              <!-- Section: 条件期望 -->
              <section class="form-section">
                <div class="section-head">
                  <span class="section-eyebrow">Conditions</span>
                  <span class="section-title">{{ t('mockService.expectations') }}</span>
                  <span v-if="editingMock.expectations?.length" class="section-count">{{ editingMock.expectations.length }}</span>
                  <el-button class="section-action ml-auto" size="small" text type="primary" @click="addExpectation">
                    <el-icon><Plus /></el-icon>{{ t('mockService.addExpectation') }}
                  </el-button>
                </div>
                <div v-if="editingMock.expectations?.length" class="expectation-list">
                  <div v-for="(exp, ei) in editingMock.expectations" :key="exp.id || ei" class="expectation-card">
                    <div class="expectation-header">
                      <el-switch v-model="exp.enabled" size="small"
                        @click.stop @mousedown.stop @change="doSaveMockRules" />
                      <el-input v-model="exp.name" size="small" class="expectation-name" :placeholder="t('mockService.expectationName')" @input="doSaveMockRules" />
                      <el-icon class="kv-delete" @click="removeExpectation(ei)"><Close /></el-icon>
                    </div>
                    <div class="expectation-body">
                      <div class="expectation-block-label">{{ t('mockService.conditions') }}</div>
                      <div v-if="!exp.conditions?.length" class="expectation-empty">{{ t('mockService.alwaysHit') }}</div>
                      <div v-for="(cond, ci) in exp.conditions" :key="cond.id || ci" class="kv-row">
                        <el-input v-model="cond.path" size="small" class="kv-path" placeholder="body.username" @input="doSaveMockRules" />
                        <el-select v-model="cond.operator" size="small" class="kv-op" @change="doSaveMockRules">
                          <el-option label="==" value="==" />
                          <el-option label="!=" value="!=" />
                          <el-option label="contains" value="contains" />
                          <el-option label="exists" value="exists" />
                        </el-select>
                        <el-input v-model="cond.value" size="small" class="kv-value" placeholder="value" @input="doSaveMockRules" />
                        <el-icon class="kv-delete" @click="removeCondition(exp, ci)"><Close /></el-icon>
                      </div>
                      <el-button class="add-cond-btn" size="small" text type="primary" @click="addCondition(exp)">
                        + condition
                      </el-button>
                      <div class="expectation-block-label" style="margin-top:10px">{{ t('mockService.hitResponse') }}</div>
                      <textarea v-model="exp.responseBody" class="resp-textarea exp-textarea"
                        :placeholder="t('mockService.expectationBodyPlaceholder')" spellcheck="false" @input="doSaveMockRules" />
                    </div>
                  </div>
                </div>
                <div v-else class="section-empty">{{ t('mockService.noExpectations') }}</div>
              </section>
            </div>

            <!-- Sticky 底部操作栏 -->
            <div class="form-actions">
              <span class="form-actions-hint">{{ mockRunning ? t('mockService.hotUpdateHint') : t('mockService.autoSaveHint') }}</span>
              <!-- 立即保存:绕过 debounce,点击就同步落盘 + 推送后端,不等 350ms -->
              <el-button size="small" type="primary" @click="doSaveMockRules.flush(); performSave()">
                <el-icon style="margin-right: 6px;"><Check /></el-icon>{{ t('common.save') }}
              </el-button>
            </div>
          </template>
          <div v-else class="empty-hint center-empty">
            <el-icon><Document /></el-icon>
            <span>{{ t('mockService.selectMockRule') }}</span>
          </div>
        </div>
      </div>

      <!-- Mock Log：底部抽屉 -->
      <div class="mock-log-drawer" :class="{ collapsed: logCollapsed }">
        <div class="mock-log-header" @click="logCollapsed = !logCollapsed">
          <span class="log-eyebrow">Logs</span>
          <span class="log-title">{{ t('mockService.mockLog') }}</span>
          <span class="log-count" v-if="mockLogs.length">{{ mockLogs.length }}</span>
          <el-icon v-if="mockLogs.length" class="log-clear" @click.stop="mockLogs = []" :title="t('common.delete')">
            <Close />
          </el-icon>
          <el-icon class="log-toggle">
            <ArrowDown v-if="!logCollapsed" />
            <ArrowUp v-else />
          </el-icon>
        </div>
        <div v-show="!logCollapsed" class="mock-log-body">
          <div v-if="mockLogs.length" class="mock-log-list">
            <!-- 用 time+path+method 拼一个稳定 key,index 做 key 时新日志 unshift 进来会让所有项整体复用错位的 DOM -->
            <div v-for="log in mockLogs" :key="`${log.time}-${log.method}-${log.path}`" class="mock-log-item"
              :class="{ expanded: !!log._expanded }"
              @click="log._expanded = !log._expanded">
              <div class="log-row-main">
                <span class="method-tag" :style="{ color: METHOD_COLORS[log.method] }">{{ log.method }}</span>
                <span class="log-path">{{ log.path }}</span>
                <!-- matchedExpectation 直接挂在主行上,一眼能看到走了哪条分支 -->
                <span v-if="log.matchedExpectation" class="log-exp-tag" :title="t('mockService.matchedExpectation') || '命中期望'">
                  ★ {{ log.matchedExpectation }}
                </span>
                <span class="status-badge" :class="log.status < 400 ? 'ok' : 'err'">{{ log.status }}</span>
                <span class="log-delay">{{ log.delay }}ms</span>
              </div>
              <!-- 展开后显示请求 body 摘要 + 命中规则 id,调试条件期望必看 -->
              <div v-if="log._expanded" class="log-row-detail" @click.stop>
                <div v-if="log.matchedRuleId" class="log-meta">
                  <span class="log-meta-key">ruleId</span>
                  <code>{{ log.matchedRuleId }}</code>
                </div>
                <div v-if="log.requestBody" class="log-meta">
                  <span class="log-meta-key">body</span>
                  <pre class="log-body-preview">{{ log.requestBody }}</pre>
                </div>
                <div v-if="!log.requestBody && !log.matchedRuleId" class="log-meta-empty">
                  {{ t('mockService.noRequestPayload') || '无请求体' }}
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-hint" style="margin: 8px;">{{ t('mockService.noMockLog') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, Close, MagicStick, Brush, Plus, ArrowDown, ArrowUp, Document, VideoPlay, VideoPause, Check } from '@element-plus/icons-vue'
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
const logCollapsed = ref(false)

const editingMock = computed(() => editMockIdx.value >= 0 ? mockRules.value[editMockIdx.value] : null)

// ---- 工具:debounce + toast 节流 ----
// 旧版:每次输入都直接 invoke + 弹一条「已保存」toast,改 5 个字段就 5 次 IPC + 5 个 toast 堆叠。
// 这里把"持久化 + 后端热更新 + 反馈"一起延迟 350ms,只有用户停下来才落盘/通知。
function debounce(fn, ms = 350) {
  let timer = null
  const debounced = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => { timer = null; fn(...args) }, ms)
  }
  debounced.flush = () => {
    if (timer) { clearTimeout(timer); timer = null; fn() }
  }
  debounced.cancel = () => { clearTimeout(timer); timer = null }
  return debounced
}

let lastSavedToastTime = 0
function notifySaved(success = true, errMsg = '') {
  // 同一个 800ms 窗口内只弹一次,避免连续保存堆 toast
  const now = Date.now()
  if (success) {
    if (now - lastSavedToastTime < 800) return
    lastSavedToastTime = now
    ElMessage({ message: t('mockService.saved'), type: 'success', grouping: true, duration: 1500 })
  } else {
    ElMessage.error(t('mockService.hotUpdateFailed', { error: errMsg }))
  }
}

// 真正干活的保存函数 —— 写本地存储 + (running 时)推送到后端
function performSave() {
  doSaveMockRulesStorage(mockRules.value)
  if (mockRunning.value) {
    invoke('update_mock_rules', { rules: mockRules.value })
      .then(() => notifySaved(true))
      .catch(e => notifySaved(false, String(e)))
  } else {
    notifySaved(true)
  }
}

const doSaveMockRules = debounce(performSave, 350)

function onAddMockRule() {
  mockRules.value.push({
    id: uuid(), method: 'GET', path: '/api/mock', statusCode: 200, delay: 0, enabled: true,
    responseBody: '{\n  "code": 0,\n  "data": {},\n  "message": "success"\n}',
    expectations: [],
  })
  editMockIdx.value = mockRules.value.length - 1
  // 新增是"立即操作",不走 debounce
  doSaveMockRules.cancel()
  performSave()
}

// ---- 删除 / 索引修正 ----
// 旧 bug:删除当前正在编辑的规则时 editMockIdx 不动,computed editingMock 会指向被删除项后面的规则,
// 用户继续输入相当于"误改了下一条规则"。这里删除时显式修正索引。
async function removeMockRule(i) {
  const rule = mockRules.value[i]
  try {
    await ElMessageBox.confirm(
      t('mockService.confirmDeleteRule', { path: rule.path }) || `确认删除规则 ${rule.method} ${rule.path}?`,
      t('common.delete') || '删除',
      { type: 'warning', confirmButtonText: t('common.delete') || '删除', cancelButtonText: t('common.cancel') || '取消' }
    )
  } catch { return }

  mockRules.value.splice(i, 1)
  if (editMockIdx.value === i) editMockIdx.value = -1
  else if (editMockIdx.value > i) editMockIdx.value--
  doSaveMockRules.cancel()
  performSave()
}

async function removeExpectation(ei) {
  if (!editingMock.value) return
  try {
    await ElMessageBox.confirm(
      t('mockService.confirmDeleteExpectation') || '确认删除该期望?',
      t('common.delete') || '删除',
      { type: 'warning', confirmButtonText: t('common.delete') || '删除', cancelButtonText: t('common.cancel') || '取消' }
    )
  } catch { return }
  editingMock.value.expectations.splice(ei, 1)
  doSaveMockRules()
}

function addExpectation() {
  if (!editingMock.value) return
  editingMock.value.expectations.push({
    id: uuid(),               // 新增 id 字段,用作 v-for :key,中间删除时不会 DOM 复用错乱
    name: '',
    enabled: true,
    conditions: [],
    responseBody: '',
  })
  doSaveMockRules()
}

function addCondition(exp) {
  exp.conditions.push({ id: uuid(), path: '', operator: '==', value: '' })
  doSaveMockRules()
}

function removeCondition(exp, ci) {
  exp.conditions.splice(ci, 1)
  doSaveMockRules()
}

function doSmartMock() {
  if (!editingMock.value) return
  try {
    const template = JSON.parse(editingMock.value.responseBody)
    const mocked = generateMockData(inferSchema(template))
    editingMock.value.responseBody = JSON.stringify(mocked, null, 2)
    doSaveMockRules()
  } catch { ElMessage.warning(t('mockService.jsonParseWarn')) }
}

async function toggleMock() {
  // 切换前先把还在 debounce 队列里的保存 flush 出去,免得后端启动后立刻又被一次延迟保存覆盖
  doSaveMockRules.flush()

  if (mockRunning.value) {
    try {
      await invoke('stop_mock_server')
      mockRunning.value = false
      ElMessage.info(`Mock ${t('mockService.stop')}`)
    } catch (e) { ElMessage.error(String(e)) }
  } else {
    if (!mockRules.value.filter(r => r.enabled).length) {
      ElMessage.warning(t('mockService.needRule'))
      return
    }
    try {
      await invoke('start_mock_server', { port: mockPort.value, rules: mockRules.value })
      mockRunning.value = true
      ElMessage.success(`Mock ${t('mockService.start')} :${mockPort.value}`)
    } catch (e) { ElMessage.error(String(e)) }
  }
}

// ---- 老数据迁移:为现有 expectation/condition 补 id,避免 v-for :key 仍然吃 index ----
function ensureIds(rules) {
  for (const r of rules) {
    if (!Array.isArray(r.expectations)) r.expectations = []
    for (const exp of r.expectations) {
      if (!exp.id) exp.id = uuid()
      if (!Array.isArray(exp.conditions)) exp.conditions = []
      for (const c of exp.conditions) {
        if (!c.id) c.id = uuid()
      }
    }
  }
}

let mockLogUnlisten = null

onMounted(async () => {
  mockRules.value = loadMockRules()
  ensureIds(mockRules.value)

  // 同步后端真实运行状态。
  // 旧 bug:mockRunning 是组件 local ref,App.vue 的 keep-alive 只 include 了 Chat,
  // MockService 切走就被销毁,回来时 mockRunning 默认值 false,但后端 axum task 还在跑
  // → UI 显示"已停止",实际仍在监听端口,且改规则不再热更新(因为 performSave 看 mockRunning=false 不推后端)。
  // 这里主动问一次后端,把 mockRunning / mockPort 拉对齐。
  try {
    const status = await invoke('get_mock_server_status')
    mockRunning.value = !!status?.running
    if (status?.port) mockPort.value = status.port
  } catch (e) {
    // 查询失败不影响基本功能,容忍
    console.warn('[mock] sync status failed:', e)
  }

  mockLogUnlisten = await listen('mock-request-log', (event) => {
    mockLogs.value.unshift(event.payload)
    if (mockLogs.value.length > 50) mockLogs.value.splice(50)
  })
})

onBeforeUnmount(() => {
  // 离开页面前把待保存的内容立刻落盘(否则 debounce 队列里的修改会丢)
  doSaveMockRules.flush()
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
  background: linear-gradient(180deg, var(--el-fill-color-light) 0%, var(--el-fill-color-light) 100%);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, var(--surface-panel), var(--surface-panel-soft));
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
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
.header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mock-status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--el-text-color-secondary); transition: background 0.15s, box-shadow 0.15s; }
.mock-status-dot.running { background: var(--el-color-success); box-shadow: 0 0 0 3px rgba(103,194,58,0.18); }

/* 端口输入框:原本 width:100px + 默认左右双侧按钮,5 位端口号 65535 会和按钮挤在一起。
   改成 controls-position=right(两个箭头堆在右侧 24px 列) + 宽度 130px,数字区有 ~96px 空间不再重叠。
   :deep 因为 el-input-number 有自己的内层 wrapper,scoped 样式默认打不进去。 */
.port-input { width: 130px; }
.port-input :deep(.el-input__inner) {
  text-align: left;
  padding-right: 28px;  /* 给右侧上下箭头列留位置 */
}

/* 内容区：column 排布，编辑区在上、log 抽屉在下 */
.content-area { flex: 1; overflow: hidden; min-height: 0; display: flex; flex-direction: column; }
.mock-layout { flex: 1; display: flex; overflow: hidden; min-height: 0; }

/* ============ 左侧规则列表 ============ */
.mock-rules-panel {
  width: 260px;
  min-width: 260px;
  overflow: hidden;
  background: transparent;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  flex-shrink: 0;
}
.panel-toolbar > span:first-child {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.mock-rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  cursor: pointer;
  font-size: 12px;
  border-left: 2px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}
.mock-rule-item:hover { background: rgba(60, 40, 20, 0.04); }
.mock-rule-item.active {
  background: rgba(47, 111, 228, 0.08);
  border-left-color: var(--accent-blue);
}
.mock-rule-item .kv-delete { opacity: 0; }
.mock-rule-item:hover .kv-delete { opacity: 1; }

/* ============ 右侧编辑面板（扫平风，对齐 ApiDocs） ============ */
.mock-edit-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: transparent;
  border-left: 1px solid rgba(60, 40, 20, 0.08);
}

/* ---- 顶栏：method + path + status pill ---- */
.form-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}
.method-select { width: 110px; flex-shrink: 0; }
.method-select :deep(.el-select__wrapper) {
  height: 32px;
  border-radius: 8px;
  background: var(--el-bg-color-overlay);
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.12);
  padding: 0 10px;
}
.method-select :deep(.el-select__wrapper:hover) {
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.2);
}
.method-select :deep(.el-select__wrapper.is-focused) {
  box-shadow: inset 0 0 0 1.5px var(--accent-blue);
}
.method-select :deep(.el-select__placeholder),
.method-select :deep(.el-select__selected-item) {
  color: var(--method-color, var(--text-primary)) !important;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.02em;
}
.method-select :deep(.el-select__caret) { color: var(--text-quaternary); }

.path-input { flex: 1; min-width: 0; }
.path-input :deep(.el-input__wrapper) {
  height: 32px;
  border-radius: 8px;
  background: var(--el-bg-color-overlay);
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.12);
  padding: 0 12px;
}
.path-input :deep(.el-input__wrapper:hover) {
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.2);
}
.path-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: inset 0 0 0 1.5px var(--accent-blue);
}
.path-input :deep(.el-input__inner) {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12.5px;
  color: var(--text-primary);
}
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  border-radius: 6px;
  flex-shrink: 0;
}
.status-pill.ok { color: var(--el-color-success); background: rgba(103,194,58,0.12); }
.status-pill.err { color: var(--el-color-danger); background: rgba(245,108,108,0.12); }

/* ---- 滚动主体 ---- */
.form-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 14px;
}
.form-scroll::-webkit-scrollbar { width: 5px; }
.form-scroll::-webkit-scrollbar-thumb { background: rgba(60, 40, 20, 0.18); border-radius: 3px; }

/* ---- Section ---- */
.form-section {
  padding: 14px 0 16px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}
.form-section:last-child { border-bottom: 0; padding-bottom: 4px; }

.section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  min-height: 24px;
}
.section-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-quaternary);
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.section-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 17px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--accent-blue);
  background: rgba(47, 111, 228, 0.08);
  border-radius: 8px;
}
.section-actions { margin-left: auto; display: inline-flex; gap: 4px; }
.section-action.ml-auto { margin-left: auto; }
.section-action {
  height: 24px !important;
  padding: 0 8px !important;
  font-size: 12px !important;
  border-radius: 6px !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
}
.section-action :deep(.el-icon) { font-size: 12px; }
.section-action:hover { background: rgba(47, 111, 228, 0.06) !important; }
.section-empty {
  font-size: 12px;
  color: var(--text-quaternary);
  padding: 16px 12px;
  text-align: center;
  border: 1px dashed rgba(60, 40, 20, 0.12);
  border-radius: 8px;
  background: transparent;
}

/* ---- form-row ---- */
.form-rows { display: flex; flex-direction: column; }
.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  min-height: 36px;
}
.row-label {
  flex: 0 0 80px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: right;
}
.row-input { width: 130px; }
.row-inline { display: inline-flex; align-items: center; gap: 6px; }
.row-unit { font-size: 11px; color: var(--text-tertiary); }
.form-row :deep(.el-input-number .el-input__wrapper),
.form-row :deep(.el-input__wrapper) {
  height: 30px;
  border-radius: 8px;
  background: var(--el-bg-color-overlay);
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.1);
}
.form-row :deep(.el-input__wrapper:hover) {
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.2);
}
.form-row :deep(.el-input__wrapper.is-focus) {
  box-shadow: inset 0 0 0 1.5px var(--accent-blue);
}

/* ---- 响应 textarea（共用） ---- */
.resp-textarea {
  width: 100%;
  min-height: 180px;
  max-height: 320px;
  padding: 12px 14px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--text-primary);
  background: var(--el-bg-color-overlay);
  border: 0;
  border-radius: 8px;
  outline: none;
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.1);
  resize: vertical;
  box-sizing: border-box;
  transition: box-shadow 0.12s;
}
.resp-textarea:hover { box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.2); }
.resp-textarea:focus { box-shadow: inset 0 0 0 1.5px var(--accent-blue); }
.exp-textarea { min-height: 80px; max-height: 200px; font-size: 12px; padding: 8px 10px; }

/* ---- expectation 卡片 ---- */
.expectation-list { display: flex; flex-direction: column; gap: 8px; }
.expectation-card {
  border: 1px solid rgba(60, 40, 20, 0.1);
  border-radius: 10px;
  background: var(--surface-muted);
  overflow: hidden;
  transition: border-color 0.15s, background 0.15s;
}
.expectation-card:hover {
  border-color: rgba(47, 111, 228, 0.25);
  background: var(--surface-panel-soft);
}
.expectation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(60, 40, 20, 0.025);
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
}
.expectation-header .kv-delete { opacity: 0.5; }
.expectation-card:hover .expectation-header .kv-delete { opacity: 1; }
.expectation-name { flex: 1; }
.expectation-name :deep(.el-input__wrapper) {
  background: transparent;
  box-shadow: none !important;
  padding: 0 6px;
}
.expectation-name :deep(.el-input__wrapper:hover),
.expectation-name :deep(.el-input__wrapper.is-focus) {
  background: var(--el-bg-color-overlay);
  box-shadow: inset 0 0 0 1px rgba(47, 111, 228, 0.4) !important;
}
.expectation-name :deep(.el-input__inner) { font-weight: 600; font-size: 12.5px; }
.expectation-body { padding: 10px 10px 12px; }
.expectation-block-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-quaternary);
  margin-bottom: 6px;
}
.expectation-empty {
  font-size: 11.5px;
  color: var(--text-quaternary);
  font-style: italic;
  padding: 4px 0 8px;
}

/* ---- kv 条件行 ---- */
.kv-row {
  display: grid;
  grid-template-columns: 1fr 90px 1fr 22px;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
}
.kv-row :deep(.el-input__wrapper),
.kv-row :deep(.el-select__wrapper) {
  height: 28px;
  border-radius: 6px;
  background: var(--el-bg-color-overlay);
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.1);
  padding: 0 8px;
}
.kv-row :deep(.el-input__wrapper:hover),
.kv-row :deep(.el-select__wrapper:hover) {
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.2);
}
.kv-row :deep(.el-input__wrapper.is-focus),
.kv-row :deep(.el-select__wrapper.is-focused) {
  box-shadow: inset 0 0 0 1.5px var(--accent-blue);
}
.kv-row :deep(.el-input__inner) { font-size: 12px; height: 28px; line-height: 28px; }
.kv-path :deep(.el-input__inner) {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
}

.add-cond-btn {
  height: 24px !important;
  padding: 0 8px !important;
  font-size: 12px !important;
}

/* ---- 通用 kv-delete ---- */
.kv-delete {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--text-quaternary);
  cursor: pointer;
  padding: 3px;
  border-radius: 5px;
  transition: color 0.12s, background 0.12s, opacity 0.12s;
}
.kv-delete:hover {
  color: var(--el-color-danger);
  background: rgba(229, 57, 53, 0.08);
}

/* ---- Sticky 底部操作栏 ---- */
.form-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  border-top: 1px solid rgba(60, 40, 20, 0.08);
}
.form-actions-hint {
  flex: 1;
  font-size: 11px;
  color: var(--text-quaternary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.form-actions-hint::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-success);
}
.form-actions :deep(.el-button) {
  height: 30px;
  padding: 0 16px;
  font-weight: 600;
  border-radius: 7px;
}

/* ---- 空态居中 ---- */
.center-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 0;
  background: transparent;
  color: var(--text-quaternary);
}
.center-empty .el-icon { font-size: 32px; opacity: 0.4; }

/* ---- Mock Log 底部抽屉 ---- */
.mock-log-drawer {
  flex-shrink: 0;
  border-top: 1px solid rgba(60, 40, 20, 0.08);
  background: var(--surface-muted);
  display: flex;
  flex-direction: column;
  max-height: 220px;
  transition: max-height 0.22s ease;
}
.mock-log-drawer.collapsed { max-height: 36px; }
.mock-log-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 36px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}
.mock-log-header:hover { background: rgba(60, 40, 20, 0.03); }
.log-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-quaternary);
}
.log-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}
.log-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 17px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--accent-blue);
  background: rgba(47, 111, 228, 0.08);
  border-radius: 8px;
}
.log-clear, .log-toggle {
  font-size: 14px;
  color: var(--text-quaternary);
  padding: 3px;
  border-radius: 4px;
  transition: color 0.12s, background 0.12s;
}
.log-toggle { margin-left: auto; }
.log-clear:hover { color: var(--el-color-danger); background: rgba(229, 57, 53, 0.08); }
.log-toggle:hover { color: var(--text-primary); background: rgba(60, 40, 20, 0.06); }

.mock-log-body { flex: 1; overflow-y: auto; padding: 0 14px 8px; }
.mock-log-body::-webkit-scrollbar { width: 5px; }
.mock-log-body::-webkit-scrollbar-thumb { background: rgba(60, 40, 20, 0.18); border-radius: 3px; }
.mock-log-list { display: flex; flex-direction: column; }
.mock-log-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 4px;
  border-bottom: 1px dashed rgba(60, 40, 20, 0.06);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.12s;
}
.mock-log-item:hover { background: rgba(60, 40, 20, 0.03); }
.mock-log-item.expanded { background: rgba(47, 111, 228, 0.04); }
.mock-log-item:last-child { border-bottom: 0; }
.log-row-main { display: flex; align-items: center; gap: 10px; }
.log-row-detail {
  display: flex; flex-direction: column; gap: 4px;
  padding: 6px 8px;
  background: rgba(60, 40, 20, 0.04);
  border-radius: 6px;
  cursor: default;
}
.log-meta { display: flex; gap: 8px; align-items: flex-start; font-size: 11.5px; }
.log-meta-key {
  flex-shrink: 0; min-width: 48px;
  color: var(--text-tertiary);
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
}
.log-meta code {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  color: var(--text-secondary); word-break: break-all;
}
.log-body-preview {
  margin: 0; flex: 1; min-width: 0;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 11px; line-height: 1.5;
  color: var(--text-primary);
  white-space: pre-wrap; word-break: break-all;
  max-height: 120px; overflow-y: auto;
}
.log-meta-empty { color: var(--text-quaternary); font-size: 11px; font-style: italic; }
.log-exp-tag {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--el-color-warning);
  background: rgba(230, 162, 60, 0.12);
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.log-path {
  flex: 1;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.log-delay {
  font-size: 10.5px;
  color: var(--text-quaternary);
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
}
.status-badge {
  font-size: 10.5px;
  font-weight: 700;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  padding: 1px 7px;
  border-radius: 4px;
}
.status-badge.ok { color: var(--el-color-success); background: rgba(103,194,58,0.1); }
.status-badge.err { color: var(--el-color-danger); background: rgba(245,108,108,0.1); }

/* ---- 通用 ---- */
.method-tag { font-size: 10px; font-weight: 700; flex-shrink: 0; width: 40px; }
.item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); }
.empty-hint {
  text-align: center;
  color: var(--text-quaternary);
  font-size: 12px;
  padding: 24px;
  border: 1px dashed rgba(60, 40, 20, 0.14);
  border-radius: 8px;
  background: transparent;
  margin: 12px;
}

@media (max-width: 960px) {
  .mock-layout { flex-direction: column; }
  .mock-rules-panel {
    width: 100%;
    min-width: 0;
    border-bottom: 1px solid rgba(60, 40, 20, 0.1);
    max-height: 220px;
  }
  .mock-edit-panel { border-left: 0; }
}
</style>
