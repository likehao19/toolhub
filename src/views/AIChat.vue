<template>
  <div class="ai-chat-wrapper">
    <!-- 顶部工具栏 -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <i class="fas fa-robot"></i> AI 助手
        </div>
      </div>
      <div class="header-actions">
        <el-button 
          type="primary" 
          :icon="Plus" 
          circle
          size="small"
          @click="showAddDialog = true"
          title="添加 AI 网站"
        />
        <el-button 
          :icon="Setting" 
          circle
          size="small"
          @click="showManageDialog = true"
          title="管理网站"
        />
      </div>
    </div>

    <!-- AI 网站网格 -->
    <div class="content-area">
      <div class="ai-grid">
        <div
          v-for="site in aiWebsites"
          :key="site.id"
          class="ai-card"
          @click="openWebsite(site)"
        >
          <img
            v-if="site.icon_url"
            :src="site.icon_url"
            class="ai-icon"
            @error="handleIconError"
          />
          <i v-else class="fas fa-globe ai-icon-fallback"></i>
          <span class="ai-name">{{ site.name }}</span>
          <p class="ai-description">{{ site.description }}</p>
          <div class="card-overlay">
            <i class="fas fa-external-link-alt"></i>
            <span>打开窗口</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加网站对话框 -->
    <el-dialog
      v-model="showAddDialog"
      title="添加 AI 网站"
      width="500px"
    >
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="addForm.name" placeholder="例如：ChatGPT" />
        </el-form-item>
        <el-form-item label="网址">
          <el-input v-model="addForm.url" placeholder="https://" />
        </el-form-item>
        <el-form-item label="图标">
          <div style="display: flex; gap: 10px; align-items: center;">
            <el-input v-model="addForm.icon_url" placeholder="图标 URL" style="flex: 1;" />
            <el-button @click="autoFetchIcon" :loading="fetchingIcon">
              <i class="fas fa-magic"></i>
              自动获取
            </el-button>
          </div>
          <img
            v-if="addForm.icon_url"
            :src="addForm.icon_url"
            class="icon-preview"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="addForm.description"
            type="textarea"
            placeholder="简短描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="addWebsite" :loading="adding">
          添加
        </el-button>
      </template>
    </el-dialog>

    <!-- 管理网站对话框 -->
    <el-dialog
      v-model="showManageDialog"
      title="管理 AI 网站"
      width="800px"
    >
      <div class="table-container">
        <el-table :data="aiWebsites" stripe max-height="500">
          <el-table-column label="图标" width="60">
            <template #default="{ row }">
              <img v-if="row.icon_url" :src="row.icon_url" style="width: 32px; height: 32px; border-radius: 6px;" />
              <i v-else class="fas fa-globe" style="font-size: 24px; color: #909399;"></i>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" width="120" />
          <el-table-column prop="url" label="网址" show-overflow-tooltip />
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button 
                link 
                type="primary" 
                :icon="Edit"
                @click="editWebsite(row)"
                title="编辑"
              />
              <el-button 
                link 
                type="danger" 
                :icon="Delete"
                @click="deleteWebsite(row)"
                title="删除"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 编辑网站对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑 AI 网站"
      width="500px"
    >
      <el-form v-if="editForm" :model="editForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="网址">
          <el-input v-model="editForm.url" />
        </el-form-item>
        <el-form-item label="图标">
          <div style="display: flex; gap: 10px; align-items: center;">
            <el-input v-model="editForm.icon_url" placeholder="图标 URL" style="flex: 1;" />
            <el-button @click="autoFetchIconForEdit" :loading="fetchingIconEdit">
              <i class="fas fa-magic"></i>
              自动获取
            </el-button>
          </div>
          <img
            v-if="editForm.icon_url"
            :src="editForm.icon_url"
            class="icon-preview"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="updateWebsite">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Setting, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import Database from '@tauri-apps/plugin-sql'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

// 状态管理
const aiWebsites = ref([])
const showAddDialog = ref(false)
const showManageDialog = ref(false)
const showEditDialog = ref(false)
const adding = ref(false)
const fetchingIcon = ref(false)
const fetchingIconEdit = ref(false)

// 表单数据
const addForm = ref({
  name: '',
  url: '',
  icon_url: '',
  description: ''
})

const editForm = ref(null)

// 下载图标并转换为 Base64
const downloadIconAsBase64 = async (iconUrl) => {
  try {
    const response = await tauriFetch(iconUrl, {
      method: 'GET',
      responseType: 2 // Binary
    })
    
    if (response.ok) {
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    }
    return null
  } catch (error) {

    return null
  }
}

// 初始化数据库
const initDatabase = async () => {
  try {
    const db = await Database.load('sqlite:app.db')
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ai_websites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        icon_url TEXT,
        description TEXT,
        is_default INTEGER DEFAULT 0,
        is_pinned INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

    const existing = await db.select('SELECT COUNT(*) as count FROM ai_websites')
    
    if (existing[0].count === 0) {
      ElMessage.info('正在初始化 AI 网站数据，请稍候...')
      
      const defaultSites = [
        {
          name: 'ChatGPT',
          url: 'https://chatgpt.com',
          icon_url: 'https://cdn.oaistatic.com/assets/favicon-o20kmmos.svg',
          description: 'OpenAI 的 ChatGPT，最强大的对话 AI',
          is_default: 1
        },
        {
          name: 'Claude',
          url: 'https://claude.ai/new',
          icon_url: 'https://claude.ai/images/claude_app_icon.png',
          description: 'Anthropic 的 Claude，安全可靠的 AI 助手',
          is_default: 1
        },
        {
          name: 'Gemini',
          url: 'https://gemini.google.com/app',
          icon_url: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
          description: 'Google 的 Gemini，多模态 AI 模型',
          is_default: 1
        },
        {
          name: 'Copilot',
          url: 'https://copilot.microsoft.com',
          icon_url: 'https://www.bing.com/sa/simg/favicon-2x.ico',
          description: 'Microsoft Copilot，集成 GPT-4',
          is_default: 1
        },
        {
          name: 'Perplexity',
          url: 'https://www.perplexity.ai',
          icon_url: 'https://www.perplexity.ai/favicon.ico',
          description: 'Perplexity AI，AI 搜索引擎',
          is_default: 1
        },
        {
          name: 'DeepSeek',
          url: 'https://chat.deepseek.com',
          icon_url: 'https://chat.deepseek.com/favicon.png',
          description: 'DeepSeek Chat，国产强大AI模型',
          is_default: 1
        },
        {
          name: 'Kimi',
          url: 'https://kimi.moonshot.cn',
          icon_url: 'https://statics.moonshot.cn/kimi-chat/favicon.ico',
          description: 'Kimi，月之暗面出品，超长上下文',
          is_default: 1
        },
        {
          name: '豆包',
          url: 'https://www.doubao.com/chat',
          icon_url: 'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/web/logo-icon.png',
          description: '字节跳动豆包，智能AI助手',
          is_default: 1
        },
        {
          name: '文心一言',
          url: 'https://yiyan.baidu.com',
          icon_url: 'https://nlp-eb.cdn.bcebos.com/logo/favicon.ico',
          description: '百度文心一言，中文大模型',
          is_default: 1
        },
        {
          name: '通义千问',
          url: 'https://tongyi.aliyun.com/qianwen',
          icon_url: 'https://img.alicdn.com/imgextra/i3/O1CN01KGHgHb1YrwJ0qUXJ0_!!6000000003113-2-tps-192-192.png',
          description: '阿里云通义千问，企业级AI',
          is_default: 1
        },
        {
          name: '讯飞星火',
          url: 'https://xinghuo.xfyun.cn',
          icon_url: 'https://xinghuo.xfyun.cn/favicon.ico',
          description: '科大讯飞星火认知大模型',
          is_default: 1
        },
        {
          name: '智谱清言',
          url: 'https://chatglm.cn',
          icon_url: 'https://chatglm.cn/favicon.ico',
          description: '智谱AI清言，双语大模型',
          is_default: 1
        },
        {
          name: 'Poe',
          url: 'https://poe.com',
          icon_url: 'https://poe.com/_next/static/media/poeIconRounded.81cf02ae.png',
          description: 'Poe，访问多个AI模型的平台',
          is_default: 1
        },
        {
          name: 'HuggingChat',
          url: 'https://huggingface.co/chat',
          icon_url: 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg',
          description: 'Hugging Face Chat，开源AI社区',
          is_default: 1
        },
        {
          name: 'Character.AI',
          url: 'https://character.ai',
          icon_url: 'https://character.ai/favicon.ico',
          description: 'Character.AI，创建AI角色对话',
          is_default: 1
        }
      ]

      const now = new Date().toISOString()
      
      // 下载所有图标并转换为 Base64
      for (let i = 0; i < defaultSites.length; i++) {
        const site = defaultSites[i]
        
        // 尝试下载图标
        let base64Icon = await downloadIconAsBase64(site.icon_url)
        
        // 如果下载失败，尝试备用方案
        if (!base64Icon) {
          try {
            const domain = new URL(site.url).origin
            const fallbackUrls = [
              `${domain}/favicon.ico`,
              `${domain}/favicon.png`,
              `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
            ]
            
            for (const fallbackUrl of fallbackUrls) {
              base64Icon = await downloadIconAsBase64(fallbackUrl)
              if (base64Icon) break
            }
          } catch (e) { /* ignore */ }
        }
        
        // 使用 Base64 图标或空字符串
        const finalIconUrl = base64Icon || ''
        
        await db.execute(
          `INSERT INTO ai_websites (name, url, icon_url, description, is_default, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [site.name, site.url, finalIconUrl, site.description, site.is_default, i, now, now]
        )

      }
      
      ElMessage.success('AI 网站初始化完成')
    }

    await loadWebsites()
  } catch (error) {

    ElMessage.error('初始化失败: ' + error.message)
  }
}

// 加载所有 AI 网站
const loadWebsites = async () => {
  try {
    const db = await Database.load('sqlite:app.db')
    const sites = await db.select('SELECT * FROM ai_websites ORDER BY sort_order ASC, created_at DESC')
    aiWebsites.value = sites
  } catch (e) { /* ignore */ }
}

// 自动获取网站图标（添加时）
const autoFetchIcon = async () => {
  if (!addForm.value.url) {
    ElMessage.warning('请先输入网站地址')
    return
  }

  fetchingIcon.value = true
  try {
    const url = new URL(addForm.value.url)
    const domain = url.origin
    
    // 尝试多个可能的图标路径
    const iconUrls = [
      `${domain}/favicon.ico`,
      `${domain}/favicon.png`,
      `${domain}/favicon.svg`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    ]
    
    let base64Icon = null
    for (const iconUrl of iconUrls) {
      base64Icon = await downloadIconAsBase64(iconUrl)
      if (base64Icon) {
        break
      }
    }
    
    if (base64Icon) {
      addForm.value.icon_url = base64Icon
      ElMessage.success('图标下载并保存成功')
    } else {
      ElMessage.warning('无法获取图标，请手动输入')
    }
  } catch (error) {

    ElMessage.error('网站地址格式错误')
  } finally {
    fetchingIcon.value = false
  }
}

// 自动获取网站图标（编辑时）
const autoFetchIconForEdit = async () => {
  if (!editForm.value.url) {
    ElMessage.warning('请先输入网站地址')
    return
  }

  fetchingIconEdit.value = true
  try {
    const url = new URL(editForm.value.url)
    const domain = url.origin
    
    // 尝试多个可能的图标路径
    const iconUrls = [
      `${domain}/favicon.ico`,
      `${domain}/favicon.png`,
      `${domain}/favicon.svg`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    ]
    
    let base64Icon = null
    for (const iconUrl of iconUrls) {
      base64Icon = await downloadIconAsBase64(iconUrl)
      if (base64Icon) {
        break
      }
    }
    
    if (base64Icon) {
      editForm.value.icon_url = base64Icon
      ElMessage.success('图标下载并保存成功')
    } else {
      ElMessage.warning('无法获取图标，请手动输入')
    }
  } catch (error) {

    ElMessage.error('网站地址格式错误')
  } finally {
    fetchingIconEdit.value = false
  }
}

// 添加网站
const addWebsite = async () => {
  if (!addForm.value.name || !addForm.value.url) {
    ElMessage.warning('请填写名称和网址')
    return
  }

  adding.value = true
  try {
    const db = await Database.load('sqlite:app.db')
    const now = new Date().toISOString()
    
    await db.execute(
      `INSERT INTO ai_websites (name, url, icon_url, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [addForm.value.name, addForm.value.url, addForm.value.icon_url, addForm.value.description, now, now]
    )

    ElMessage.success('添加成功')
    showAddDialog.value = false
    addForm.value = { name: '', url: '', icon_url: '', description: '' }
    await loadWebsites()
  } catch (error) {

    ElMessage.error('添加失败: ' + error.message)
  } finally {
    adding.value = false
  }
}

// 打开网站（独立窗口）
const openWebsite = async (site) => {
  try {
    const windowLabel = `ai-window-${site.id}-${Date.now()}`
    
    const webview = new WebviewWindow(windowLabel, {
      url: site.url,
      title: site.name,
      width: 1400,
      height: 900,
      center: true,
      resizable: true,
      maximizable: true,
      minimizable: true,
      decorations: true,
    })

    webview.once('tauri://created', () => {
      ElMessage.success(`已打开 ${site.name}`)
    })

    webview.once('tauri://error', (e) => {
      ElMessage.error('打开失败: ' + e)
    })
  } catch (error) {

    ElMessage.error('创建窗口失败: ' + error.message)
  }
}

// 图标加载失败处理
const handleIconError = (event) => {
  event.target.style.display = 'none'
}

// 编辑网站
const editWebsite = (site) => {
  editForm.value = { ...site }
  showEditDialog.value = true
}

// 更新网站
const updateWebsite = async () => {
  if (!editForm.value) return

  try {
    const db = await Database.load('sqlite:app.db')
    const now = new Date().toISOString()
    
    await db.execute(
      `UPDATE ai_websites 
       SET name = ?, url = ?, icon_url = ?, description = ?, updated_at = ?
       WHERE id = ?`,
      [editForm.value.name, editForm.value.url, editForm.value.icon_url, editForm.value.description, now, editForm.value.id]
    )

    ElMessage.success('更新成功')
    showEditDialog.value = false
    editForm.value = null
    await loadWebsites()
  } catch (error) {

    ElMessage.error('更新失败: ' + error.message)
  }
}

// 删除网站
const deleteWebsite = async (site) => {
  try {
    await ElMessageBox.confirm(`确定要删除 ${site.name} 吗？`, '确认删除', {
      type: 'warning'
    })

    const db = await Database.load('sqlite:app.db')
    await db.execute('DELETE FROM ai_websites WHERE id = ?', [site.id])

    ElMessage.success('删除成功')
    await loadWebsites()
  } catch (error) {
    if (error !== 'cancel') {

      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

onMounted(async () => {
  await initDatabase()
})
</script>

<style scoped>
/* ignore */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

.ai-chat-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: #f7f9fb;
}

/* ignore */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  height: 50px;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.breadcrumb {
  font-size: 0.9rem;
  color: #606f7b;
  background: #f0f2f5;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.breadcrumb i {
  color: #3498db;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* ignore */
.content-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f7f9fb;
}

.ai-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
  max-width: 100%;
}

.ai-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.ai-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.ai-card:hover .card-overlay {
  opacity: 1;
  transform: translateY(0);
}

.ai-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  border-radius: 12px;
  object-fit: contain;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.ai-icon-fallback {
  font-size: 48px;
  color: #909399;
  margin-bottom: 12px;
}

.ai-name {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  text-align: center;
  margin-bottom: 6px;
}

.ai-description {
  font-size: 12px;
  color: #909399;
  text-align: center;
  margin: 0;
  line-height: 1.4;
  padding: 0 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px;
  background: linear-gradient(to top, rgba(102, 126, 234, 0.95), rgba(102, 126, 234, 0.8));
  color: white;
  font-size: 12px;
  font-weight: 500;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* ignore */
.table-container {
  max-height: 500px;
  overflow-y: auto;
}

.icon-preview {
  width: 48px;
  height: 48px;
  margin-top: 10px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  padding: 4px;
}
</style>
