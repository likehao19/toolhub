<template>
  <div class="auto-test-wrapper">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><DocumentChecked /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('autoTest.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-select v-model="currentEnvId" size="small" style="width: 140px"
          :placeholder="t('autoTest.noEnv')" clearable @change="onEnvChange">
          <el-option v-for="env in environments" :key="env.id" :label="env.name" :value="env.id" />
        </el-select>
      </div>
    </div>

    <!-- Content -->
    <div class="content-area">
      <div class="auto-layout">
        <!-- Suite List -->
        <div class="auto-sidebar">
          <div class="panel-toolbar">
            <span style="font-size:12px;font-weight:600">{{ t('autoTest.testSuites') }}</span>
            <el-button size="small" text type="primary" @click="onAddTestSuite">+</el-button>
          </div>
          <div v-for="suite in testSuites" :key="suite.id" class="doc-item"
            :class="{ active: editSuiteId === suite.id }" @click="editSuiteId = suite.id">
            <span class="item-name">{{ suite.name }}</span>
            <el-icon class="kv-delete" @click.stop="onDeleteSuite(suite.id)"><Close /></el-icon>
          </div>
          <div v-if="!testSuites.length" class="empty-hint">{{ t('autoTest.noSuites') }}</div>
        </div>

        <!-- Suite Editor -->
        <div class="auto-main">
          <template v-if="editingSuite">
            <div class="suite-toolbar">
              <el-input v-model="editingSuite.name" size="small" style="width:200px" />
              <div style="margin-left:auto;display:flex;gap:8px">
                <el-button type="primary" size="small" :loading="suiteRunning" @click="doRunSuite">
                  {{ t('autoTest.runSuite') }}
                </el-button>
                <el-button size="small" @click="doSaveSuite">{{ t('common.save') }}</el-button>
              </div>
            </div>

            <!-- Steps -->
            <div class="auto-steps">
              <div style="font-size:12px;font-weight:600;margin-bottom:8px">{{ t('autoTest.steps') }} ({{ editingSuite.steps.length }})</div>
              <div v-for="(step, si) in editingSuite.steps" :key="si" class="auto-step-card"
                :class="stepResultClass(si)">
                <div class="step-header">
                  <span class="step-num">#{{ si + 1 }}</span>
                  <el-select v-model="step.apiRef" size="small" style="flex:1" :placeholder="t('autoTest.selectApi')">
                    <el-option-group v-for="col in collectionApiGroups" :key="col.id" :label="col.name">
                      <el-option v-for="item in col.apis" :key="item.id" :label="`${item.folderPath ? item.folderPath + ' / ' : ''}${item.method} ${item.url}`" :value="item.id" />
                    </el-option-group>
                  </el-select>
                  <el-checkbox v-model="step.continueOnFailure" size="small">{{ t('autoTest.continueOnFail') }}</el-checkbox>
                  <el-icon class="kv-delete" @click="editingSuite.steps.splice(si, 1)"><Close /></el-icon>
                </div>

                <!-- Step result -->
                <div v-if="suiteResults[si]" class="step-result-row">
                  <el-tag size="small" :type="suiteResults[si].status === 'passed' ? 'success' : suiteResults[si].status === 'failed' ? 'danger' : 'info'">
                    {{ suiteResults[si].status }}
                  </el-tag>
                  <span v-if="suiteResults[si].response" style="font-size:11px;color:var(--text-tertiary)">
                    {{ suiteResults[si].response.status }} · {{ suiteResults[si].response.time }}ms
                  </span>
                  <span v-if="suiteResults[si].error" style="font-size:11px;color:#F56C6C">{{ suiteResults[si].error }}</span>
                  <span v-if="suiteResults[si].reason" style="font-size:11px;color:#E6A23C">{{ suiteResults[si].reason }}</span>
                </div>

                <!-- Assertions -->
                <div class="step-section">
                  <div style="font-size:11px;font-weight:600;margin-bottom:4px">{{ t('autoTest.assertions') }}</div>
                  <div v-for="(a, ai) in step.assertions" :key="ai" class="kv-row">
                    <el-input v-model="a.target" size="small" placeholder="status / body.code" style="flex:1" />
                    <el-select v-model="a.operator" size="small" style="width:80px">
                      <el-option v-for="op in assertionOps" :key="op" :label="op" :value="op" />
                    </el-select>
                    <el-input v-model="a.expected" size="small" placeholder="200" style="flex:1" />
                    <el-tag v-if="suiteResults[si]?.assertions?.[ai]" size="small"
                      :type="suiteResults[si].assertions[ai].pass ? 'success' : 'danger'" style="flex-shrink:0">
                      {{ suiteResults[si].assertions[ai].pass ? '✓' : '✗' }} {{ suiteResults[si].assertions[ai].actual }}
                      <template v-if="!suiteResults[si].assertions[ai].pass"> ({{ a.expected }})</template>
                    </el-tag>
                    <el-icon class="kv-delete" @click="step.assertions.splice(ai, 1)"><Close /></el-icon>
                  </div>
                  <el-button size="small" text type="primary"
                    @click="step.assertions.push({ target: 'status', operator: '==', expected: '200' })">
                    + {{ t('autoTest.addAssertion') }}
                  </el-button>
                </div>

                <!-- Extractors -->
                <div class="step-section">
                  <div style="font-size:11px;font-weight:600;margin-bottom:4px">{{ t('autoTest.extractVars') }}</div>
                  <div v-for="(ex, exi) in step.extractors" :key="exi" class="kv-row">
                    <el-select v-model="ex.source" size="small" style="width:70px">
                      <el-option label="body" value="body" /><el-option label="header" value="header" />
                    </el-select>
                    <el-input v-model="ex.path" size="small" placeholder="data.token" style="flex:1" />
                    <span style="font-size:11px;color:var(--text-tertiary)">→</span>
                    <el-input v-model="ex.variable" size="small" placeholder="token" style="flex:1" />
                    <el-icon class="kv-delete" @click="step.extractors.splice(exi, 1)"><Close /></el-icon>
                  </div>
                  <el-button size="small" text type="primary"
                    @click="step.extractors.push({ source: 'body', path: '', variable: '' })">
                    + {{ t('autoTest.addExtractor') }}
                  </el-button>
                </div>
              </div>
              <el-button size="small" type="primary" plain style="margin-top:12px"
                @click="editingSuite.steps.push({ apiRef: '', assertions: [], extractors: [], continueOnFailure: false })">
                + {{ t('autoTest.addStep') }}
              </el-button>
            </div>

            <!-- Suite Report -->
            <div v-if="suiteReport" class="suite-report">
              <el-divider content-position="left">{{ t('autoTest.testReport') }}</el-divider>
              <div class="bench-stat-grid">
                <div class="bench-stat-card"><div class="stat-val">{{ suiteReport.total }}</div><div class="stat-label">{{ t('autoTest.totalSteps') }}</div></div>
                <div class="bench-stat-card ok"><div class="stat-val">{{ suiteReport.passed }}</div><div class="stat-label">{{ t('autoTest.passed') }}</div></div>
                <div class="bench-stat-card err"><div class="stat-val">{{ suiteReport.failed + suiteReport.errors }}</div><div class="stat-label">{{ t('autoTest.failed') }}</div></div>
                <div class="bench-stat-card"><div class="stat-val">{{ suiteReport.skipped }}</div><div class="stat-label">{{ t('autoTest.skipped') }}</div></div>
              </div>
            </div>
          </template>
          <div v-else class="empty-hint" style="display:flex;align-items:center;justify-content:center;height:100%">
            {{ t('autoTest.selectSuite') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DocumentChecked, Close } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { METHOD_COLORS, uuid } from '@/utils/apiWorkbench/shared'
import { loadCollections, flattenCollectionApis } from '@/utils/apiWorkbench/collections'
import { getActiveVariables, loadEnvironments, getCurrentEnvId, setCurrentEnvId } from '@/utils/apiWorkbench/environment'
import { loadTestSuites, saveTestSuites, runTestSuite } from '@/utils/apiWorkbench/testRunner'

const router = useRouter()
const assertionOps = ['==', '!=', '>', '<', '>=', '<=', 'contains', 'notEmpty', 'regex']

const collections = ref([])
const environments = ref([])
const currentEnvId = ref(null)
const testSuites = ref([])
const editSuiteId = ref(null)
const suiteRunning = ref(false)
const suiteResults = ref({})
const suiteReport = ref(null)

const editingSuite = computed(() => testSuites.value.find(s => s.id === editSuiteId.value) || null)
const collectionApiGroups = computed(() => flattenCollectionApis(collections.value))

function onEnvChange(val) { setCurrentEnvId(val) }

function onAddTestSuite() {
  ElMessageBox.prompt(t('autoTest.suiteName'), t('autoTest.newSuite'), {
    confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'),
  }).then(({ value }) => {
    if (value?.trim()) {
      const suite = { id: uuid(), name: value.trim(), steps: [] }
      testSuites.value.push(suite)
      editSuiteId.value = suite.id
      saveTestSuites(testSuites.value)
    }
  }).catch(() => {})
}

function onDeleteSuite(id) {
  testSuites.value = testSuites.value.filter(s => s.id !== id)
  if (editSuiteId.value === id) editSuiteId.value = null
  saveTestSuites(testSuites.value)
}

function doSaveSuite() {
  saveTestSuites(testSuites.value)
  ElMessage.success(t('autoTest.saved'))
}

async function doRunSuite() {
  if (!editingSuite.value) return
  suiteRunning.value = true
  suiteResults.value = {}
  suiteReport.value = null

  const vars = getActiveVariables()
  const t0 = Date.now()

  const report = await runTestSuite(
    editingSuite.value, collections.value, vars,
    (result, idx) => { suiteResults.value = { ...suiteResults.value, [idx]: result } }
  )

  report.duration = Date.now() - t0
  suiteReport.value = report
  suiteRunning.value = false
}

function stepResultClass(idx) {
  const r = suiteResults.value[idx]
  if (!r) return ''
  return r.status === 'passed' ? 'step-passed' : r.status === 'failed' ? 'step-failed' : 'step-error'
}

onMounted(() => {
  collections.value = loadCollections()
  environments.value = loadEnvironments()
  currentEnvId.value = getCurrentEnvId()
  testSuites.value = loadTestSuites()
})
</script>

<style scoped>
.auto-test-wrapper {
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
.header-actions { display: flex; align-items: center; gap: 8px; }

.content-area {
  flex: 1;
  overflow: hidden;
  padding: 14px 18px 0;
  min-height: 0;
}
.auto-layout { flex: 1; display: flex; height: 100%; overflow: hidden; min-height: 0; }
.auto-sidebar {
  width: 250px;
  min-width: 220px;
  overflow-y: auto;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-right: none;
  border-radius: 18px 0 0 18px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(241, 245, 249, 0.98));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
}
.panel-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}
.auto-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0 18px 18px 0;
  background: linear-gradient(180deg, rgba(252,253,255,0.99), rgba(245,247,250,0.98));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
}
.suite-toolbar {
  display: flex; align-items: center; gap: 8px; padding: 12px 16px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08); background: rgba(255,255,255,0.6); flex-shrink: 0;
}
.auto-steps { padding: 16px; flex: 1; overflow-y: auto; }
.auto-step-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 10px;
  transition: border-color 0.2s;
  background: rgba(255,255,255,0.68);
}
.auto-step-card.step-passed { border-color: rgba(103,194,58,0.45); background: rgba(103,194,58,0.06); }
.auto-step-card.step-failed { border-color: rgba(245,108,108,0.45); background: rgba(245,108,108,0.06); }
.auto-step-card.step-error { border-color: rgba(230,162,60,0.45); background: rgba(230,162,60,0.06); }
.step-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.step-num { font-size: 12px; font-weight: 700; color: var(--text-tertiary); width: 24px; flex-shrink: 0; }
.step-result-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.step-section { margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(15, 23, 42, 0.1); }
.suite-report { padding: 0 16px 16px; }

.doc-item {
  display: flex; align-items: center; gap: 6px; padding: 10px 12px; cursor: pointer; font-size: 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
}
.doc-item:hover { background: rgba(255,255,255,0.62); }
.doc-item.active { background: linear-gradient(135deg, var(--accent-blue), #7c3aed); color: #fff; }
.doc-item .kv-delete { display: none; }
.doc-item:hover .kv-delete { display: block; }

.item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); }
.empty-hint {
  text-align: center; color: var(--text-quaternary); font-size: 12px; padding: 24px;
  border: 1px dashed rgba(15, 23, 42, 0.08); border-radius: 14px; background: rgba(255,255,255,0.5);
}
.kv-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.kv-delete { flex-shrink: 0; font-size: 14px; color: var(--text-quaternary); cursor: pointer; }
.kv-delete:hover { color: var(--el-color-danger); }

.bench-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.bench-stat-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  padding: 10px;
  text-align: center;
  background: rgba(255,255,255,0.68);
}
.bench-stat-card.ok { border-color: rgba(103,194,58,0.3); }
.bench-stat-card.err { border-color: rgba(245,108,108,0.3); }
.stat-val { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.bench-stat-card.ok .stat-val { color: #67C23A; }
.bench-stat-card.err .stat-val { color: #F56C6C; }
.stat-label { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }

@media (max-width: 960px) {
  .content-area { padding: 14px 14px 0; }
  .auto-layout { flex-direction: column; }
  .auto-sidebar {
    width: 100%;
    min-width: 0;
    border-right: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 18px 18px 0 0;
    max-height: 280px;
  }
  .auto-main { border-radius: 0 0 18px 18px; }
  .bench-stat-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
