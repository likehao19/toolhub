<template>
  <div class="api-debug-wrapper">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <el-icon><Briefcase /></el-icon>
          <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
          <span class="breadcrumb-sep">/</span>
          <span>{{ t('apiDebug.title') }}</span>
        </div>
      </div>
      <div class="header-actions">
        <el-select v-model="currentEnvId" size="small" style="width: 140px"
          :placeholder="t('apiDebug.noEnv')" clearable @change="onEnvChange">
          <el-option v-for="env in environments" :key="env.id" :label="env.name" :value="env.id" />
        </el-select>
        <el-button size="small" @click="showEnvDialog = true">
          <el-icon><Setting /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- Content -->
    <div class="content-area">
      <div class="debug-layout">
        <!-- Left Sidebar -->
        <div class="left-sidebar" :class="{ collapsed: sidebarCollapsed }">
          <div v-if="!sidebarCollapsed" class="sidebar-content">
            <div class="sidebar-tabs">
              <div class="sidebar-tab" :class="{ active: sidebarTab === 'collections' }" @click="sidebarTab = 'collections'">
                {{ t('apiDebug.collections') }}
              </div>
              <div class="sidebar-tab" :class="{ active: sidebarTab === 'history' }" @click="sidebarTab = 'history'">
                {{ t('apiDebug.history') }}
              </div>
            </div>

            <!-- Collections -->
            <div v-if="sidebarTab === 'collections'" class="sidebar-list">
              <div class="sidebar-toolbar">
                <el-button size="small" text type="primary" @click="onCreateCollection">+ {{ t('apiDebug.newCollection') }}</el-button>
              </div>
              <div v-for="col in collections" :key="col.id" class="collection-group">
                <div class="collection-header">
                  <span class="collection-name">📁 {{ col.name }}</span>
                  <el-dropdown trigger="click" size="small" @command="cmd => onCollectionCmd(cmd, col)">
                    <el-icon class="collection-more"><MoreFilled /></el-icon>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="rename">{{ t('common.edit') }}</el-dropdown-item>
                        <el-dropdown-item command="delete" divided>{{ t('common.delete') }}</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
                <div v-for="item in col.items" :key="item.id" class="collection-item"
                  :class="{ active: activeItemId === item.id }" @click="loadCollectionItem(col, item)">
                  <span class="method-tag" :style="{ color: METHOD_COLORS[item.method] }">{{ item.method }}</span>
                  <span class="item-name" :title="item.name">{{ item.name }}</span>
                  <el-icon class="item-delete" @click.stop="onDeleteCollectionItem(col.id, item.id)"><Close /></el-icon>
                </div>
              </div>
              <div v-if="!collections.length" class="empty-hint">{{ t('apiDebug.noCollections') }}</div>
            </div>

            <!-- History -->
            <div v-if="sidebarTab === 'history'" class="sidebar-list">
              <div class="sidebar-toolbar">
                <el-button size="small" text type="danger" @click="onClearHistory">{{ t('apiDebug.clearHistory') }}</el-button>
              </div>
              <div v-for="group in groupedHistory" :key="group.label" class="history-group">
                <div class="history-group-label">{{ group.label }}</div>
                <div v-for="item in group.items" :key="item.id" class="history-item"
                  @click="loadHistoryItem(item)">
                  <span class="method-tag" :style="{ color: METHOD_COLORS[item.method] }">{{ item.method }}</span>
                  <span class="item-name" :title="item.url">{{ shortenUrl(item.url) }}</span>
                  <span class="history-status" :class="item.status < 400 ? 'ok' : 'err'">{{ item.status || '' }}</span>
                  <el-icon class="item-delete" @click.stop="onDeleteHistoryItem(item.id)"><Close /></el-icon>
                </div>
              </div>
              <div v-if="!history.length" class="empty-hint">{{ t('apiDebug.noHistory') }}</div>
            </div>
          </div>
          <div class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
            <el-icon>
              <ArrowLeft v-if="!sidebarCollapsed" />
              <ArrowRight v-else />
            </el-icon>
          </div>
        </div>

        <!-- Main Panel -->
        <div class="main-panel">
          <!-- Request URL Bar -->
          <div class="url-bar">
            <el-select v-model="reqMethod" class="method-select" size="default">
              <el-option v-for="m in methods" :key="m" :label="m" :value="m">
                <span :style="{ color: METHOD_COLORS[m], fontWeight: 600 }">{{ m }}</span>
              </el-option>
            </el-select>
            <el-input v-model="reqUrl" class="url-input" :placeholder="'https://api.example.com/users'"
              @keydown.ctrl.enter="doSend" clearable />
            <el-button type="primary" :loading="sending" @click="doSend" :disabled="!reqUrl.trim()">
              {{ sending ? t('apiDebug.sending') : t('apiDebug.send') }}
            </el-button>
            <el-button v-if="sending" @click="doCancel" type="danger" plain>
              {{ t('apiDebug.cancel') }}
            </el-button>
            <el-dropdown trigger="click" @command="onUrlMenuCmd">
              <el-button><el-icon><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="save">{{ t('apiDebug.saveToCollection') }}</el-dropdown-item>
                  <el-dropdown-item command="curl">{{ t('apiDebug.copyCurl') }}</el-dropdown-item>
                  <el-dropdown-item command="importCurl">{{ t('apiDebug.importCurl') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <!-- Request / Response Split -->
          <div class="split-panels">
            <!-- Request Tabs -->
            <div class="request-panel">
              <el-tabs v-model="reqTab" class="compact-tabs">
                <el-tab-pane :label="`Params${activeParamsCount ? ' (' + activeParamsCount + ')' : ''}`" name="params">
                  <div class="kv-editor">
                    <div v-for="(p, i) in reqParams" :key="i" class="kv-row">
                      <el-checkbox v-model="p.enabled" size="small" />
                      <el-input v-model="p.key" size="small" placeholder="Key" />
                      <el-input v-model="p.value" size="small" placeholder="Value" />
                      <el-icon class="kv-delete" @click="reqParams.splice(i, 1)"><Close /></el-icon>
                    </div>
                    <el-button size="small" text type="primary" @click="reqParams.push({ key: '', value: '', enabled: true })">
                      + {{ t('apiDebug.addParam') }}
                    </el-button>
                  </div>
                </el-tab-pane>

                <el-tab-pane :label="`Headers${activeHeadersCount ? ' (' + activeHeadersCount + ')' : ''}`" name="headers">
                  <div class="kv-editor">
                    <div v-for="(h, i) in reqHeaders" :key="i" class="kv-row">
                      <el-checkbox v-model="h.enabled" size="small" />
                      <el-autocomplete v-model="h.key" size="small" placeholder="Key"
                        :fetch-suggestions="queryHeaders" />
                      <el-input v-model="h.value" size="small" placeholder="Value" />
                      <el-icon class="kv-delete" @click="reqHeaders.splice(i, 1)"><Close /></el-icon>
                    </div>
                    <el-button size="small" text type="primary" @click="reqHeaders.push({ key: '', value: '', enabled: true })">
                      + {{ t('apiDebug.addHeader') }}
                    </el-button>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="Body" name="body">
                  <div class="body-editor">
                    <div class="body-type-bar">
                      <el-radio-group v-model="reqBody.type" size="small">
                        <el-radio-button value="none">none</el-radio-button>
                        <el-radio-button value="json">JSON</el-radio-button>
                        <el-radio-button value="form">x-www-form</el-radio-button>
                        <el-radio-button value="raw">raw</el-radio-button>
                      </el-radio-group>
                      <el-button v-if="reqBody.type === 'json'" size="small" text @click="formatBodyJson">
                        {{ t('apiDebug.formatJson') }}
                      </el-button>
                    </div>
                    <textarea v-if="reqBody.type === 'json' || reqBody.type === 'raw'"
                      v-model="reqBody.content" class="body-textarea"
                      :placeholder="reqBody.type === 'json' ? '{ }' : 'raw text...'"
                      spellcheck="false" />
                    <div v-if="reqBody.type === 'form'" class="kv-editor">
                      <div v-for="(f, i) in reqBody.formData" :key="i" class="kv-row">
                        <el-checkbox v-model="f.enabled" size="small" />
                        <el-input v-model="f.key" size="small" placeholder="Key" />
                        <el-input v-model="f.value" size="small" placeholder="Value" />
                        <el-icon class="kv-delete" @click="reqBody.formData.splice(i, 1)"><Close /></el-icon>
                      </div>
                      <el-button size="small" text type="primary"
                        @click="reqBody.formData.push({ key: '', value: '', enabled: true })">
                        + {{ t('apiDebug.addParam') }}
                      </el-button>
                    </div>
                    <div v-if="reqBody.type === 'none'" class="empty-hint" style="padding:20px">
                      {{ t('apiDebug.noBody') }}
                    </div>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="Auth" name="auth">
                  <div class="auth-editor">
                    <el-select v-model="reqAuth.type" size="small" style="width:180px;margin-bottom:12px">
                      <el-option label="No Auth" value="none" />
                      <el-option label="Bearer Token" value="bearer" />
                      <el-option label="Basic Auth" value="basic" />
                      <el-option label="API Key" value="apikey" />
                    </el-select>
                    <div v-if="reqAuth.type === 'bearer'" class="auth-fields">
                      <el-input v-model="reqAuth.token" size="small" placeholder="Token (支持 {{变量}})" />
                    </div>
                    <div v-if="reqAuth.type === 'basic'" class="auth-fields">
                      <el-input v-model="reqAuth.username" size="small" placeholder="Username" />
                      <el-input v-model="reqAuth.password" size="small" placeholder="Password" type="password" show-password />
                    </div>
                    <div v-if="reqAuth.type === 'apikey'" class="auth-fields">
                      <el-input v-model="reqAuth.key" size="small" placeholder="Header Name (e.g. X-Api-Key)" />
                      <el-input v-model="reqAuth.value" size="small" placeholder="Value" />
                      <el-radio-group v-model="reqAuth.position" size="small">
                        <el-radio value="header">Header</el-radio>
                        <el-radio value="query">Query Param</el-radio>
                      </el-radio-group>
                    </div>
                    <div v-if="reqAuth.type === 'none'" class="empty-hint" style="padding:12px">
                      No authentication
                    </div>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>

            <!-- Response Panel -->
            <div class="response-panel">
              <div v-if="!response && !sending" class="response-empty">
                <div class="response-empty-icon">🔗</div>
                <div>{{ t('apiDebug.clickSend') }}</div>
                <div class="response-empty-hint">Ctrl+Enter {{ t('apiDebug.send') }}</div>
              </div>

              <template v-if="response || responseError">
                <div class="response-status-bar">
                  <template v-if="response">
                    <span class="status-badge" :class="response.ok ? 'ok' : 'err'">
                      {{ response.status }} {{ response.statusText }}
                    </span>
                    <span class="status-meta">{{ response.time }}ms</span>
                    <span class="status-meta">{{ formatSize(response.size) }}</span>
                  </template>
                  <span v-if="responseError" class="status-badge err">{{ responseError }}</span>
                </div>

                <el-tabs v-model="resTab" class="compact-tabs response-tabs">
                  <el-tab-pane label="Body" name="body">
                    <div class="response-toolbar">
                      <el-radio-group v-model="resBodyMode" size="small">
                        <el-radio-button value="pretty">Pretty</el-radio-button>
                        <el-radio-button value="raw">Raw</el-radio-button>
                      </el-radio-group>
                      <el-button size="small" text @click="copyResponse">{{ t('apiDebug.copy') }}</el-button>
                    </div>
                    <pre class="response-body" :class="resBodyMode">{{ resBodyMode === 'pretty' ? prettyBody : response?.body }}</pre>
                  </el-tab-pane>
                  <el-tab-pane :label="`Headers (${Object.keys(response?.headers || {}).length})`" name="headers">
                    <div class="response-headers-table">
                      <div v-for="(val, key) in (response?.headers || {})" :key="key" class="res-header-row">
                        <span class="res-header-key">{{ key }}</span>
                        <span class="res-header-val">{{ val }}</span>
                      </div>
                    </div>
                  </el-tab-pane>
                </el-tabs>
              </template>

              <div v-if="sending" class="response-loading">
                <el-icon class="is-loading" :size="24"><Loading /></el-icon>
                <span>{{ t('apiDebug.sending') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="status-bar">
      <span>{{ collections.length }} {{ t('apiDebug.collections') }}</span>
      <span>{{ history.length }} {{ t('apiDebug.history') }}</span>
      <span v-if="currentEnvName">{{ t('apiDebug.env') }}: {{ currentEnvName }}</span>
      <span v-else>{{ t('apiDebug.noEnv') }}</span>
    </div>

    <!-- Save to Collection Dialog -->
    <el-dialog v-model="showSaveDialog" :title="t('apiDebug.saveToCollection')" width="420px" append-to-body>
      <el-form label-width="80px" size="small">
        <el-form-item :label="t('apiDebug.reqName')">
          <el-input v-model="saveName" :placeholder="`${reqMethod} ${reqUrl}`" />
        </el-form-item>
        <el-form-item :label="t('apiDebug.collection')">
          <el-select v-model="saveCollectionId" style="width:100%"
            :placeholder="t('apiDebug.selectCollection')">
            <el-option v-for="col in collections" :key="col.id" :label="col.name" :value="col.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showSaveDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button size="small" type="primary" @click="doSaveToCollection">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- Import cURL Dialog -->
    <el-dialog v-model="showCurlDialog" :title="t('apiDebug.importCurl')" width="540px" append-to-body>
      <el-input v-model="curlInput" type="textarea" :rows="8"
        placeholder="curl -X GET https://api.example.com/users -H 'Authorization: Bearer xxx'" />
      <template #footer>
        <el-button size="small" @click="showCurlDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button size="small" type="primary" @click="doImportCurl">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- Environment Manager Dialog -->
    <el-dialog v-model="showEnvDialog" :title="t('apiDebug.envManage')" width="640px" append-to-body>
      <div class="env-manager">
        <div class="env-list-bar">
          <el-select v-model="editEnvId" size="small" style="flex:1" :placeholder="t('apiDebug.selectEnv')">
            <el-option v-for="env in environments" :key="env.id" :label="env.name" :value="env.id" />
          </el-select>
          <el-button size="small" type="primary" @click="onCreateEnv">+</el-button>
          <el-button size="small" type="danger" :disabled="!editEnvId" @click="onDeleteEnv">{{ t('common.delete') }}</el-button>
        </div>
        <template v-if="editingEnv">
          <el-input v-model="editingEnv.name" size="small" style="margin: 12px 0"
            :placeholder="t('apiDebug.envName')" />
          <div class="kv-editor">
            <div class="kv-row kv-header-row">
              <span style="width:28px"></span>
              <span style="flex:1;font-weight:600;font-size:12px">Key</span>
              <span style="flex:1;font-weight:600;font-size:12px">Value</span>
              <span style="width:20px"></span>
            </div>
            <div v-for="(v, i) in editingEnv.variables" :key="i" class="kv-row">
              <el-checkbox v-model="v.enabled" size="small" />
              <el-input v-model="v.key" size="small" placeholder="key" />
              <el-input v-model="v.value" size="small" placeholder="value" />
              <el-icon class="kv-delete" @click="editingEnv.variables.splice(i, 1)"><Close /></el-icon>
            </div>
            <el-button size="small" text type="primary"
              @click="editingEnv.variables.push({ key: '', value: '', enabled: true })">
              + {{ t('apiDebug.addVariable') }}
            </el-button>
          </div>
        </template>
        <div v-else class="empty-hint" style="padding:30px">{{ t('apiDebug.selectOrCreateEnv') }}</div>
      </div>
      <template #footer>
        <el-button size="small" @click="showEnvDialog = false">{{ t('common.close') }}</el-button>
        <el-button size="small" type="primary" :disabled="!editingEnv" @click="doSaveEnv">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Briefcase, Setting, Close, MoreFilled, ArrowLeft, ArrowRight, ArrowDown, Loading } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { sendRequest, cancelRequest } from '@/utils/apiWorkbench/httpEngine'
import { formatSize, METHOD_COLORS, COMMON_HEADERS, tryFormatJson, isJson, buildUrl, buildAuthHeader, uuid } from '@/utils/apiWorkbench/shared'
import { resolveVariables, getActiveVariables, loadEnvironments, getCurrentEnvId, setCurrentEnvId, createEnvironment, deleteEnvironment, updateEnvironment } from '@/utils/apiWorkbench/environment'
import { loadCollections, createCollection, deleteCollection, renameCollection, saveRequestToCollection, deleteCollectionItem, loadHistory, saveToHistory, clearHistory as doClearHistory, deleteHistoryItem } from '@/utils/apiWorkbench/collections'
import { parseCurl, generateCode } from '@/utils/apiWorkbench/curlParser'

const router = useRouter()

// ==================== Sidebar ====================
const sidebarCollapsed = ref(false)
const sidebarTab = ref('collections')
const collections = ref([])
const history = ref([])
const activeItemId = ref(null)

// ==================== Request State ====================
const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
const reqMethod = ref('GET')
const reqUrl = ref('')
const reqTab = ref('params')
const reqParams = ref([{ key: '', value: '', enabled: true }])
const reqHeaders = ref([{ key: '', value: '', enabled: true }])
const reqBody = ref({ type: 'none', content: '', formData: [{ key: '', value: '', enabled: true }] })
const reqAuth = ref({ type: 'none', token: '', username: '', password: '', key: '', value: '', position: 'header' })

const activeParamsCount = computed(() => reqParams.value.filter(p => p.enabled && p.key).length)
const activeHeadersCount = computed(() => reqHeaders.value.filter(h => h.enabled && h.key).length)

// ==================== Response State ====================
const sending = ref(false)
const response = ref(null)
const responseError = ref(null)
const resTab = ref('body')
const resBodyMode = ref('pretty')

const prettyBody = computed(() => {
  if (!response.value?.body) return ''
  return isJson(response.value.body) ? tryFormatJson(response.value.body) : response.value.body
})

// ==================== Environments ====================
const environments = ref([])
const currentEnvId = ref(null)
const showEnvDialog = ref(false)
const editEnvId = ref(null)

const currentEnvName = computed(() => environments.value.find(e => e.id === currentEnvId.value)?.name || '')
const editingEnv = computed(() => environments.value.find(e => e.id === editEnvId.value) || null)

// ==================== Dialogs ====================
const showSaveDialog = ref(false)
const saveName = ref('')
const saveCollectionId = ref(null)
const showCurlDialog = ref(false)
const curlInput = ref('')

// ==================== Header Autocomplete ====================
const queryHeaders = (queryString, cb) => {
  const results = queryString
    ? COMMON_HEADERS.filter(h => h.toLowerCase().includes(queryString.toLowerCase())).map(h => ({ value: h }))
    : COMMON_HEADERS.map(h => ({ value: h }))
  cb(results)
}

// ==================== History Grouping ====================
const groupedHistory = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const groups = { today: [], yesterday: [], earlier: [] }
  history.value.forEach(item => {
    if (item.timestamp >= today) groups.today.push(item)
    else if (item.timestamp >= yesterday) groups.yesterday.push(item)
    else groups.earlier.push(item)
  })
  const result = []
  if (groups.today.length) result.push({ label: t('apiDebug.today'), items: groups.today })
  if (groups.yesterday.length) result.push({ label: t('apiDebug.yesterday'), items: groups.yesterday })
  if (groups.earlier.length) result.push({ label: t('apiDebug.earlier'), items: groups.earlier })
  return result
})

// ==================== Send Request ====================
async function doSend() {
  if (!reqUrl.value.trim() || sending.value) return
  const vars = getActiveVariables()
  let finalUrl = resolveVariables(reqUrl.value, vars)
  finalUrl = buildUrl(finalUrl, reqParams.value)

  const headerMap = {}
  reqHeaders.value.filter(h => h.enabled && h.key).forEach(h => {
    headerMap[resolveVariables(h.key, vars)] = resolveVariables(h.value, vars)
  })

  const authResolved = { ...reqAuth.value }
  if (authResolved.token) authResolved.token = resolveVariables(authResolved.token, vars)
  if (authResolved.value) authResolved.value = resolveVariables(authResolved.value, vars)
  const authHeader = buildAuthHeader(authResolved)
  if (authHeader) headerMap[authHeader.key] = authHeader.value

  if (reqAuth.value.type === 'apikey' && reqAuth.value.position === 'query' && reqAuth.value.key) {
    const resolvedKey = resolveVariables(reqAuth.value.key, vars)
    const resolvedVal = resolveVariables(reqAuth.value.value, vars)
    finalUrl += (finalUrl.includes('?') ? '&' : '?') +
      `${encodeURIComponent(resolvedKey)}=${encodeURIComponent(resolvedVal)}`
  }

  let bodyPayload = null
  if (reqBody.value.type === 'json' && reqBody.value.content) {
    const jsonContent = resolveVariables(reqBody.value.content, vars)
    try { JSON.parse(jsonContent) } catch {
      ElMessage.warning('JSON Body 格式错误，请检查')
      return
    }
    headerMap['Content-Type'] = headerMap['Content-Type'] || 'application/json'
    bodyPayload = jsonContent
  } else if (reqBody.value.type === 'raw' && reqBody.value.content) {
    bodyPayload = resolveVariables(reqBody.value.content, vars)
  } else if (reqBody.value.type === 'form') {
    const formPairs = reqBody.value.formData.filter(f => f.enabled && f.key)
      .map(f => `${encodeURIComponent(resolveVariables(f.key, vars))}=${encodeURIComponent(resolveVariables(f.value, vars))}`)
    if (formPairs.length) {
      headerMap['Content-Type'] = headerMap['Content-Type'] || 'application/x-www-form-urlencoded'
      bodyPayload = formPairs.join('&')
    }
  }

  sending.value = true
  response.value = null
  responseError.value = null
  resTab.value = 'body'

  try {
    const res = await sendRequest({ method: reqMethod.value, url: finalUrl, headers: headerMap, body: bodyPayload })
    response.value = res
    saveToHistory({
      method: reqMethod.value, url: reqUrl.value, status: res.status, time: res.time,
      params: reqParams.value, headers: reqHeaders.value,
      body: { ...reqBody.value }, auth: { ...reqAuth.value },
    })
    history.value = loadHistory()
  } catch (err) {
    if (err.name === 'AbortError' || err.message === 'REQUEST_TIMEOUT') {
      responseError.value = t('apiDebug.timeoutError')
    } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      responseError.value = t('apiDebug.networkError') || '网络错误，请检查 URL 或 CORS 配置'
    } else {
      responseError.value = err.message
    }
  } finally {
    sending.value = false
  }
}

function doCancel() {
  cancelRequest()
  sending.value = false
}

// ==================== Cleanup ====================
onBeforeUnmount(() => {
  cancelRequest()
})

// ==================== Collection Actions ====================
function onCreateCollection() {
  ElMessageBox.prompt(t('apiDebug.collectionName'), t('apiDebug.newCollection'), {
    confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'),
  }).then(({ value }) => {
    if (value?.trim()) {
      createCollection(value.trim())
      collections.value = loadCollections()
      ElMessage.success(t('apiDebug.saved'))
    }
  }).catch(() => {})
}

function onCollectionCmd(cmd, col) {
  if (cmd === 'rename') {
    ElMessageBox.prompt(t('apiDebug.collectionName'), t('common.edit'), {
      confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'), inputValue: col.name,
    }).then(({ value }) => {
      if (value?.trim()) { renameCollection(col.id, value.trim()); collections.value = loadCollections() }
    }).catch(() => {})
  } else if (cmd === 'delete') {
    ElMessageBox.confirm(t('apiDebug.confirmDeleteCollection'), t('common.confirmDelete'), { type: 'warning' })
      .then(() => { deleteCollection(col.id); collections.value = loadCollections() }).catch(() => {})
  }
}

function onDeleteCollectionItem(colId, itemId) {
  deleteCollectionItem(colId, itemId)
  collections.value = loadCollections()
}

function loadCollectionItem(col, item) {
  activeItemId.value = item.id
  reqMethod.value = item.method
  reqUrl.value = item.url
  reqParams.value = item.params?.length ? JSON.parse(JSON.stringify(item.params)) : [{ key: '', value: '', enabled: true }]
  reqHeaders.value = item.headers?.length ? JSON.parse(JSON.stringify(item.headers)) : [{ key: '', value: '', enabled: true }]
  reqBody.value = item.body ? JSON.parse(JSON.stringify(item.body)) : { type: 'none', content: '', formData: [] }
  if (!reqBody.value.formData) reqBody.value.formData = [{ key: '', value: '', enabled: true }]
  reqAuth.value = item.auth ? JSON.parse(JSON.stringify(item.auth)) : { type: 'none' }
  response.value = null
  responseError.value = null
}

// ==================== Save to Collection ====================
function doSaveToCollection() {
  if (!saveCollectionId.value) { ElMessage.warning(t('apiDebug.selectCollection')); return }
  saveRequestToCollection(saveCollectionId.value, {
    name: saveName.value || `${reqMethod.value} ${reqUrl.value}`,
    method: reqMethod.value, url: reqUrl.value,
    params: reqParams.value, headers: reqHeaders.value, body: reqBody.value, auth: reqAuth.value,
  })
  collections.value = loadCollections()
  showSaveDialog.value = false
  ElMessage.success(t('apiDebug.saved'))
}

// ==================== History ====================
function loadHistoryItem(item) {
  reqMethod.value = item.method
  reqUrl.value = item.url
  reqParams.value = item.params?.length ? JSON.parse(JSON.stringify(item.params)) : [{ key: '', value: '', enabled: true }]
  reqHeaders.value = item.headers?.length ? JSON.parse(JSON.stringify(item.headers)) : [{ key: '', value: '', enabled: true }]
  reqBody.value = item.body ? JSON.parse(JSON.stringify(item.body)) : { type: 'none', content: '', formData: [] }
  if (!reqBody.value.formData) reqBody.value.formData = [{ key: '', value: '', enabled: true }]
  reqAuth.value = item.auth ? JSON.parse(JSON.stringify(item.auth)) : { type: 'none' }
  activeItemId.value = null
  response.value = null
  responseError.value = null
}

function onClearHistory() {
  ElMessageBox.confirm(t('apiDebug.confirmClearHistory'), t('common.confirmDelete'), { type: 'warning' })
    .then(() => { doClearHistory(); history.value = [] }).catch(() => {})
}

function onDeleteHistoryItem(id) {
  deleteHistoryItem(id)
  history.value = loadHistory()
}

// ==================== URL Menu ====================
function onUrlMenuCmd(cmd) {
  if (cmd === 'save') {
    saveName.value = ''
    saveCollectionId.value = collections.value[0]?.id || null
    showSaveDialog.value = true
  } else if (cmd === 'curl') {
    const curl = generateCode({ method: reqMethod.value, url: reqUrl.value, headers: reqHeaders.value, body: reqBody.value }, 'curl')
    navigator.clipboard.writeText(curl)
    ElMessage.success(t('apiDebug.copied'))
  } else if (cmd === 'importCurl') {
    curlInput.value = ''
    showCurlDialog.value = true
  }
}

function doImportCurl() {
  const parsed = parseCurl(curlInput.value)
  if (!parsed || !parsed.url) { ElMessage.error(t('apiDebug.curlParseError')); return }
  reqMethod.value = parsed.method
  reqUrl.value = parsed.url
  reqHeaders.value = parsed.headers.length ? parsed.headers : [{ key: '', value: '', enabled: true }]
  reqBody.value = { type: parsed.body.type, content: parsed.body.content, formData: [{ key: '', value: '', enabled: true }] }
  reqAuth.value = parsed.auth
  showCurlDialog.value = false
  ElMessage.success(t('apiDebug.importSuccess'))
}

// ==================== Body Helpers ====================
function formatBodyJson() {
  if (reqBody.value.content) reqBody.value.content = tryFormatJson(reqBody.value.content)
}

function copyResponse() {
  if (response.value?.body) {
    navigator.clipboard.writeText(resBodyMode.value === 'pretty' ? prettyBody.value : response.value.body)
    ElMessage.success(t('apiDebug.copied'))
  }
}

// ==================== Environment ====================
function onEnvChange(val) { setCurrentEnvId(val) }

function onCreateEnv() {
  ElMessageBox.prompt(t('apiDebug.envName'), t('apiDebug.newEnv'), {
    confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'),
  }).then(({ value }) => {
    if (value?.trim()) {
      const env = createEnvironment(value.trim())
      environments.value = loadEnvironments()
      editEnvId.value = env.id
    }
  }).catch(() => {})
}

function onDeleteEnv() {
  if (!editEnvId.value) return
  ElMessageBox.confirm(t('apiDebug.confirmDeleteEnv'), t('common.confirmDelete'), { type: 'warning' })
    .then(() => {
      deleteEnvironment(editEnvId.value)
      environments.value = loadEnvironments()
      editEnvId.value = environments.value[0]?.id || null
      if (currentEnvId.value && !environments.value.find(e => e.id === currentEnvId.value)) {
        currentEnvId.value = null
        setCurrentEnvId(null)
      }
    }).catch(() => {})
}

function doSaveEnv() {
  if (!editingEnv.value) return
  if (!editingEnv.value.name?.trim()) { ElMessage.warning(t('apiDebug.envName')); return }
  updateEnvironment(editingEnv.value.id, { name: editingEnv.value.name.trim(), variables: editingEnv.value.variables })
  environments.value = loadEnvironments()
  ElMessage.success(t('apiDebug.envSaved'))
}

// ==================== Helpers ====================
function shortenUrl(url) {
  try { const u = new URL(url); return u.pathname + u.search }
  catch { return url?.length > 40 ? url.slice(0, 40) + '...' : url }
}

// ==================== Init ====================
onMounted(() => {
  collections.value = loadCollections()
  history.value = loadHistory()
  environments.value = loadEnvironments()
  currentEnvId.value = getCurrentEnvId()
})
</script>

<style scoped>
.api-debug-wrapper {
  display: flex; flex-direction: column; height: 100%; width: 100%; overflow: hidden;
  background-color: var(--bg-secondary);
}
.header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 var(--space-lg); background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color); height: 46px; box-sizing: border-box; flex-shrink: 0;
}
.header-left { display: flex; align-items: center; gap: var(--space-xl); }
.breadcrumb {
  display: flex; align-items: center; gap: var(--space-sm);
  font-size: var(--font-size-body); font-weight: var(--font-weight-semibold);
  color: var(--text-primary); white-space: nowrap;
}
.breadcrumb .el-icon { font-size: 16px; color: var(--text-secondary); }
.breadcrumb-link { cursor: pointer; color: var(--text-secondary); }
.breadcrumb-link:hover { color: var(--accent-blue); }
.breadcrumb-sep { color: var(--text-quaternary); }
.header-actions { display: flex; align-items: center; gap: 8px; }

.content-area { flex: 1; overflow: hidden; }
.debug-layout { display: flex; height: 100%; }

/* Left Sidebar */
.left-sidebar {
  width: 240px; min-width: 240px; border-right: 1px solid var(--border-color);
  background: var(--bg-primary); display: flex; flex-direction: column; position: relative;
  transition: width 0.2s, min-width 0.2s;
}
.left-sidebar.collapsed { width: 0; min-width: 0; overflow: hidden; }
.sidebar-content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.sidebar-toggle {
  position: absolute; right: -12px; top: 50%; transform: translateY(-50%);
  width: 24px; height: 48px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; background: var(--bg-primary); border: 1px solid var(--border-color);
  border-left: none; border-radius: 0 6px 6px 0; z-index: 10; color: var(--text-tertiary); font-size: 12px;
}
.sidebar-toggle:hover { color: var(--accent-blue); }
.sidebar-tabs { display: flex; border-bottom: 1px solid var(--border-color); }
.sidebar-tab {
  flex: 1; text-align: center; padding: 8px 0; font-size: 12px; color: var(--text-secondary);
  cursor: pointer; user-select: none; border-bottom: 2px solid transparent; transition: all 0.15s;
}
.sidebar-tab:hover { color: var(--text-primary); }
.sidebar-tab.active { color: var(--accent-blue); border-bottom-color: var(--accent-blue); font-weight: 600; }
.sidebar-list { flex: 1; overflow-y: auto; padding: 4px 0; }
.sidebar-toolbar { padding: 6px 12px; display: flex; justify-content: flex-end; }

.collection-group { margin-bottom: 4px; }
.collection-header {
  display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; cursor: pointer;
}
.collection-header:hover { background: var(--bg-tertiary); }
.collection-name { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.collection-more { font-size: 14px; color: var(--text-tertiary); cursor: pointer; }
.collection-more:hover { color: var(--text-primary); }
.collection-item {
  display: flex; align-items: center; gap: 6px; padding: 5px 12px 5px 24px; cursor: pointer; font-size: 12px;
}
.collection-item:hover { background: var(--bg-tertiary); }
.collection-item.active { background: var(--accent-blue); color: #fff; }
.collection-item.active .method-tag { color: #fff !important; }
.collection-item.active .item-delete { color: rgba(255,255,255,0.7); }

.method-tag { font-size: 10px; font-weight: 700; flex-shrink: 0; width: 40px; }
.item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); }
.item-delete { font-size: 12px; color: var(--text-quaternary); flex-shrink: 0; display: none; }
.collection-item:hover .item-delete, .history-item:hover .item-delete { display: block; }
.item-delete:hover { color: var(--el-color-danger); }

.history-group-label { padding: 6px 12px 2px; font-size: 11px; color: var(--text-tertiary); font-weight: 600; }
.history-item { display: flex; align-items: center; gap: 6px; padding: 5px 12px; cursor: pointer; font-size: 12px; }
.history-item:hover { background: var(--bg-tertiary); }
.history-item .item-delete { display: none; }
.history-status { font-size: 10px; font-weight: 600; flex-shrink: 0; }
.history-status.ok { color: #67C23A; }
.history-status.err { color: #F56C6C; }

.empty-hint { text-align: center; color: var(--text-quaternary); font-size: 12px; padding: 24px; }

/* Main Panel */
.main-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
.url-bar {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px;
  background: var(--bg-primary); border-bottom: 1px solid var(--border-color); flex-shrink: 0;
}
.method-select { width: 110px; flex-shrink: 0; }
.method-select :deep(.el-input__inner) { font-weight: 700; }
.url-input { flex: 1; }
.url-input :deep(.el-input__inner) { font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; }

.split-panels { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.request-panel {
  flex: 0 0 auto; max-height: 45%; overflow-y: auto;
  border-bottom: 2px solid var(--border-color); background: var(--bg-primary);
}
.response-panel { flex: 1; overflow-y: auto; background: var(--bg-primary); display: flex; flex-direction: column; }

.compact-tabs :deep(.el-tabs__header) { margin: 0; padding: 0 16px; }
.compact-tabs :deep(.el-tabs__item) { height: 34px; line-height: 34px; font-size: 12px; padding: 0 12px; }
.compact-tabs :deep(.el-tabs__content) { padding: 0; }
.compact-tabs :deep(.el-tab-pane) { padding: 0 16px 8px; }

.kv-editor { padding: 4px 0; }
.kv-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.kv-header-row { margin-bottom: 6px; }
.kv-delete { flex-shrink: 0; font-size: 14px; color: var(--text-quaternary); cursor: pointer; }
.kv-delete:hover { color: var(--el-color-danger); }

.body-type-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.body-textarea {
  width: 100%; min-height: 120px; max-height: 200px; padding: 8px;
  border: 1px solid var(--border-color); border-radius: 4px;
  background: var(--bg-secondary); color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;
  resize: vertical; outline: none; box-sizing: border-box;
}
.body-textarea:focus { border-color: var(--accent-blue); }
.auth-editor { padding: 4px 0; }
.auth-fields { display: flex; flex-direction: column; gap: 8px; }

.response-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: var(--text-quaternary); gap: 8px;
}
.response-empty-icon { font-size: 48px; }
.response-empty-hint { font-size: 11px; }
.response-loading { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-tertiary); }
.response-status-bar {
  display: flex; align-items: center; gap: 12px; padding: 8px 16px;
  border-bottom: 1px solid var(--border-color); flex-shrink: 0;
}
.status-badge { font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
.status-badge.ok { color: #67C23A; background: rgba(103,194,58,0.1); }
.status-badge.err { color: #F56C6C; background: rgba(245,108,108,0.1); }
.status-meta { font-size: 11px; color: var(--text-tertiary); }

.response-tabs { flex: 1; display: flex; flex-direction: column; }
.response-tabs :deep(.el-tabs__content) { flex: 1; overflow: auto; }
.response-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.response-body {
  margin: 0; padding: 0; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;
  line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; word-break: break-all;
  flex: 1; overflow-y: auto;
}
.response-headers-table { padding: 4px 0; }
.res-header-row { display: flex; gap: 12px; padding: 4px 0; font-size: 12px; border-bottom: 1px solid var(--border-color); }
.res-header-key { width: 200px; flex-shrink: 0; font-weight: 600; color: var(--text-primary); }
.res-header-val { flex: 1; color: var(--text-secondary); word-break: break-all; }

.env-manager { }
.env-list-bar { display: flex; gap: 8px; }

.status-bar {
  height: 28px; display: flex; align-items: center; gap: 16px; padding: 0 16px;
  background-color: var(--bg-primary); border-top: 1px solid var(--border-color);
  font-size: 11px; color: var(--text-tertiary); flex-shrink: 0;
}

.sidebar-list::-webkit-scrollbar, .response-body::-webkit-scrollbar,
.request-panel::-webkit-scrollbar, .response-panel::-webkit-scrollbar { width: 5px; }
.sidebar-list::-webkit-scrollbar-thumb, .response-body::-webkit-scrollbar-thumb,
.request-panel::-webkit-scrollbar-thumb, .response-panel::-webkit-scrollbar-thumb {
  background: var(--text-quaternary); border-radius: 3px;
}
</style>
