<template>
  <div class="api-debug-wrapper">
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Briefcase /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('apiDebug.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-select v-model="currentEnvId" size="small" style="width: 140px" :placeholder="t('apiDebug.noEnv')" clearable @change="onEnvChange">
          <el-option v-for="env in environments" :key="env.id" :label="env.name" :value="env.id" />
        </el-select>
        <el-button size="small" @click="showEnvDialog = true">
          <el-icon><Setting /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="content-area">
      <div class="debug-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
        <div class="sidebar-area" :class="{ collapsed: sidebarCollapsed }">
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

              <div v-if="sidebarTab === 'collections'" class="sidebar-list">
                <!-- 顶部新建栏（对齐 ApiDocs 风格） -->
                <div class="list-toolbar">
                  <el-button size="small" type="primary" class="toolbar-btn" @click="onCreateCollection">
                    <el-icon><CollectionTag /></el-icon>
                    <span>{{ t('apiDebug.newCollection') }}</span>
                  </el-button>
                </div>
                <el-tree
                  v-if="collectionTree.length"
                  ref="collectionTreeRef"
                  :data="collectionTree"
                  node-key="id"
                  :props="treeProps"
                  :default-expanded-keys="expandedKeys"
                  :expand-on-click-node="false"
                  :highlight-current="true"
                  @node-click="handleCollectionNodeClick"
                  @node-expand="onTreeExpand"
                  @node-collapse="onTreeCollapse"
                >
                  <template #default="{ node, data }">
                    <div class="tree-row" :class="{ active: activeTreeNodeId === data.id, 'is-folder': data.type === 'folder' || data.type === 'collection' }">
                      <div class="tree-row-main">
                        <!-- 自绘展开/折叠 chevron：folder/collection 显示，api 同尺寸占位保持对齐 -->
                        <el-icon v-if="data.type === 'folder' || data.type === 'collection'" class="row-chevron" :class="{ expanded: node.expanded }">
                          <CaretRight />
                        </el-icon>
                        <span v-else class="row-chevron-spacer"></span>
                        <el-icon v-if="data.type === 'collection'" class="row-icon collection-icon"><CollectionTag /></el-icon>
                        <el-icon v-else-if="data.type === 'folder'" class="row-icon folder-icon">
                          <FolderOpened v-if="node.expanded" />
                          <Folder v-else />
                        </el-icon>
                        <span v-else class="method-tag" :style="{ color: METHOD_COLORS[data.method] }">{{ data.method }}</span>
                        <span class="item-name" :title="nodeTitle(data)">{{ nodeTitle(data) }}</span>
                        <span v-if="(data.type === 'folder' || data.type === 'collection') && data.children?.length" class="folder-count">{{ data.children.length }}</span>
                      </div>
                      <el-dropdown trigger="click" size="small" @command="cmd => onTreeNodeCmd(cmd, data)">
                        <el-icon class="row-more" @click.stop><MoreFilled /></el-icon>
                        <template #dropdown>
                          <el-dropdown-menu>
                            <el-dropdown-item v-if="data.type !== 'api'" command="newFolder">
                              <el-icon><FolderAdd /></el-icon>{{ t('apiDebug.newFolder') }}
                            </el-dropdown-item>
                            <el-dropdown-item v-if="data.type !== 'api'" command="newInterface">
                              <el-icon><DocumentAdd /></el-icon>{{ t('apiDebug.newInterface') }}
                            </el-dropdown-item>
                            <el-dropdown-item command="rename" :divided="data.type !== 'api'">
                              <el-icon><Edit /></el-icon>{{ t('common.edit') }}
                            </el-dropdown-item>
                            <el-dropdown-item command="delete" divided>
                              <el-icon><Delete /></el-icon>{{ t('common.delete') }}
                            </el-dropdown-item>
                          </el-dropdown-menu>
                        </template>
                      </el-dropdown>
                    </div>
                  </template>
                </el-tree>
                <div v-else class="empty-hint">{{ t('apiDebug.noCollections') }}</div>
              </div>

              <div v-if="sidebarTab === 'history'" class="sidebar-list">
                <div class="sidebar-toolbar">
                  <el-button size="small" text type="danger" @click="onClearHistory" :title="t('apiDebug.clearHistory')">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <div v-for="group in groupedHistory" :key="group.label" class="history-group">
                  <div class="history-group-label">{{ group.label }}</div>
                  <div v-for="item in group.items" :key="item.id" class="history-item" @click="loadHistoryItem(item)">
                    <span class="method-tag" :style="{ color: METHOD_COLORS[item.method] }">{{ item.method }}</span>
                    <span class="item-name" :title="item.url">{{ shortenUrl(item.url) }}</span>
                    <span class="history-status" :class="item.status < 400 ? 'ok' : 'err'">{{ item.status || '' }}</span>
                    <el-icon class="item-delete" @click.stop="onDeleteHistoryItem(item.id)"><Close /></el-icon>
                  </div>
                </div>
                <div v-if="!history.length" class="empty-hint">{{ t('apiDebug.noHistory') }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 折叠/展开按钮：浮动在 debug-layout 内，按钮中心始终落在 panel 右边缘 -->
        <div class="sidebar-toggle" :class="{ collapsed: sidebarCollapsed }"
          @click="sidebarCollapsed = !sidebarCollapsed"
          :title="sidebarCollapsed ? t('common.showSidebar') : t('common.hideSidebar')">
          <el-icon>
            <ArrowLeft v-if="!sidebarCollapsed" />
            <ArrowRight v-else />
          </el-icon>
        </div>

        <div class="main-panel">
          <div class="url-bar">
            <el-select v-model="reqMethod" class="method-select" size="default">
              <el-option v-for="m in methods" :key="m" :label="m" :value="m">
                <span :style="{ color: METHOD_COLORS[m], fontWeight: 600 }">{{ m }}</span>
              </el-option>
            </el-select>
            <el-input v-model="reqUrl" class="url-input" :placeholder="'https://api.example.com/users'" @keydown.ctrl.enter="doSend" clearable />
            <div class="url-actions">
              <el-button type="primary" :loading="sending" @click="doSend" :disabled="!reqUrl.trim()">
                <el-icon style="margin-right: 6px;"><Promotion /></el-icon>{{ sending ? t('apiDebug.sending') : t('apiDebug.send') }}
              </el-button>
              <el-button v-if="sending" @click="doCancel" type="danger" plain>
                <el-icon style="margin-right: 6px;"><Close /></el-icon>{{ t('apiDebug.cancel') }}
              </el-button>
              <el-dropdown trigger="click" @command="onUrlMenuCmd">
                <el-button class="url-more-btn"><el-icon><ArrowDown /></el-icon></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="save">{{ t('apiDebug.saveToCollection') }}</el-dropdown-item>
                    <el-dropdown-item command="curl">{{ t('apiDebug.copyCurl') }}</el-dropdown-item>
                    <el-dropdown-item command="importCurl">{{ t('apiDebug.importCurl') }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <div class="split-panels">
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
                    <el-button size="small" text type="primary" @click="reqParams.push({ key: '', value: '', enabled: true })">+ {{ t('apiDebug.addParam') }}</el-button>
                  </div>
                </el-tab-pane>

                <el-tab-pane :label="`Headers${activeHeadersCount ? ' (' + activeHeadersCount + ')' : ''}`" name="headers">
                  <div class="kv-editor">
                    <div v-for="(h, i) in reqHeaders" :key="i" class="kv-row">
                      <el-checkbox v-model="h.enabled" size="small" />
                      <el-autocomplete v-model="h.key" size="small" placeholder="Key" :fetch-suggestions="queryHeaders" />
                      <el-input v-model="h.value" size="small" placeholder="Value" />
                      <el-icon class="kv-delete" @click="reqHeaders.splice(i, 1)"><Close /></el-icon>
                    </div>
                    <el-button size="small" text type="primary" @click="reqHeaders.push({ key: '', value: '', enabled: true })">+ {{ t('apiDebug.addHeader') }}</el-button>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="Body" name="body">
                  <div class="body-editor">
                    <div class="body-type-bar">
                      <el-radio-group v-model="reqBody.type" size="small">
                        <el-radio-button value="none">none</el-radio-button>
                        <el-radio-button value="json">JSON</el-radio-button>
                        <el-radio-button value="form">x-www-form</el-radio-button>
                        <el-radio-button value="multipart">multipart</el-radio-button>
                        <el-radio-button value="raw">raw</el-radio-button>
                      </el-radio-group>
                      <el-button v-if="reqBody.type === 'json'" size="small" text @click="formatBodyJson">
                        <el-icon style="margin-right: 4px;"><Brush /></el-icon>{{ t('apiDebug.formatJson') }}
                      </el-button>
                    </div>
                    <textarea v-if="reqBody.type === 'json' || reqBody.type === 'raw'" v-model="reqBody.content" class="body-textarea" :placeholder="reqBody.type === 'json' ? '{ }' : 'raw text...'" spellcheck="false" />
                    <div v-if="reqBody.type === 'form' || reqBody.type === 'multipart'" class="kv-editor">
                      <div v-for="(f, i) in reqBody.formData" :key="i" class="kv-row">
                        <el-checkbox v-model="f.enabled" size="small" />
                        <el-input v-model="f.key" size="small" placeholder="Key" />
                        <el-input v-model="f.value" size="small" :placeholder="reqBody.type === 'multipart' ? 'Value / file path' : 'Value'" />
                        <el-icon class="kv-delete" @click="reqBody.formData.splice(i, 1)"><Close /></el-icon>
                      </div>
                      <el-button size="small" text type="primary" @click="reqBody.formData.push({ key: '', value: '', enabled: true })">+ {{ t('apiDebug.addParam') }}</el-button>
                    </div>
                    <div v-if="reqBody.type === 'none'" class="empty-hint" style="padding:20px">{{ t('apiDebug.noBody') }}</div>
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
                      <el-input v-model="reqAuth.token" size="small" :placeholder="t('apiDebug.tokenPlaceholder')" />
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
                    <div v-if="reqAuth.type === 'none'" class="empty-hint" style="padding:12px">No authentication</div>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>

            <div class="response-panel">
              <div v-if="!response && !sending" class="response-empty">
                <div class="response-empty-icon">🔗</div>
                <div>{{ t('apiDebug.clickSend') }}</div>
                <div class="response-empty-hint">Ctrl+Enter {{ t('apiDebug.send') }}</div>
              </div>

              <template v-if="response || responseError">
                <div class="response-status-bar">
                  <template v-if="response">
                    <span class="status-badge" :class="response.ok ? 'ok' : 'err'">{{ response.status }} {{ response.statusText }}</span>
                    <span class="status-meta">{{ response.time }}ms</span>
                    <span class="status-meta">{{ formatSize(response.size) }}</span>
                  </template>
                  <span v-if="responseError" class="status-badge err">{{ responseError }}</span>
                </div>

                <el-tabs v-if="response" v-model="resTab" class="compact-tabs response-tabs">
                  <el-tab-pane label="Body" name="body">
                    <div class="response-toolbar">
                      <el-radio-group v-model="resBodyMode" size="small">
                        <el-radio-button value="pretty">Pretty</el-radio-button>
                        <el-radio-button value="raw">Raw</el-radio-button>
                      </el-radio-group>
                      <el-button size="small" text @click="copyResponse" :title="t('common.copy')">
                        <el-icon><CopyDocument /></el-icon>
                      </el-button>
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

    <div class="status-bar">
      <span>{{ collections.length }} {{ t('apiDebug.collections') }}</span>
      <span>{{ history.length }} {{ t('apiDebug.history') }}</span>
      <span v-if="currentEnvName">{{ t('apiDebug.env') }}: {{ currentEnvName }}</span>
      <span v-else>{{ t('apiDebug.noEnv') }}</span>
    </div>

    <el-dialog v-model="showSaveDialog" :title="t('apiDebug.saveToCollection')" width="420px" append-to-body>
      <el-form label-width="80px" size="small">
        <el-form-item :label="t('apiDebug.reqName')">
          <el-input v-model="saveName" :placeholder="`${reqMethod} ${reqUrl}`" />
        </el-form-item>
        <el-form-item :label="t('apiDebug.collection')">
          <el-select v-model="saveCollectionId" style="width:100%" :placeholder="t('apiDebug.selectCollection')">
            <el-option v-for="col in collections" :key="col.id" :label="col.name" :value="col.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('apiDebug.selectSaveTarget')">
          <el-select v-model="saveParentNodeId" style="width:100%" clearable :placeholder="t('apiDebug.collectionRoot')">
            <el-option :label="t('apiDebug.collectionRoot')" :value="null" />
            <el-option v-for="folder in saveTargetFolders" :key="folder.id" :label="folder.label" :value="folder.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showSaveDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button size="small" type="primary" @click="doSaveToCollection">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showCurlDialog" :title="t('apiDebug.importCurl')" width="540px" append-to-body>
      <el-input v-model="curlInput" type="textarea" :rows="8" placeholder="curl -X GET https://api.example.com/users -H 'Authorization: Bearer xxx'" />
      <template #footer>
        <el-button size="small" @click="showCurlDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button size="small" type="primary" @click="doImportCurl">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEnvDialog" :title="t('apiDebug.envManage')" width="640px" append-to-body>
      <div class="env-manager">
        <div class="env-list-bar">
          <el-select v-model="editEnvId" size="small" style="flex:1" :placeholder="t('apiDebug.selectEnv')">
            <el-option v-for="env in environments" :key="env.id" :label="env.name" :value="env.id" />
          </el-select>
          <el-button size="small" type="primary" text @click="onCreateEnv" :title="t('common.add')">
            <el-icon><Plus /></el-icon>
          </el-button>
          <el-button size="small" type="danger" text :disabled="!editEnvId" @click="onDeleteEnv" :title="t('common.delete')">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
        <template v-if="editingEnv">
          <el-input v-model="editingEnv.name" size="small" style="margin: 12px 0" :placeholder="t('apiDebug.envName')" />
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
            <el-button size="small" text type="primary" @click="editingEnv.variables.push({ key: '', value: '', enabled: true })">+ {{ t('apiDebug.addVariable') }}</el-button>
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Briefcase, Setting, Close, MoreFilled, ArrowLeft, ArrowRight, ArrowDown, Loading, CollectionTag, Folder, FolderOpened, FolderAdd, DocumentAdd, Edit, Delete, Document, CaretRight, CopyDocument, Plus, Promotion, Brush } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { sendRequest, cancelRequest } from '@/utils/apiWorkbench/httpEngine'
import { formatSize, METHOD_COLORS, COMMON_HEADERS, tryFormatJson, isJson, buildUrl, buildAuthHeader } from '@/utils/apiWorkbench/shared'
import { resolveVariables, getActiveVariables, loadEnvironments, getCurrentEnvId, setCurrentEnvId, createEnvironment, deleteEnvironment, updateEnvironment } from '@/utils/apiWorkbench/environment'
import {
  loadCollections,
  createCollection,
  deleteCollection,
  renameCollection,
  saveRequestToCollection,
  createFolder,
  deleteCollectionItem,
  renameCollectionNode,
  loadHistory,
  saveToHistory,
  clearHistory as doClearHistory,
  deleteHistoryItem,
  buildCollectionTree,
  getCollectionNodeById,
} from '@/utils/apiWorkbench/collections'
import { parseCurl, generateCode } from '@/utils/apiWorkbench/curlParser'

const router = useRouter()
const collectionTreeRef = ref(null)
const treeProps = { children: 'children', label: 'name' }

const sidebarCollapsed = ref(false)
const sidebarTab = ref('collections')
const collections = ref([])
const history = ref([])
const activeItemId = ref(null)
const activeTreeNodeId = ref(null)
const selectedCollectionId = ref(null)
const selectedFolderId = ref(null)
const expandedKeys = ref([])

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

const sending = ref(false)
const response = ref(null)
const responseError = ref(null)
const requestCanceled = ref(false)
const resTab = ref('body')
const resBodyMode = ref('pretty')

const prettyBody = computed(() => {
  if (!response.value?.body) return ''
  return isJson(response.value.body) ? tryFormatJson(response.value.body) : response.value.body
})

const environments = ref([])
const currentEnvId = ref(null)
const showEnvDialog = ref(false)
const editEnvId = ref(null)

const currentEnvName = computed(() => environments.value.find(e => e.id === currentEnvId.value)?.name || '')
const editingEnv = computed(() => environments.value.find(e => e.id === editEnvId.value) || null)
const collectionTree = computed(() => buildCollectionTree(collections.value))
const saveTargetFolders = computed(() => {
  const collectionId = saveCollectionId.value
  if (!collectionId) return []
  const tree = buildCollectionTree(collections.value).find(item => item.rawId === collectionId)
  if (!tree) return []
  return flattenFolderOptions(tree.children)
})

const showSaveDialog = ref(false)
const saveName = ref('')
const saveCollectionId = ref(null)
const saveParentNodeId = ref(null)
const showCurlDialog = ref(false)
const curlInput = ref('')

const queryHeaders = (queryString, cb) => {
  const results = queryString
    ? COMMON_HEADERS.filter(h => h.toLowerCase().includes(queryString.toLowerCase())).map(h => ({ value: h }))
    : COMMON_HEADERS.map(h => ({ value: h }))
  cb(results)
}

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

async function doSend() {
  if (!reqUrl.value.trim() || sending.value) return
  const vars = getActiveVariables()
  let finalUrl = resolveVariables(reqUrl.value, vars)
  finalUrl = normalizeRequestUrl(finalUrl)
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
    finalUrl += (finalUrl.includes('?') ? '&' : '?') + `${encodeURIComponent(resolvedKey)}=${encodeURIComponent(resolvedVal)}`
  }

  let bodyPayload = null
  if (reqBody.value.type === 'json' && reqBody.value.content) {
    const jsonContent = resolveVariables(reqBody.value.content, vars)
    try { JSON.parse(jsonContent) } catch {
      ElMessage.warning('JSON Body format is invalid')
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
  } else if (reqBody.value.type === 'multipart') {
    bodyPayload = reqBody.value.formData
      .filter(f => f.enabled && f.key)
      .map(f => ({
        key: resolveVariables(f.key, vars),
        value: resolveVariables(f.value, vars),
      }))
  }

  sending.value = true
  response.value = null
  responseError.value = null
  requestCanceled.value = false
  resTab.value = 'body'

  try {
    const res = await sendRequest({ method: reqMethod.value, url: finalUrl, headers: headerMap, body: bodyPayload })
    response.value = res
    saveToHistory({
      method: reqMethod.value,
      url: reqUrl.value,
      status: res.status,
      time: res.time,
      params: reqParams.value,
      headers: reqHeaders.value,
      body: { ...reqBody.value },
      auth: { ...reqAuth.value },
    })
    history.value = loadHistory()
  } catch (err) {
    if (err.message === 'REQUEST_CANCELED') {
      responseError.value = t('apiDebug.cancel')
    } else if (err.name === 'AbortError') {
      if (requestCanceled.value) {
        responseError.value = t('apiDebug.cancel')
      } else {
        responseError.value = t('apiDebug.timeoutError')
      }
    } else if (err.message === 'REQUEST_TIMEOUT') {
      responseError.value = t('apiDebug.timeoutError')
    } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('network')) {
      responseError.value = t('apiDebug.networkError')
    } else {
      responseError.value = err.message
    }
  } finally {
    sending.value = false
    requestCanceled.value = false
  }
}

function doCancel() {
  requestCanceled.value = true
  cancelRequest()
}

onBeforeUnmount(() => {
  cancelRequest()
})

function refreshCollectionsState() {
  collections.value = loadCollections()
  // 不再 mutate expandedKeys ——
  // 1) :default-expanded-keys 是 reactive 绑定，每次变化会被 EP 重新应用，
  //    会破坏用户手动折叠的状态；
  // 2) EP 内部 store 在数据更新时按 ID 保留 nodesMap，已展开节点的状态不会丢；
  // 3) 新建节点时通过 expandNodeById 显式展开父节点。
}

function onCreateCollection() {
  ElMessageBox.prompt(t('apiDebug.collectionName'), t('apiDebug.newCollection'), {
    confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'),
  }).then(({ value }) => {
    if (value?.trim()) {
      const collection = createCollection(value.trim())
      refreshCollectionsState()
      activeTreeNodeId.value = `collection:${collection.id}`
      selectedCollectionId.value = collection.id
      // 自动展开新创建的 collection
      expandNodeById(`collection:${collection.id}`)
      ElMessage.success(t('apiDebug.saved'))
    }
  }).catch(() => {})
}

function onCreateFolderAtSelection() {
  const target = resolveTreeTarget()
  if (!target.collectionId) {
    ElMessage.warning(t('apiDebug.selectCollection'))
    return
  }
  ElMessageBox.prompt(t('apiDebug.folderName'), t('apiDebug.newFolder'), {
    confirmButtonText: t('common.confirm'), cancelButtonText: t('common.cancel'),
  }).then(({ value }) => {
    if (value?.trim()) {
      const folder = createFolder(target.collectionId, target.parentId, value.trim())
      refreshCollectionsState()
      if (folder) {
        activeTreeNodeId.value = `folder:${folder.id}`
        selectedCollectionId.value = target.collectionId
        selectedFolderId.value = folder.id
        // 自动展开父节点（folder 在 folder 下，或 folder 在 collection 下）
        const parentTreeId = target.parentId
          ? `folder:${target.parentId}`
          : `collection:${target.collectionId}`
        expandNodeById(parentTreeId)
      }
    }
  }).catch(() => {})
}

function onCreateInterfaceAtSelection() {
  const target = resolveTreeTarget()
  if (!target.collectionId) {
    ElMessage.warning(t('apiDebug.selectCollection'))
    return
  }
  saveName.value = ''
  saveCollectionId.value = target.collectionId
  saveParentNodeId.value = target.parentId
  showSaveDialog.value = true
}

function onTreeNodeCmd(cmd, data) {
  if (cmd === 'newFolder') {
    selectedCollectionId.value = data.type === 'collection' ? data.rawId : data.collectionId
    selectedFolderId.value = data.type === 'folder' ? data.rawId : null
    onCreateFolderAtSelection()
    return
  }
  if (cmd === 'newInterface') {
    selectedCollectionId.value = data.type === 'collection' ? data.rawId : data.collectionId
    selectedFolderId.value = data.type === 'folder' ? data.rawId : null
    onCreateInterfaceAtSelection()
    return
  }
  if (cmd === 'rename') {
    const currentName = data.name
    const title = data.type === 'collection' ? t('apiDebug.collectionName') : (data.type === 'folder' ? t('apiDebug.folderName') : t('apiDebug.reqName'))
    ElMessageBox.prompt(title, t('common.edit'), {
      confirmButtonText: t('common.confirm'),
      cancelButtonText: t('common.cancel'),
      inputValue: currentName,
    }).then(({ value }) => {
      if (!value?.trim()) return
      if (data.type === 'collection') {
        renameCollection(data.rawId, value.trim())
      } else {
        renameCollectionNode(data.collectionId, data.rawId, value.trim())
      }
      refreshCollectionsState()
    }).catch(() => {})
    return
  }
  if (cmd === 'delete') {
    ElMessageBox.confirm(
      data.type === 'collection' ? t('apiDebug.confirmDeleteCollection') : t('apiDebug.confirmDeleteNode'),
      t('common.confirmDelete'),
      { type: 'warning' }
    ).then(() => {
      if (data.type === 'collection') {
        deleteCollection(data.rawId)
      } else {
        deleteCollectionItem(data.collectionId, data.rawId)
      }
      if (data.type === 'api' && activeItemId.value === data.rawId) {
        activeItemId.value = null
      }
      refreshCollectionsState()
    }).catch(() => {})
  }
}

/* ========= 文件夹/集合展开/折叠：no-op =========
   注意：不要在这里 mutate expandedKeys —— :default-expanded-keys
   是 reactive 绑定，每次变化会被 EP 重新应用，导致刚刚折叠的节点
   被强制重新展开，子节点"折叠不住"。 */
function onTreeExpand() { /* no-op */ }
function onTreeCollapse() { /* no-op */ }

function handleCollectionNodeClick(data) {
  activeTreeNodeId.value = data.id
  if (data.type === 'collection') {
    selectedCollectionId.value = data.rawId
    selectedFolderId.value = null
    toggleTreeNode(data.id)
    return
  }
  selectedCollectionId.value = data.collectionId
  if (data.type === 'folder') {
    selectedFolderId.value = data.rawId
    toggleTreeNode(data.id)
    return
  }
  activeItemId.value = data.rawId
  selectedFolderId.value = null
  const item = getCollectionNodeById(collections.value, data.collectionId, data.rawId)
  if (item) {
    loadCollectionItem(item)
  }
}

/* 手动 toggle：非 lazy 模式下空 folder 被 EP 视为 leaf，
   expand-on-click-node 不生效，所以这里主动调用 node API。 */
function toggleTreeNode(treeNodeId) {
  if (!collectionTreeRef.value) return
  const treeNode = collectionTreeRef.value.getNode(treeNodeId)
  if (!treeNode) return
  if (treeNode.expanded) treeNode.collapse()
  else treeNode.expand()
}

/* 工具：通过 tree 实例展开某节点（异步，等 DOM 更新） */
async function expandNodeById(treeNodeId) {
  await nextTick()
  if (!collectionTreeRef.value) return
  const treeNode = collectionTreeRef.value.getNode(treeNodeId)
  if (treeNode) treeNode.expand()
}

function loadCollectionItem(item) {
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

function doSaveToCollection() {
  if (!saveCollectionId.value) {
    ElMessage.warning(t('apiDebug.selectCollection'))
    return
  }
  saveRequestToCollection(saveCollectionId.value, {
    name: saveName.value || `${reqMethod.value} ${reqUrl.value}`,
    method: reqMethod.value,
    url: reqUrl.value,
    params: reqParams.value,
    headers: reqHeaders.value,
    body: reqBody.value,
    auth: reqAuth.value,
  }, saveParentNodeId.value)
  refreshCollectionsState()
  // 自动展开保存目标父节点（folder 或 collection 根）
  const parentTreeId = saveParentNodeId.value
    ? `folder:${saveParentNodeId.value}`
    : `collection:${saveCollectionId.value}`
  expandNodeById(parentTreeId)
  showSaveDialog.value = false
  ElMessage.success(t('apiDebug.saved'))
}

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

function onUrlMenuCmd(cmd) {
  if (cmd === 'save') {
    saveName.value = ''
    saveCollectionId.value = selectedCollectionId.value || collections.value[0]?.id || null
    saveParentNodeId.value = selectedFolderId.value || null
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
  if (!parsed || !parsed.url) {
    ElMessage.error(t('apiDebug.curlParseError'))
    return
  }
  reqMethod.value = parsed.method
  reqUrl.value = parsed.url
  reqHeaders.value = parsed.headers.length ? parsed.headers : [{ key: '', value: '', enabled: true }]
  reqBody.value = { type: parsed.body.type, content: parsed.body.content, formData: [{ key: '', value: '', enabled: true }] }
  reqAuth.value = parsed.auth
  showCurlDialog.value = false
  ElMessage.success(t('apiDebug.importSuccess'))
}

function normalizeRequestUrl(url) {
  const trimmed = (url || '').trim()
  if (!trimmed) return trimmed
  if (/^[a-zA-Z][\w+.-]*:\/\//.test(trimmed)) return trimmed
  if (/^(localhost|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?([/?#]|$)/.test(trimmed)) return 'http://' + trimmed
  if (/^[\w.-]+\.[a-zA-Z]{2,}(:\d+)?([/?#]|$)/.test(trimmed)) return 'https://' + trimmed
  return trimmed
}

function formatBodyJson() {
  if (reqBody.value.content) reqBody.value.content = tryFormatJson(reqBody.value.content)
}

function copyResponse() {
  if (response.value?.body) {
    navigator.clipboard.writeText(resBodyMode.value === 'pretty' ? prettyBody.value : response.value.body)
    ElMessage.success(t('apiDebug.copied'))
  }
}

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
  if (!editingEnv.value.name?.trim()) {
    ElMessage.warning(t('apiDebug.envName'))
    return
  }
  updateEnvironment(editingEnv.value.id, { name: editingEnv.value.name.trim(), variables: editingEnv.value.variables })
  environments.value = loadEnvironments()
  ElMessage.success(t('apiDebug.envSaved'))
}

function flattenFolderOptions(nodes = [], prefix = '') {
  const result = []
  nodes.forEach(node => {
    if (node.type !== 'folder') return
    const label = prefix ? `${prefix} / ${node.name}` : node.name
    result.push({ id: node.rawId, label })
    result.push(...flattenFolderOptions(node.children || [], label))
  })
  return result
}

function resolveTreeTarget() {
  if (selectedFolderId.value && selectedCollectionId.value) {
    return { collectionId: selectedCollectionId.value, parentId: selectedFolderId.value }
  }
  if (selectedCollectionId.value) {
    return { collectionId: selectedCollectionId.value, parentId: null }
  }
  if (collections.value[0]?.id) {
    return { collectionId: collections.value[0].id, parentId: null }
  }
  return { collectionId: null, parentId: null }
}

function collectExpandKeys(node, target) {
  if (node.type !== 'api') target.push(node.id)
  ;(node.children || []).forEach(child => collectExpandKeys(child, target))
}

function iconForNode(node) {
  if (node.type === 'collection') return '🗂️'
  if (node.type === 'folder') return '📁'
  return '🔗'
}

function nodeTitle(node) {
  if (node.type === 'api') {
    return node.name || node.url
  }
  return node.name
}

function shortenUrl(url) {
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    return url?.length > 40 ? `${url.slice(0, 40)}...` : url
  }
}

onMounted(() => {
  refreshCollectionsState()
  // 初始展开所有 collection / folder 节点（一次性，后续不再 mutate）
  const initial = []
  buildCollectionTree(collections.value).forEach(root => collectExpandKeys(root, initial))
  expandedKeys.value = Array.from(new Set(initial))
  history.value = loadHistory()
  environments.value = loadEnvironments()
  currentEnvId.value = getCurrentEnvId()
})
</script>

<style scoped>
.api-debug-wrapper {
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
  line-height: 1.2;
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
.breadcrumb-sep { color: var(--text-tertiary); margin: 0 1px; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.header-actions :deep(.el-button),
.url-bar :deep(.el-button),
.sidebar-toolbar :deep(.el-button),
.response-toolbar :deep(.el-button) {
  --el-button-border-radius: 10px;
}
.api-debug-wrapper :deep(.el-button) {
  font-weight: 650;
  letter-spacing: 0;
}
.api-debug-wrapper :deep(.el-button--primary) {
  color: #fff;
  background: linear-gradient(180deg, #4c82e6 0%, #316bd0 100%);
  border-color: rgba(49, 107, 208, 0.85);
  box-shadow: 0 6px 14px rgba(49, 107, 208, 0.18), inset 0 1px 0 rgba(255,255,255,0.26);
}
.api-debug-wrapper :deep(.el-button--primary:hover) {
  color: #fff;
  background: linear-gradient(180deg, #5a8dea 0%, #3a72d6 100%);
  border-color: rgba(58, 114, 214, 0.9);
}
.api-debug-wrapper :deep(.el-button--default) {
  color: #314155;
  background: rgba(255,255,255,0.68);
  border-color: rgba(100, 116, 139, 0.16);
}
.api-debug-wrapper :deep(.el-button--default:hover) {
  color: #245fca;
  background: rgba(255,255,255,0.88);
  border-color: rgba(74, 120, 217, 0.32);
}
.content-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.debug-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  width: 100%;
  min-width: 0;
  flex: 1;
  min-height: 0;
  padding: 0;
  gap: 0;
  position: relative;
  transition: grid-template-columns 0.22s ease;
}
.debug-layout.sidebar-collapsed {
  grid-template-columns: 0 minmax(0, 1fr) !important;
}
.sidebar-area.collapsed {
  width: 0;
  overflow: hidden;
}
.sidebar-area {
  position: relative;
  display: flex;
  min-height: 0;
  transition: width 0.22s ease;
}
.left-sidebar {
  width: 260px; min-width: 260px;
  background: transparent;
  display: flex; flex-direction: column; position: relative;
  transition: width 0.2s, min-width 0.2s;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
}
.left-sidebar.collapsed { width: 0; min-width: 0; overflow: hidden; border-width: 0; }
.sidebar-content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.sidebar-toggle {
  position: absolute;
  left: 260px;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 22px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #fff;
  border: 1px solid rgba(60, 40, 20, 0.14);
  border-radius: 11px;
  z-index: 20;
  color: var(--text-tertiary);
  font-size: 12px;
  box-shadow: 0 2px 6px rgba(60, 40, 20, 0.06);
  transition: left 0.22s ease, color 0.15s, background 0.15s, box-shadow 0.15s;
}
.sidebar-toggle.collapsed { left: 0; }
.sidebar-toggle:hover {
  color: var(--accent-blue);
  background: #fff;
  box-shadow: 0 3px 10px rgba(47, 111, 228, 0.18);
}
.sidebar-tabs { display: flex; padding: 10px 10px 8px; gap: 6px; }
.sidebar-tab {
  flex: 1; text-align: center; padding: 8px 0; font-size: 12px; color: var(--text-secondary);
  cursor: pointer; user-select: none; border: 1px solid transparent; border-radius: 10px; transition: all 0.15s;
}
.sidebar-tab:hover { color: var(--text-primary); background: rgba(255,255,255,0.58); }
.sidebar-tab.active {
  color: var(--accent-blue); font-weight: 600;
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(240,245,251,0.95));
  border-color: rgba(194, 65, 12,0.15);
  box-shadow: 0 1px 0 rgba(255,255,255,0.82), 0 6px 14px rgba(60, 40, 20,0.05);
}
.sidebar-list { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 4px 8px 8px; }
.sidebar-toolbar {
  padding: 6px 4px 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
/* 顶部新建栏（对齐 ApiDocs 视觉） */
.list-toolbar {
  display: flex;
  gap: 6px;
  /* sidebar-list 自带 4px/8px padding —— negative margin 抵消，让 toolbar 顶到面板边缘 */
  margin: -4px -8px 6px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  flex-shrink: 0;
}
.toolbar-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.toolbar-btn :deep(.el-icon) { font-size: 13px; }
/* el-tree 节点行 — 对齐 ApiDocs 视觉 */
.tree-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  padding-right: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.15s;
}
.tree-row.active {
  color: var(--accent-blue);
  font-weight: 600;
}
.tree-row.active .item-name { color: var(--accent-blue); }
.tree-row.active .method-tag { color: var(--accent-blue) !important; }

.tree-row-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.row-icon { font-size: 14px; flex-shrink: 0; color: #d2a55a; }
.folder-icon { color: #d2a55a; }
.collection-icon { color: var(--el-text-color-regular); }
.tree-row.active .folder-icon,
.tree-row.active .collection-icon { color: var(--accent-blue); }

.folder-count {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-quaternary);
  padding: 1px 6px;
  background: rgba(60, 40, 20, 0.06);
  border-radius: 8px;
  margin-left: 2px;
}
.tree-row.active .folder-count {
  color: var(--accent-blue);
  background: rgba(47, 111, 228, 0.12);
}

.row-more {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--text-quaternary);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}
.tree-row:hover .row-more { opacity: 1; }
.row-more:hover { background: rgba(60, 40, 20, 0.06); color: var(--text-primary); }

:deep(.el-tree) {
  --el-tree-node-hover-bg-color: rgba(60, 40, 20, 0.04);
  background: transparent;
  /* 防止深层缩进的节点撑出横向滚动 */
  overflow: hidden;
}
:deep(.el-tree-node) {
  /* 缩进会累加 padding-left，子节点过宽时会逼出横向滚动；这里截断 */
  white-space: nowrap;
  overflow: hidden;
}
/* 彻底隐藏 EP 默认展开箭头，由 slot 内自绘 chevron 接管视觉 */
:deep(.el-tree-node__expand-icon) {
  display: none !important;
}
/* 自绘 chevron：folder/collection 行有箭头，api 行用 spacer 占位 */
.row-chevron {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  font-size: 12px;
  color: var(--text-secondary, var(--el-text-color-regular));
  transition: transform 0.18s ease, color 0.15s;
}
.row-chevron.expanded { transform: rotate(90deg); }
.tree-row:hover .row-chevron { color: var(--accent-blue); }
.tree-row.active .row-chevron { color: var(--accent-blue); }
.row-chevron-spacer {
  flex-shrink: 0;
  display: inline-block;
  width: 14px;
  height: 14px;
}
:deep(.el-tree-node__content) {
  height: 32px;
  padding-right: 0 !important;
  border-left: 2px solid transparent;
  border-radius: 0;
  margin-bottom: 0;
  overflow: hidden;
  transition: background 0.15s, border-color 0.15s;
}
:deep(.el-tree-node__content:hover) {
  background: rgba(60, 40, 20, 0.04);
}
:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: rgba(47, 111, 228, 0.08);
  border-left-color: var(--accent-blue);
}
:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
  border: 0;
  border-left: 2px solid var(--accent-blue);
  box-shadow: none;
}
.method-tag { font-size: 10px; font-weight: 700; flex-shrink: 0; width: 40px; }
.item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); }
.item-delete { font-size: 12px; color: var(--text-quaternary); flex-shrink: 0; display: inline-flex; opacity: 0; pointer-events: none; transition: opacity 0.15s, color 0.15s; }
.history-group { margin-bottom: 8px; }
.history-group-label { padding: 8px 10px 4px; font-size: 11px; color: var(--text-tertiary); font-weight: 600; }
.history-item {
  display: flex; align-items: center; gap: 6px; padding: 7px 10px; cursor: pointer; font-size: 12px;
  border-radius: 10px; border: 1px solid transparent; margin-bottom: 2px;
}
.history-item:hover { background: rgba(255,255,255,0.56); }
.history-item:hover .item-delete,
.history-item:focus-within .item-delete {
  opacity: 1;
  pointer-events: auto;
}
.history-status { font-size: 10px; font-weight: 600; flex-shrink: 0; }
.history-status.ok { color: var(--el-color-success); }
.history-status.err { color: var(--el-color-danger); }
.empty-hint {
  text-align: center;
  color: var(--text-quaternary);
  font-size: 12px;
  padding: 24px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 14px;
  background: rgba(255,255,255,0.52);
}
.main-panel {
  width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.url-bar {
  display: flex; align-items: center; gap: 10px; padding: 12px 18px;
  background: transparent; border-bottom: 1px solid rgba(60, 40, 20, 0.08); flex-shrink: 0;
}
.url-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 4px;
  border: 1px solid rgba(100, 116, 139, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
}
.url-actions :deep(.el-button) {
  min-width: 74px;
  height: 32px;
  padding: 0 13px;
}
.url-actions :deep(.el-button--primary) {
  min-width: 86px;
}
.url-more-btn {
  min-width: 32px !important;
  padding: 0 8px !important;
  color: #526174 !important;
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
.method-select { width: 110px; flex-shrink: 0; }
.method-select :deep(.el-select__wrapper) {
  height: 32px;
  border-radius: 8px;
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.12);
  padding: 0 10px;
}
.method-select :deep(.el-select__wrapper:hover) {
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.2);
}
.method-select :deep(.el-select__wrapper.is-focused) {
  box-shadow: inset 0 0 0 1.5px var(--accent-blue);
}
.method-select :deep(.el-input__inner) { font-weight: 700; }

.url-input { flex: 1; }
.url-input :deep(.el-input__wrapper) {
  height: 32px;
  border-radius: 8px;
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.12);
  padding: 0 12px;
}
.url-input :deep(.el-input__wrapper:hover) {
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.2);
}
.url-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: inset 0 0 0 1.5px var(--accent-blue);
}
.url-input :deep(.el-input__inner) {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12.5px;
  color: var(--text-primary);
}
.split-panels {
  flex: 1;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.request-panel {
  flex: 0 0 45%;
  width: 100%;
  min-width: 0;
  min-height: 180px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid rgba(100, 116, 139, 0.12);
  background: transparent;
}
.panel-resizer { display: none; }
.response-panel {
  flex: 1 1 55%;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  background: transparent;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* ============ tabs：nav sticky 不滚动，content 独立滚 ============ */
.compact-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  --el-color-primary: var(--accent-blue);
}
.compact-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 12px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}
.compact-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0;
}
.compact-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}
.compact-tabs :deep(.el-tabs__item) {
  height: 36px;
  line-height: 36px;
  font-size: 12px;
  font-weight: 500;
  padding: 0 14px;
  color: var(--text-tertiary);
  transition: color 0.15s;
  border-bottom: 2px solid transparent;
}
.compact-tabs :deep(.el-tabs__item):hover {
  color: var(--text-primary);
}
.compact-tabs :deep(.el-tabs__item.is-active) {
  color: var(--accent-blue);
  font-weight: 600;
}
.compact-tabs :deep(.el-tabs__active-bar) {
  height: 2px;
  background: var(--accent-blue);
  border-radius: 2px;
}
.compact-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0;
}
.compact-tabs :deep(.el-tabs__content)::-webkit-scrollbar { width: 5px; }
.compact-tabs :deep(.el-tabs__content)::-webkit-scrollbar-thumb { background: rgba(60, 40, 20, 0.18); border-radius: 3px; }
.compact-tabs :deep(.el-tab-pane) {
  padding: 12px 14px;
  min-height: 100%;
  box-sizing: border-box;
}
/* KV 编辑器 — 对齐 ApiDocs 卡片风 */
.kv-editor {
  border: 1px solid rgba(60, 40, 20, 0.1);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  padding: 0;
}
.kv-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  min-height: 36px;
  margin: 0;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
  transition: background 0.12s;
}
.kv-row:last-of-type { border-bottom: 0; }
.kv-row:not(.kv-header-row):hover { background: rgba(47, 111, 228, 0.025); }
.kv-header-row {
  min-height: 30px;
  background: rgba(60, 40, 20, 0.03);
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  margin-bottom: 0 !important;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.kv-editor :deep(.el-input__wrapper),
.kv-editor :deep(.el-select__wrapper),
.kv-editor :deep(.el-autocomplete .el-input__wrapper) {
  height: 30px;
  background: transparent;
  box-shadow: none;
  padding: 0 8px;
  border-radius: 6px;
  transition: box-shadow 0.12s, background 0.12s;
}
.kv-editor :deep(.el-input__inner) {
  font-size: 12px;
  height: 30px;
  line-height: 30px;
}
.kv-editor :deep(.el-input__wrapper:hover),
.kv-editor :deep(.el-select__wrapper:hover),
.kv-editor :deep(.el-autocomplete .el-input__wrapper:hover) {
  background: rgba(60, 40, 20, 0.03);
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.12);
}
.kv-editor :deep(.el-input__wrapper.is-focus),
.kv-editor :deep(.el-select__wrapper.is-focused),
.kv-editor :deep(.el-autocomplete .el-input__wrapper.is-focus) {
  background: #fff !important;
  box-shadow: inset 0 0 0 1.5px var(--accent-blue) !important;
}
.kv-editor > .el-button {
  display: block;
  width: calc(100% - 12px);
  margin: 6px;
  height: 28px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  border-radius: 6px !important;
  text-align: center;
}
.kv-editor > .el-button:hover {
  background: rgba(47, 111, 228, 0.06) !important;
}
.kv-delete {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--text-quaternary);
  cursor: pointer;
  padding: 3px;
  border-radius: 5px;
  transition: color 0.12s, background 0.12s, opacity 0.12s;
}
.kv-delete:hover { color: var(--el-color-danger); background: rgba(229, 57, 53, 0.08); }
.kv-row:not(.kv-header-row) .kv-delete { opacity: 0; }
.kv-row:not(.kv-header-row):hover .kv-delete { opacity: 1; }
.body-type-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.body-textarea {
  width: 100%; min-height: 120px; max-height: 200px; padding: 10px 12px;
  border: 1px solid rgba(60, 40, 20, 0.08); border-radius: 12px;
  background: rgba(255,255,255,0.92); color: var(--text-primary);
  font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;
  resize: vertical; outline: none; box-sizing: border-box;
}
.body-textarea:focus { border-color: var(--accent-blue); }
.auth-editor { padding: 6px 0; }
.auth-fields { display: flex; flex-direction: column; gap: 8px; }
.response-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: var(--text-quaternary); gap: 8px;
  margin: 20px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  background: rgba(255,255,255,0.42);
}
.response-empty-icon { font-size: 48px; }
.response-empty-hint { font-size: 11px; }
.response-loading { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-tertiary); }
.response-status-bar {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08); flex-shrink: 0;
}
.status-badge { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
.status-badge.ok { color: var(--el-color-success); background: rgba(103,194,58,0.12); }
.status-badge.err { color: var(--el-color-danger); background: rgba(245,108,108,0.12); }
.status-meta { font-size: 11px; color: var(--text-tertiary); }
.response-tabs { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.response-tabs :deep(.el-tabs__content) { flex: 1; overflow: auto; }
.response-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.response-body {
  margin: 0; padding: 0 0 10px; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;
  line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; word-break: break-all;
  flex: 1; overflow-y: auto;
}
.response-headers-table { padding: 4px 0; }
.res-header-row { display: flex; gap: 12px; padding: 6px 0; font-size: 12px; border-bottom: 1px solid rgba(60, 40, 20, 0.08); }
.res-header-key { min-width: 120px; max-width: 32%; flex: 0 1 220px; font-weight: 600; color: var(--text-primary); }
.res-header-val { flex: 1; color: var(--text-secondary); word-break: break-all; }
.env-list-bar { display: flex; gap: 8px; }
.status-bar {
  height: 30px; display: flex; align-items: center; gap: 16px; padding: 0 16px;
  margin: 0;
  background: rgba(255,255,255,0.72); border: 1px solid rgba(60, 40, 20, 0.08); border-top: none;
  border-radius: 0;
  font-size: 11px; color: var(--text-tertiary); flex-shrink: 0;
}
.sidebar-list::-webkit-scrollbar, .response-body::-webkit-scrollbar,
.request-panel::-webkit-scrollbar, .response-panel::-webkit-scrollbar { width: 5px; }
.sidebar-list::-webkit-scrollbar-track, .response-body::-webkit-scrollbar-track,
.request-panel::-webkit-scrollbar-track, .response-panel::-webkit-scrollbar-track { background: transparent; }
.sidebar-list::-webkit-scrollbar-thumb, .response-body::-webkit-scrollbar-thumb,
.request-panel::-webkit-scrollbar-thumb, .response-panel::-webkit-scrollbar-thumb {
  background: var(--text-quaternary); border-radius: 3px;
}
@media (max-width: 1100px) {
  .left-sidebar { width: 240px; min-width: 240px; }
  .header-actions { gap: 6px; }
}
@media (max-width: 860px) {
  .header { padding: 0 14px; }
  .breadcrumb { font-size: 14px; }
  .left-sidebar { width: 220px; min-width: 220px; }
}
</style>



