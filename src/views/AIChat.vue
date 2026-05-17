<template>
  <div class="ai-chat-wrapper">
    <!-- 顶部 -->
    <div class="header">
      <span class="header-title">{{ t('aiChat.title') }}</span>
      <div class="header-actions">
        <el-button text :icon="Plus" @click="openAddDialog" :title="t('aiChat.addWebsite')" />
        <el-button text :icon="Setting" @click="showManageDialog = true" :title="t('aiChat.manageWebsites')" />
      </div>
    </div>

    <!-- 分类内容区 -->
    <div class="content-area">
      <template v-for="cat in AI_CATEGORIES" :key="cat.id">
        <div v-if="groupedSites[cat.id]?.length" class="category-section">
          <div class="category-label">{{ cat.name }}</div>
          <div class="icon-grid">
            <el-tooltip
              v-for="site in groupedSites[cat.id]"
              :key="site.id"
              :content="site.name"
              placement="top"
              :show-after="200"
            >
              <div class="icon-card" @click="openWebsite(site)">
                <img :src="site.icon_url" class="icon-img" @error="onIconError($event, site)" />
              </div>
            </el-tooltip>
          </div>
        </div>
      </template>
    </div>

    <!-- 添加 -->
    <el-dialog v-model="showAddDialog" :title="t('aiChat.addDialogTitle')" width="460px" :close-on-click-modal="false">
      <el-form :model="addForm" label-width="70px" @submit.prevent>
        <el-form-item :label="t('aiChat.category')">
          <el-select v-model="addForm.category" style="width: 100%">
            <el-option v-for="c in AI_CATEGORIES" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('aiChat.name')">
          <el-input v-model="addForm.name" :placeholder="t('aiChat.namePlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('aiChat.url')">
          <el-input v-model="addForm.url" placeholder="https://..." />
        </el-form-item>
        <el-form-item :label="t('aiChat.icon')">
          <div style="display: flex; gap: 8px; align-items: center; width: 100%">
            <el-input v-model="addForm.icon_url" :placeholder="t('aiChat.iconPlaceholder')" style="flex: 1" />
            <el-button @click="fetchIcon(addForm)" :loading="fetchingIcon">{{ t('aiChat.fetch') }}</el-button>
          </div>
          <img v-if="addForm.icon_url" :src="addForm.icon_url" class="icon-preview" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="addWebsite" :loading="adding">{{ t('common.add') }}</el-button>
      </template>
    </el-dialog>

    <!-- 管理 -->
    <el-dialog v-model="showManageDialog" :title="t('aiChat.manageDialogTitle')" width="700px">
      <el-table :data="allSites" stripe max-height="500" size="small">
        <el-table-column label="" width="46" align="center">
          <template #default="{ row }">
            <img :src="row.icon_url" style="width: 26px; height: 26px; border-radius: 6px; vertical-align: middle" />
          </template>
        </el-table-column>
        <el-table-column prop="name" :label="t('aiChat.nameColumn')" width="110" />
        <el-table-column :label="t('aiChat.categoryColumn')" width="80">
          <template #default="{ row }">{{ catName(row.category) }}</template>
        </el-table-column>
        <el-table-column prop="url" :label="t('aiChat.urlColumn')" show-overflow-tooltip />
        <el-table-column :label="t('aiChat.operations')" width="90" align="center">
          <template #default="{ row }">
            <el-button link type="primary" :icon="EditIcon" @click="editWebsite(row)" />
            <el-button link type="danger" :icon="Delete" @click="deleteWebsite(row)" />
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 编辑 -->
    <el-dialog v-model="showEditDialog" :title="t('aiChat.editDialogTitle')" width="460px" :close-on-click-modal="false">
      <el-form v-if="editForm" :model="editForm" label-width="70px" @submit.prevent>
        <el-form-item :label="t('aiChat.category')">
          <el-select v-model="editForm.category" style="width: 100%">
            <el-option v-for="c in AI_CATEGORIES" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('aiChat.name')">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item :label="t('aiChat.url')">
          <el-input v-model="editForm.url" />
        </el-form-item>
        <el-form-item :label="t('aiChat.icon')">
          <div style="display: flex; gap: 8px; align-items: center; width: 100%">
            <el-input v-model="editForm.icon_url" style="flex: 1" />
            <el-button @click="fetchIcon(editForm)" :loading="fetchingIcon">{{ t('aiChat.fetch') }}</el-button>
          </div>
          <img v-if="editForm.icon_url" :src="editForm.icon_url" class="icon-preview" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="updateWebsite">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, Setting, Edit as EditIcon, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import Database from '@tauri-apps/plugin-sql'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { AI_CATEGORIES, AI_SITES } from '@/data/ai-sites.js'
import { t } from '@/i18n'

// ── 状态 ──
const allSites = ref([])
const showAddDialog = ref(false)
const showManageDialog = ref(false)
const showEditDialog = ref(false)
const adding = ref(false)
const fetchingIcon = ref(false)

const addForm = ref({ name: '', url: '', icon_url: '', category: 'general' })
const editForm = ref(null)

// ── 按分类分组 ──
const groupedSites = computed(() => {
  const map = {}
  for (const cat of AI_CATEGORIES) map[cat.id] = []
  for (const site of allSites.value) {
    const key = site.category || 'general'
    ;(map[key] ??= map.general).push(site)
  }
  return map
})

const catName = (id) => AI_CATEGORIES.find(c => c.id === id)?.name || id

// ── 数据库 ──
const getDb = () => Database.load('sqlite:app.db')

const initDatabase = async () => {
  const db = await getDb()

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ai_websites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      icon_url TEXT,
      category TEXT DEFAULT 'general',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // 兼容旧表：添加 category 列
  try { await db.execute(`ALTER TABLE ai_websites ADD COLUMN category TEXT DEFAULT 'general'`) } catch {}

  const [{ count }] = await db.select('SELECT COUNT(*) as count FROM ai_websites')

  if (count === 0) {
    // 用预抓取的数据初始化，无需运行时下载图标
    const now = new Date().toISOString()
    for (let i = 0; i < AI_SITES.length; i++) {
      const s = AI_SITES[i]
      await db.execute(
        `INSERT INTO ai_websites (name, url, icon_url, category, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [s.name, s.url, s.icon_url, s.category, i, now, now]
      )
    }
  }

  await loadSites()
}

const loadSites = async () => {
  const db = await getDb()
  allSites.value = await db.select('SELECT * FROM ai_websites ORDER BY sort_order ASC, id ASC')
}

// ── 图标获取（通用，tauriFetch + base64）──
const downloadIconBase64 = async (iconUrl) => {
  const response = await tauriFetch(iconUrl, { method: 'GET' })
  if (!response.ok) return null
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const fetchIcon = async (form) => {
  if (!form.url) return ElMessage.warning(t('aiChat.enterUrl'))

  fetchingIcon.value = true
  try {
    const origin = new URL(form.url).origin
    const hostname = new URL(form.url).hostname
    const candidates = [
      `${origin}/favicon.ico`,
      `${origin}/favicon.png`,
      `${origin}/favicon.svg`,
      `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
    ]
    for (const url of candidates) {
      try {
        const b64 = await downloadIconBase64(url)
        if (b64) { form.icon_url = b64; ElMessage.success(t('aiChat.iconFetched')); return }
      } catch {}
    }
    ElMessage.warning(t('aiChat.iconFetchFailed'))
  } catch {
    ElMessage.error(t('aiChat.invalidUrl'))
  } finally {
    fetchingIcon.value = false
  }
}

// ── 生成首字母 SVG fallback ──
const letterIcon = (name) => {
  // Array.from 处理 surrogate pair / emoji,charAt(0) 在 emoji 下会切到一半。
  const letter = (Array.from(String(name || ''))[0] || '?').toUpperCase()
  const colors = ['#6366f1','var(--color-purple)','#ec4899','#f97316','var(--color-green)','#06b6d4','var(--accent-blue)','var(--color-red)']
  const bg = colors[(name?.charCodeAt(0) || 0) % colors.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/><text x="32" y="44" text-anchor="middle" font-family="system-ui,sans-serif" font-size="32" font-weight="600" fill="white">${letter}</text></svg>`
  // 旧:btoa(svg) —— 名字含中文/emoji 时 SVG 里有非 latin-1 字符,btoa 抛 InvalidCharacterError,
  // 整个 fallback 流程崩,UI 显示破图。改用 utf8 内联 data URL,无需 base64,绕过 btoa 限制。
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

const onIconError = (e, site) => {
  e.target.src = letterIcon(site.name)
}

// ── 打开网站 ──
const openWebsite = async (site) => {
  try {
    const label = `ai-${site.id}-${Date.now()}`
    const webview = new WebviewWindow(label, {
      url: site.url,
      title: site.name,
      width: 1400,
      height: 900,
      center: true,
      resizable: true,
      decorations: true,
    })
    webview.once('tauri://error', (e) => ElMessage.error(t('aiChat.openFailed') + e))
  } catch (err) {
    ElMessage.error(t('aiChat.windowFailed') + err.message)
  }
}

// ── CRUD ──
const openAddDialog = () => {
  addForm.value = { name: '', url: '', icon_url: '', category: 'general' }
  showAddDialog.value = true
}

const addWebsite = async () => {
  const f = addForm.value
  if (!f.name || !f.url) return ElMessage.warning(t('aiChat.fillNameAndUrl'))

  adding.value = true
  try {
    const db = await getDb()
    const now = new Date().toISOString()
    // 没有手动获取图标时，自动尝试一次
    if (!f.icon_url) await fetchIcon(f)
    // 仍然没有则生成首字母图标
    if (!f.icon_url) f.icon_url = letterIcon(f.name)

    await db.execute(
      `INSERT INTO ai_websites (name, url, icon_url, category, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, 999, ?, ?)`,
      [f.name, f.url, f.icon_url, f.category, now, now]
    )
    ElMessage.success(t('aiChat.addSuccess'))
    showAddDialog.value = false
    await loadSites()
  } catch (err) {
    ElMessage.error(t('aiChat.addFailed') + err.message)
  } finally {
    adding.value = false
  }
}

const editWebsite = (site) => {
  editForm.value = { ...site }
  showEditDialog.value = true
}

const updateWebsite = async () => {
  if (!editForm.value) return
  const f = editForm.value
  try {
    const db = await getDb()
    await db.execute(
      `UPDATE ai_websites SET name=?, url=?, icon_url=?, category=?, updated_at=? WHERE id=?`,
      [f.name, f.url, f.icon_url, f.category, new Date().toISOString(), f.id]
    )
    ElMessage.success(t('aiChat.saved'))
    showEditDialog.value = false
    await loadSites()
  } catch (err) {
    ElMessage.error(t('aiChat.saveFailed') + err.message)
  }
}

const deleteWebsite = async (site) => {
  try {
    await ElMessageBox.confirm(t('aiChat.confirmDeleteSite').replace('{name}', site.name), t('aiChat.confirmTitle'), { type: 'warning' })
    const db = await getDb()
    await db.execute('DELETE FROM ai_websites WHERE id = ?', [site.id])
    ElMessage.success(t('aiChat.deleted'))
    await loadSites()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(t('aiChat.deleteFailed'))
  }
}

onMounted(initDatabase)
</script>

<style scoped>
.ai-chat-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-secondary, var(--surface-panel-soft));
}

/* ── Header ── */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 48px;
  flex-shrink: 0;
  border-bottom: 0.5px solid var(--border-color);
  background: var(--bg-primary);
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 2px;
}

/* ── Content ── */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px 32px;
}

/* ── Category ── */
.category-section {
  margin-bottom: 20px;
}

.category-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  padding-left: 2px;
}

/* ── Icon Grid ── */
.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.icon-card {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  background: var(--bg-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.icon-card:hover {
  transform: scale(1.12);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.icon-card:active {
  transform: scale(0.96);
}

.icon-img {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: contain;
}

/* ── Dialogs ── */
.icon-preview {
  width: 40px;
  height: 40px;
  margin-top: 8px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 3px;
}

/* ── Scrollbar ── */
.content-area::-webkit-scrollbar { width: 4px; }
.content-area::-webkit-scrollbar-track { background: transparent; }
.content-area::-webkit-scrollbar-thumb { background: transparent; border-radius: 2px; }
.content-area:hover::-webkit-scrollbar-thumb { background: var(--text-quaternary); }
</style>
