<template>
  <div class="calendar-wrapper">
    <!-- 顶部工具栏 -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <i class="fas fa-calendar-alt"></i> 日程管理
        </div>
        <!-- 视图切换 -->
        <el-radio-group v-model="calendarView" size="small" style="margin-left: 16px;">
          <el-radio-button value="month">月视图</el-radio-button>
          <el-radio-button value="week">周视图</el-radio-button>
          <el-radio-button value="day">日视图</el-radio-button>
          <el-radio-button value="list">列表视图</el-radio-button>
        </el-radio-group>
      </div>
      <div class="header-actions">
        <el-select v-model="selectedCategory" placeholder="按分类筛选" clearable size="small" style="width: 150px; margin-right: 8px;">
          <el-option label="全部" value="" />
          <el-option
            v-for="category in categories"
            :key="category"
            :label="category"
            :value="category"
          />
        </el-select>
        <el-button 
          :icon="Bell" 
          circle
          size="small"
          @click="testReminders"
          title="测试提醒（开发用）"
          style="margin-right: 4px;"
        />
        <el-button 
          :icon="Upload" 
          circle
          size="small"
          @click="showImportDialog = true"
          title="导入日程"
        />
        <el-button 
          :icon="Download" 
          circle
          size="small"
          @click="handleExport"
          title="导出日程"
        />
        <el-button 
          :icon="Plus" 
          circle
          size="small"
          type="primary"
          @click="showCreateDialog"
          title="新建日程"
        />
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="content-container">
    <div v-if="calendarView === 'month'" class="calendar-container">
      <el-config-provider :locale="locale">
        <el-calendar v-model="selectedDate">
          <template #date-cell="{ data }">
            <div class="calendar-day" :class="{ 
              'has-events': hasEvents(data.day), 
              'is-holiday': isHoliday(data.day), 
              'is-solar-term': getSolarTerm(data.day),
              'is-today': isToday(data.day)
            }" @dblclick="handleDateDoubleClick(data.day)">
              <div class="day-number">{{ getDayNumber(data.day) }}</div>
              <div class="lunar-info">
                <div class="lunar-date">{{ getLunarDateStr(data.day) }}</div>
                <div v-if="getSolarTerm(data.day)" class="solar-term">{{ getSolarTerm(data.day) }}</div>
              </div>
              <div v-if="isHoliday(data.day)" class="holiday-label">
                {{ getHolidayName(data.day) }}
              </div>
              <div class="day-events">
                <div
                  v-for="event in getDayEvents(data.day)"
                  :key="event.id"
                  class="event-dot"
                  :style="{ backgroundColor: getEventColor(event) }"
                  @click.stop="viewEvent(event)"
                />
              </div>
            </div>
          </template>
        </el-calendar>
      </el-config-provider>
    </div>

    <!-- 周视图 -->
    <div v-else-if="calendarView === 'week'" class="week-view">
      <div class="week-header">
        <div class="week-day" v-for="day in weekDays" :key="day.date">
          <div class="day-label">{{ day.label }}</div>
          <div class="day-number">{{ day.number }}</div>
        </div>
      </div>
      <div class="week-content">
        <div class="week-column" v-for="day in weekDays" :key="day.date">
          <div
            v-for="event in getDayEvents(day.date)"
            :key="event.id"
            class="week-event"
            :style="{ backgroundColor: getEventColor(event) }"
            @click="viewEvent(event)"
          >
            <div class="event-time">{{ formatEventTime(event.start_time) }}</div>
            <div class="event-title">{{ event.title }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 日视图 -->
    <div v-else-if="calendarView === 'day'" class="day-view">
      <div class="day-header">
        <h3>{{ formatSelectedDate() }}</h3>
        <div class="day-events-list">
          <div
            v-for="event in selectedDateEvents"
            :key="event.id"
            class="day-event-item"
            @click="viewEvent(event)"
          >
            <div class="event-time-block">
              <div class="time-start">{{ formatEventTime(event.start_time) }}</div>
              <div v-if="event.end_time" class="time-end">{{ formatEventTime(event.end_time) }}</div>
            </div>
            <div class="event-details">
              <div class="event-title">{{ event.title }}</div>
              <div v-if="event.location" class="event-location">
                <el-icon><Location /></el-icon>
                {{ event.location }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-else-if="calendarView === 'list'" class="list-view">
      <div class="list-toolbar">
        <el-date-picker
          v-model="listViewDateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="handleListViewDateChange"
        />
      </div>
      <div class="event-list-view">
        <el-card
          v-for="event in listViewEvents"
          :key="event.id"
          class="event-card"
          shadow="hover"
          @click="viewEvent(event)"
        >
          <div class="event-content">
            <div class="event-time">
              {{ formatEventTime(event.start_time) }}
              <span v-if="event.end_time"> - {{ formatEventTime(event.end_time) }}</span>
            </div>
            <div class="event-title">{{ event.title }}</div>
            <div v-if="event.location" class="event-location">
              <el-icon><Location /></el-icon>
              {{ event.location }}
            </div>
          </div>
        </el-card>
        <el-empty v-if="listViewEvents.length === 0" description="该时间段无日程" />
      </div>
    </div>

    <!-- 选中日期的日程列表（月视图） -->
    <div v-if="calendarView === 'month'" class="events-section">
      <h3>{{ formatSelectedDate() }} 的日程</h3>
      <div class="event-list">
        <el-card
          v-for="event in selectedDateEvents"
          :key="event.id"
          class="event-card"
          shadow="hover"
          @click="viewEvent(event)"
        >
          <div class="event-card-header">
            <div class="event-time">
              {{ formatEventTime(event.start_time) }}
              <span v-if="event.end_time"> - {{ formatEventTime(event.end_time) }}</span>
            </div>
            <div class="event-actions">
              <el-button text size="small" @click.stop="editEvent(event)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button text size="small" type="danger" @click.stop="deleteEvent(event)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="event-content">
            <div class="event-title">{{ event.title }}</div>
            <div v-if="event.location" class="event-location">
              <el-icon><Location /></el-icon>
              {{ event.location }}
            </div>
          </div>
        </el-card>
        <el-empty v-if="selectedDateEvents.length === 0" description="该日期无日程" />
      </div>
    </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingEvent ? '编辑日程' : '新建日程'"
      width="650px"
      :close-on-click-modal="false"
    >
      <el-form :model="eventForm" label-width="70px" size="default">
        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item label="标题" required>
              <el-input v-model="eventForm.title" placeholder="日程标题" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="开始" required>
              <el-date-picker
                v-model="eventForm.start_time"
                type="datetime"
                placeholder="开始时间"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DDTHH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束">
              <el-date-picker
                v-model="eventForm.end_time"
                type="datetime"
                placeholder="结束时间"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DDTHH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="16">
            <el-form-item label="地点">
              <el-input v-model="eventForm.location" placeholder="地点" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="分类">
              <el-select v-model="eventForm.category" placeholder="分类" style="width: 100%;">
                <el-option label="工作" value="工作" />
                <el-option label="个人" value="个人" />
                <el-option label="会议" value="会议" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item label="描述">
              <el-input
                v-model="eventForm.description"
                type="textarea"
                :rows="2"
                placeholder="日程描述"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item label="提醒">
              <el-checkbox-group v-model="eventForm.reminderRules">
                <el-checkbox :value="5">5分钟</el-checkbox>
                <el-checkbox :value="15">15分钟</el-checkbox>
                <el-checkbox :value="30">30分钟</el-checkbox>
                <el-checkbox :value="60">1小时</el-checkbox>
                <el-checkbox :value="1440">1天</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="重复">
              <el-select v-model="eventForm.recurrenceType" placeholder="不重复" @change="handleRecurrenceChange" style="width: 100%;">
                <el-option label="不重复" value="none" />
                <el-option label="每天" value="daily" />
                <el-option label="每周" value="weekly" />
                <el-option label="每月" value="monthly" />
                <el-option label="每年" value="yearly" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8" v-if="eventForm.recurrenceType && eventForm.recurrenceType !== 'none'">
            <el-form-item label="间隔">
              <el-input-number v-model="eventForm.recurrenceInterval" :min="1" :max="365" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="颜色">
              <el-color-picker v-model="eventForm.color" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12" v-if="eventForm.recurrenceType === 'weekly'">
          <el-col :span="24">
            <el-form-item label="星期">
              <el-checkbox-group v-model="eventForm.recurrenceDaysOfWeek">
                <el-checkbox label="0">日</el-checkbox>
                <el-checkbox label="1">一</el-checkbox>
                <el-checkbox label="2">二</el-checkbox>
                <el-checkbox label="3">三</el-checkbox>
                <el-checkbox label="4">四</el-checkbox>
                <el-checkbox label="5">五</el-checkbox>
                <el-checkbox label="6">六</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEvent">保存</el-button>
      </template>
    </el-dialog>

    <!-- 查看日程对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="日程详情"
      width="500px"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="标题">{{ viewingEvent?.title }}</el-descriptions-item>
        <el-descriptions-item label="描述">{{ viewingEvent?.description || '无' }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">
          {{ formatEventTime(viewingEvent?.start_time) }}
        </el-descriptions-item>
        <el-descriptions-item label="结束时间">
          {{ viewingEvent?.end_time ? formatEventTime(viewingEvent.end_time) : '未设置' }}
        </el-descriptions-item>
        <el-descriptions-item label="地点">
          {{ viewingEvent?.location || '未设置' }}
        </el-descriptions-item>
        <el-descriptions-item label="提醒">
          {{ viewingEvent?.reminder_minutes ? `${viewingEvent.reminder_minutes}分钟前` : '不提醒' }}
        </el-descriptions-item>
        <el-descriptions-item label="重复">
          {{ getRecurrenceDisplayText(viewingEvent) }}
        </el-descriptions-item>
        <el-descriptions-item label="分类">
          {{ viewingEvent?.category || '未分类' }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="viewDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="editEvent(viewingEvent)">编辑</el-button>
      </template>
    </el-dialog>

    <!-- 自定义提醒对话框 -->
    <el-dialog
      v-model="showCustomReminderDialog"
      title="自定义提醒"
      width="400px"
    >
      <el-form :model="customReminderForm" label-width="100px">
        <el-form-item label="提前时间">
          <el-input-number
            v-model="customReminderForm.minutes"
            :min="1"
            :max="10080"
            placeholder="分钟数"
          />
          <span style="margin-left: 8px;">分钟前</span>
        </el-form-item>
        <el-form-item label="提醒方式">
          <el-radio-group v-model="customReminderForm.type">
            <el-radio value="notification">通知</el-radio>
            <el-radio value="sound">声音</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCustomReminderDialog = false">取消</el-button>
        <el-button type="primary" @click="addCustomReminder">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { Plus, Edit, Delete, Location, Upload, Download, Bell } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { useRoute } from 'vue-router'
import Database from '@tauri-apps/plugin-sql'
import { manualCheckReminders } from '@/utils/reminderService'
import { generateRecurrenceRule, parseRecurrenceRule, getRecurrenceText, RECURRENCE_TYPES } from '@/utils/recurrence'
import { isHoliday, getHolidayName } from '@/utils/holidays'
import { getLunarDate, getSolarTerm, getDateInfo } from '@/utils/lunarCalendar'
import { saveFile } from '@/utils/tauri/dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'

const route = useRoute()
const locale = zhCn // Element Plus 中文本地化

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

const events = ref([])
const selectedDate = ref(new Date())
const calendarView = ref('month')
const listViewDateRange = ref([])
const listViewEvents = ref([])
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const editingEvent = ref(null)
const viewingEvent = ref(null)
const selectedCategory = ref('')

// 计算周视图的日期
const weekDays = computed(() => {
  const start = new Date(selectedDate.value)
  const day = start.getDay()
  const diff = start.getDate() - day
  start.setDate(diff)
  
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    days.push({
      date: date.toISOString().split('T')[0],
      label: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][i],
      number: date.getDate()
    })
  }
  return days
})

const eventForm = ref({
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  location: '',
  reminder_minutes: null, // 保留向后兼容
  reminderRules: [], // 多级提醒规则（分钟数数组）
  customReminders: [], // 自定义提醒规则
  recurrenceType: 'none',
  recurrenceInterval: 1,
  recurrenceDaysOfWeek: [],
  recurrenceEndType: 'never',
  recurrenceCount: 10,
  recurrenceEndDate: '',
  category: '',
  color: '#409eff'
})

const showCustomReminderDialog = ref(false)
const customReminderForm = ref({
  minutes: 0,
  type: 'notification' // notification, sound, email
})

// 获取所有分类
const categories = computed(() => {
  const cats = new Set()
  events.value.forEach(e => {
    if (e.category) cats.add(e.category)
  })
  return Array.from(cats).sort()
})

// 按分类过滤的事件
const filteredEvents = computed(() => {
  if (!selectedCategory.value) return events.value
  return events.value.filter(e => e.category === selectedCategory.value)
})

// 获取选中日期的日程
const selectedDateEvents = computed(() => {
  const dateStr = selectedDate.value.toISOString().split('T')[0]
  return events.value.filter(e => {
    const eventDate = new Date(e.start_time).toISOString().split('T')[0]
    return eventDate === dateStr
  }).sort((a, b) => {
    return new Date(a.start_time) - new Date(b.start_time)
  })
})

// 加载日程列表
const loadEvents = async () => {
  try {
    const db = await getDatabase()
    const result = await db.select(
      'SELECT * FROM calendar_events ORDER BY start_time ASC'
    )
    events.value = result || []
  } catch (error) {
    ElMessage.error('加载日程失败')
  }
}

// 检查日期是否有日程
const hasEvents = (dateStr) => {
  const date = new Date(dateStr).toISOString().split('T')[0]
  const eventList = selectedCategory.value ? filteredEvents.value : events.value
  return eventList.some(e => {
    const eventDate = new Date(e.start_time).toISOString().split('T')[0]
    return eventDate === date
  })
}

// 检查是否是今天
const isToday = (dateStr) => {
  const date = new Date(dateStr).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]
  return date === today
}

// 获取日期数字
const getDayNumber = (dateStr) => {
  return new Date(dateStr).getDate()
}

// 获取日期的事件
const getDayEvents = (dateStr) => {
  const date = new Date(dateStr).toISOString().split('T')[0]
  const eventList = selectedCategory.value ? filteredEvents.value : events.value
  return eventList.filter(e => {
    const eventDate = new Date(e.start_time).toISOString().split('T')[0]
    return eventDate === date
  })
}

// 导出日程
const handleExport = async () => {
  try {
    const exportData = events.value.map(e => ({
      title: e.title,
      description: e.description || '',
      start_time: e.start_time,
      end_time: e.end_time,
      location: e.location || '',
      category: e.category || '',
      color: e.color || '#409eff',
      repeat_rule: e.repeat_rule || null,
      reminder_rules: e.reminder_rules || null
    }))
    
    const jsonContent = JSON.stringify(exportData, null, 2)
    const fileName = `calendar_export_${new Date().toISOString().split('T')[0]}.json`
    
    const filePath = await saveFile({
      filters: [{
        name: 'JSON 文件',
        extensions: ['json']
      }],
      defaultPath: fileName
    })
    
    if (filePath) {
      await writeTextFile(filePath, jsonContent)
      ElMessage.success('导出成功')
    }
  } catch (error) {
    if (error !== 'cancelled' && error !== 'null') {
      ElMessage.error('导出失败')
    }
  }
}

// 测试提醒功能
const testReminders = async () => {
  try {
    await manualCheckReminders()
    ElMessage.success('提醒检查完成，请查看控制台日志')
  } catch (error) {
    ElMessage.error('提醒检查失败: ' + error.message)
  }
}

// 处理列表视图日期范围变化
const handleListViewDateChange = () => {
  if (!listViewDateRange.value || listViewDateRange.value.length !== 2) {
    listViewEvents.value = []
    return
  }
  
  const startDate = new Date(listViewDateRange.value[0])
  const endDate = new Date(listViewDateRange.value[1])
  endDate.setHours(23, 59, 59, 999)
  
  const eventList = selectedCategory.value ? filteredEvents.value : events.value
  listViewEvents.value = eventList.filter(e => {
    const eventDate = new Date(e.start_time)
    return eventDate >= startDate && eventDate <= endDate
  }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
}

// 获取事件颜色
const getEventColor = (event) => {
  return event.color || '#409eff'
}

// 处理日期双击事件
const handleDateDoubleClick = (dateStr) => {
  const date = new Date(dateStr)
  selectedDate.value = date
  showCreateDialog()
}

// 显示创建对话框
const showCreateDialog = () => {
  editingEvent.value = null
  const date = selectedDate.value
  const dateStr = date.toISOString().split('T')[0]
  eventForm.value = {
    title: '',
    description: '',
    start_time: `${dateStr}T09:00:00`,
    end_time: `${dateStr}T10:00:00`,
    location: '',
    reminder_minutes: null,
    reminderRules: [],
    customReminders: [],
    recurrenceType: 'none',
    recurrenceInterval: 1,
    recurrenceDaysOfWeek: [],
    recurrenceEndType: 'never',
    recurrenceCount: 10,
    recurrenceEndDate: '',
    category: '',
    color: '#409eff'
  }
  dialogVisible.value = true
}

// 编辑日程
const editEvent = (event) => {
  editingEvent.value = event
  const recurrence = parseRecurrenceRule(event.repeat_rule)
  
  // 解析提醒规则
  let reminderRules = []
  let customReminders = []
  if (event.reminder_rules) {
    try {
      const rules = JSON.parse(event.reminder_rules)
      if (Array.isArray(rules)) {
        reminderRules = rules.filter(r => typeof r === 'number')
        customReminders = rules.filter(r => typeof r === 'object')
      }
    } catch {
      // 如果解析失败，使用旧的 reminder_minutes
      if (event.reminder_minutes) {
        reminderRules = [event.reminder_minutes]
      }
    }
  } else if (event.reminder_minutes) {
    reminderRules = [event.reminder_minutes]
  }
  
  eventForm.value = {
    title: event.title || '',
    description: event.description || '',
    start_time: event.start_time || '',
    end_time: event.end_time || '',
    location: event.location || '',
    reminder_minutes: event.reminder_minutes || null,
    reminderRules,
    customReminders,
    recurrenceType: recurrence?.type || 'none',
    recurrenceInterval: recurrence?.interval || 1,
    recurrenceDaysOfWeek: recurrence?.daysOfWeek || [],
    recurrenceEndType: recurrence?.endType || 'never',
    recurrenceCount: recurrence?.count || 10,
    recurrenceEndDate: recurrence?.endDate || '',
    category: event.category || '',
    color: event.color || '#409eff'
  }
  viewDialogVisible.value = false
  dialogVisible.value = true
}

// 处理重复规则变化
const handleRecurrenceChange = () => {
  if (eventForm.value.recurrenceType === 'weekly' && eventForm.value.recurrenceDaysOfWeek.length === 0) {
    // 默认选择开始时间的星期几
    const startDate = new Date(eventForm.value.start_time)
    eventForm.value.recurrenceDaysOfWeek = [String(startDate.getDay())]
  }
}

// 获取重复单位
const getRecurrenceUnit = (type) => {
  const units = {
    daily: '天',
    weekly: '周',
    monthly: '月',
    yearly: '年'
  }
  return units[type] || ''
}

// 保存日程
const saveEvent = async () => {
  if (!eventForm.value.title || !eventForm.value.start_time) {
    ElMessage.warning('请填写标题和开始时间')
    return
  }

  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    
    // 构建重复规则
    let recurrenceRule = null
    if (eventForm.value.recurrenceType && eventForm.value.recurrenceType !== 'none') {
      recurrenceRule = generateRecurrenceRule({
        type: eventForm.value.recurrenceType,
        interval: eventForm.value.recurrenceInterval || 1,
        daysOfWeek: eventForm.value.recurrenceDaysOfWeek.map(d => parseInt(d)),
        endType: eventForm.value.recurrenceEndType,
        count: eventForm.value.recurrenceEndType === 'count' ? eventForm.value.recurrenceCount : null,
        endDate: eventForm.value.recurrenceEndType === 'date' ? eventForm.value.recurrenceEndDate : null
      })
    }
    
    const repeatEndDate = eventForm.value.recurrenceEndType === 'date' ? eventForm.value.recurrenceEndDate : null
    
    // 构建提醒规则 JSON（合并标准提醒和自定义提醒）
    const allReminders = [...eventForm.value.reminderRules, ...eventForm.value.customReminders]
    const reminderRulesJson = allReminders.length > 0 ? JSON.stringify(allReminders) : null
    // 保留 reminder_minutes 用于向后兼容（使用第一个提醒时间）
    const reminderMinutes = eventForm.value.reminderRules.length > 0 ? eventForm.value.reminderRules[0] : null

    if (editingEvent.value) {
      // 更新 - 重置提醒状态，让提醒可以再次触发
      await db.execute(
        'UPDATE calendar_events SET title = ?, description = ?, start_time = ?, end_time = ?, location = ?, reminder_minutes = ?, reminder_rules = ?, repeat_rule = ?, repeat_end_date = ?, category = ?, color = ?, reminder_sent = 0, updated_at = ? WHERE id = ?',
        [
          eventForm.value.title,
          eventForm.value.description,
          eventForm.value.start_time,
          eventForm.value.end_time || null,
          eventForm.value.location,
          reminderMinutes,
          reminderRulesJson,
          recurrenceRule,
          repeatEndDate,
          eventForm.value.category || null,
          eventForm.value.color || null,
          now,
          editingEvent.value.id
        ]
      )
      ElMessage.success('日程更新成功')
    } else {
      // 创建
      await db.execute(
        'INSERT INTO calendar_events (title, description, start_time, end_time, location, reminder_minutes, reminder_rules, repeat_rule, repeat_end_date, category, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          eventForm.value.title,
          eventForm.value.description,
          eventForm.value.start_time,
          eventForm.value.end_time || null,
          eventForm.value.location,
          reminderMinutes,
          reminderRulesJson,
          recurrenceRule,
          repeatEndDate,
          eventForm.value.category || null,
          eventForm.value.color || null,
          now,
          now
        ]
      )
      ElMessage.success('日程创建成功')
    }

    dialogVisible.value = false
    await loadEvents()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 删除日程
const deleteEvent = async (event) => {
  try {
    await ElMessageBox.confirm('确定要删除这个日程吗？', '确认删除', {
      type: 'warning'
    })

    const db = await getDatabase()
    await db.execute('DELETE FROM calendar_events WHERE id = ?', [event.id])
    ElMessage.success('删除成功')
    await loadEvents()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 查看日程
const viewEvent = (event) => {
  viewingEvent.value = event
  viewDialogVisible.value = true
}

// 格式化选中日期
const formatSelectedDate = () => {
  return selectedDate.value.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

// 获取农历日期字符串
const getLunarDateStr = (dateStr) => {
  try {
    const lunar = getLunarDate(dateStr)
    return lunar.full
  } catch (error) {
    return ''
  }
}

// 格式化事件时间
const formatEventTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  
  // 周视图只显示时间
  if (calendarView.value === 'week') {
    return date.toLocaleString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // 其他视图显示完整日期时间
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取重复规则显示文本
const getRecurrenceDisplayText = (event) => {
  if (!event || !event.repeat_rule) {
    return '不重复'
  }
  
  const rule = parseRecurrenceRule(event.repeat_rule)
  if (!rule) return '不重复'
  
  return getRecurrenceText(rule)
}

// 获取事件的提醒规则
const getEventReminders = (event) => {
  if (!event) return []
  
  if (event.reminder_rules) {
    try {
      const rules = JSON.parse(event.reminder_rules)
      return Array.isArray(rules) ? rules : []
    } catch {
      // 解析失败，使用旧的 reminder_minutes
      return event.reminder_minutes ? [event.reminder_minutes] : []
    }
  }
  
  return event.reminder_minutes ? [event.reminder_minutes] : []
}

// 格式化提醒时间
const formatReminder = (reminder) => {
  if (typeof reminder === 'number') {
    if (reminder < 60) {
      return `${reminder}分钟前`
    } else if (reminder < 1440) {
      return `${Math.floor(reminder / 60)}小时前`
    } else {
      return `${Math.floor(reminder / 1440)}天前`
    }
  } else if (typeof reminder === 'object' && reminder.minutes) {
    return `${reminder.minutes}分钟前 (${reminder.type === 'sound' ? '声音' : reminder.type === 'email' ? '邮件' : '通知'})`
  }
  return '不提醒'
}

// 添加自定义提醒
const addCustomReminder = () => {
  if (customReminderForm.value.minutes > 0) {
    eventForm.value.customReminders.push({
      minutes: customReminderForm.value.minutes,
      type: customReminderForm.value.type
    })
    customReminderForm.value = { minutes: 0, type: 'notification' }
    showCustomReminderDialog.value = false
  }
}

onMounted(async () => {
  await loadEvents()
  
  // 初始化列表视图日期范围（默认当前月）
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  listViewDateRange.value = [
    firstDay.toISOString().split('T')[0],
    lastDay.toISOString().split('T')[0]
  ]
  handleListViewDateChange()
  
  // 检查是否有创建操作
  if (route.query.action === 'create') {
    showCreateDialog()
  } else if (route.query.id) {
    const event = events.value.find(e => e.id === parseInt(route.query.id))
    if (event) {
      viewEvent(event)
    }
  }
})
</script>

<style scoped>
.calendar-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: var(--bg-secondary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-xl);
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  height: 50px;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.breadcrumb {
  font-size: var(--font-size-body);
  color: var(--text-secondary);
  padding: 0;
  font-weight: 400;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.breadcrumb i {
  color: var(--accent-blue);
  font-size: var(--font-size-body);
}

.header-actions {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.content-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2xl);
  background: var(--bg-secondary);
}

.calendar-wrapper {
  overflow: hidden;
}

.form-section {
  margin-bottom: 24px;
  padding: var(--space-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 var(--space-lg) 0;
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--text-primary);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--divider);
}

.calendar-day {
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.calendar-day:hover {
  background-color: var(--accent-blue-bg) !important;
}

.calendar-container {
  margin-bottom: var(--space-lg);
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-card);
}

.calendar-day {
  height: 100%;
  padding: var(--space-xs);
  position: relative;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.calendar-day:hover {
  background: var(--bg-tertiary) !important;
}

.day-number {
  font-size: var(--font-size-body);
  font-weight: 500;
  margin-bottom: var(--space-xs);
}

.day-events {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  cursor: pointer;
}

.calendar-day.is-today {
  background: var(--accent-blue-bg) !important;
  border: 2px solid var(--accent-blue);
  border-radius: var(--radius-xs);
}

.calendar-day.is-today .day-number {
  color: var(--accent-blue);
  font-weight: 700;
  font-size: 16px;
}

.calendar-day.has-events {
  background: var(--accent-blue-bg);
}

.calendar-day.is-holiday {
  background: rgba(255, 149, 0, 0.06);
}

.holiday-label {
  font-size: 10px;
  color: var(--color-orange);
  font-weight: 600;
  margin-top: 2px;
}

.events-section {
  margin-top: var(--space-lg);
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-card);
}

.events-section h3 {
  margin: 0 0 var(--space-md) 0;
  font-size: var(--font-size-callout);
  font-weight: 600;
  color: var(--text-primary);
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.event-card {
  cursor: pointer;
  transition: var(--transition-normal);
}

.event-card:hover {
  box-shadow: var(--shadow-card-hover);
}

.event-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
  color: var(--text-tertiary);
}

.event-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.event-time {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  font-weight: 500;
}

.event-title {
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--text-primary);
}

.event-location {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.event-actions {
  display: flex;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.week-view,
.day-view,
.list-view {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-card);
  margin-bottom: var(--space-lg);
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  border-bottom: 1px solid var(--divider);
  padding-bottom: var(--space-md);
}

.week-day {
  text-align: center;
}

.day-label {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  margin-bottom: var(--space-xs);
}

.day-number {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.week-content {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-sm);
  min-height: 400px;
}

.week-column {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xs);
  padding: var(--space-sm);
  min-height: 400px;
}

.week-event {
  padding: var(--space-sm) 10px;
  margin-bottom: var(--space-sm);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-footnote);
  transition: var(--transition-normal);
  box-shadow: var(--shadow-card);
  border-left: 3px solid rgba(255, 255, 255, 0.5);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0));
}

.week-event:hover {
  box-shadow: var(--shadow-card-hover);
}

.week-event .event-time {
  font-weight: 600;
  font-size: var(--font-size-caption);
  margin-bottom: 3px;
  opacity: 0.95;
  color: #ffffff;
}

.week-event .event-title {
  font-weight: 500;
  color: #ffffff;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.day-view {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-card);
  margin-bottom: var(--space-lg);
}

.day-header h3 {
  margin: 0 0 var(--space-lg) 0;
  font-size: 18px;
  font-weight: 600;
}

.day-events-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.day-event-item {
  display: flex;
  gap: var(--space-lg);
  padding: var(--space-md);
  border: 0.5px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-normal);
}

.day-event-item:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-blue);
}

.time-start {
  font-weight: 600;
  color: var(--accent-blue);
}

.time-end {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
}

.list-view {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-card);
  margin-bottom: var(--space-lg);
}

.list-toolbar {
  margin-bottom: var(--space-lg);
}

.event-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.el-empty {
  padding: 40px 0;
}

.lunar-info {
  font-size: 10px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.lunar-date {
  line-height: 1.2;
}

.solar-term {
  color: var(--color-green);
  font-weight: 600;
  margin-top: 2px;
}
</style>

