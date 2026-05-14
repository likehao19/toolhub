<template>
  <div class="schedule-manager">
    <div class="schedule-list">
      <div v-for="(item, index) in schedules" :key="index" class="schedule-item">
        <div class="title-row">
          <input
            v-model="item.title"
            class="input title-input"
            placeholder="标题"
            @input="onInput"
          />
          <button class="delete-btn" @click="removeSchedule(index)" title="删除">×</button>
        </div>
        <div class="time-row">
          <input
            v-model="item.start_time"
            type="datetime-local"
            class="input time-input"
            @input="onInput"
          />
          <span class="time-separator">至</span>
          <input
            v-model="item.end_time"
            type="datetime-local"
            class="input time-input"
            @input="onInput"
          />
        </div>
      </div>
      <button class="add-btn" @click="addSchedule">+ 添加日程</button>
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

const schedules = ref([{ id: null, title: '', start_time: '', end_time: '' }])
const isSaved = ref(false)
const savedContent = ref('')

// 添加日程
const addSchedule = () => {
  schedules.value.push({ id: null, title: '', start_time: '', end_time: '' })
  isSaved.value = false
}

// 删除日程
const removeSchedule = async (index) => {
  const schedule = schedules.value[index]
  
  // 如果有 id，从数据库中删除
  if (schedule.id) {
    try {
      const db = await Database.load('sqlite:productivity.db')
      await db.execute('DELETE FROM calendar_events WHERE id = ?', [schedule.id])
    } catch (e) { /* ignore */ }
  }
  
  if (schedules.value.length > 1) {
    schedules.value.splice(index, 1)
  } else {
    schedules.value = [{ id: null, title: '', start_time: '', end_time: '' }]
  }
  isSaved.value = false
}

// 输入变化
const onInput = () => {
  const current = JSON.stringify(schedules.value)
  if (savedContent.value !== current) {
    isSaved.value = false
  }
  updateContent()
}

// 更新折叠内容
const updateContent = () => {
  const validSchedules = schedules.value.filter(s => s.title || s.start_time)
  let content = ''
  if (validSchedules.length === 0) {
    content = '暂无日程'
  } else {
    const first = validSchedules[0]
    const title = first.title || '未命名'
    const titleBrief = title.length > 8 ? title.substring(0, 8) + '...' : title
    
    // 格式化时间
    const formatTime = (timeStr) => {
      if (!timeStr) return ''
      const date = new Date(timeStr)
      return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-')
    }
    
    const start = formatTime(first.start_time)
    const end = formatTime(first.end_time)
    
    if (start && end) {
      content = `${titleBrief} ${start}~${end}`
    } else if (start) {
      content = `${titleBrief} ${start}`
    } else {
      content = titleBrief
    }
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
    const validSchedules = schedules.value.filter(s => s.title && s.start_time)
    
    for (const schedule of validSchedules) {
      if (schedule.id) {
        // 更新已有日程
        await db.execute(
          'UPDATE calendar_events SET title = ?, start_time = ?, end_time = ?, updated_at = datetime("now") WHERE id = ?',
          [schedule.title, schedule.start_time, schedule.end_time || null, schedule.id]
        )
      } else {
        // 插入新日程
        const result = await db.execute(
          'INSERT INTO calendar_events (title, start_time, end_time) VALUES (?, ?, ?)',
          [schedule.title, schedule.start_time, schedule.end_time || null]
        )
        schedule.id = result.lastInsertId
      }
    }
    
    savedContent.value = JSON.stringify(schedules.value)
    isSaved.value = true
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 从数据库加载
const load = async () => {
  try {
    const db = await Database.load('sqlite:productivity.db')
    // 只加载 7 天前至未来的日程，限制 50 条
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}T00:00:00`

    const result = await db.select(
      `SELECT id, title, start_time, end_time FROM calendar_events
       WHERE start_time >= ?
       ORDER BY start_time ASC
       LIMIT 50`,
      [cutoffStr]
    )
    
    if (result && result.length > 0) {
      // 转换时间格式为 datetime-local 格式
      schedules.value = result.map(item => ({
        ...item,
        start_time: item.start_time ? item.start_time.slice(0, 16) : '',
        end_time: item.end_time ? item.end_time.slice(0, 16) : ''
      }))
    } else {
      schedules.value = [{ id: null, title: '', start_time: '', end_time: '' }]
    }
    
    savedContent.value = JSON.stringify(schedules.value)
    isSaved.value = true
    updateContent()
  } catch (error) {
    schedules.value = [{ id: null, title: '', start_time: '', end_time: '' }]
    updateContent()
  }
}

onMounted(() => {
  load()
  window.addEventListener('sticky-notes-save-schedule', save)
})

onActivated(() => {
  updateContent()
})

onUnmounted(() => {
  window.removeEventListener('sticky-notes-save-schedule', save)
})
</script>

<style scoped>
.schedule-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.schedule-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
  padding-right: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scrollbar-gutter: stable;
}

.schedule-list::-webkit-scrollbar {
  width: 6px;
}

.schedule-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 3px;
}

.schedule-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.schedule-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

.schedule-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.title-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.time-row {
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
