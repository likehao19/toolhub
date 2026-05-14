<template>
  <div class="bookmark-manager">
    <div class="bookmark-list">
      <div v-for="(item, index) in bookmarks" :key="index" class="bookmark-item">
        <input
          v-model="item.title"
          class="input title-input"
          placeholder="标题"
          @input="onInput"
        />
        <input
          v-model="item.url"
          class="input url-input"
          placeholder="URL"
          @input="onInput"
        />
        <button class="delete-btn" @click="removeBookmark(index)" title="删除">×</button>
      </div>
      <button class="add-btn" @click="addBookmark">+ 添加书签</button>
    </div>
    <div class="bar">
      <span class="hint">Ctrl+S 保存</span>
      <span class="status" :class="{ unsaved: !isSaved }">
        {{ isSaved ? '已保存' : '未保存' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, onActivated } from 'vue'
import { ElMessage } from 'element-plus'
import Database from '@tauri-apps/plugin-sql'

const bookmarks = ref([{ id: null, title: '', url: '' }])
const isSaved = ref(false)
const savedContent = ref('')

// 添加书签
const addBookmark = () => {
  bookmarks.value.push({ id: null, title: '', url: '' })
  isSaved.value = false
}

// 删除书签
const removeBookmark = async (index) => {
  const bookmark = bookmarks.value[index]
  
  // 如果有 id，从数据库中删除
  if (bookmark.id) {
    try {
      const db = await Database.load('sqlite:productivity.db')
      await db.execute('DELETE FROM bookmarks WHERE id = ?', [bookmark.id])
    } catch (e) { /* ignore */ }
  }
  
  if (bookmarks.value.length > 1) {
    bookmarks.value.splice(index, 1)
  } else {
    bookmarks.value = [{ id: null, title: '', url: '' }]
  }
  isSaved.value = false
}

// 输入变化
const onInput = () => {
  const current = JSON.stringify(bookmarks.value)
  if (savedContent.value !== current) {
    isSaved.value = false
  }
  updateContent()
}

// 更新折叠内容
const updateContent = () => {
  const validBookmarks = bookmarks.value.filter(b => b.title || b.url)
  let content = ''
  if (validBookmarks.length === 0) {
    content = '暂无书签'
  } else {
    const first = validBookmarks[0]
    const title = first.title || '未命名'
    const url = first.url || ''
    // 标题 + URL，都做截断处理
    const titleBrief = title.length > 10 ? title.substring(0, 10) + '...' : title
    const urlBrief = url.length > 15 ? url.substring(0, 15) + '...' : url
    content = `${titleBrief} ${urlBrief}`
  }
  window.dispatchEvent(new CustomEvent('sticky-notes-content-update', {
    detail: { content }
  }))
}

// 保存到数据库
const save = async () => {
  // 如果已保存，跳过
  if (isSaved.value) {
    return
  }
  
  try {
    const db = await Database.load('sqlite:productivity.db')
    const validBookmarks = bookmarks.value.filter(b => b.title && b.url)
    
    for (const bookmark of validBookmarks) {
      if (bookmark.id) {
        // 更新已有书签
        await db.execute(
          'UPDATE bookmarks SET title = ?, url = ?, updated_at = datetime("now") WHERE id = ?',
          [bookmark.title, bookmark.url, bookmark.id]
        )
      } else {
        // 插入新书签
        const result = await db.execute(
          'INSERT INTO bookmarks (title, url, category) VALUES (?, ?, ?)',
          [bookmark.title, bookmark.url, '便签收藏']
        )
        bookmark.id = result.lastInsertId
      }
    }
    
    savedContent.value = JSON.stringify(bookmarks.value)
    isSaved.value = true
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 从数据库加载
const load = async () => {
  try {
    const db = await Database.load('sqlite:productivity.db')
    const result = await db.select(
      `SELECT id, title, url FROM bookmarks 
       WHERE category = '便签收藏' 
       ORDER BY created_at DESC`
    )
    
    if (result && result.length > 0) {
      bookmarks.value = result
    } else {
      bookmarks.value = [{ id: null, title: '', url: '' }]
    }
    
    savedContent.value = JSON.stringify(bookmarks.value)
    isSaved.value = true
    updateContent()
  } catch (error) {
    bookmarks.value = [{ id: null, title: '', url: '' }]
    updateContent()
  }
}

onMounted(() => {
  load()
  window.addEventListener('sticky-notes-save-bookmarks', save)
})

onActivated(() => {
  updateContent()
})

onUnmounted(() => {
  window.removeEventListener('sticky-notes-save-bookmarks', save)
})
</script>

<style scoped>
.bookmark-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.bookmark-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
  padding-right: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scrollbar-gutter: stable;
}

.bookmark-list::-webkit-scrollbar {
  width: 6px;
}

.bookmark-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 3px;
}

.bookmark-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.bookmark-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

.bookmark-item {
  display: flex;
  gap: 6px;
  align-items: center;
}

.input {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--surface-panel-soft);
  transition: all 0.2s;
}

.input:focus {
  outline: none;
  border-color: rgba(194, 65, 12, 0.5);
  background: var(--surface-panel);
}

.input::placeholder {
  color: var(--el-text-color-placeholder);
}

.title-input {
  flex: 0 0 80px;
  min-width: 0;
}

.url-input {
  flex: 1;
  min-width: 0;
}

.delete-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-red);
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.add-btn {
  margin-top: 4px;
  padding: 6px;
  border: 1px dashed rgba(0, 0, 0, 0.2);
  background: transparent;
  color: var(--el-text-color-secondary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.add-btn:hover {
  border-color: rgba(194, 65, 12, 0.5);
  color: var(--accent-blue, #c2410c);
  background: rgba(194, 65, 12, 0.05);
}

.bar {
  padding: 6px 0 0;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  margin-top: 6px;
  padding-top: 6px;
}

.hint {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.status {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  transition: color 0.2s;
}

.status.unsaved {
  color: var(--color-orange);
}
</style>
