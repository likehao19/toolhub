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
        <el-button size="small" type="primary" @click="onAddApiDoc">+ {{ t('apiDocs.newApiDef') }}</el-button>
        <el-button size="small" @click="showModelDialog = true">{{ t('apiDocs.dataModels') }}</el-button>
        <el-button size="small" @click="docsViewMode = docsViewMode === 'edit' ? 'preview' : 'edit'">
          {{ docsViewMode === 'edit' ? t('apiDocs.docPreview') : t('apiDocs.docEdit') }}
        </el-button>
      </div>
    </div>

    <!-- Content -->
    <div class="content-area">
      <!-- Edit Mode -->
      <div v-if="docsViewMode === 'edit'" class="docs-edit">
        <div class="docs-list-panel">
          <div v-for="doc in apiDocsList" :key="doc.id" class="doc-item"
            :class="{ active: editDocId === doc.id }" @click="editDocId = doc.id">
            <span class="method-tag" :style="{ color: METHOD_COLORS[doc.method] }">{{ doc.method }}</span>
            <span class="item-name">{{ doc.path }}</span>
            <el-icon class="kv-delete" @click.stop="onDeleteDoc(doc.id)"><Close /></el-icon>
          </div>
          <div v-if="!apiDocsList.length" class="empty-hint">{{ t('apiDocs.noApiDocs') }}</div>
        </div>
        <div class="docs-form-panel" v-if="editingDoc">
          <el-form label-width="80px" size="small">
            <el-form-item :label="t('apiDocs.apiName')">
              <el-input v-model="editingDoc.name" />
            </el-form-item>
            <el-form-item :label="t('apiDocs.method')">
              <el-select v-model="editingDoc.method" style="width:120px">
                <el-option v-for="m in methods" :key="m" :label="m" :value="m" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('apiDocs.path')">
              <el-input v-model="editingDoc.path" placeholder="/api/users" />
            </el-form-item>
            <el-form-item :label="t('apiDocs.group')">
              <el-input v-model="editingDoc.group" placeholder="用户管理" />
            </el-form-item>
            <el-form-item :label="t('apiDocs.description')">
              <el-input v-model="editingDoc.description" type="textarea" :rows="2" />
            </el-form-item>
            <el-divider content-position="left">{{ t('apiDocs.reqParams') }}</el-divider>
            <div class="kv-editor">
              <div class="kv-row kv-header-row">
                <span style="flex:1;font-weight:600;font-size:11px">{{ t('apiDocs.fieldName') }}</span>
                <span style="width:80px;font-weight:600;font-size:11px">{{ t('apiDocs.fieldType') }}</span>
                <span style="width:50px;font-weight:600;font-size:11px">{{ t('apiDocs.required') }}</span>
                <span style="flex:1;font-weight:600;font-size:11px">{{ t('apiDocs.fieldDesc') }}</span>
                <span style="width:20px"></span>
              </div>
              <div v-for="(f, i) in editingDoc.fields" :key="i" class="kv-row">
                <el-input v-model="f.name" size="small" placeholder="name" style="flex:1" />
                <el-select v-model="f.type" size="small" style="width:80px">
                  <el-option v-for="ft in fieldTypes" :key="ft" :label="ft" :value="ft" />
                </el-select>
                <el-checkbox v-model="f.required" size="small" style="width:50px" />
                <el-input v-model="f.description" size="small" placeholder="说明" style="flex:1" />
                <el-icon class="kv-delete" @click="editingDoc.fields.splice(i, 1)"><Close /></el-icon>
              </div>
              <el-button size="small" text type="primary"
                @click="editingDoc.fields.push({ name: '', type: 'string', required: false, description: '' })">
                + {{ t('apiDocs.addField') }}
              </el-button>
            </div>
            <el-divider content-position="left">{{ t('apiDocs.respDef') }}</el-divider>
            <el-input v-model="editingDoc.responseExample" type="textarea" :rows="5"
              placeholder='{"code": 0, "data": {}, "message": "success"}' style="font-family:monospace" />
            <div style="margin-top:12px">
              <el-button size="small" type="primary" @click="doSaveDoc">{{ t('common.save') }}</el-button>
              <el-button size="small" @click="doGenSchemaFromExample">{{ t('apiDocs.genFromExample') }}</el-button>
            </div>
          </el-form>
        </div>
        <div v-else class="empty-hint" style="flex:1;display:flex;align-items:center;justify-content:center">
          {{ t('apiDocs.selectApiDoc') }}
        </div>
      </div>
      <!-- Preview Mode -->
      <div v-else class="docs-preview">
        <div v-for="doc in apiDocsList" :key="doc.id" class="doc-preview-card">
          <div class="doc-preview-header">
            <span class="method-tag" :style="{ color: METHOD_COLORS[doc.method], fontSize: '13px' }">{{ doc.method }}</span>
            <span style="font-weight:600;font-size:14px">{{ doc.path }}</span>
            <span style="color:var(--text-tertiary);margin-left:12px">{{ doc.name }}</span>
          </div>
          <p v-if="doc.description" style="color:var(--text-secondary);font-size:12px;margin:6px 0">{{ doc.description }}</p>
          <table v-if="doc.fields?.length" class="doc-table">
            <thead><tr><th>{{ t('apiDocs.fieldName') }}</th><th>{{ t('apiDocs.fieldType') }}</th><th>{{ t('apiDocs.required') }}</th><th>{{ t('apiDocs.fieldDesc') }}</th></tr></thead>
            <tbody>
              <tr v-for="f in doc.fields" :key="f.name">
                <td style="font-family:monospace">{{ f.name }}</td>
                <td>{{ f.type }}</td>
                <td>{{ f.required ? '✅' : '' }}</td>
                <td>{{ f.description }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="doc.responseExample" style="margin-top:8px">
            <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:4px">Response Example:</div>
            <pre class="response-body" style="max-height:200px">{{ tryFormatJson(doc.responseExample) }}</pre>
          </div>
        </div>
        <div v-if="!apiDocsList.length" class="empty-hint" style="padding:60px">{{ t('apiDocs.noApiDocs') }}</div>
      </div>
    </div>

    <!-- Data Models Dialog -->
    <el-dialog v-model="showModelDialog" :title="t('apiDocs.dataModels')" width="600px" append-to-body>
      <div v-for="(model, mi) in dataModels" :key="model.id" style="margin-bottom:16px;padding:12px;border:1px solid var(--border-color);border-radius:6px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <el-input v-model="model.name" size="small" style="width:150px" placeholder="Model Name" />
          <el-input v-model="model.description" size="small" style="flex:1" placeholder="描述" />
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document, Close } from '@element-plus/icons-vue'
import { t } from '@/i18n'
import { METHOD_COLORS, tryFormatJson, uuid } from '@/utils/apiWorkbench/shared'
import { loadApiDocs, saveApiDocs, loadDataModels, saveDataModels, inferSchema } from '@/utils/apiWorkbench/apiDocs'

const router = useRouter()

const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
const fieldTypes = ['string', 'number', 'integer', 'boolean', 'array', 'object']

const apiDocsList = ref([])
const editDocId = ref(null)
const docsViewMode = ref('edit')
const showModelDialog = ref(false)
const dataModels = ref([])

const editingDoc = computed(() => apiDocsList.value.find(d => d.id === editDocId.value) || null)

function onAddApiDoc() {
  const doc = {
    id: uuid(), name: '新接口', method: 'GET', path: '/api/', group: '', description: '',
    fields: [], responseExample: '{ "code": 0, "data": {}, "message": "success" }',
  }
  apiDocsList.value.push(doc)
  editDocId.value = doc.id
  saveApiDocs(apiDocsList.value)
}

function onDeleteDoc(id) {
  apiDocsList.value = apiDocsList.value.filter(d => d.id !== id)
  if (editDocId.value === id) editDocId.value = null
  saveApiDocs(apiDocsList.value)
}

function doSaveDoc() {
  if (!editingDoc.value) return
  if (!editingDoc.value.path?.trim()) { ElMessage.warning(t('apiDocs.path') + ' 不能为空'); return }
  saveApiDocs(apiDocsList.value)
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
    }
    ElMessage.success(t('apiDocs.saved'))
  } catch { ElMessage.error('JSON 解析失败') }
}

function doSaveModels() {
  saveDataModels(dataModels.value)
  showModelDialog.value = false
  ElMessage.success(t('apiDocs.saved'))
}

onMounted(() => {
  apiDocsList.value = loadApiDocs()
  dataModels.value = loadDataModels()
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
.content-area { flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 14px 18px 0; min-height: 0; }

.docs-edit { flex: 1; display: flex; overflow: hidden; min-height: 0; }
.docs-list-panel {
  width: 250px;
  min-width: 220px;
  overflow-y: auto;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-right: none;
  border-radius: 18px 0 0 18px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(241, 245, 249, 0.98));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
}
.doc-item {
  display: flex; align-items: center; gap: 6px; padding: 10px 12px; cursor: pointer; font-size: 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
}
.doc-item:hover { background: rgba(255,255,255,0.62); }
.doc-item.active { background: linear-gradient(135deg, var(--accent-blue), #7c3aed); color: #fff; }
.doc-item.active .method-tag { color: #fff !important; }
.doc-item.active .item-name { color: #fff; }
.doc-item .kv-delete { display: none; }
.doc-item:hover .kv-delete { display: block; }
.docs-form-panel,
.docs-preview {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0 18px 18px 0;
  background: linear-gradient(180deg, rgba(252,253,255,0.99), rgba(245,247,250,0.98));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
}
.docs-preview { border-radius: 18px; }
.doc-preview-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 12px;
  background: rgba(255,255,255,0.72);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.85);
}
.doc-preview-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.doc-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
.doc-table th, .doc-table td { padding: 7px 8px; border: 1px solid rgba(15, 23, 42, 0.08); text-align: left; }
.doc-table th { background: rgba(241,245,249,0.9); font-weight: 600; }

.method-tag { font-size: 10px; font-weight: 700; flex-shrink: 0; width: 40px; }
.item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); }
.empty-hint {
  text-align: center; color: var(--text-quaternary); font-size: 12px; padding: 24px;
  border: 1px dashed rgba(15, 23, 42, 0.08); border-radius: 14px; background: rgba(255,255,255,0.5);
}
.kv-editor { padding: 4px 0; }
.kv-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.kv-header-row { margin-bottom: 6px; }
.kv-delete { flex-shrink: 0; font-size: 14px; color: var(--text-quaternary); cursor: pointer; }
.kv-delete:hover { color: var(--el-color-danger); }
.response-body {
  margin: 0; padding: 12px; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;
  line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; word-break: break-all; overflow-y: auto;
  border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 12px; background: rgba(255,255,255,0.7);
}

@media (max-width: 960px) {
  .content-area { padding: 14px 14px 0; }
  .docs-edit { flex-direction: column; }
  .docs-list-panel {
    width: 100%;
    min-width: 0;
    border-right: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 18px 18px 0 0;
    max-height: 280px;
  }
  .docs-form-panel { border-radius: 0 0 18px 18px; }
}
</style>
