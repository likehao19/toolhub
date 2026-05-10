<template>
  <div class="api-docs-wrapper">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Document /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('apiDocs.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="showModelDialog = true">
          <el-icon style="margin-right: 6px;"><DataAnalysis /></el-icon>{{ t('apiDocs.dataModels') }}
        </el-button>
        <el-button size="small" @click="docsViewMode = docsViewMode === 'edit' ? 'preview' : 'edit'">
          <el-icon style="margin-right: 6px;">
            <View v-if="docsViewMode === 'edit'" /><Edit v-else />
          </el-icon>{{ docsViewMode === 'edit' ? t('apiDocs.docPreview') : t('apiDocs.docEdit') }}
        </el-button>
      </div>
    </div>

    <!-- Content -->
    <div class="content-area">
      <!-- Edit Mode -->
      <div v-if="docsViewMode === 'edit'" class="docs-edit">
        <div class="docs-list-panel" :class="{ collapsed: sidebarCollapsed }">
          <div class="list-inner">
            <!-- 顶部新建栏 -->
            <div class="list-toolbar">
              <el-button size="small" type="primary" text class="toolbar-btn" @click="onAddFolder(null)" :title="t('apiDocs.newFolder')">
                <el-icon><FolderAdd /></el-icon>
              </el-button>
              <el-button size="small" text class="toolbar-btn" @click="onAddDoc(null)" :title="t('apiDocs.newApi')">
                <el-icon><DocumentAdd /></el-icon>
              </el-button>
            </div>

            <!-- 树 -->
            <div class="tree-scroll">
            <el-tree
              v-if="apiDocsTree.length"
              ref="treeRef"
              :data="apiDocsTree"
              node-key="id"
              :props="treeProps"
              :default-expanded-keys="expandedKeys"
              :expand-on-click-node="false"
              :highlight-current="true"
              draggable
              :allow-drop="allowDrop"
              @node-drop="onNodeDrop"
              @node-click="onNodeClick"
              @node-expand="onNodeExpand"
              @node-collapse="onNodeCollapse"
            >
              <template #default="{ node, data }">
                <div class="tree-row" :class="{ active: editDocId === data.id, 'is-folder': data.type === 'folder' }">
                  <div class="tree-row-main">
                    <!-- 自定义展开/折叠 chevron：folder 显示，doc 同尺寸占位保持左缘对齐 -->
                    <el-icon v-if="data.type === 'folder'" class="row-chevron" :class="{ expanded: node.expanded }">
                      <CaretRight />
                    </el-icon>
                    <span v-else class="row-chevron-spacer"></span>
                    <el-icon v-if="data.type === 'folder'" class="row-icon folder-icon">
                      <FolderOpened v-if="node.expanded" />
                      <Folder v-else />
                    </el-icon>
                    <span v-else class="method-tag" :style="{ color: METHOD_COLORS[data.method] }">{{ data.method }}</span>
                    <span class="item-name" :title="nodeLabel(data)">{{ nodeLabel(data) }}</span>
                    <span v-if="data.type === 'folder' && data.children?.length" class="folder-count">{{ data.children.length }}</span>
                  </div>
                  <el-dropdown trigger="click" size="small" @command="cmd => onNodeCmd(cmd, data)">
                    <el-icon class="row-more" @click.stop><MoreFilled /></el-icon>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item v-if="data.type === 'folder'" command="newSubFolder">
                          <el-icon><FolderAdd /></el-icon>{{ t('apiDocs.newSubFolder') }}
                        </el-dropdown-item>
                        <el-dropdown-item v-if="data.type === 'folder'" command="newApi">
                          <el-icon><DocumentAdd /></el-icon>{{ t('apiDocs.newApi') }}
                        </el-dropdown-item>
                        <el-dropdown-item command="rename" :divided="data.type === 'folder'">
                          <el-icon><Edit /></el-icon>{{ t('apiDocs.rename') }}
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
            <div v-else class="empty-hint">{{ t('apiDocs.noApiDocs') }}</div>
          </div>
          </div>
        </div>

        <!-- 折叠/展开吸附按钮（独立浮动在 docs-edit 内，跟随 panel 边缘） -->
        <div class="sidebar-toggle" :class="{ collapsed: sidebarCollapsed }"
          @click="sidebarCollapsed = !sidebarCollapsed"
          :title="sidebarCollapsed ? t('common.showSidebar') : t('common.hideSidebar')">
          <el-icon>
            <ArrowLeft v-if="!sidebarCollapsed" />
            <ArrowRight v-else />
          </el-icon>
        </div>

        <div class="docs-form-panel" v-if="editingDoc">
          <!-- 顶栏：method + path 一行，文件夹路径作右侧 hint -->
          <div class="form-header">
            <el-select v-model="editingDoc.method" class="method-select"
              :style="{ '--method-color': METHOD_COLORS[editingDoc.method] }" @change="persist">
              <el-option v-for="m in methods" :key="m" :label="m" :value="m">
                <span :style="{ color: METHOD_COLORS[m], fontWeight: 700 }">{{ m }}</span>
              </el-option>
            </el-select>
            <el-input v-model="editingDoc.path" class="path-input" placeholder="/api/users" @change="persist" />
            <span v-if="editingDocFolderPath" class="folder-crumb in-header" :title="editingDocFolderPath">
              <el-icon><Folder /></el-icon>{{ editingDocFolderPath }}
            </span>
          </div>

          <!-- 滚动主体 -->
          <div class="form-scroll">
            <!-- 基本信息 -->
            <section class="form-section">
              <div class="section-head">
                <span class="section-eyebrow">Basic</span>
                <span class="section-title">{{ t('apiDocs.basicInfo') }}</span>
              </div>
              <div class="form-rows">
                <div class="form-row">
                  <span class="row-label">{{ t('apiDocs.apiName') }}</span>
                  <el-input v-model="editingDoc.name" size="small"
                    :placeholder="t('apiDocs.apiNamePrompt')" @change="persist" />
                </div>
                <div class="form-row">
                  <span class="row-label">{{ t('apiDocs.group') }}</span>
                  <el-input v-model="editingDoc.group" size="small" :placeholder="t('apiDocs.groupPlaceholder')" @change="persist" />
                </div>
                <div class="form-row form-row-top">
                  <span class="row-label">{{ t('apiDocs.description') }}</span>
                  <el-input v-model="editingDoc.description" type="textarea" :rows="2"
                    :placeholder="t('apiDocs.description')" @change="persist" />
                </div>
              </div>
            </section>

            <!-- 请求参数 -->
            <section class="form-section">
              <div class="section-head">
                <span class="section-eyebrow">Request</span>
                <span class="section-title">{{ t('apiDocs.reqParams') }}</span>
                <span class="section-count" v-if="editingDoc.fields?.length">{{ editingDoc.fields.length }}</span>
                <el-button class="section-action" size="small" text type="primary"
                  @click="editingDoc.fields.push({ name: '', type: 'string', required: false, description: '' }); persist()">
                  + {{ t('apiDocs.addField') }}
                </el-button>
              </div>
              <div v-if="editingDoc.fields?.length" class="kv-table">
                <div class="kv-table-head">
                  <span class="kv-col-name">{{ t('apiDocs.fieldName') }}</span>
                  <span class="kv-col-type">{{ t('apiDocs.fieldType') }}</span>
                  <span class="kv-col-req">{{ t('apiDocs.required') }}</span>
                  <span class="kv-col-desc">{{ t('apiDocs.fieldDesc') }}</span>
                  <span class="kv-col-act"></span>
                </div>
                <div v-for="(f, i) in editingDoc.fields" :key="i" class="kv-table-row">
                  <el-input v-model="f.name" size="small" class="kv-col-name" placeholder="name" @change="persist" />
                  <el-select v-model="f.type" size="small" class="kv-col-type" @change="persist">
                    <el-option v-for="ft in fieldTypes" :key="ft" :label="ft" :value="ft" />
                  </el-select>
                  <el-checkbox v-model="f.required" size="small" class="kv-col-req" @change="persist" />
                  <el-input v-model="f.description" size="small" class="kv-col-desc" :placeholder="t('apiDocs.fieldDescPlaceholder')" @change="persist" />
                  <el-icon class="kv-col-act kv-delete" @click="editingDoc.fields.splice(i, 1); persist()"><Close /></el-icon>
                </div>
              </div>
              <div v-else class="section-empty">{{ t('apiDocs.noFields') }}</div>
            </section>

            <!-- 响应定义 -->
            <section class="form-section">
              <div class="section-head">
                <span class="section-eyebrow">Response</span>
                <span class="section-title">{{ t('apiDocs.respDef') }}</span>
                <el-button class="section-action" size="small" text type="primary" @click="doGenSchemaFromExample">
                  {{ t('apiDocs.genFromExample') }}
                </el-button>
              </div>
              <el-input v-model="editingDoc.responseExample" type="textarea" :rows="12"
                class="resp-textarea"
                placeholder='{"code": 0, "data": {}, "message": "success"}'
                @change="persist" />
            </section>
          </div>

          <!-- 底部 sticky 操作栏 -->
          <div class="form-actions">
            <span class="form-actions-hint">{{ t('apiDocs.autoSaveHint') }}</span>
            <el-button size="small" type="primary" @click="doSaveDoc">
              <el-icon style="margin-right: 6px;"><Check /></el-icon>{{ t('common.save') }}
            </el-button>
          </div>
        </div>
        <div v-else class="empty-hint center-empty">
          <el-icon><Document /></el-icon>
          <span>{{ t('apiDocs.selectApiDoc') }}</span>
        </div>
      </div>
      <!-- Preview Mode -->
      <div v-else class="docs-preview">
        <template v-for="group in flatDocs" :key="group.id">
          <div class="doc-preview-card">
            <div class="doc-preview-header">
              <span class="method-tag" :style="{ color: METHOD_COLORS[group.method], fontSize: '13px' }">{{ group.method }}</span>
              <span class="preview-path">{{ group.path }}</span>
              <span class="preview-name">{{ group.name }}</span>
              <span v-if="group.folderPath" class="folder-crumb">{{ group.folderPath }}</span>
              <el-button size="small" text class="preview-edit-btn" @click="onEditFromPreview(group.id)" :title="t('apiDocs.docEdit')">
                <el-icon><Edit /></el-icon>
              </el-button>
            </div>
            <p v-if="group.description" class="preview-desc">{{ group.description }}</p>
            <table v-if="group.fields?.length" class="doc-table">
              <thead><tr><th>{{ t('apiDocs.fieldName') }}</th><th>{{ t('apiDocs.fieldType') }}</th><th>{{ t('apiDocs.required') }}</th><th>{{ t('apiDocs.fieldDesc') }}</th></tr></thead>
              <tbody>
                <tr v-for="f in group.fields" :key="f.name">
                  <td style="font-family:monospace">{{ f.name }}</td>
                  <td>{{ f.type }}</td>
                  <td>{{ f.required ? '✅' : '' }}</td>
                  <td>{{ f.description }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="group.responseExample" class="preview-resp">
              <div class="preview-resp-label">Response Example</div>
              <pre class="response-body">{{ tryFormatJson(group.responseExample) }}</pre>
            </div>
          </div>
        </template>
        <div v-if="!flatDocs.length" class="empty-hint" style="padding:60px">{{ t('apiDocs.noApiDocs') }}</div>
      </div>
    </div>

    <!-- Data Models Dialog -->
    <el-dialog v-model="showModelDialog" :title="t('apiDocs.dataModels')" width="600px" append-to-body>
      <div v-for="(model, mi) in dataModels" :key="model.id" style="margin-bottom:16px;padding:12px;border:1px solid var(--border-color);border-radius:6px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <el-input v-model="model.name" size="small" style="width:150px" placeholder="Model Name" />
          <el-input v-model="model.description" size="small" style="flex:1" :placeholder="t('apiDocs.modelDescPlaceholder')" />
          <el-icon class="kv-delete" @click="dataModels.splice(mi, 1)"><Close /></el-icon>
        </div>
        <el-input v-model="model.schema" type="textarea" :rows="4" size="small" style="font-family:monospace"
          placeholder='{ "type": "object", "properties": { "id": { "type": "integer" } } }' />
      </div>
      <el-button size="small" text type="primary"
        @click="dataModels.push({ id: uuid(), name: '', description: '', schema: '' })">
        + {{ t('apiDocs.addModel') }}
      </el-button>
      <template #footer>
        <el-button size="small" @click="showModelDialog = false">{{ t('common.close') }}</el-button>
        <el-button size="small" type="primary" @click="doSaveModels">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Close, Folder, FolderOpened, FolderAdd, DocumentAdd, MoreFilled, Edit, Delete, ArrowLeft, ArrowRight, CaretRight, Check, DataAnalysis, View } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { METHOD_COLORS, tryFormatJson, uuid } from '@/utils/apiWorkbench/shared'
import {
  loadApiDocs, saveApiDocs, loadDataModels, saveDataModels, inferSchema,
  walkNodes, findNodeById, removeNodeById, createFolder, createDoc, flattenDocs,
} from '@/utils/apiWorkbench/apiDocs'

const router = useRouter()

const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
const fieldTypes = ['string', 'number', 'integer', 'boolean', 'array', 'object']

const apiDocsTree = ref([])
const editDocId = ref(null)
const docsViewMode = ref('edit')
const showModelDialog = ref(false)
const dataModels = ref([])
const treeRef = ref(null)
const expandedKeys = ref([])
const sidebarCollapsed = ref(false)

const treeProps = {
  children: 'children',
  label: 'name',
  // 注：EP el-tree 的 props.isLeaf 只在 lazy 模式生效，
  // 非 lazy 模式下空文件夹（children: []）会被自动判定为 leaf，
  // 所以展开/折叠改为在 onNodeClick 中手动调用 node.expand/collapse 实现。
}

// 当前编辑的 doc：通过 walkNodes 在树中找
const editingDoc = computed(() => {
  if (!editDocId.value) return null
  return walkNodes(apiDocsTree.value, n => n.id === editDocId.value && n.type === 'doc' ? n : null)
})

// 当前编辑接口所在的文件夹路径（用于顶栏面包屑）
const editingDocFolderPath = computed(() => {
  if (!editDocId.value) return ''
  const segments = []
  const dfs = (nodes, path) => {
    for (const n of nodes) {
      if (n.id === editDocId.value) {
        segments.push(...path)
        return true
      }
      if (n.type === 'folder' && Array.isArray(n.children)) {
        if (dfs(n.children, [...path, n.name])) return true
      }
    }
    return false
  }
  dfs(apiDocsTree.value, [])
  return segments.join(' / ')
})

// 预览模式扁平化
const flatDocs = computed(() => flattenDocs(apiDocsTree.value))

function nodeLabel(data) {
  if (data.type === 'folder') return data.name
  return data.name || data.path || '(unnamed)'
}

function persist() {
  saveApiDocs(apiDocsTree.value)
}

/* ========= 节点点击：folder 手动展开/折叠，doc 选中 ========= */
function onNodeClick(data) {
  if (data.type === 'doc') {
    editDocId.value = data.id
    return
  }
  // folder：通过 tree 实例拿到 store node 再 toggle，避免 slot props 中
  // 的 node 引用问题；同时不修改 expandedKeys，避免响应式重新应用。
  if (data.type === 'folder' && treeRef.value) {
    const treeNode = treeRef.value.getNode(data.id)
    if (!treeNode) return
    if (treeNode.expanded) treeNode.collapse()
    else treeNode.expand()
  }
}

/* ========= 文件夹展开/折叠：no-op =========
   注意：不要在这里 mutate expandedKeys —— :default-expanded-keys
   是 reactive 绑定，每次变化会被 EP 重新应用，导致刚刚折叠的节点
   被强制重新展开，子节点"折叠不住"。 */
function onNodeExpand() { /* no-op */ }
function onNodeCollapse() { /* no-op */ }

/* 工具：通过 tree 实例展开某节点（异步，等 DOM 更新） */
async function expandNodeById(id) {
  await nextTick()
  if (!treeRef.value) return
  const treeNode = treeRef.value.getNode(id)
  if (treeNode) treeNode.expand()
}

/* ========= 新建文件夹（顶部按钮 / 节点菜单） ========= */
async function onAddFolder(parentId) {
  try {
    const { value } = await ElMessageBox.prompt(t('apiDocs.folderName'), t('apiDocs.newFolder'), {
      confirmButtonText: t('common.save'),
      cancelButtonText: t('common.cancel'),
      inputPattern: /\S+/,
      inputErrorMessage: t('apiDocs.folderName'),
    })
    const folder = createFolder(apiDocsTree.value, parentId, value.trim())
    if (folder) {
      persist()
      // 自动展开父节点
      if (parentId) await expandNodeById(parentId)
      ElMessage.success(t('apiDocs.saved'))
    }
  } catch { /* cancelled */ }
}

/* ========= 新建接口（顶部按钮 / 节点菜单） ========= */
async function onAddDoc(parentId) {
  const doc = createDoc(apiDocsTree.value, parentId, {
    name: t('apiDocs.newApi'),
    method: 'GET',
    path: '/api/',
  })
  if (!doc) return
  persist()
  if (parentId) await expandNodeById(parentId)
  editDocId.value = doc.id
}

/* ========= 节点 dropdown 命令 ========= */
async function onNodeCmd(cmd, data) {
  if (cmd === 'newSubFolder') {
    onAddFolder(data.id)
  } else if (cmd === 'newApi') {
    onAddDoc(data.id)
  } else if (cmd === 'rename') {
    try {
      const promptTitle = data.type === 'folder' ? t('apiDocs.folderName') : t('apiDocs.apiNamePrompt')
      const { value } = await ElMessageBox.prompt(promptTitle, t('apiDocs.rename'), {
        confirmButtonText: t('common.save'),
        cancelButtonText: t('common.cancel'),
        inputValue: data.name || '',
        inputPattern: /\S+/,
      })
      const node = findNodeById(apiDocsTree.value, data.id)
      if (node) {
        node.name = value.trim()
        persist()
      }
    } catch { /* cancelled */ }
  } else if (cmd === 'delete') {
    const msg = data.type === 'folder'
      ? t('apiDocs.confirmDeleteFolder')
      : t('apiDocs.confirmDeleteApi')
    try {
      await ElMessageBox.confirm(msg, t('common.delete'), {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      })
      apiDocsTree.value = removeNodeById(apiDocsTree.value, data.id)
      // 如果删的是当前编辑的，清空选中
      if (editDocId.value === data.id) editDocId.value = null
      // 删的若是文件夹，里面可能含编辑中 doc，校验一下
      if (editDocId.value && !findNodeById(apiDocsTree.value, editDocId.value)) {
        editDocId.value = null
      }
      persist()
    } catch { /* cancelled */ }
  }
}

/* ========= 拖拽：禁止把节点拖到 doc 下；其他放行 ========= */
function allowDrop(draggingNode, dropNode, type) {
  // type: 'prev' | 'inner' | 'next'
  if (type === 'inner') {
    // 只允许拖入文件夹
    return dropNode.data?.type === 'folder'
  }
  return true
}

function onNodeDrop() {
  // el-tree 已经原地修改了 data 数组（apiDocsTree.value），直接保存
  persist()
}

/* ========= 预览模式：点击编辑按钮切回编辑模式并选中 ========= */
async function onEditFromPreview(docId) {
  editDocId.value = docId
  docsViewMode.value = 'edit'
  // 自动展开该 doc 所在的所有父级文件夹
  const collectAncestors = (nodes, path = []) => {
    for (const n of nodes) {
      if (n.id === docId) return path
      if (n.type === 'folder' && Array.isArray(n.children)) {
        const found = collectAncestors(n.children, [...path, n.id])
        if (found) return found
      }
    }
    return null
  }
  const ancestorIds = collectAncestors(apiDocsTree.value) || []
  await nextTick()
  if (treeRef.value) {
    for (const id of ancestorIds) {
      const treeNode = treeRef.value.getNode(id)
      if (treeNode) treeNode.expand()
    }
  }
}

/* ========= 编辑：保存 / 从示例生成 schema ========= */
function doSaveDoc() {
  if (!editingDoc.value) return
  if (!editingDoc.value.path?.trim()) { ElMessage.warning(`${t('apiDocs.path')} ${t('apiDocs.pathRequired')}`); return }
  persist()
  ElMessage.success(t('apiDocs.saved'))
}

function doGenSchemaFromExample() {
  if (!editingDoc.value?.responseExample) return
  try {
    const json = JSON.parse(editingDoc.value.responseExample)
    const schema = inferSchema(json)
    if (schema.properties) {
      editingDoc.value.fields = Object.entries(schema.properties).map(([name, prop]) => ({
        name, type: prop.type || 'string', required: schema.required?.includes(name) || false, description: '',
      }))
      persist()
    }
    ElMessage.success(t('apiDocs.saved'))
  } catch { ElMessage.error(t('apiDocs.jsonParseFailed')) }
}

function doSaveModels() {
  saveDataModels(dataModels.value)
  showModelDialog.value = false
  ElMessage.success(t('apiDocs.saved'))
}

onMounted(() => {
  apiDocsTree.value = loadApiDocs()
  dataModels.value = loadDataModels()
  // 默认展开第一层文件夹。注意：expandedKeys 仅作 :default-expanded-keys 的
  // 一次性初始值，后续不再 mutate（否则 EP 会因响应式变化重新覆盖 expanded 状态）。
  expandedKeys.value = apiDocsTree.value
    .filter(n => n.type === 'folder')
    .map(n => n.id)
})
</script>

<style scoped>
.api-docs-wrapper {
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
.content-area { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }

.docs-edit {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
  position: relative;
}
.docs-list-panel {
  position: relative;
  width: 260px;
  min-width: 260px;
  flex-shrink: 0;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  transition: width 0.22s ease, min-width 0.22s ease;
}
.docs-list-panel.collapsed {
  width: 0;
  min-width: 0;
}
.docs-list-panel .list-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  width: 260px;
  background: transparent;
  transition: opacity 0.18s;
}
.docs-list-panel.collapsed .list-inner {
  opacity: 0;
  pointer-events: none;
}

/* 折叠按钮：浮动在 docs-edit 内，按钮中心始终落在 panel 右边缘 */
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

.list-toolbar {
  display: flex;
  gap: 6px;
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
.toolbar-btn .el-icon { font-size: 13px; }

.tree-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.tree-scroll::-webkit-scrollbar { width: 5px; }
.tree-scroll::-webkit-scrollbar-thumb { background: rgba(60, 40, 20, 0.18); border-radius: 3px; }

/* el-tree 节点行样式 */
.tree-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
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
}
.row-icon { font-size: 14px; flex-shrink: 0; color: #d2a55a; }
.folder-icon { color: #d2a55a; }
.tree-row.active .folder-icon { color: var(--accent-blue); }

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

/* el-tree 内置容器去多余 padding，让高亮顶天立地 */
:deep(.el-tree) {
  background: transparent;
}
/* 彻底隐藏 EP 默认展开箭头，由 slot 内自绘 chevron 接管视觉 */
:deep(.el-tree-node__expand-icon) {
  display: none !important;
}
/* 自绘 chevron：folder 行有箭头，doc 行用 spacer 占位 */
.row-chevron {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  font-size: 12px;
  color: var(--text-secondary, #606266);
  transition: transform 0.18s ease, color 0.15s;
}
.row-chevron.expanded {
  transform: rotate(90deg);
}
.tree-row:hover .row-chevron {
  color: var(--accent-blue);
}
.tree-row.active .row-chevron {
  color: var(--accent-blue);
}
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
  transition: background 0.15s, border-color 0.15s;
}
:deep(.el-tree-node__content:hover) {
  background: rgba(60, 40, 20, 0.04);
}
:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: rgba(47, 111, 228, 0.08);
  border-left-color: var(--accent-blue);
}

/* ============================================================
   右侧编辑区 — 扫平风（对齐 CryptoTool）
   - 整体透明背景，不用渐变 / backdrop-filter
   - 段落用 hairline border-bottom 分隔
   - 输入框：1px alpha 描边 + 白底 + 8px 圆角，hover/focus 加深
   - method 用文字色彩区分，不用胶囊背景
   ============================================================ */
.docs-form-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: transparent;
}

/* ---- 顶栏：method + path 一行 ---- */
.form-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}
.method-select {
  width: 110px;
  flex-shrink: 0;
}
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
.method-select :deep(.el-select__placeholder),
.method-select :deep(.el-select__selected-item) {
  color: var(--method-color, var(--text-primary)) !important;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.02em;
}
.method-select :deep(.el-select__caret) {
  color: var(--text-quaternary);
}

.path-input { flex: 1; min-width: 0; }
.path-input :deep(.el-input__wrapper) {
  height: 32px;
  border-radius: 8px;
  background: #fff;
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
.folder-crumb.in-header {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  height: 24px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-tertiary);
  background: rgba(60, 40, 20, 0.04);
  border-radius: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
  flex-shrink: 0;
}
.folder-crumb.in-header .el-icon { font-size: 12px; flex-shrink: 0; }

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
.section-action {
  margin-left: auto;
  height: 24px !important;
  padding: 0 8px !important;
  font-size: 12px !important;
  border-radius: 6px !important;
}
.section-action:hover {
  background: rgba(47, 111, 228, 0.06) !important;
}
.section-empty {
  font-size: 12px;
  color: var(--text-quaternary);
  padding: 16px 12px;
  text-align: center;
  border: 1px dashed rgba(60, 40, 20, 0.12);
  border-radius: 8px;
  background: transparent;
}

/* ---- 表单 row：左标签 + 右输入框 ---- */
.form-rows {
  display: flex;
  flex-direction: column;
}
.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  min-height: 36px;
}
.form-row.form-row-top {
  align-items: flex-start;
}
.form-row.form-row-top .row-label {
  padding-top: 8px;
}
.row-label {
  flex: 0 0 80px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: right;
}
.form-row :deep(.el-input),
.form-row :deep(.el-textarea) {
  flex: 1;
  min-width: 0;
}
.form-row :deep(.el-input__wrapper) {
  height: 30px;
  border-radius: 8px;
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.1);
}
.form-row :deep(.el-textarea__inner) {
  border-radius: 8px;
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.1);
  padding: 8px 12px;
  font-size: 12.5px;
  line-height: 1.55;
}
.form-row :deep(.el-input__wrapper:hover),
.form-row :deep(.el-textarea__inner:hover) {
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.2);
}
.form-row :deep(.el-input__wrapper.is-focus),
.form-row :deep(.el-textarea__inner:focus) {
  box-shadow: inset 0 0 0 1.5px var(--accent-blue);
}

/* ---- KV 表格 ---- */
.kv-table {
  border: 1px solid rgba(60, 40, 20, 0.1);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.kv-table-head,
.kv-table-row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) 100px 56px minmax(0, 1.4fr) 30px;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
}
.kv-table-head {
  height: 30px;
  background: rgba(60, 40, 20, 0.03);
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.kv-table-row {
  min-height: 36px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
  transition: background 0.12s;
}
.kv-table-row:last-child { border-bottom: 0; }
.kv-table-row:hover { background: rgba(47, 111, 228, 0.025); }

.kv-table :deep(.el-input__wrapper),
.kv-table :deep(.el-select__wrapper) {
  height: 28px;
  background: transparent;
  box-shadow: none;
  padding: 0 8px;
  border-radius: 6px;
  transition: box-shadow 0.12s, background 0.12s;
}
.kv-table :deep(.el-input__inner) {
  font-size: 12px;
  height: 28px;
  line-height: 28px;
}
.kv-table :deep(.el-input__wrapper:hover),
.kv-table :deep(.el-select__wrapper:hover) {
  background: rgba(60, 40, 20, 0.03);
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.12);
}
.kv-table :deep(.el-input__wrapper.is-focus),
.kv-table :deep(.el-select__wrapper.is-focused) {
  background: #fff !important;
  box-shadow: inset 0 0 0 1.5px var(--accent-blue) !important;
}
.kv-col-act { display: flex; justify-content: center; align-items: center; }
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
.kv-table-row .kv-delete { opacity: 0; }
.kv-table-row:hover .kv-delete { opacity: 1; }

/* ---- 响应 textarea ---- */
.resp-textarea {
  display: block;
  width: 100%;
}
.resp-textarea :deep(.el-textarea) {
  width: 100%;
}
.resp-textarea :deep(.el-textarea__inner) {
  width: 100%;
  box-sizing: border-box;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12.5px;
  line-height: 1.65;
  border-radius: 8px;
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.1);
  padding: 12px 14px;
  color: var(--text-primary);
  transition: box-shadow 0.12s;
}
.resp-textarea :deep(.el-textarea__inner:hover) {
  box-shadow: inset 0 0 0 1px rgba(60, 40, 20, 0.2);
}
.resp-textarea :deep(.el-textarea__inner:focus) {
  box-shadow: inset 0 0 0 1.5px var(--accent-blue);
}

/* ---- 底部操作栏 ---- */
.form-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  border-top: 1px solid rgba(60, 40, 20, 0.08);
  background: transparent;
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
  background: #67c23a;
}
.form-actions :deep(.el-button) {
  height: 30px;
  padding: 0 16px;
  font-weight: 600;
  border-radius: 7px;
}

/* 空态居中 */
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
.center-empty .el-icon {
  font-size: 32px;
  opacity: 0.4;
}

.docs-preview {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
  background: transparent;
}
.docs-preview::-webkit-scrollbar { width: 5px; }
.docs-preview::-webkit-scrollbar-thumb { background: rgba(60, 40, 20, 0.18); border-radius: 3px; }
.doc-preview-card {
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 12px;
  background: rgba(255,255,255,0.7);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.85);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.doc-preview-card:hover {
  border-color: rgba(47, 111, 228, 0.25);
}
.doc-preview-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.preview-path {
  font-weight: 700;
  font-size: 14px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  color: var(--text-primary);
}
.preview-name {
  color: var(--text-secondary);
  font-size: 12.5px;
}
.preview-edit-btn {
  margin-left: auto;
  height: 26px !important;
  padding: 0 10px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  border-radius: 6px !important;
  color: var(--text-tertiary) !important;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, background 0.15s !important;
}
.preview-edit-btn .el-icon { margin-right: 4px; font-size: 12px; }
.doc-preview-card:hover .preview-edit-btn { opacity: 1; }
.preview-edit-btn:hover {
  color: var(--accent-blue) !important;
  background: rgba(47, 111, 228, 0.08) !important;
}
.preview-desc {
  color: var(--text-secondary);
  font-size: 12px;
  margin: 8px 0 4px;
  line-height: 1.55;
}
.preview-resp {
  margin-top: 10px;
}
.preview-resp-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-quaternary);
  margin-bottom: 4px;
}
.folder-crumb {
  font-size: 11px;
  color: var(--text-quaternary);
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(60, 40, 20, 0.04);
}
.doc-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
.doc-table th, .doc-table td { padding: 7px 8px; border: 1px solid rgba(60, 40, 20, 0.08); text-align: left; }
.doc-table th { background: rgba(240, 233, 220,0.9); font-weight: 600; }

.method-tag { font-size: 10px; font-weight: 700; flex-shrink: 0; width: 40px; }
.item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-hint {
  text-align: center; color: var(--text-quaternary); font-size: 12px; padding: 24px;
  border: 1px dashed rgba(60, 40, 20, 0.08); border-radius: 14px; background: rgba(255,255,255,0.5);
  margin: 12px;
}
.response-body {
  margin: 0; padding: 10px 12px; font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace; font-size: 12px;
  line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; word-break: break-all; overflow-y: auto;
  max-height: 240px;
  border: 1px solid rgba(60, 40, 20, 0.08); border-radius: 8px; background: rgba(255,255,255,0.85);
}

@media (max-width: 960px) {
  .docs-edit { flex-direction: column; }
  .docs-list-panel {
    width: 100%;
    min-width: 0;
    border-right: 0;
    border-bottom: 1px solid rgba(60, 40, 20, 0.08);
    max-height: 280px;
  }
  .form-row { gap: 8px; }
  .row-label { flex: 0 0 64px; font-size: 11px; }
}
</style>
