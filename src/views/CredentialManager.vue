<template>
  <div class="credential-manager">
    <!-- 顶部栏 -->
    <header class="header">
      <div class="header-left">
        <span class="page-title">{{ t('credential.title') }}</span>
      </div>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          :placeholder="t('credential.search')"
          clearable
          class="header-search"
          size="small"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button size="small" circle @click="handleRefresh" :title="t('common.refresh')">
          <el-icon><Refresh /></el-icon>
        </el-button>
        <template v-if="activeTab === 'credentials'">
          <el-button size="small" type="primary" circle @click="showAddDialog" :title="t('credential.addCredential')">
            <el-icon><Plus /></el-icon>
          </el-button>
        </template>
        <template v-else>
          <el-button size="small" circle @click="openPasskeySettings" :title="t('credential.openPasskeySettings')">
            <el-icon><Unlock /></el-icon>
          </el-button>
        </template>
      </div>
    </header>

    <!-- 双标签页内容 -->
    <div class="main-tabs">
      <el-tabs v-model="activeTab" class="cred-tabs">
        <!-- 系统凭据 -->
        <el-tab-pane :label="t('credential.sysCredentials')" name="credentials">
          <div class="list-wrapper" v-loading="loading">
            <div v-if="filteredCredentials.length > 0" class="card-list">
              <div
                v-for="(row, idx) in filteredCredentials"
                :key="row.target_name"
                class="card-item"
              >
                <!-- 第一行：名称 + 操作 -->
                <div class="card-row card-header-row">
                  <div class="card-title-section">
                    <el-icon class="card-icon"><Key /></el-icon>
                    <span class="card-title" :title="row.target_name">{{ row.target_name }}</span>
                  </div>
                  <div class="card-actions">
                    <el-button text size="small" @click="viewCredential(row)" :title="t('credential.viewDetail')">
                      <el-icon><View /></el-icon>
                    </el-button>
                    <el-button text size="small" @click="copyText(row.username)" :title="t('credential.copyUsername')">
                      <el-icon><CopyDocument /></el-icon>
                    </el-button>
                    <el-button text type="danger" size="small" @click="confirmDelete(row)" :title="t('common.delete')">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
                <!-- 第二行：用户名 + 类型 + 时间 -->
                <div class="card-info-row">
                  <span class="card-username">{{ row.username }}</span>
                  <el-tag size="small" :type="typeTagColor(row.credential_type)">{{ row.credential_type }}</el-tag>
                  <span class="card-time">{{ formatTime(row.last_written) }}</span>
                </div>
              </div>
            </div>
            <el-empty v-else-if="!loading" :description="t('credential.noCredentials')" :image-size="120" />
          </div>
        </el-tab-pane>

        <!-- 通行密钥 -->
        <el-tab-pane :label="t('credential.passkeys')" name="passkeys">
          <div class="list-wrapper" v-loading="passkeyLoading">
            <!-- API 不可用 -->
            <div v-if="passkeyApiError" class="passkey-fallback">
              <el-icon :size="48" color="var(--text-quaternary)"><Warning /></el-icon>
              <p class="fallback-title">{{ t('credential.cannotEnumPasskeys') }}</p>
              <p class="fallback-desc">{{ passkeyApiError }}</p>
              <el-button size="small" @click="openPasskeySettings">{{ t('credential.openPasskeySettings') }}</el-button>
            </div>

            <!-- 正常列表 -->
            <template v-else-if="!passkeyLoading">
              <div v-if="filteredPasskeys.length > 0" class="card-list">
                <div
                  v-for="row in filteredPasskeys"
                  :key="row.credential_id"
                  class="card-item"
                >
                  <!-- 第一行：网站 + 操作 -->
                  <div class="card-row card-header-row">
                    <div class="card-title-section">
                      <el-icon class="card-icon"><Unlock /></el-icon>
                      <span class="card-title" :title="row.rp_id">{{ row.rp_id }}</span>
                    </div>
                    <div class="card-actions">
                      <el-button
                        v-if="row.removable"
                        text
                        type="danger"
                        size="small"
                        @click="confirmDeletePasskey(row)"
                        :title="t('common.delete')"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                      <span v-else class="text-muted">{{ t('credential.cannotDelete') }}</span>
                    </div>
                  </div>
                  <!-- 第二行：用户名 + RP名称 -->
                  <div class="card-info-row">
                    <span class="card-username">{{ row.user_name || row.user_display_name || '-' }}</span>
                    <span v-if="row.rp_name && row.rp_name !== row.rp_id" class="card-time">{{ row.rp_name }}</span>
                  </div>
                </div>
              </div>
              <el-empty v-else :description="t('credential.noPasskeys')" :image-size="120" />
            </template>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 添加凭据对话框 -->
    <el-dialog v-model="addDialogVisible" :title="t('credential.addCredentialTitle')" width="460" :close-on-click-modal="false">
      <el-form :model="addForm" label-width="80px" size="small">
        <el-form-item :label="t('credential.targetName')">
          <el-input v-model="addForm.target_name" :placeholder="t('credential.targetPlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('credential.username')">
          <el-input v-model="addForm.username" :placeholder="t('credential.username')" />
        </el-form-item>
        <el-form-item :label="t('credential.password')">
          <el-input v-model="addForm.password" type="password" show-password :placeholder="t('credential.password')" />
        </el-form-item>
        <el-form-item :label="t('credential.notesLabel')">
          <el-input v-model="addForm.comment" type="textarea" :rows="2" :placeholder="t('credential.notesPlaceholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="addDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button size="small" type="primary" @click="saveCredential" :loading="saving">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="detailDialogVisible" :title="t('credential.detailTitle')" width="500">
      <div class="detail-grid" v-if="detailData">
        <div class="detail-row">
          <span class="detail-label">{{ t('credential.targetName') }}</span>
          <span class="detail-value">{{ detailData.target_name }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('credential.username') }}</span>
          <span class="detail-value copyable" @click="copyText(detailData.username)">
            {{ detailData.username }}
            <el-icon class="copy-icon"><CopyDocument /></el-icon>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('credential.password') }}</span>
          <span class="detail-value copyable" @click="copyText(detailData.password)">
            <template v-if="passwordVisible">{{ detailData.password }}</template>
            <template v-else>••••••••</template>
            <el-button link size="small" @click.stop="passwordVisible = !passwordVisible" class="toggle-pwd">
              <el-icon><View v-if="!passwordVisible" /><Hide v-else /></el-icon>
            </el-button>
            <el-icon class="copy-icon"><CopyDocument /></el-icon>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('passwords.type') }}</span>
          <span class="detail-value">
            <el-tag size="small" :type="typeTagColor(detailData.credential_type)">
              {{ detailData.credential_type }}
            </el-tag>
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('credential.persist') }}</span>
          <span class="detail-value">{{ detailData.persist }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ t('credential.lastWritten') }}</span>
          <span class="detail-value">{{ formatTime(detailData.last_written) }}</span>
        </div>
        <div class="detail-row" v-if="detailData.comment">
          <span class="detail-label">{{ t('credential.notesLabel') }}</span>
          <span class="detail-value">{{ detailData.comment }}</span>
        </div>
      </div>
      <template #footer>
        <el-button size="small" @click="detailDialogVisible = false">{{ t('common.close') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { Search, Refresh, Unlock, Plus, CopyDocument, View, Hide, Warning, Delete, Key } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'

const loading = ref(false)
const saving = ref(false)
const searchKeyword = ref('')
const credentials = ref([])
const activeTab = ref('credentials')

// 通行密钥
const passkeys = ref([])
const passkeyLoading = ref(false)
const passkeyApiError = ref('')
let passkeyLoaded = false

// 添加对话框
const addDialogVisible = ref(false)
const addForm = ref({ target_name: '', username: '', password: '', comment: '' })

// 详情对话框
const detailDialogVisible = ref(false)
const detailData = ref(null)
const passwordVisible = ref(false)

// 过滤凭据
const filteredCredentials = computed(() => {
  const kw = searchKeyword.value.toLowerCase()
  if (!kw) return credentials.value
  return credentials.value.filter(
    c => c.target_name.toLowerCase().includes(kw) || c.username.toLowerCase().includes(kw)
  )
})

// 过滤通行密钥
const filteredPasskeys = computed(() => {
  const kw = searchKeyword.value.toLowerCase()
  if (!kw) return passkeys.value
  return passkeys.value.filter(
    p => p.rp_id.toLowerCase().includes(kw)
      || p.rp_name.toLowerCase().includes(kw)
      || p.user_name.toLowerCase().includes(kw)
      || p.user_display_name.toLowerCase().includes(kw)
  )
})

// 类型 → Tag 颜色
const typeTagColor = (type) => {
  const map = { Generic: '', DomainPassword: 'warning', DomainCertificate: 'success' }
  return map[type] || 'info'
}

// 格式化时间
const formatTime = (iso) => {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

// 刷新按钮根据当前 tab
const handleRefresh = () => {
  if (activeTab.value === 'credentials') {
    loadCredentials()
  } else {
    loadPasskeys()
  }
}

// 加载凭据列表
const loadCredentials = async () => {
  loading.value = true
  try {
    credentials.value = await invoke('list_credentials')
  } catch (e) {
    ElMessage.error(t('credential.loadFailed') + ` ${e}`)
  } finally {
    loading.value = false
  }
}

// 加载通行密钥列表
const loadPasskeys = async () => {
  passkeyLoading.value = true
  passkeyApiError.value = ''
  try {
    passkeys.value = await invoke('list_passkeys')
    passkeyLoaded = true
  } catch (e) {
    passkeyApiError.value = String(e)
    passkeys.value = []
  } finally {
    passkeyLoading.value = false
  }
}

// 查看凭据详情
const viewCredential = async (row) => {
  try {
    detailData.value = await invoke('read_credential', { targetName: row.target_name })
    passwordVisible.value = false
    detailDialogVisible.value = true
  } catch (e) {
    ElMessage.error(`读取凭据失败: ${e}`)
  }
}

// 显示添加对话框
const showAddDialog = () => {
  addForm.value = { target_name: '', username: '', password: '', comment: '' }
  addDialogVisible.value = true
}

// 保存凭据
const saveCredential = async () => {
  const { target_name, username, password } = addForm.value
  if (!target_name || !username || !password) {
    ElMessage.warning(t('credential.fillRequired'))
    return
  }
  saving.value = true
  try {
    await invoke('add_credential', {
      targetName: target_name,
      username,
      password,
      comment: addForm.value.comment
    })
    ElMessage.success(t('credential.credentialSaved'))
    addDialogVisible.value = false
    await loadCredentials()
  } catch (e) {
    ElMessage.error(`保存失败: ${e}`)
  } finally {
    saving.value = false
  }
}

// 删除凭据
const confirmDelete = (row) => {
  ElMessageBox.confirm(t('credential.confirmDeleteCred').replace('{name}', row.target_name), t('credential.confirmDeleteTitle'), {
    confirmButtonText: t('credential.confirmDeleteBtn'),
    cancelButtonText: t('credential.cancelBtn'),
    type: 'warning'
  }).then(async () => {
    try {
      await invoke('delete_credential', {
        targetName: row.target_name,
        credType: row.credential_type
      })
      ElMessage.success(t('credential.deletedSuccess'))
      await loadCredentials()
    } catch (e) {
      ElMessage.error(t('common.deleteFailed') + `: ${e}`)
    }
  }).catch(() => {})
}

// 删除通行密钥
const confirmDeletePasskey = (row) => {
  const label = row.rp_id + (row.user_name ? ` (${row.user_name})` : '')
  ElMessageBox.confirm(t('credential.confirmDeletePasskey').replace('{name}', label), t('credential.confirmDeleteTitle'), {
    confirmButtonText: t('credential.confirmDeleteBtn'),
    cancelButtonText: t('credential.cancelBtn'),
    type: 'warning'
  }).then(async () => {
    try {
      await invoke('delete_passkey', {
        rpId: row.rp_id,
        credentialId: row.credential_id
      })
      ElMessage.success(t('credential.deletedSuccess'))
      await loadPasskeys()
    } catch (e) {
      ElMessage.error(t('common.deleteFailed') + `: ${e}`)
    }
  }).catch(() => {})
}

// 打开 Passkey 设置
const openPasskeySettings = async () => {
  try {
    await invoke('open_passkey_settings')
  } catch (e) {
    ElMessage.error(`${e}`)
  }
}

// 复制文本
const copyText = async (text) => {
  try {
    await writeText(text)
    ElMessage.success(t('credential.copied'))
  } catch {
    ElMessage.error(t('common.copyFailed'))
  }
}

// 懒加载：首次切到通行密钥 tab 时才请求
watch(activeTab, (tab) => {
  if (tab === 'passkeys' && !passkeyLoaded) {
    loadPasskeys()
  }
})

onMounted(loadCredentials)
</script>

<style scoped>
.credential-manager {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-primary);
  background-color: var(--bg-secondary);
  height: 100%;
  width: 100%;
  position: relative;
}

/* 顶部导航 */
.header {
  height: 48px;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-lg);
  flex-shrink: 0;
  z-index: 2;
  position: relative;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.page-title {
  font-size: var(--font-size-body);
  color: var(--text-secondary);
  font-weight: var(--font-weight-regular);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.header-search {
  width: 200px;
}

.main-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cred-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}

:deep(.cred-tabs > .el-tabs__header) {
  padding: 0 var(--space-lg);
  margin-bottom: 0;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

:deep(.cred-tabs > .el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

:deep(.cred-tabs .el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 列表区域 */
.list-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  background: var(--bg-secondary);
}

/* 卡片容器 */
.card-list {
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color-strong);
  overflow: hidden;
}

/* 卡片项 */
.card-item {
  padding: 13px 20px;
  transition: background 0.15s;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  background: var(--bg-primary);
}

.card-item:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
}

.card-item:nth-child(even) {
  background: var(--bg-grouped);
}

.card-item:hover {
  background: var(--accent-blue-bg);
}

/* 卡片行 */
.card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.card-header-row {
  padding-bottom: 0;
}

.card-title-section {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
  min-width: 0;
}

.card-icon {
  font-size: 20px;
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.card-title {
  margin: 0;
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

/* 操作按钮 */
.card-actions {
  display: flex;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.card-actions .el-button {
  padding: var(--space-xs);
}

/* 信息行 */
.card-info-row {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
  flex-wrap: wrap;
}

.card-username {
  font-size: var(--font-size-footnote);
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.card-time {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
}

.text-muted {
  font-size: 12px;
  color: var(--text-quaternary);
}

/* Passkey fallback */
.passkey-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  gap: 8px;
}

.fallback-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 8px 0 0;
}

.fallback-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  max-width: 400px;
  margin: 0 0 12px;
}

/* 详情网格 */
.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 4px 16px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  width: 70px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-tertiary);
  text-align: right;
}

.detail-value {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-value.copyable {
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 6px;
  margin: -2px -6px;
  transition: background 0.2s;
}

.detail-value.copyable:hover {
  background: var(--bg-primary);
}

.copy-icon {
  font-size: 13px;
  color: var(--text-quaternary);
  flex-shrink: 0;
}

.toggle-pwd {
  padding: 0;
  margin: 0;
}
</style>
