<template>
  <div class="bookmarks-page-wrapper">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <el-button size="small" circle @click="hideSidebar = !hideSidebar" :title="hideSidebar ? t('common.showSidebar') : t('common.hideSidebar')" class="sidebar-toggle-btn">
          <el-icon><ArrowLeft v-if="!hideSidebar" /><ArrowRight v-else /></el-icon>
        </el-button>
        <div class="page-title-block">
          <div class="page-eyebrow">Knowledge Vault</div>
          <div class="breadcrumb">
            <span>{{ t('bookmarks.title') }}</span>
            <span class="breadcrumb-divider">/</span>
            <span>{{ currentCategoryName }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          :placeholder="t('bookmarks.searchPlaceholder')"
          clearable
          style="width: 250px;"
          size="small"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <!-- 操作按钮组 -->
        <el-button size="small" circle @click="openImportDialog" :title="t('bookmarks.importBookmarks')">
          <el-icon><Upload /></el-icon>
        </el-button>
        <el-button size="small" circle @click="exportBookmarks" :title="t('bookmarks.exportBookmarks')">
          <el-icon><Download /></el-icon>
        </el-button>
        <el-button size="small" type="primary" circle @click="showCreateDialog" :title="t('bookmarks.addBookmark')">
          <el-icon><Plus /></el-icon>
        </el-button>
      </div>
    </header>

    <div class="main-container" :class="{ 'sidebar-hidden': hideSidebar }">
      <!-- 左侧分类栏 -->
      <aside class="sidebar-left" v-show="!hideSidebar">
        <div class="sidebar-toolbar">
          <span class="sidebar-title">{{ t('common.category') }}</span>
          <div class="actions">
            <span class="sidebar-btn" :title="t('common.newCategory')" @click="showAddCategoryDialog">
              <i class="fa-solid fa-plus"></i>
            </span>
          </div>
        </div>

        <div class="category-list">
          <!-- 全部书签 -->
          <div
            class="category-item"
            :class="{ active: selectedCategory === null }"
            @click="selectCategory(null)"
          >
            <el-icon class="category-icon"><Folder /></el-icon>
            <span class="category-name">{{ t('bookmarks.allBookmarks') }}</span>
            <span class="category-count">{{ bookmarks.length }}</span>
          </div>

          <!-- 常用书签（收藏） -->
          <div
            class="category-item category-favorite"
            :class="{ active: selectedCategory === 'favorite' }"
            @click="selectCategory('favorite')"
          >
            <el-icon class="category-icon favorite-icon"><StarFilled /></el-icon>
            <span class="category-name">{{ t('bookmarks.favorites') }}</span>
            <span class="category-count">{{ getFavoriteCount() }}</span>
          </div>

          <!-- 自定义分类 -->
          <div
            v-for="category in categories"
            :key="category.id"
            class="category-item"
            :class="{ active: selectedCategory === category.id }"
            @click="selectCategory(category.id)"
          >
            <el-icon class="category-icon" :style="{ color: getIconColor(category.icon) }">
              <component :is="getCategoryIcon(category.icon)" />
            </el-icon>
            <span class="category-name">{{ category.name }}</span>
            <span class="category-count">{{ getCategoryCount(category.id) }}</span>
            <div class="category-actions" v-if="!category.is_default">
              <i class="fa-solid fa-pen action-icon" @click.stop="editCategory(category)" :title="t('common.edit')"></i>
              <i class="fa-solid fa-trash action-icon del" @click.stop="deleteCategory(category)" :title="t('common.delete')"></i>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧内容区域 -->
      <main class="content-area">
        <!-- 书签列表 -->
        <div class="bookmark-list" v-loading="loading">
          <el-empty v-if="filteredBookmarks.length === 0" :description="t('bookmarks.noBookmarks')" />

          <div v-else class="bookmark-cards">
            <div
              v-for="bookmark in filteredBookmarks"
              :key="bookmark.id"
              class="bookmark-row"
              @dblclick="openBookmark(bookmark)"
              @contextmenu.prevent="showContextMenu($event, bookmark)"
            >
              <!-- 单行紧凑布局：[favicon] [标题] [URL灰色] [hover操作按钮] -->
              <div class="row-left" @click="openBookmark(bookmark)">
                <!-- Favicon：优先 favicon_data > favicon_url > 默认图标 -->
                <div class="bookmark-favicon">
                  <img
                    v-if="bookmark.favicon_data"
                    :src="bookmark.favicon_data"
                    :alt="bookmark.title"
                  />
                  <img
                    v-else-if="bookmark.favicon_url"
                    :src="bookmark.favicon_url"
                    :data-url="bookmark.url"
                    :alt="bookmark.title"
                    @error="handleFaviconError"
                  />
                  <el-icon v-else class="default-favicon">
                    <Link />
                  </el-icon>
                </div>
                <span class="row-title">{{ bookmark.title }}</span>
                <span class="row-url">{{ getDisplayUrl(bookmark.url) }}</span>
              </div>

              <!-- 右侧：hover 操作按钮 + 收藏星标 -->
              <div class="row-right">
                <div class="row-actions">
                  <el-button text size="small" @click.stop="editBookmark(bookmark)" :title="t('common.edit')">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button text size="small" type="danger" @click.stop="deleteBookmark(bookmark)" :title="t('common.delete')">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <el-icon
                  class="favorite-star"
                  :class="{ 'is-favorite': bookmark.is_favorite }"
                  @click.stop="toggleFavorite(bookmark)"
                  :title="t('bookmarks.markFavorite')"
                >
                  <StarFilled v-if="bookmark.is_favorite" />
                  <Star v-else />
                </el-icon>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 右键菜单 -->
    <teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click="contextMenu.visible = false"
      >
        <div class="context-menu-item" @click="openBookmark(contextMenu.bookmark)">
          <el-icon><Link /></el-icon>
          <span>{{ t('bookmarks.openBookmark') }}</span>
        </div>
        <div class="context-menu-item" @click="copyToClipboard(contextMenu.bookmark.url, 'URL')">
          <el-icon><CopyDocument /></el-icon>
          <span>{{ t('bookmarks.copyUrl') }}</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" @click="editBookmark(contextMenu.bookmark)">
          <el-icon><Edit /></el-icon>
          <span>{{ t('common.edit') }}</span>
        </div>
        <div class="context-menu-item danger" @click="deleteBookmark(contextMenu.bookmark)">
          <el-icon><Delete /></el-icon>
          <span>{{ t('common.delete') }}</span>
        </div>
      </div>
    </teleport>

    <!-- 添加/编辑书签对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingBookmark ? t('bookmarks.editBookmark') : t('bookmarks.addBookmarkTitle')"
      width="500px"
    >
      <el-form :model="bookmarkForm" label-width="80px">
        <el-form-item label="URL" required>
          <div style="display: flex; gap: 8px; width: 100%;">
            <el-input v-model="bookmarkForm.url" placeholder="https://example.com" style="flex: 1;" @blur="onUrlBlur" />
            <el-button :loading="fetchingInfo" @click="fetchWebsiteInfo" :disabled="!bookmarkForm.url">
              {{ fetchingInfo ? t('bookmarks.fetching') : t('bookmarks.fetchInfo') }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item :label="t('common.title')" required>
          <el-input v-model="bookmarkForm.title" :placeholder="t('bookmarks.bookmarkTitle')" />
        </el-form-item>
        <el-form-item :label="t('common.description')">
          <el-input
            v-model="bookmarkForm.description"
            type="textarea"
            :rows="2"
            :placeholder="t('bookmarks.bookmarkDesc')"
          />
        </el-form-item>
        <el-form-item :label="t('common.category')">
          <el-select v-model="bookmarkForm.category_id" :placeholder="t('bookmarks.selectCategory')" clearable style="width: 100%;">
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            >
              <el-icon :style="{ color: getIconColor(category.icon) }">
                <component :is="getCategoryIcon(category.icon)" />
              </el-icon>
              <span style="margin-left: 8px;">{{ category.name }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="t('bookmarks.tagLabel')">
          <el-select
            v-model="bookmarkForm.tagsArray"
            multiple
            filterable
            allow-create
            default-first-option
            :placeholder="t('bookmarks.selectTags')"
            style="width: 100%;"
          >
            <el-option
              v-for="tag in allTags"
              :key="tag.name"
              :label="tag.name"
              :value="tag.name"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveBookmark">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 添加/编辑分类对话框 -->
    <el-dialog
      v-model="categoryDialogVisible"
      :title="editingCategory ? t('bookmarks.editCategory') : t('bookmarks.addCategory')"
      width="400px"
    >
      <el-form :model="categoryForm" label-width="80px">
        <el-form-item :label="t('common.title')" required>
          <el-input v-model="categoryForm.name" :placeholder="t('bookmarks.categoryName')" />
        </el-form-item>
        <el-form-item :label="t('bookmarks.selectIcon')">
          <el-select v-model="categoryForm.icon" :placeholder="t('bookmarks.selectIcon')">
            <el-option
              v-for="icon in availableIcons"
              :key="icon.value"
              :label="icon.label"
              :value="icon.value"
            >
              <el-icon :style="{ color: getIconColor(icon.value) }">
                <component :is="getCategoryIcon(icon.value)" />
              </el-icon>
              <span style="margin-left: 8px;">{{ icon.label }}</span>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveCategory">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 导入书签对话框 -->
    <el-dialog
      v-model="showImportDialog"
      :title="t('bookmarks.importTitle')"
      width="600px"
    >
      <div v-if="!importFile">
        <el-alert
          :title="t('bookmarks.supportedFormats')"
          type="info"
          :closable="false"
          style="margin-bottom: 16px;"
        >
          <ul style="margin: 8px 0 0 20px; padding: 0;">
            <li>{{ t('bookmarks.browserHtml') }}</li>
            <li>{{ t('bookmarks.csvFile') }}</li>
          </ul>
        </el-alert>
        <el-button type="primary" @click="handleBookmarkFileSelect" style="width: 100%;">
          <el-icon><Upload /></el-icon>
          {{ t('bookmarks.selectFile') }}
        </el-button>
      </div>

      <div v-else>
        <el-alert
          :title="`${t('bookmarks.fileSelected')}${importFile.name}`"
          type="success"
          :closable="false"
          style="margin-bottom: 16px;"
        />

        <el-button @click="handleBookmarkFileSelect" style="margin-bottom: 16px;">
          {{ t('bookmarks.reselect') }}
        </el-button>

        <div v-if="importResult">
          <el-divider />
          <div class="import-result">
            <div class="result-stat">
              <div class="stat-item">
                <span class="stat-label">{{ t('bookmarks.total') }}</span>
                <span class="stat-value">{{ importResult.total }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ t('bookmarks.valid') }}</span>
                <span class="stat-value success">{{ importResult.valid || importResult.total }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showImportDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button
          type="primary"
          @click="executeBookmarkImport"
          :disabled="!importResult || importResult.total === 0"
        >
          {{ t('bookmarks.importBtn') }}（{{ importResult?.total || 0 }}）
        </el-button>
      </template>
    </el-dialog>

    <!-- 网站预览对话框 -->
    <el-dialog
      v-model="showPreviewDialog"
      :title="previewBookmark?.title || t('bookmarks.previewTitle')"
      width="80%"
      top="5vh"
    >
      <div v-if="previewBookmark" class="preview-container">
        <div class="preview-header">
          <div class="preview-info">
            <div class="preview-favicon">
              <img
                v-if="previewBookmark.favicon_data || previewBookmark.favicon_url"
                :src="previewBookmark.favicon_data || previewBookmark.favicon_url"
                :alt="previewBookmark.title"
              />
            </div>
            <div>
              <div class="preview-title">{{ previewBookmark.title }}</div>
              <el-link :href="previewBookmark.url" target="_blank" type="primary">
                {{ previewBookmark.url }}
              </el-link>
            </div>
          </div>
          <el-button type="primary" @click="openBookmark(previewBookmark)">
            <el-icon><Link /></el-icon>
            {{ t('bookmarks.openInBrowser') }}
          </el-button>
        </div>

        <el-divider />

        <div class="preview-image-container">
          <img
            :src="getPreviewImage(previewBookmark.url)"
            :alt="previewBookmark.title"
            class="preview-image"
            @error="handlePreviewError"
          />
        </div>

        <div v-if="previewBookmark.description" class="preview-description">
          <h4>{{ t('bookmarks.descriptionLabel') }}</h4>
          <p>{{ previewBookmark.description }}</p>
        </div>

        <div class="preview-meta">
          <el-tag v-if="previewBookmark.category_id" size="small">
            <el-icon :style="{ color: getIconColor(previewBookmark.category_icon) }">
              <component :is="getCategoryIcon(previewBookmark.category_icon)" />
            </el-icon>
            {{ getCategoryName(previewBookmark.category_id) }}
          </el-tag>
          <el-tag
            v-for="tag in getBookmarkTags(previewBookmark)"
            :key="tag"
            size="small"
            type="info"
          >
            {{ tag }}
          </el-tag>
          <span class="meta-text">{{ t('bookmarks.accessCount') }}{{ previewBookmark.access_count || 0 }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Plus, Search, Edit, Delete, Link, Upload, Download, Folder,
  ArrowLeft, ArrowRight, Star, StarFilled, CopyDocument,
  ChromeFilled, Document, FolderOpened,
  ShoppingCart, VideoCamera, Guide,
  Trophy, Picture, Tools, View
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { TauriShell } from '@/utils/tauri'
import Database from '@tauri-apps/plugin-sql'
import { importBookmarkFile, exportBookmarksToHTML } from '@/utils/bookmarkImport'
import { t } from '@/i18n'
import { openFile, saveFile } from '@/utils/tauri/dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

// 状态变量
const bookmarks = ref([])
const categories = ref([])
const searchKeyword = ref('')
const selectedCategory = ref(null)
const hideSidebar = ref(false)
const loading = ref(false)
const dialogVisible = ref(false)
const categoryDialogVisible = ref(false)
const showImportDialog = ref(false)
const importFile = ref(null)
const importResult = ref(null)
const editingBookmark = ref(null)
const editingCategory = ref(null)
const showPreviewDialog = ref(false)
const previewBookmark = ref(null)
const fetchingInfo = ref(false)

// 右键菜单
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  bookmark: null
})

const bookmarkForm = ref({
  title: '',
  url: '',
  description: '',
  category_id: null,
  tagsArray: []
})

const categoryForm = ref({
  name: '',
  icon: 'ChromeFilled'
})

// 可用图标列表
const availableIcons = computed(() => [
  { label: t('bookmarks.iconWebsite'), value: 'ChromeFilled' },
  { label: t('bookmarks.iconDocument'), value: 'Document' },
  { label: t('bookmarks.iconFolder'), value: 'FolderOpened' },
  { label: t('bookmarks.iconShopping'), value: 'ShoppingCart' },
  { label: t('bookmarks.iconVideo'), value: 'VideoCamera' },
  { label: t('bookmarks.iconGuide'), value: 'Guide' },
  { label: t('bookmarks.iconTrophy'), value: 'Trophy' },
  { label: t('bookmarks.iconPicture'), value: 'Picture' },
  { label: t('bookmarks.iconTools'), value: 'Tools' }
])

// 计算属性：当前分类名称
const currentCategoryName = computed(() => {
  if (selectedCategory.value === null) return t('bookmarks.allBookmarks')
  if (selectedCategory.value === 'favorite') return t('bookmarks.favorites')
  const cat = categories.value.find(c => c.id === selectedCategory.value)
  return cat ? cat.name : t('bookmarks.unknownCategory')
})

// 获取所有标签（带统计）
const allTags = computed(() => {
  const tagCounts = new Map()
  bookmarks.value.forEach(b => {
    const tags = getBookmarkTags(b)
    tags.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    })
  })
  return Array.from(tagCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
})

// 过滤书签
const filteredBookmarks = computed(() => {
  let result = bookmarks.value

  // 分类过滤
  if (selectedCategory.value === 'favorite') {
    result = result.filter(b => b.is_favorite === 1)
  } else if (selectedCategory.value !== null) {
    result = result.filter(b => b.category_id === selectedCategory.value)
  }

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(b =>
      b.title?.toLowerCase().includes(keyword) ||
      b.url?.toLowerCase().includes(keyword) ||
      b.tags?.toLowerCase().includes(keyword)
    )
  }

  return result
})

// 初始化数据库
const initDatabase = async () => {
  try {
    const db = await getDatabase()

    // 创建书签分类表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bookmark_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT DEFAULT 'ChromeFilled',
        is_default INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

    // 修改bookmarks表，添加category_id、is_favorite 和 favicon_data 字段
    const alterColumns = [
      'ALTER TABLE bookmarks ADD COLUMN category_id INTEGER',
      'ALTER TABLE bookmarks ADD COLUMN is_favorite INTEGER DEFAULT 0',
      'ALTER TABLE bookmarks ADD COLUMN favicon_data TEXT'
    ]
    for (const sql of alterColumns) {
      try { await db.execute(sql) } catch (e) { /* 列已存在 */ }
    }

    // 检查是否有默认分类
    const existingCategories = await db.select('SELECT * FROM bookmark_categories WHERE is_default = 1')
    if (!existingCategories || existingCategories.length === 0) {
      const now = new Date().toISOString()
      const defaultCategories = [
        { name: '网站', icon: 'ChromeFilled', sort_order: 1 },
        { name: '社交媒体', icon: 'Trophy', sort_order: 2 },
        { name: '学习资料', icon: 'Guide', sort_order: 3 },
        { name: '工具', icon: 'Tools', sort_order: 4 }
      ]

      for (const cat of defaultCategories) {
        await db.execute(
          'INSERT INTO bookmark_categories (name, icon, is_default, sort_order, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?)',
          [cat.name, cat.icon, cat.sort_order, now, now]
        )
      }
    }
  } catch (error) {
    console.error('初始化数据库失败:', error)
  }
}

// 加载书签列表
const loadBookmarks = async () => {
  try {
    loading.value = true
    const db = await getDatabase()
    const result = await db.select(`
      SELECT b.*, c.icon as category_icon, c.name as category_name
      FROM bookmarks b
      LEFT JOIN bookmark_categories c ON b.category_id = c.id
      ORDER BY b.is_favorite DESC, b.access_count DESC, b.updated_at DESC
    `)
    bookmarks.value = result || []

    // 自动更新缺失的favicon（后台静默执行）
    updateMissingFavicons()
  } catch (error) {
    console.error('加载书签失败:', error)
    ElMessage.error(t('bookmarks.loadFailed'))
  } finally {
    loading.value = false
  }
}

// 更新缺失的favicon — 通过 Rust 命令获取并缓存 base64 数据
const updateMissingFavicons = async () => {
  try {
    const db = await getDatabase()
    const needUpdate = bookmarks.value.filter(b => !b.favicon_data && b.url)

    for (const bookmark of needUpdate) {
      try {
        const info = await invoke('fetch_website_info', { url: bookmark.url })
        if (info.favicon_base64) {
          await db.execute(
            'UPDATE bookmarks SET favicon_data = ? WHERE id = ?',
            [info.favicon_base64, bookmark.id]
          )
          bookmark.favicon_data = info.favicon_base64
        }
      } catch (e) {
        // 静默失败，不阻塞
      }
    }
  } catch (error) {
    console.error('更新favicon失败:', error)
  }
}

// 加载分类列表
const loadCategories = async () => {
  try {
    const db = await getDatabase()
    const result = await db.select('SELECT * FROM bookmark_categories ORDER BY sort_order ASC')
    categories.value = result || []
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

// 选择分类
const selectCategory = (categoryId) => {
  selectedCategory.value = categoryId
}

// 获取分类图标组件
const getCategoryIcon = (iconName) => {
  const iconMap = {
    'ChromeFilled': ChromeFilled,
    'Document': Document,
    'FolderOpened': FolderOpened,
    'ShoppingCart': ShoppingCart,
    'VideoCamera': VideoCamera,
    'Guide': Guide,
    'Trophy': Trophy,
    'Picture': Picture,
    'Tools': Tools
  }
  return iconMap[iconName] || ChromeFilled
}

// 获取图标颜色
const getIconColor = (iconName) => {
  const colorMap = {
    'ChromeFilled': 'var(--accent-blue)',
    'Document': 'var(--el-color-success)',
    'FolderOpened': 'var(--el-color-warning)',
    'ShoppingCart': 'var(--el-color-danger)',
    'VideoCamera': 'var(--el-color-danger)',
    'Guide': 'var(--el-text-color-secondary)',
    'Trophy': '#FFB800',
    'Picture': 'var(--el-color-warning)',
    'Tools': 'var(--el-text-color-secondary)'
  }
  return colorMap[iconName] || 'var(--accent-blue)'
}

// 获取收藏数量
const getFavoriteCount = () => {
  return bookmarks.value.filter(b => b.is_favorite === 1).length
}

// 获取分类书签数量
const getCategoryCount = (categoryId) => {
  return bookmarks.value.filter(b => b.category_id === categoryId).length
}

// 获取书签标签数组
const getBookmarkTags = (bookmark) => {
  if (!bookmark.tags) return []
  try {
    const tags = JSON.parse(bookmark.tags)
    return Array.isArray(tags) ? tags : []
  } catch {
    return bookmark.tags.split(',').map(t => t.trim()).filter(t => t)
  }
}

// 获取用于显示的简短 URL
const getDisplayUrl = (url) => {
  try {
    const u = new URL(url)
    return u.hostname + (u.pathname !== '/' ? u.pathname : '')
  } catch {
    return url
  }
}

// 切换收藏状态
const toggleFavorite = async (bookmark) => {
  try {
    const db = await getDatabase()
    const newValue = bookmark.is_favorite ? 0 : 1
    await db.execute(
      'UPDATE bookmarks SET is_favorite = ?, updated_at = ? WHERE id = ?',
      [newValue, new Date().toISOString(), bookmark.id]
    )
    await loadBookmarks()
    ElMessage.success(newValue ? t('bookmarks.addedToFavorites') : t('bookmarks.removedFromFavorites'))
  } catch (error) {
    console.error('更新收藏状态失败:', error)
    ElMessage.error(t('bookmarks.operationFailed'))
  }
}

// 复制到剪贴板
const copyToClipboard = async (text, label) => {
  try {
    await writeText(text)
    ElMessage.success(`${label}${t('bookmarks.copied')}`)
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error(t('common.copyFailed'))
  }
}

// 打开书签
const openBookmark = async (bookmark) => {
  try {
    await TauriShell.openURL(bookmark.url)

    // 更新访问次数
    const db = await getDatabase()
    await db.execute(
      'UPDATE bookmarks SET access_count = access_count + 1, last_accessed_at = ? WHERE id = ?',
      [new Date().toISOString(), bookmark.id]
    )
    await loadBookmarks()
  } catch (error) {
    console.error('打开书签失败:', error)
    ElMessage.error(t('bookmarks.openFailed'))
  }
}

// 处理图标加载错误 - 尝试备用源
const handleFaviconError = (event) => {
  const img = event.target
  const currentSrc = img.src

  if (currentSrc.includes('google.com/s2/favicons')) {
    const url = img.getAttribute('data-url')
    if (url) {
      try {
        const urlObj = new URL(url)
        img.src = `https://icon.horse/icon/${urlObj.hostname}`
        return
      } catch (e) {
        // 继续隐藏
      }
    }
  }

  img.style.display = 'none'
}

// 获取网站图标 URL（在线备用）
const getFavicon = (url) => {
  try {
    const urlObj = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`
  } catch (error) {
    return null
  }
}

// 自动获取网站信息（标题、描述、favicon）
const fetchWebsiteInfo = async () => {
  if (!bookmarkForm.value.url) return

  fetchingInfo.value = true
  try {
    const info = await invoke('fetch_website_info', { url: bookmarkForm.value.url })

    // 自动填充：仅在字段为空时填充
    if (!bookmarkForm.value.title && info.title) {
      bookmarkForm.value.title = info.title
    }
    if (!bookmarkForm.value.description && info.description) {
      bookmarkForm.value.description = info.description
    }
    // 缓存 favicon_base64 到表单临时字段
    if (info.favicon_base64) {
      bookmarkForm.value._favicon_data = info.favicon_base64
    }

    ElMessage.success(t('bookmarks.fetchSuccess'))
  } catch (error) {
    console.error('获取网站信息失败:', error)
    ElMessage.warning(t('bookmarks.fetchFailed'))
  } finally {
    fetchingInfo.value = false
  }
}

// URL 失焦时自动获取（仅新建时且标题为空）
const onUrlBlur = () => {
  if (!editingBookmark.value && bookmarkForm.value.url && !bookmarkForm.value.title) {
    fetchWebsiteInfo()
  }
}

// 显示右键菜单
const showContextMenu = (event, bookmark) => {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    bookmark
  }
}

// 点击外部关闭右键菜单
const closeContextMenu = () => {
  contextMenu.value.visible = false
}

// 显示创建对话框
const showCreateDialog = () => {
  editingBookmark.value = null
  bookmarkForm.value = {
    title: '',
    url: '',
    description: '',
    category_id: null,
    tagsArray: [],
    _favicon_data: null
  }
  dialogVisible.value = true
}

// 编辑书签
const editBookmark = (bookmark) => {
  editingBookmark.value = bookmark
  bookmarkForm.value = {
    title: bookmark.title || '',
    url: bookmark.url || '',
    description: bookmark.description || '',
    category_id: bookmark.category_id || null,
    tagsArray: getBookmarkTags(bookmark),
    _favicon_data: bookmark.favicon_data || null
  }
  dialogVisible.value = true
}

// 保存书签
const saveBookmark = async () => {
  if (!bookmarkForm.value.title || !bookmarkForm.value.url) {
    ElMessage.warning(t('bookmarks.fillTitleAndUrl'))
    return
  }

  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    const favicon = getFavicon(bookmarkForm.value.url)
    const tagsJson = JSON.stringify(bookmarkForm.value.tagsArray || [])
    const faviconData = bookmarkForm.value._favicon_data || null

    if (editingBookmark.value) {
      await db.execute(
        'UPDATE bookmarks SET title = ?, url = ?, description = ?, category_id = ?, tags = ?, favicon_url = ?, favicon_data = COALESCE(?, favicon_data), updated_at = ? WHERE id = ?',
        [
          bookmarkForm.value.title,
          bookmarkForm.value.url,
          bookmarkForm.value.description,
          bookmarkForm.value.category_id,
          tagsJson,
          favicon,
          faviconData,
          now,
          editingBookmark.value.id
        ]
      )
      ElMessage.success(t('bookmarks.bookmarkUpdated'))
    } else {
      await db.execute(
        'INSERT INTO bookmarks (title, url, description, category_id, tags, favicon_url, favicon_data, is_favorite, created_at, updated_at, access_count) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0)',
        [
          bookmarkForm.value.title,
          bookmarkForm.value.url,
          bookmarkForm.value.description,
          bookmarkForm.value.category_id,
          tagsJson,
          favicon,
          faviconData,
          now,
          now
        ]
      )
      ElMessage.success(t('bookmarks.bookmarkAdded'))
    }

    dialogVisible.value = false
    await loadBookmarks()
  } catch (error) {
    console.error('保存书签失败:', error)
    ElMessage.error(t('bookmarks.saveFailed'))
  }
}

// 删除书签
const deleteBookmark = async (bookmark) => {
  try {
    await ElMessageBox.confirm(t('bookmarks.confirmDeleteBookmark'), t('bookmarks.confirmDelete'), {
      type: 'warning'
    })

    const db = await getDatabase()
    await db.execute('DELETE FROM bookmarks WHERE id = ?', [bookmark.id])
    ElMessage.success(t('bookmarks.deleteSuccess'))
    await loadBookmarks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除书签失败:', error)
      ElMessage.error(t('bookmarks.deleteFailed'))
    }
  }
}

// 显示添加分类对话框
const showAddCategoryDialog = () => {
  editingCategory.value = null
  categoryForm.value = {
    name: '',
    icon: 'GlobeFilled'
  }
  categoryDialogVisible.value = true
}

// 编辑分类
const editCategory = (category) => {
  editingCategory.value = category
  categoryForm.value = {
    name: category.name,
    icon: category.icon
  }
  categoryDialogVisible.value = true
}

// 保存分类
const saveCategory = async () => {
  if (!categoryForm.value.name) {
    ElMessage.warning(t('bookmarks.fillCategoryName'))
    return
  }

  try {
    const db = await getDatabase()
    const now = new Date().toISOString()

    if (editingCategory.value) {
      await db.execute(
        'UPDATE bookmark_categories SET name = ?, icon = ?, updated_at = ? WHERE id = ?',
        [categoryForm.value.name, categoryForm.value.icon, now, editingCategory.value.id]
      )
      ElMessage.success(t('bookmarks.categoryUpdated'))
    } else {
      const maxOrder = categories.value.length > 0
        ? Math.max(...categories.value.map(c => c.sort_order || 0))
        : 0
      await db.execute(
        'INSERT INTO bookmark_categories (name, icon, is_default, sort_order, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)',
        [categoryForm.value.name, categoryForm.value.icon, maxOrder + 1, now, now]
      )
      ElMessage.success(t('bookmarks.categoryAdded'))
    }

    categoryDialogVisible.value = false
    await loadCategories()
  } catch (error) {
    console.error('保存分类失败:', error)
    ElMessage.error(t('bookmarks.saveFailed'))
  }
}

// 删除分类
const deleteCategory = async (category) => {
  try {
    await ElMessageBox.confirm(t('bookmarks.confirmDeleteCategory'), t('bookmarks.confirmDelete'), {
      type: 'warning'
    })

    const db = await getDatabase()
    await db.execute('DELETE FROM bookmark_categories WHERE id = ?', [category.id])
    await db.execute('UPDATE bookmarks SET category_id = NULL WHERE category_id = ?', [category.id])
    await loadCategories()
    await loadBookmarks()
    ElMessage.success(t('bookmarks.categoryDeleted'))
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除分类失败:', error)
      ElMessage.error(t('bookmarks.deleteFailed'))
    }
  }
}

// 打开导入对话框
const openImportDialog = () => {
  importFile.value = null
  importResult.value = null
  showImportDialog.value = true
}

// 处理书签文件选择
const handleBookmarkFileSelect = async () => {
  try {
    const selected = await openFile({
      filters: [{
        name: t('bookmarks.bookmarkFiles'),
        extensions: ['html', 'csv']
      }]
    })

    if (selected) {
      const content = await readTextFile(selected)
      importFile.value = {
        path: selected,
        name: selected.split(/[/\\]/).pop(),
        content
      }

      await parseBookmarkFile()
    }
  } catch (error) {
    if (error !== 'cancelled' && error !== 'null') {
      console.error('选择文件失败:', error)
      ElMessage.error(t('bookmarks.selectFileFailed'))
    }
  }
}

// 解析书签文件
const parseBookmarkFile = async () => {
  if (!importFile.value) return

  try {
    const result = await importBookmarkFile({
      name: importFile.value.name,
      content: importFile.value.content
    })

    importResult.value = {
      total: result.total,
      valid: result.bookmarks.length,
      bookmarks: result.bookmarks
    }
  } catch (error) {
    console.error('解析文件失败:', error)
    ElMessage.error(error.message || t('bookmarks.parseFailed'))
  }
}

// 执行书签导入 — 保留文件夹结构，自动创建分类
const executeBookmarkImport = async () => {
  if (!importResult.value || importResult.value.total === 0) {
    ElMessage.warning(t('bookmarks.noValidBookmarks'))
    return
  }

  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    let successCount = 0
    let failCount = 0
    let newCategoryCount = 0

    // 收集所有唯一的文件夹名称，创建对应分类
    const folderNames = [...new Set(
      importResult.value.bookmarks
        .map(b => b.category)
        .filter(Boolean)
    )]

    // 加载现有分类
    await loadCategories()
    const categoryMap = {}
    for (const cat of categories.value) {
      categoryMap[cat.name] = cat.id
    }

    // 为不存在的文件夹创建分类
    for (const folderName of folderNames) {
      if (!categoryMap[folderName]) {
        const maxOrder = categories.value.length > 0
          ? Math.max(...categories.value.map(c => c.sort_order || 0))
          : 0
        const result = await db.execute(
          'INSERT INTO bookmark_categories (name, icon, is_default, sort_order, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)',
          [folderName, 'FolderOpened', maxOrder + 1 + newCategoryCount, now, now]
        )
        categoryMap[folderName] = result.lastInsertId
        newCategoryCount++
      }
    }

    for (const bookmark of importResult.value.bookmarks) {
      try {
        const categoryId = bookmark.category ? (categoryMap[bookmark.category] || null) : null
        const favicon = getFavicon(bookmark.url)

        await db.execute(
          'INSERT INTO bookmarks (title, url, description, category_id, tags, favicon_url, favicon_data, is_favorite, created_at, updated_at, access_count) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0)',
          [
            bookmark.title || bookmark.url,
            bookmark.url,
            bookmark.description || '',
            categoryId,
            JSON.stringify(bookmark.tags || []),
            favicon,
            bookmark.favicon_data || null,
            bookmark.created_at || now,
            now
          ]
        )
        successCount++
      } catch (error) {
        console.error('导入书签失败:', error)
        failCount++
      }
    }

    if (newCategoryCount > 0) {
      ElMessage.success(
        t('bookmarks.importedWithFolders')
          .replace('{0}', successCount)
          .replace('{1}', newCategoryCount)
          .replace('{2}', failCount)
      )
    } else {
      ElMessage.success(t('bookmarks.importSuccess').replace('{0}', successCount).replace('{1}', failCount))
    }
    showImportDialog.value = false
    await loadCategories()
    await loadBookmarks()
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error(t('bookmarks.importFailed'))
  }
}

// 导出书签 — 携带分类名称和 favicon_data
const exportBookmarks = async () => {
  try {
    if (bookmarks.value.length === 0) {
      ElMessage.warning(t('bookmarks.noBookmarksToExport'))
      return
    }

    // bookmarks 已经 JOIN 了 category_name，直接使用
    const htmlContent = exportBookmarksToHTML(bookmarks.value)

    const filePath = await saveFile({
      defaultPath: `bookmarks_${new Date().toISOString().split('T')[0]}.html`,
      filters: [{
        name: t('bookmarks.htmlFiles'),
        extensions: ['html']
      }]
    })

    if (filePath) {
      await writeTextFile(filePath, htmlContent)
      ElMessage.success(t('bookmarks.exportSuccess'))
    }
  } catch (error) {
    if (error !== 'cancelled' && error !== 'null') {
      console.error('导出失败:', error)
      ElMessage.error(t('bookmarks.exportFailed'))
    }
  }
}

// 显示预览
const showPreview = (bookmark) => {
  previewBookmark.value = bookmark
  showPreviewDialog.value = true
}

// 获取网站预览图
const getPreviewImage = (url) => {
  try {
    return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1280&h=720`
  } catch (error) {
    return null
  }
}

// 处理预览图片错误
const handlePreviewError = (event) => {
  event.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgwIiBoZWlnaHQ9IjcyMCI+PHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPumihOiniOWbvuaXoOazleWKoOi9vTwvdGV4dD48L3N2Zz4='
  event.target.style.opacity = '0.5'
}

// 获取分类名称
const getCategoryName = (categoryId) => {
  const cat = categories.value.find(c => c.id === categoryId)
  return cat ? cat.name : t('bookmarks.uncategorized')
}

onMounted(async () => {
  await initDatabase()
  await loadCategories()
  await loadBookmarks()
  selectedCategory.value = 'favorite'

  // 全局点击关闭右键菜单
  document.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})
</script>

<style scoped>
.bookmarks-page-wrapper {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-primary);
  background: linear-gradient(180deg, #eef2f6 0%, #e7ecf3 100%);
  height: 100%;
  width: 100%;
  position: relative;
}

/* 顶部导航 */
.header {
  min-height: 58px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 18px;
  flex-shrink: 0;
  z-index: 2;
  position: relative;
  backdrop-filter: blur(18px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.sidebar-toggle-btn {
  border: 1px solid rgba(60, 40, 20, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(242, 246, 251, 0.92));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.page-title-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.page-eyebrow {
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-quaternary);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 600;
}

.breadcrumb-divider {
  color: var(--text-quaternary);
  font-weight: 400;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.main-container {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  flex: 1;
  overflow: hidden;
  min-height: 0;
  padding: 5px 5px 0;
  gap: 0;
}

.main-container.sidebar-hidden {
  grid-template-columns: minmax(0, 1fr);
}

/* 左侧分类栏 */
.sidebar-left {
  min-width: 0;
  flex-shrink: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 96%, var(--accent-warm-soft) 4%), var(--bg-secondary));
  border: 1px solid var(--divider);
  border-right: none;
  border-radius: 18px 0 0 18px;
  display: flex;
  flex-direction: column;
  user-select: none;
  overflow: hidden;
  height: 100%;
  position: relative;
  z-index: 1;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.sidebar-toolbar {
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-quaternary);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.sidebar-btn {
  cursor: pointer;
  color: var(--text-tertiary);
  font-size: var(--font-size-body);
  transition: color var(--transition-fast), background var(--transition-fast);
  padding: 4px 6px;
  border-radius: 8px;
}

.sidebar-btn:hover {
  color: var(--accent-blue);
  background: rgba(255, 255, 255, 0.72);
}

.category-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 9px 12px;
  margin: 0 0 4px;
  border-radius: 12px;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  font-size: var(--font-size-body);
  color: var(--text-primary);
  border: 1px solid transparent;
}

.category-item:hover {
  background-color: rgba(255, 255, 255, 0.58);
}

.category-item.active {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(240, 245, 251, 0.95));
  color: var(--accent-blue);
  font-weight: var(--font-weight-semibold);
  border-color: rgba(194, 65, 12, 0.15);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.82), 0 6px 14px rgba(60, 40, 20, 0.05);
}

.category-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.favorite-icon {
  color: var(--color-orange) !important;
}

.category-name {
  flex: 1;
  font-size: var(--font-size-body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  min-width: 16px;
  text-align: right;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.category-actions {
  display: none;
  gap: 2px;
  flex-shrink: 0;
  margin-left: 2px;
}

.category-item:hover .category-actions,
.category-item.active .category-actions {
  display: flex;
}

.action-icon {
  font-size: 11px;
  padding: 3px;
  cursor: pointer;
  transition: color var(--transition-fast);
  color: var(--text-quaternary);
  border-radius: var(--radius-xs);
}

.action-icon:hover {
  color: var(--accent-blue);
}

.action-icon.del:hover {
  color: var(--color-red);
}

/* 内容区域 */
.content-area {
  flex: 1;
  background: linear-gradient(180deg, var(--bg-primary), color-mix(in srgb, var(--bg-primary) 92%, var(--bg-secondary) 8%));
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--divider);
  border-radius: 0 18px 18px 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.main-container.sidebar-hidden .content-area {
  border-radius: 18px;
}

/* 书签列表 */
.bookmark-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 22px;
  background: transparent;
}

.bookmark-list :deep(.el-empty) {
  min-height: 320px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,0.8), rgba(248, 244, 232,0.92));
}

.bookmark-cards {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 18px;
  border: 1px solid rgba(60, 40, 20, 0.08);
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(60, 40, 20, 0.05);
}

.bookmark-cards::before {
  content: '';
  display: block;
  height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0.88), rgba(255,255,255,0.24));
}

.bookmark-list::-webkit-scrollbar {
  width: 6px;
}

.bookmark-list::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.24);
  border-radius: 999px;
}

.bookmark-list::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.36);
}

.bookmark-list::-webkit-scrollbar-track {
  background: transparent;
}

/* Chrome 风格紧凑行 */
.bookmark-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  transition: background 0.12s;
  cursor: default;
  min-height: 40px;
}

.bookmark-row:not(:last-child) {
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
}

.bookmark-row:hover {
  background: rgba(239, 246, 255, 0.72);
}

.row-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.bookmark-favicon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bookmark-favicon img {
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 2px;
}

.default-favicon {
  font-size: 14px;
  color: var(--text-quaternary);
}

.row-title {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-regular);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 360px;
  flex-shrink: 0;
}

.row-url {
  font-size: var(--font-size-footnote);
  color: var(--text-quaternary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.row-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 8px;
}

/* 收藏星标 */
.favorite-star {
  font-size: 14px;
  color: var(--text-quaternary);
  cursor: pointer;
  transition: color var(--transition-fast);
  flex-shrink: 0;
}

.favorite-star:hover {
  color: var(--color-orange);
}

.favorite-star.is-favorite {
  color: var(--color-orange);
}

/* 操作按钮 — 默认隐藏，hover 时显示 */
.row-actions {
  display: none;
  gap: 2px;
}

.bookmark-row:hover .row-actions {
  display: flex;
}

.row-actions .el-button {
  padding: 2px 4px;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  z-index: 9999;
  background: var(--bg-primary);
  border: 1px solid var(--border-color-strong);
  border-radius: var(--radius-md);
  padding: 4px 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  min-width: 160px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  font-size: var(--font-size-body);
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.1s;
}

.context-menu-item:hover {
  background: var(--accent-blue-bg);
}

.context-menu-item.danger {
  color: var(--color-red);
}

.context-menu-item.danger:hover {
  background: rgba(245, 108, 108, 0.1);
}

.context-menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}

/* 预览对话框 */
.preview-container {
  max-height: 80vh;
  overflow-y: auto;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-lg);
}

.preview-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
  min-width: 0;
}

.preview-favicon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.preview-favicon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.preview-title {
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.preview-image-container {
  width: 100%;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin: var(--space-xl) 0;
}

.preview-image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: var(--radius-md);
}

.preview-description {
  margin: var(--space-xl) 0;
}

.preview-description h4 {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--space-sm);
}

.preview-description p {
  font-size: var(--font-size-body);
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.preview-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
  padding: var(--space-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.meta-text {
  font-size: var(--font-size-footnote);
  color: var(--text-secondary);
  margin-left: auto;
}

/* 导入结果统计 */
.import-result {
  padding: var(--space-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.result-stat {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.stat-label {
  font-size: var(--font-size-body);
  color: var(--text-secondary);
}

.stat-value {
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.stat-value.success {
  color: var(--color-green);
}
</style>
