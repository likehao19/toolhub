<template>
  <div class="task-manager">
    <div class="task-list">
      <div v-for="(item, index) in tasks" :key="index" class="task-item">
        <div class="task-main">
          <input type="checkbox" v-model="item.completed" @change="onInput" class="checkbox" />
          <input
            v-model="item.title"
            class="input title-input"
            :class="{ completed: item.completed }"
            placeholder="任务标题"
            @input="onInput"
          />
          <button class="expand-btn" @click="toggleSubtasks(index)" v-if="item.subtasks && item.subtasks.length > 0">
            {{ item.showSubtasks ? '▼' : '▶' }}
          </button>
          <button class="delete-btn" @click="removeTask(index)" title="删除">×</button>
        </div>
        <div class="task-time">
          <input
            v-model="item.start_date"
            type="datetime-local"
            class="input time-input"
            @input="onInput"
          />
          <span class="time-separator">至</span>
          <input
            v-model="item.due_date"
            type="datetime-local"
            class="input time-input"
            @input="onInput"
          />
        </div>
        
        <!-- 子任务 -->
        <div v-if="item.showSubtasks" class="subtasks">
          <div v-for="(sub, subIndex) in item.subtasks" :key="subIndex" class="subtask-item">
            <input type="checkbox" v-model="sub.completed" @change="onInput" class="checkbox" />
            <input
              v-model="sub.title"
              class="input subtask-input"
              :class="{ completed: sub.completed }"
              placeholder="子任务"
              @input="onInput"
            />
            <button class="delete-btn-small" @click="removeSubtask(index, subIndex)">×</button>
          </div>
          <button class="add-subtask-btn" @click="addSubtask(index)">+ 子任务</button>
        </div>
        <button v-else class="add-subtask-btn" @click="addSubtask(index)">+ 子任务</button>
      </div>
      <button class="add-btn" @click="addTask">+ 添加任务</button>
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
import { ref, onMounted, onUnmounted, onActivated } from 'vue'
import { ElMessage } from 'element-plus'
import Database from '@tauri-apps/plugin-sql'

const tasks = ref([{ id: null, title: '', start_date: '', due_date: '', completed: false, subtasks: [], showSubtasks: false }])
const isSaved = ref(false)
const savedContent = ref('')

// 添加任务
const addTask = () => {
  tasks.value.push({ id: null, title: '', start_date: '', due_date: '', completed: false, subtasks: [], showSubtasks: false })
  isSaved.value = false
}

// 删除任务
const removeTask = async (index) => {
  const task = tasks.value[index]
  
  if (task.id) {
    try {
      const db = await Database.load('sqlite:productivity.db')
      await db.execute('DELETE FROM todos WHERE id = ? OR parent_id = ?', [task.id, task.id])
    } catch (e) { /* ignore */ }
  }
  
  if (tasks.value.length > 1) {
    tasks.value.splice(index, 1)
  } else {
    tasks.value = [{ id: null, title: '', start_date: '', due_date: '', completed: false, subtasks: [], showSubtasks: false }]
  }
  isSaved.value = false
}

// 添加子任务
const addSubtask = (taskIndex) => {
  if (!tasks.value[taskIndex].subtasks) {
    tasks.value[taskIndex].subtasks = []
  }
  tasks.value[taskIndex].subtasks.push({ id: null, title: '', completed: false })
  tasks.value[taskIndex].showSubtasks = true
  isSaved.value = false
}

// 删除子任务
const removeSubtask = async (taskIndex, subIndex) => {
  const subtask = tasks.value[taskIndex].subtasks[subIndex]
  
  if (subtask.id) {
    try {
      const db = await Database.load('sqlite:productivity.db')
      await db.execute('DELETE FROM todos WHERE id = ?', [subtask.id])
    } catch (e) { /* ignore */ }
  }
  
  tasks.value[taskIndex].subtasks.splice(subIndex, 1)
  isSaved.value = false
}

// 切换子任务显示
const toggleSubtasks = (taskIndex) => {
  tasks.value[taskIndex].showSubtasks = !tasks.value[taskIndex].showSubtasks
}

// 输入变化
const onInput = () => {
  const current = JSON.stringify(tasks.value)
  if (savedContent.value !== current) {
    isSaved.value = false
  }
  updateContent()
}

// 更新折叠内容
const updateContent = () => {
  const validTasks = tasks.value.filter(t => t.title)
  const incompleteTasks = validTasks.filter(t => !t.completed)
  let content = ''
  if (validTasks.length === 0) {
    content = '暂无任务'
  } else if (incompleteTasks.length > 0) {
    const first = incompleteTasks[0]
    const title = first.title
    const titleBrief = title.length > 8 ? title.substring(0, 8) + '...' : title
    
    // 格式化时间
    const formatTime = (timeStr) => {
      if (!timeStr) return ''
      const date = new Date(timeStr)
      return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-')
    }
    
    const start = formatTime(first.start_date)
    const end = formatTime(first.due_date)
    
    if (start && end) {
      content = `${titleBrief} ${start}~${end}`
    } else if (start) {
      content = `${titleBrief} ${start}`
    } else {
      content = titleBrief
    }
  } else {
    content = '全部完成'
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
    const validTasks = tasks.value.filter(t => t.title)
    
    for (const task of validTasks) {
      const status = task.completed ? 2 : 0
      
      if (task.id) {
        // 更新已有任务
        await db.execute(
          'UPDATE todos SET title = ?, start_date = ?, due_date = ?, status = ?, updated_at = datetime("now"), completed_at = ? WHERE id = ?',
          [task.title, task.start_date || null, task.due_date || null, status, task.completed ? new Date().toISOString() : null, task.id]
        )
      } else {
        // 插入新任务
        const result = await db.execute(
          'INSERT INTO todos (title, start_date, due_date, status, category) VALUES (?, ?, ?, ?, ?)',
          [task.title, task.start_date || null, task.due_date || null, status, '便签任务']
        )
        task.id = result.lastInsertId
      }
      
      // 保存子任务
      if (task.subtasks && task.subtasks.length > 0) {
        for (const subtask of task.subtasks) {
          if (!subtask.title) continue
          
          const subStatus = subtask.completed ? 2 : 0
          
          if (subtask.id) {
            await db.execute(
              'UPDATE todos SET title = ?, status = ?, updated_at = datetime("now") WHERE id = ?',
              [subtask.title, subStatus, subtask.id]
            )
          } else {
            const subResult = await db.execute(
              'INSERT INTO todos (title, status, parent_id, category) VALUES (?, ?, ?, ?)',
              [subtask.title, subStatus, task.id, '便签任务']
            )
            subtask.id = subResult.lastInsertId
          }
        }
      }
    }
    
    savedContent.value = JSON.stringify(tasks.value)
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
      `SELECT id, title, start_date, due_date, status, parent_id FROM todos 
       WHERE category = '便签任务' AND parent_id IS NULL
       ORDER BY created_at DESC`
    )
    
    if (result && result.length > 0) {
      tasks.value = await Promise.all(result.map(async (item) => {
        // 加载子任务
        const subtasks = await db.select(
          'SELECT id, title, status FROM todos WHERE parent_id = ? ORDER BY created_at ASC',
          [item.id]
        )
        
        return {
          ...item,
          start_date: item.start_date ? item.start_date.slice(0, 16) : '',
          due_date: item.due_date ? item.due_date.slice(0, 16) : '',
          completed: item.status === 2,
          subtasks: (subtasks || []).map(sub => ({
            ...sub,
            completed: sub.status === 2
          })),
          showSubtasks: false
        }
      }))
    } else {
      tasks.value = [{ id: null, title: '', start_date: '', due_date: '', completed: false, subtasks: [], showSubtasks: false }]
    }
    
    savedContent.value = JSON.stringify(tasks.value)
    isSaved.value = true
    updateContent()
  } catch (error) {
    tasks.value = [{ id: null, title: '', start_date: '', due_date: '', completed: false, subtasks: [], showSubtasks: false }]
    updateContent()
  }
}

onMounted(() => {
  load()
  window.addEventListener('sticky-notes-save-tasks', save)
})

onActivated(() => {
  updateContent()
})

onUnmounted(() => {
  window.removeEventListener('sticky-notes-save-tasks', save)
})
</script>

<style scoped>
.task-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
  padding-right: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scrollbar-gutter: stable;
}

.task-list::-webkit-scrollbar {
  width: 6px;
}

.task-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 3px;
}

.task-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.task-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

.task-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.task-main {
  display: flex;
  gap: 6px;
  align-items: center;
}

.task-time {
  display: flex;
  gap: 6px;
  align-items: center;
  padding-left: 26px;
}

.checkbox {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.input {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: rgba(255, 255, 255, 0.8);
  transition: all 0.2s;
}

.input:focus {
  outline: none;
  border-color: rgba(194, 65, 12, 0.5);
  background: rgba(255, 255, 255, 1);
}

.input::placeholder {
  color: var(--el-text-color-placeholder);
}

.input.completed {
  text-decoration: line-through;
  color: var(--el-text-color-secondary);
}

.title-input {
  flex: 1;
  min-width: 0;
}

.time-input {
  flex: 1;
  min-width: 0;
  font-size: 11px;
}

.time-separator {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.expand-btn {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(194, 65, 12, 0.1);
  color: var(--accent-blue, #c2410c);
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-btn:hover {
  background: rgba(194, 65, 12, 0.2);
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

/* ignore */
.subtasks {
  padding-left: 26px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.subtask-item {
  display: flex;
  gap: 6px;
  align-items: center;
}

.subtask-input {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  padding: 4px 6px;
}

.delete-btn-small {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-red);
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn-small:hover {
  background: rgba(239, 68, 68, 0.2);
}

.add-subtask-btn {
  padding: 4px 6px;
  margin-left: 26px;
  border: 1px dashed rgba(0, 0, 0, 0.15);
  background: transparent;
  color: var(--el-text-color-secondary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.add-subtask-btn:hover {
  border-color: rgba(194, 65, 12, 0.5);
  color: var(--accent-blue, #c2410c);
  background: rgba(194, 65, 12, 0.05);
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
