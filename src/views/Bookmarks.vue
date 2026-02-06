<template>
  <div class="bookmarks-page-wrapper">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <!-- 折叠/展开侧边栏按钮 -->
        <el-button size="small" circle @click="hideSidebar = !hideSidebar" :title="hideSidebar ? '显示侧边栏' : '隐藏侧边栏'">
          <el-icon><ArrowLeft v-if="!hideSidebar" /><ArrowRight v-else /></el-icon>
        </el-button>
        <div class="breadcrumb">书签管理 / {{ currentCategoryName }}</div>
      </div>
      <div class="header-actions">
        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索书签..."
          clearable
          style="width: 250px;"
          size="small"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <!-- 操作按钮组 -->
        <el-button size="small" circle @click="openImportDialog" title="导入书签">
          <el-icon><Upload /></el-icon>
        </el-button>
        <el-button size="small" circle @click="exportBookmarks" title="导出书签">
          <el-icon><Download /></el-icon>
        </el-button>
        <el-button size="small" type="primary" circle @click="showCreateDialog" title="添加书签">
          <el-icon><Plus /></el-icon>
        </el-button>
      </div>
    </header>

    <div class="main-container">
      <!-- 左侧分类栏 -->
      <aside class="sidebar-left" v-show="!hideSidebar">
        <div class="sidebar-toolbar">
          <span class="sidebar-title">分类</span>
          <div class="actions">
            <span class="sidebar-btn" title="新建分类" @click="showAddCategoryDialog">
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
            <span class="category-name">全部书签</span>
            <span class="category-count">{{ bookmarks.length }}</span>
          </div>
          
          <!-- 常用书签（收藏） -->
          <div 
            class="category-item category-favorite" 
            :class="{ active: selectedCategory === 'favorite' }"
            @click="selectCategory('favorite')"
          >
            <el-icon class="category-icon favorite-icon"><StarFilled /></el-icon>
            <span class="category-name">常用</span>
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
              <i class="fa-solid fa-pen action-icon" @click.stop="editCategory(category)" title="编辑"></i>
              <i class="fa-solid fa-trash action-icon del" @click.stop="deleteCategory(category)" title="删除"></i>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧内容区域 -->
      <main class="content-area">
        <!-- 书签列表 -->
        <div class="bookmark-list" v-loading="loading">
          <el-empty v-if="filteredBookmarks.length === 0" description="暂无书签" />
          
          <div v-else class="bookmark-cards">
            <div 
              v-for="bookmark in filteredBookmarks" 
              :key="bookmark.id"
              class="bookmark-card"
            >
              <!-- 第一行：标题和操作按钮 -->
              <div class="card-row card-header-row">
                <!-- 左侧：图标和标题 -->
                <div class="card-title-section">
                  <!-- 网站图标 -->
                  <div class="bookmark-favicon">
                    <img
                      v-if="bookmark.favicon_url"
                      :src="bookmark.favicon_url"
                      :data-url="bookmark.url"
                      :alt="bookmark.title"
                      @error="handleFaviconError"
                    />
                    <el-icon v-else class="card-icon" :style="{ color: getIconColor(bookmark.category_icon) }">
                      <component :is="getCategoryIcon(bookmark.category_icon)" />
                    </el-icon>
                  </div>
                  <h3 class="card-title" @click="openBookmark(bookmark)">{{ bookmark.title }}</h3>
                  <!-- 收藏星标 -->
                  <el-icon 
                    class="favorite-star" 
                    :class="{ 'is-favorite': bookmark.is_favorite }"
                    @click.stop="toggleFavorite(bookmark)"
                    title="标记为常用"
                  >
                    <StarFilled v-if="bookmark.is_favorite" />
                    <Star v-else />
                  </el-icon>
                  <!-- 预览图标按钮 -->
                  <el-button 
                    text 
                    size="small"
                    @click.stop="showPreview(bookmark)"
                    title="查看预览"
                    class="preview-btn"
                  >
                    <el-icon><View /></el-icon>
                  </el-button>
                </div>
                
                <!-- 右侧：操作按钮 -->
                <div class="card-actions">
                  <el-button 
                    text 
                    size="small"
                    @click="openBookmark(bookmark)"
                    title="打开书签"
                  >
                    <el-icon><Link /></el-icon>
                  </el-button>
                  <el-button 
                    text 
                    size="small"
                    @click="copyToClipboard(bookmark.url, 'URL')"
                    title="复制URL"
                  >
                    <el-icon><CopyDocument /></el-icon>
                  </el-button>
                  <el-button 
                    text 
                    size="small"
                    @click="editBookmark(bookmark)"
                    title="编辑"
                  >
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button 
                    text 
                    type="danger"
                    size="small"
                    @click="deleteBookmark(bookmark)"
                    title="删除"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
              
              <!-- 第二行：URL和标签 -->
              <div class="card-row card-info-row">
                <div class="card-url">
                  <el-link :href="bookmark.url" target="_blank" underline="never" @click.prevent="openBookmark(bookmark)">
                    {{ bookmark.url }}
                  </el-link>
                </div>
                <div class="card-meta">
                  <span v-if="bookmark.access_count > 0" class="visit-count">
                    <i class="fa-solid fa-eye"></i>
                    {{ bookmark.access_count }}
                  </span>
                  <div class="card-tags" v-if="getBookmarkTags(bookmark).length > 0">
                    <el-tag 
                      v-for="tag in getBookmarkTags(bookmark)" 
                      :key="tag" 
                      size="small" 
                      type="info"
                    >
                      {{ tag }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 添加/编辑书签对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingBookmark ? '编辑书签' : '添加书签'"
      width="500px"
    >
      <el-form :model="bookmarkForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="bookmarkForm.title" placeholder="书签标题" />
        </el-form-item>
        <el-form-item label="URL" required>
          <el-input v-model="bookmarkForm.url" placeholder="https://example.com" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="bookmarkForm.description"
            type="textarea"
            :rows="2"
            placeholder="书签描述"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="bookmarkForm.category_id" placeholder="选择分类" clearable style="width: 100%;">
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
        <el-form-item label="标签">
          <el-select
            v-model="bookmarkForm.tagsArray"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入标签"
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
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveBookmark">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加/编辑分类对话框 -->
    <el-dialog
      v-model="categoryDialogVisible"
      :title="editingCategory ? '编辑分类' : '添加分类'"
      width="400px"
    >
      <el-form :model="categoryForm" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="categoryForm.name" placeholder="分类名称" />
        </el-form-item>
        <el-form-item label="图标">
          <el-select v-model="categoryForm.icon" placeholder="选择图标">
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
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>

    <!-- 导入书签对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="导入书签"
      width="600px"
    >
      <div v-if="!importFile">
        <el-alert
          title="支持的格式"
          type="info"
          :closable="false"
          style="margin-bottom: 16px;"
        >
          <ul style="margin: 8px 0 0 20px; padding: 0;">
            <li>浏览器书签 HTML 文件（Chrome/Firefox/Edge）</li>
            <li>CSV 格式文件</li>
          </ul>
        </el-alert>
        <el-button type="primary" @click="handleBookmarkFileSelect" style="width: 100%;">
          <el-icon><Upload /></el-icon>
          选择文件
        </el-button>
      </div>
      
      <div v-else>
        <el-alert
          :title="`已选择文件：${importFile.name}`"
          type="success"
          :closable="false"
          style="margin-bottom: 16px;"
        />
        
        <el-button @click="handleBookmarkFileSelect" style="margin-bottom: 16px;">
          重新选择
        </el-button>
        
        <div v-if="importResult">
          <el-divider />
          <div class="import-result">
            <div class="result-stat">
              <div class="stat-item">
                <span class="stat-label">总计：</span>
                <span class="stat-value">{{ importResult.total }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">有效：</span>
                <span class="stat-value success">{{ importResult.valid || importResult.total }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="executeBookmarkImport"
          :disabled="!importResult || importResult.total === 0"
        >
          导入（{{ importResult?.total || 0 }} 条）
        </el-button>
      </template>
    </el-dialog>

    <!-- 网站预览对话框 -->
    <el-dialog
      v-model="showPreviewDialog"
      :title="previewBookmark?.title || '网站预览'"
      width="80%"
      top="5vh"
    >
      <div v-if="previewBookmark" class="preview-container">
        <div class="preview-header">
          <div class="preview-info">
            <div class="preview-favicon">
              <img
                v-if="previewBookmark.favicon_url"
                :src="previewBookmark.favicon_url"
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
            在浏览器中打开
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
          <h4>描述</h4>
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
          <span class="meta-text">访问次数：{{ previewBookmark.access_count || 0 }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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
import { openFile, saveFile } from '@/utils/tauri/dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

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
const availableIcons = [
  { label: '网站', value: 'ChromeFilled' },
  { label: '文档', value: 'Document' },
  { label: '文件夹', value: 'FolderOpened' },
  { label: '购物', value: 'ShoppingCart' },
  { label: '视频', value: 'VideoCamera' },
  { label: '指南', value: 'Guide' },
  { label: '奖杯', value: 'Trophy' },
  { label: '图片', value: 'Picture' },
  { label: '工具', value: 'Tools' }
]

// 计算属性：当前分类名称
const currentCategoryName = computed(() => {
  if (selectedCategory.value === null) return '全部书签'
  if (selectedCategory.value === 'favorite') return '常用'
  const cat = categories.value.find(c => c.id === selectedCategory.value)
  return cat ? cat.name : '未知分类'
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
    
    // 修改bookmarks表，添加category_id和is_favorite字段
    try {
      await db.execute('ALTER TABLE bookmarks ADD COLUMN category_id INTEGER')
    } catch (e) {
      // 列已存在
    }
    
    try {
      await db.execute('ALTER TABLE bookmarks ADD COLUMN is_favorite INTEGER DEFAULT 0')
    } catch (e) {
      // 列已存在
    }
    
    // 检查是否有默认分类
    const existingCategories = await db.select('SELECT * FROM bookmark_categories WHERE is_default = 1')
    if (!existingCategories || existingCategories.length === 0) {
      // 创建默认分类
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
      SELECT b.*, c.icon as category_icon
      FROM bookmarks b
      LEFT JOIN bookmark_categories c ON b.category_id = c.id
      ORDER BY b.is_favorite DESC, b.access_count DESC, b.updated_at DESC
    `)
    bookmarks.value = result || []
    
    // 自动更新缺失的favicon
    await updateMissingFavicons()
  } catch (error) {
    console.error('加载书签失败:', error)
    ElMessage.error('加载书签失败')
  } finally {
    loading.value = false
  }
}

// 更新缺失的favicon
const updateMissingFavicons = async () => {
  try {
    const db = await getDatabase()
    const bookmarksNeedUpdate = bookmarks.value.filter(b => !b.favicon_url && b.url)
    
    for (const bookmark of bookmarksNeedUpdate) {
      const favicon = getFavicon(bookmark.url)
      if (favicon) {
        await db.execute(
          'UPDATE bookmarks SET favicon_url = ? WHERE id = ?',
          [favicon, bookmark.id]
        )
        bookmark.favicon_url = favicon
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
    'ChromeFilled': '#409EFF',
    'Document': '#67C23A',
    'FolderOpened': '#E6A23C',
    'ShoppingCart': '#F56C6C',
    'VideoCamera': '#F56C6C',
    'Guide': '#909399',
    'Trophy': '#FFB800',
    'Picture': '#E6A23C',
    'Tools': '#909399'
  }
  return colorMap[iconName] || '#409EFF'
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
    ElMessage.success(newValue ? '已添加到常用' : '已从常用移除')
  } catch (error) {
    console.error('更新收藏状态失败:', error)
    ElMessage.error('操作失败')
  }
}

// 复制到剪贴板
const copyToClipboard = async (text, label) => {
  try {
    await writeText(text)
    ElMessage.success(`${label}已复制`)
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
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
    ElMessage.error('打开失败')
  }
}

// 处理图标加载错误 - 尝试备用源
const handleFaviconError = (event) => {
  const img = event.target
  const currentSrc = img.src
  
  // 如果是Google的服务失败了，尝试icon.horse
  if (currentSrc.includes('google.com/s2/favicons')) {
    const url = img.getAttribute('data-url')
    if (url) {
      try {
        const urlObj = new URL(url)
        const domain = urlObj.hostname
        img.src = `https://icon.horse/icon/${domain}`
        return
      } catch (e) {
        // 继续下面的隐藏逻辑
      }
    }
  }
  
  // 如果icon.horse也失败了，隐藏图片
  img.style.display = 'none'
}

// 获取网站图标 - 使用多种方式
const getFavicon = (url) => {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname
    
    // 优先使用Google的favicon服务（更可靠）
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    
    // 备选方案：
    // return `https://icon.horse/icon/${domain}`
    // return `${urlObj.protocol}//${urlObj.host}/favicon.ico`
  } catch (error) {
    return null
  }
}

// 显示创建对话框
const showCreateDialog = () => {
  editingBookmark.value = null
  bookmarkForm.value = {
    title: '',
    url: '',
    description: '',
    category_id: null,
    tagsArray: []
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
    tagsArray: getBookmarkTags(bookmark)
  }
  dialogVisible.value = true
}

// 保存书签
const saveBookmark = async () => {
  if (!bookmarkForm.value.title || !bookmarkForm.value.url) {
    ElMessage.warning('请填写标题和URL')
    return
  }

  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    const favicon = getFavicon(bookmarkForm.value.url)
    const tagsJson = JSON.stringify(bookmarkForm.value.tagsArray || [])

    if (editingBookmark.value) {
      // 更新
      await db.execute(
        'UPDATE bookmarks SET title = ?, url = ?, description = ?, category_id = ?, tags = ?, favicon_url = ?, updated_at = ? WHERE id = ?',
        [
          bookmarkForm.value.title,
          bookmarkForm.value.url,
          bookmarkForm.value.description,
          bookmarkForm.value.category_id,
          tagsJson,
          favicon,
          now,
          editingBookmark.value.id
        ]
      )
      ElMessage.success('书签更新成功')
    } else {
      // 创建
      await db.execute(
        'INSERT INTO bookmarks (title, url, description, category_id, tags, favicon_url, is_favorite, created_at, updated_at, access_count) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0)',
        [
          bookmarkForm.value.title,
          bookmarkForm.value.url,
          bookmarkForm.value.description,
          bookmarkForm.value.category_id,
          tagsJson,
          favicon,
          now,
          now
        ]
      )
      ElMessage.success('书签添加成功')
    }

    dialogVisible.value = false
    await loadBookmarks()
  } catch (error) {
    console.error('保存书签失败:', error)
    ElMessage.error('保存失败')
  }
}

// 删除书签
const deleteBookmark = async (bookmark) => {
  try {
    await ElMessageBox.confirm('确定要删除这个书签吗？', '确认删除', {
      type: 'warning'
    })

    const db = await getDatabase()
    await db.execute('DELETE FROM bookmarks WHERE id = ?', [bookmark.id])
    ElMessage.success('删除成功')
    await loadBookmarks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除书签失败:', error)
      ElMessage.error('删除失败')
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
    ElMessage.warning('请填写分类名称')
    return
  }

  try {
    const db = await getDatabase()
    const now = new Date().toISOString()

    if (editingCategory.value) {
      // 更新
      await db.execute(
        'UPDATE bookmark_categories SET name = ?, icon = ?, updated_at = ? WHERE id = ?',
        [categoryForm.value.name, categoryForm.value.icon, now, editingCategory.value.id]
      )
      ElMessage.success('分类更新成功')
    } else {
      // 创建
      const maxOrder = categories.value.length > 0 
        ? Math.max(...categories.value.map(c => c.sort_order || 0)) 
        : 0
      await db.execute(
        'INSERT INTO bookmark_categories (name, icon, is_default, sort_order, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)',
        [categoryForm.value.name, categoryForm.value.icon, maxOrder + 1, now, now]
      )
      ElMessage.success('分类添加成功')
    }

    categoryDialogVisible.value = false
    await loadCategories()
  } catch (error) {
    console.error('保存分类失败:', error)
    ElMessage.error('保存失败')
  }
}

// 删除分类
const deleteCategory = async (category) => {
  try {
    await ElMessageBox.confirm('确定要删除此分类吗？分类内的书签不会被删除。', '确认删除', {
      type: 'warning'
    })
    
    const db = await getDatabase()
    await db.execute('DELETE FROM bookmark_categories WHERE id = ?', [category.id])
    // 清除该分类下书签的分类关联
    await db.execute('UPDATE bookmarks SET category_id = NULL WHERE category_id = ?', [category.id])
    await loadCategories()
    await loadBookmarks()
    ElMessage.success('分类已删除')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除分类失败:', error)
      ElMessage.error('删除失败')
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
        name: '书签文件',
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
      
      // 自动解析
      await parseBookmarkFile()
    }
  } catch (error) {
    if (error !== 'cancelled' && error !== 'null') {
      console.error('选择文件失败:', error)
      ElMessage.error('选择文件失败')
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
    ElMessage.error(error.message || '解析文件失败')
  }
}

// 执行书签导入
const executeBookmarkImport = async () => {
  if (!importResult.value || importResult.value.total === 0) {
    ElMessage.warning('没有有效的书签可导入')
    return
  }
  
  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    let successCount = 0
    let failCount = 0
    
    // 获取"网站"分类ID
    const websiteCategory = categories.value.find(c => c.name === '网站')
    const defaultCategoryId = websiteCategory ? websiteCategory.id : null
    
    for (const bookmark of importResult.value.bookmarks) {
      try {
        const favicon = getFavicon(bookmark.url)
        
        await db.execute(
          'INSERT INTO bookmarks (title, url, description, category_id, tags, favicon_url, is_favorite, created_at, updated_at, access_count) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0)',
          [
            bookmark.title || bookmark.url,
            bookmark.url,
            bookmark.description || '',
            defaultCategoryId,
            JSON.stringify(bookmark.tags || []),
            favicon,
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
    
    ElMessage.success(`导入完成：成功 ${successCount} 条，失败 ${failCount} 条`)
    showImportDialog.value = false
    await loadBookmarks()
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败')
  }
}

// 导出书签
const exportBookmarks = async () => {
  try {
    if (bookmarks.value.length === 0) {
      ElMessage.warning('没有书签可导出')
      return
    }
    
    const htmlContent = exportBookmarksToHTML(bookmarks.value)
    
    const filePath = await saveFile({
      defaultPath: `bookmarks_${new Date().toISOString().split('T')[0]}.html`,
      filters: [{
        name: 'HTML 文件',
        extensions: ['html']
      }]
    })
    
    if (filePath) {
      await writeTextFile(filePath, htmlContent)
      ElMessage.success('导出成功')
    }
  } catch (error) {
    if (error !== 'cancelled' && error !== 'null') {
      console.error('导出失败:', error)
      ElMessage.error('导出失败')
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
    // 使用 WordPress.com 的免费 mShots 截图服务
    // 完全免费，无需API key，稳定可靠
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
  return cat ? cat.name : '未分类'
}

onMounted(async () => {
  await initDatabase()
  await loadCategories()
  await loadBookmarks()
  // 默认选择"常用"分类
  selectedCategory.value = 'favorite'
})
</script>

<style scoped>
/* Font Awesome CDN */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

.bookmarks-page-wrapper {
  /* CSS 变量定义 */
  --bg-body: #f7f9fb;
  --bg-sidebar: #fcfcfc;
  --bg-content: #ffffff;
  --border-color: #e1e4e8;
  --text-primary: #2c3e50;
  --text-secondary: #606f7b;
  --accent-color: #3498db;
  --hover-bg: #edf2f7;
  --active-bg: #e6f4ff;
  --danger-color: #e74c3c;
  --success-color: #2ecc71;
  
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--text-primary);
  background-color: var(--bg-body);
  height: 100%;
  width: 100%;
  position: relative;
}

/* 顶部导航 */
.header {
  height: 50px;
  background-color: var(--bg-content);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  flex-shrink: 0;
  z-index: 2;
  position: relative;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.breadcrumb {
  font-size: 0.9rem;
  color: var(--text-secondary);
  background: #f0f2f5;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 主布局 */
.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* 左侧分类栏 */
.sidebar-left {
  width: 260px;
  min-width: 260px;
  flex-shrink: 0;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  user-select: none;
  overflow: hidden;
  height: 100%;
  position: relative;
  z-index: 1;
}

.sidebar-toolbar {
  padding: 10px 15px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.sidebar-btn {
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.sidebar-btn:hover {
  color: var(--accent-color);
}

.category-list {
  flex: 1;
  overflow-y: auto;
  padding: 5px 10px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  margin: 2px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  color: var(--text-primary);
  position: relative;
}

.category-item:hover {
  background-color: var(--hover-bg);
}

.category-item.active {
  background-color: var(--active-bg);
  color: var(--accent-color);
  font-weight: 600;
}

.category-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.favorite-icon {
  color: #FFB800 !important;
}

.category-name {
  flex: 1;
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--hover-bg);
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.category-actions {
  display: none;
  gap: 6px;
  position: absolute;
  right: 8px;
}

.category-item:hover .category-actions {
  display: flex;
}

.action-icon {
  font-size: 0.75rem;
  padding: 3px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.action-icon:hover {
  color: var(--accent-color);
  transform: scale(1.1);
}

.action-icon.del:hover {
  color: var(--danger-color);
}

/* 内容区域 */
.content-area {
  flex: 1;
  background-color: var(--bg-content);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  min-width: 0;
}

/* 书签列表 */
.bookmark-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.bookmark-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bookmark-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 14px 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bookmark-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: var(--accent-color);
}

/* 卡片行 */
.card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* 第一行：标题行 */
.card-header-row {
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f2f5;
}

.card-title-section {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.bookmark-favicon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bookmark-favicon img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  border-radius: 4px;
}

.card-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.card-title:hover {
  color: var(--accent-color);
}

.favorite-star {
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.favorite-star:hover {
  color: #FFB800;
  transform: scale(1.2);
}

.favorite-star.is-favorite {
  color: #FFB800;
}

/* 操作按钮 */
.card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.card-actions .el-button {
  padding: 6px;
}

/* 第二行：信息行 */
.card-info-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.card-url {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.visit-count {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* 预览按钮 */
.preview-btn {
  margin-left: auto;
  opacity: 1;
  transition: opacity 0.2s;
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
  gap: 16px;
}

.preview-info {
  display: flex;
  align-items: center;
  gap: 12px;
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
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.preview-image-container {
  width: 100%;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  margin: 20px 0;
}

.preview-image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
}

.preview-description {
  margin: 20px 0;
}

.preview-description h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.preview-description p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.preview-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.meta-text {
  font-size: 13px;
  color: var(--text-secondary);
  margin-left: auto;
}

/* 导入结果统计 */
.import-result {
  padding: 16px;
  background: var(--hover-bg);
  border-radius: 8px;
}

.result-stat {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-value.success {
  color: var(--success-color);
}

/* 暗色主题 */
@media (prefers-color-scheme: dark) {
  .bookmarks-page-wrapper {
    --bg-sidebar: #1e1e1e;
    --bg-content: #121212;
    --border-color: #2d2d2d;
    --text-primary: #e5e5e5;
    --text-regular: #b5b5b5;
    --text-secondary: #8b8b8b;
    --hover-bg: #2a2a2a;
    --active-bg: #1e3a5f;
    background-color: #121212;
  }
  
  .bookmark-card {
    background: #1e1e1e;
    border-color: #2d2d2d;
  }
  
  .card-header-row {
    border-bottom-color: #2d2d2d;
  }
}
</style>
