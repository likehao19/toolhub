<template>
  <div class="calendar-wrapper">
    <!-- 顶部工具栏 -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Productivity</div>
          <div class="breadcrumb">
            <i class="fas fa-calendar-alt"></i>
            <span>{{ t('calendar.title') }}</span>
          </div>
        </div>
        <!-- 视图切换 -->
        <el-radio-group v-model="calendarView" size="small" class="view-switcher">
          <el-radio-button value="month">{{ t('calendar.monthView') }}</el-radio-button>
          <el-radio-button value="week">{{ t('calendar.weekView') }}</el-radio-button>
          <el-radio-button value="day">{{ t('calendar.dayView') }}</el-radio-button>
          <el-radio-button value="list">{{ t('calendar.listView') }}</el-radio-button>
        </el-radio-group>
      </div>
      <div class="header-actions">
        <el-select v-model="selectedCategory" :placeholder="t('calendar.filterCategory')" clearable size="small" class="category-filter">
          <el-option :label="t('calendar.all')" value="" />
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
          :title="t('calendar.testReminder')"
          class="toolbar-btn"
        />
        <el-button
          :icon="Upload"
          circle
          size="small"
          @click="showImportDialog = true"
          :title="t('calendar.importEvents')"
          class="toolbar-btn"
        />
        <el-button
          :icon="Download"
          circle
          size="small"
          @click="handleExport"
          :title="t('calendar.exportEvents')"
          class="toolbar-btn"
        />
        <el-button
          :icon="Plus"
          circle
          size="small"
          type="primary"
          @click="showCreateDialog"
          :title="t('calendar.newEvent')"
          class="toolbar-btn"
        />
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="content-container">
      <div class="calendar-workspace">
    <div v-if="calendarView === 'month'" class="calendar-container">
      <el-config-provider :locale="locale">
        <el-calendar v-model="selectedDate">
          <template #date-cell="{ data }">
            <div class="calendar-day" :class="{
              'has-events': hasEvents(data.day),
              'is-holiday': isHoliday(data.day),
              'is-comp-day': isCompDay(data.day),
              'is-solar-term': getSolarTerm(data.day),
              'is-today': isToday(data.day)
            }" @dblclick="handleDateDoubleClick(data.day)">
              <div class="day-top">
                <span class="day-number">{{ getDayNumber(data.day) }}</span>
                <span class="lunar-date">{{ getLunarDateStr(data.day) }}</span>
              </div>
              <div v-if="getSolarTerm(data.day)" class="solar-term">{{ getSolarTerm(data.day) }}</div>
              <div v-if="isHoliday(data.day)" class="holiday-label">{{ getHolidayName(data.day) }}</div>
              <div v-else-if="isCompDay(data.day)" class="comp-day-label">{{ t('calendar.compDay') }}</div>
              <div class="day-events">
                <div
                  v-for="event in getDayEvents(data.day).slice(0, 3)"
                  :key="event.id"
                  class="event-bar"
                  :style="{ '--event-color': getEventColor(event) }"
                  @click.stop="viewEvent(event)"
                >
                  <span class="event-bar-title">{{ event.title }}</span>
                </div>
                <div v-if="getDayEvents(data.day).length > 3" class="event-more">
                  +{{ getDayEvents(data.day).length - 3 }}
                </div>
              </div>
            </div>
          </template>
        </el-calendar>
      </el-config-provider>
    </div>

    <!-- 周视图 -->
    <div v-else-if="calendarView === 'week'" class="week-view">
      <div class="week-header">
        <div class="week-day" v-for="day in weekDays" :key="day.date" :class="{ 'is-weekend': day.isWeekend, 'is-today': isToday(day.date) }">
          <div class="day-label">{{ day.label }}</div>
          <div class="day-number">{{ day.number }}</div>
        </div>
      </div>
      <div class="week-content">
        <div class="week-column" v-for="day in weekDays" :key="day.date" :class="{ 'is-weekend': day.isWeekend, 'is-today': isToday(day.date) }">
          <div
            v-for="event in getDayEvents(day.date)"
            :key="event.id"
            class="week-event"
            :style="{ '--event-color': getEventColor(event) }"
            @click="viewEvent(event)"
          >
            <div class="event-time">{{ formatEventTime(event.start_time) }}</div>
            <div class="event-title">{{ event.title }}</div>
          </div>
          <div v-if="getDayEvents(day.date).length === 0" class="week-empty"></div>
        </div>
      </div>
    </div>

    <!-- 日视图 -->
    <div v-else-if="calendarView === 'day'" class="day-view">
      <div class="day-header">
        <h3>{{ formatSelectedDate() }}</h3>
        <el-empty v-if="selectedDateEvents.length === 0" :description="t('calendar.noEventsToday')" :image-size="80" />
        <div v-else class="day-events-list">
          <div
            v-for="event in selectedDateEvents"
            :key="event.id"
            class="day-event-item"
            :style="{ '--event-color': getEventColor(event) }"
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
          :range-separator="t('calendar.to')"
          :start-placeholder="t('calendar.startDate')"
          :end-placeholder="t('calendar.endDate')"
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
        <el-empty v-if="listViewEvents.length === 0" :description="t('calendar.noEventsInRange')" />
      </div>
    </div>

      </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingEvent ? t('calendar.editEvent') : t('calendar.newEventTitle')"
      width="650px"
      :close-on-click-modal="false"
    >
      <el-form :model="eventForm" label-width="70px" size="default">
        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item :label="t('calendar.titleLabel')" required>
              <el-input v-model="eventForm.title" :placeholder="t('calendar.eventTitle')" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="t('calendar.startLabel')" required>
              <el-date-picker
                v-model="eventForm.start_time"
                type="datetime"
                :placeholder="t('calendar.startTime')"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DDTHH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('calendar.endLabel')">
              <el-date-picker
                v-model="eventForm.end_time"
                type="datetime"
                :placeholder="t('calendar.endTime')"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DDTHH:mm:ss"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="16">
            <el-form-item :label="t('calendar.location')">
              <el-input v-model="eventForm.location" :placeholder="t('calendar.locationPlaceholder')" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="t('calendar.category')">
              <el-select v-model="eventForm.category" :placeholder="t('calendar.category')" style="width: 100%;">
                <el-option :label="t('calendar.catWork')" value="工作" />
                <el-option :label="t('calendar.catPersonal')" value="个人" />
                <el-option :label="t('calendar.catMeeting')" value="会议" />
                <el-option :label="t('calendar.catOther')" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item :label="t('calendar.description')">
              <el-input
                v-model="eventForm.description"
                type="textarea"
                :rows="2"
                :placeholder="t('calendar.eventDesc')"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item :label="t('calendar.reminder')">
              <el-checkbox-group v-model="eventForm.reminderRules">
                <el-checkbox :value="5">{{ t('calendar.min5') }}</el-checkbox>
                <el-checkbox :value="15">{{ t('calendar.min15') }}</el-checkbox>
                <el-checkbox :value="30">{{ t('calendar.min30') }}</el-checkbox>
                <el-checkbox :value="60">{{ t('calendar.hour1') }}</el-checkbox>
                <el-checkbox :value="1440">{{ t('calendar.day1') }}</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="t('calendar.recurrence')">
              <el-select v-model="eventForm.recurrenceType" :placeholder="t('calendar.noRepeat')" @change="handleRecurrenceChange" style="width: 100%;">
                <el-option :label="t('calendar.noRepeat')" value="none" />
                <el-option :label="t('calendar.daily')" value="daily" />
                <el-option :label="t('calendar.weekly')" value="weekly" />
                <el-option :label="t('calendar.monthly')" value="monthly" />
                <el-option :label="t('calendar.yearly')" value="yearly" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8" v-if="eventForm.recurrenceType && eventForm.recurrenceType !== 'none'">
            <el-form-item :label="t('calendar.interval')">
              <el-input-number v-model="eventForm.recurrenceInterval" :min="1" :max="365" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item :label="t('calendar.color')">
              <el-color-picker v-model="eventForm.color" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12" v-if="eventForm.recurrenceType === 'weekly'">
          <el-col :span="24">
            <el-form-item :label="t('calendar.weekdayLabel')">
              <el-checkbox-group v-model="eventForm.recurrenceDaysOfWeek">
                <el-checkbox label="0">{{ t('calendar.weekSun') }}</el-checkbox>
                <el-checkbox label="1">{{ t('calendar.weekMon') }}</el-checkbox>
                <el-checkbox label="2">{{ t('calendar.weekTue') }}</el-checkbox>
                <el-checkbox label="3">{{ t('calendar.weekWed') }}</el-checkbox>
                <el-checkbox label="4">{{ t('calendar.weekThu') }}</el-checkbox>
                <el-checkbox label="5">{{ t('calendar.weekFri') }}</el-checkbox>
                <el-checkbox label="6">{{ t('calendar.weekSat') }}</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveEvent">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 查看日程对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      :title="t('calendar.eventDetail')"
      width="500px"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item :label="t('calendar.titleLabel')">{{ viewingEvent?.title }}</el-descriptions-item>
        <el-descriptions-item :label="t('calendar.description')">{{ viewingEvent?.description || t('calendar.noDesc') }}</el-descriptions-item>
        <el-descriptions-item :label="t('calendar.startTime')">
          {{ formatEventTime(viewingEvent?.start_time) }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('calendar.endTime')">
          {{ viewingEvent?.end_time ? formatEventTime(viewingEvent.end_time) : t('calendar.notSet') }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('calendar.location')">
          {{ viewingEvent?.location || t('calendar.notSet') }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('calendar.reminder')">
          {{ viewingEvent?.reminder_minutes ? `${viewingEvent.reminder_minutes}${t('calendar.minutesBefore')}` : t('calendar.noReminder') }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('calendar.recurrence')">
          {{ getRecurrenceDisplayText(viewingEvent) }}
        </el-descriptions-item>
        <el-descriptions-item :label="t('calendar.category')">
          {{ viewingEvent?.category || t('calendar.uncategorized') }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="viewDialogVisible = false">{{ t('common.close') }}</el-button>
        <el-button type="danger" @click="deleteEvent(viewingEvent)" v-if="viewingEvent">
          <el-icon><Delete /></el-icon>{{ t('common.delete') || '删除' }}
        </el-button>
        <el-button type="primary" @click="editEvent(viewingEvent)">{{ t('common.edit') }}</el-button>
      </template>
    </el-dialog>

    <!-- 自定义提醒对话框 -->
    <el-dialog
      v-model="showCustomReminderDialog"
      :title="t('calendar.customReminder')"
      width="400px"
    >
      <el-form :model="customReminderForm" label-width="100px">
        <el-form-item :label="t('calendar.advanceTime')">
          <el-input-number
            v-model="customReminderForm.minutes"
            :min="1"
            :max="10080"
            :placeholder="t('calendar.minutePlaceholder')"
          />
          <span style="margin-left: 8px;">{{ t('calendar.minutesBefore2') }}</span>
        </el-form-item>
        <el-form-item :label="t('calendar.method')">
          <el-radio-group v-model="customReminderForm.type">
            <el-radio value="notification">{{ t('calendar.notification') }}</el-radio>
            <el-radio value="sound">{{ t('calendar.sound') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCustomReminderDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="addCustomReminder">{{ t('common.add') }}</el-button>
      </template>
    </el-dialog>

    <!-- 导入日程对话框 -->
    <el-dialog
      v-model="showImportDialog"
      :title="t('calendar.importTitle')"
      width="500px"
      @close="importFile = null; importResult = null"
    >
      <div v-if="!importResult">
        <el-alert
          :title="t('calendar.importHint')"
          type="info"
          :closable="false"
          style="margin-bottom: 16px;"
        />
        <el-button type="primary" @click="handleImportFileSelect" style="width: 100%;">
          <el-icon><Upload /></el-icon>
          {{ t('calendar.selectFile') }}
        </el-button>
      </div>
      <div v-else>
        <el-alert
          :title="t('calendar.parsedEvents', { count: importResult.total })"
          :type="importResult.total > 0 ? 'success' : 'warning'"
          :closable="false"
          style="margin-bottom: 16px;"
        />
        <div v-if="importResult.total > 0" style="max-height: 300px; overflow-y: auto;">
          <div v-for="(event, i) in importResult.events.slice(0, 20)" :key="i" style="padding: 4px 0; border-bottom: 1px solid var(--border-color); font-size: 13px;">
            {{ event.title }} - {{ event.start_time }}
          </div>
          <div v-if="importResult.total > 20" style="padding: 8px 0; color: var(--text-tertiary); font-size: 12px;">
            {{ t('calendar.moreEvents', { count: importResult.total - 20 }) }}
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showImportDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button
          type="primary"
          @click="executeImport"
          :disabled="!importResult || importResult.total === 0"
        >
          {{ t('calendar.importBtn') }}（{{ importResult?.total || 0 }}）
        </el-button>
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
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { manualCheckReminders } from '@/utils/reminderService'
import { t } from '@/i18n'
import { generateRecurrenceRule, parseRecurrenceRule, getRecurrenceText, generateRecurrenceInstances, RECURRENCE_TYPES } from '@/utils/recurrence'
import { isHoliday, getHolidayName, isCompDay } from '@/utils/holidays'
import { getLunarDate, getSolarTerm, getDateInfo } from '@/utils/lunarCalendar'
import { saveFile, openFile } from '@/utils/tauri/dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import { importEventsFromICS, importEventsFromCSV } from '@/utils/calendarImportExport'

const route = useRoute()
const locale = zhCn
dayjs.locale('zh-cn') // 让 el-calendar 从周一开始

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

// 本地日期格式化（避免 toISOString 的 UTC 时区偏移）
function formatLocalDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const events = ref([])
const selectedDate = ref(new Date())
const calendarView = ref('month')
const listViewDateRange = ref([])
// listViewEvents 改成 computed —— 旧实现是 ref + 手动 handleListViewDateChange 触发,
// 用户改 selectedCategory / 在另一个视图里增删事件后,列表视图保持旧结果直到他重新选日期范围,
// 体验上像"分类切了但事件没变"。
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const editingEvent = ref(null)
const viewingEvent = ref(null)
const selectedCategory = ref('')
const showImportDialog = ref(false)
const importFile = ref(null)
const importResult = ref(null)

// 计算周视图的日期（从周一开始）
const weekDays = computed(() => {
  const current = new Date(selectedDate.value)
  const dayOfWeek = current.getDay() // 0=周日
  // 回退到本周一：如果是周日则回退6天，否则回退 dayOfWeek-1 天
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(current)
  monday.setDate(current.getDate() + mondayOffset)

  const labels = t('calendar.weekLabels')
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    days.push({
      date: formatLocalDate(date),
      label: labels[i],
      number: date.getDate(),
      isWeekend: i >= 5
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
  color: 'var(--accent-blue)'
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

// 展开重复事件为虚拟实例
const expandedEvents = computed(() => {
  const center = selectedDate.value
  const rangeStart = new Date(center.getFullYear(), center.getMonth() - 1, 1)
  const rangeEnd = new Date(center.getFullYear(), center.getMonth() + 2, 0)
  const rangeEndStr = `${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, '0')}-${String(rangeEnd.getDate()).padStart(2, '0')}T23:59:59`

  const result = []
  for (const event of events.value) {
    result.push(event)

    if (event.repeat_rule) {
      const rule = parseRecurrenceRule(event.repeat_rule)
      if (rule && rule.type !== 'none') {
        const instances = generateRecurrenceInstances(event.start_time, rule, rangeEndStr)
        const originalStart = new Date(event.start_time)
        const originalEnd = event.end_time ? new Date(event.end_time) : null
        const duration = originalEnd ? originalEnd - originalStart : 0

        for (const instanceDate of instances) {
          if (formatLocalDate(instanceDate) === formatLocalDate(originalStart)) continue
          if (instanceDate < rangeStart) continue

          result.push({
            ...event,
            start_time: `${formatLocalDate(instanceDate)}T${String(originalStart.getHours()).padStart(2, '0')}:${String(originalStart.getMinutes()).padStart(2, '0')}:00`,
            end_time: duration > 0
              ? (() => {
                  const end = new Date(instanceDate.getTime() + duration)
                  return `${formatLocalDate(end)}T${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}:00`
                })()
              : null,
            _isRecurrenceInstance: true,
            _originalId: event.id
          })
        }
      }
    }
  }
  return result
})

// 按分类过滤的事件
const filteredEvents = computed(() => {
  if (!selectedCategory.value) return expandedEvents.value
  return expandedEvents.value.filter(e => e.category === selectedCategory.value)
})

// 获取选中日期的日程
const selectedDateEvents = computed(() => {
  const dateStr = formatLocalDate(selectedDate.value)
  const eventList = selectedCategory.value ? filteredEvents.value : expandedEvents.value
  return eventList.filter(e => {
    return formatLocalDate(new Date(e.start_time)) === dateStr
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
    ElMessage.error(t('calendar.loadFailed'))
  }
}

// 检查日期是否有日程
const hasEvents = (dateStr) => {
  const date = formatLocalDate(new Date(dateStr))
  const eventList = selectedCategory.value ? filteredEvents.value : expandedEvents.value
  return eventList.some(e => formatLocalDate(new Date(e.start_time)) === date)
}

// 检查是否是今天
const isToday = (dateStr) => {
  return formatLocalDate(new Date(dateStr)) === formatLocalDate(new Date())
}

// 获取日期数字
const getDayNumber = (dateStr) => {
  return new Date(dateStr).getDate()
}

// 获取日期的事件
const getDayEvents = (dateStr) => {
  const date = formatLocalDate(new Date(dateStr))
  const eventList = selectedCategory.value ? filteredEvents.value : expandedEvents.value
  return eventList.filter(e => formatLocalDate(new Date(e.start_time)) === date)
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
      color: e.color || 'var(--accent-blue)',
      repeat_rule: e.repeat_rule || null,
      reminder_rules: e.reminder_rules || null
    }))
    
    const jsonContent = JSON.stringify(exportData, null, 2)
    const fileName = `calendar_export_${formatLocalDate(new Date())}.json`
    
    const filePath = await saveFile({
      filters: [{
        name: t('calendar.jsonFile'),
        extensions: ['json']
      }],
      defaultPath: fileName
    })
    
    if (filePath) {
      await writeTextFile(filePath, jsonContent)
      ElMessage.success(t('calendar.exportSuccess'))
    }
  } catch (error) {
    if (error !== 'cancelled' && error !== 'null') {
      ElMessage.error(t('calendar.exportFailed'))
    }
  }
}

// 测试提醒功能
const testReminders = async () => {
  try {
    await manualCheckReminders()
    ElMessage.success(t('calendar.reminderCheckDone'))
  } catch (error) {
    ElMessage.error(t('calendar.reminderCheckFailed') + ': ' + error.message)
  }
}

// 列表视图日程(自动响应 listViewDateRange / selectedCategory / events 变化)
const listViewEvents = computed(() => {
  if (!listViewDateRange.value || listViewDateRange.value.length !== 2) {
    return []
  }
  const startDate = new Date(listViewDateRange.value[0])
  const endDate = new Date(listViewDateRange.value[1])
  endDate.setHours(23, 59, 59, 999)

  const eventList = selectedCategory.value ? filteredEvents.value : expandedEvents.value
  return eventList.filter(e => {
    const eventDate = new Date(e.start_time)
    return eventDate >= startDate && eventDate <= endDate
  }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
})

// 保留 handleListViewDateChange 作为 @change 钩子,实现仅扩展 expandedEvents 的范围窗口
// (computed 已经自动响应,这里留空函数避免模板报错;真正想扩窗口需改 expandedEvents 实现)。
const handleListViewDateChange = () => { /* computed 自动响应,留空 */ }

// 获取事件颜色
const getEventColor = (event) => {
  return event.color || 'var(--accent-blue)'
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
  const dateStr = formatLocalDate(date)
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
    color: 'var(--accent-blue)'
  }
  dialogVisible.value = true
}

// 编辑日程
const editEvent = async (event) => {
  // 重复事件保护:用户在月视图点的可能是 expandedEvents 里展开的"虚拟实例",
  // 它的 start_time 已经被改写成那一次的日期,但 id 仍指向原始事件 ——
  // 不处理直接编辑,UPDATE 会把整个系列的 start_time 改成"那一次"的日期。
  // 旧实现完全没拦,用户改一次以为只改这次,实际把整个重复系列毁了。
  if (event && event._isRecurrenceInstance) {
    try {
      await ElMessageBox.confirm(
        t('calendar.editRecurringInstanceMsg') || '该事件属于一个重复系列。当前只支持编辑整个系列(原始事件),修改会影响所有展开的实例。',
        t('calendar.editRecurringInstanceTitle') || '编辑重复事件',
        {
          confirmButtonText: t('calendar.editSeries') || '编辑整个系列',
          cancelButtonText: t('common.cancel') || '取消',
          type: 'warning'
        }
      )
    } catch {
      return // 用户取消
    }
    // 找回原始事件用它的 start_time/end_time 填表单,而不是用展开后的虚拟实例
    const original = events.value.find(e => e.id === event._originalId)
    if (!original) {
      ElMessage.error(t('calendar.originalEventNotFound') || '找不到原始事件')
      return
    }
    event = original
  }

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
    // 数据库存的是 int 数组(saveEvent 里 parseInt 过),但 template 的 el-checkbox label 是 string,
    // 不转 String 的话 v-model 数组里的 1 跟 label "1" 严格比较不等,checkbox 全部不勾选 ——
    // 用户看到没选任何一天,保存后 daysOfWeek 变成 [],配合 L6 的 fallback 才不会死循环但语义全丢。
    recurrenceDaysOfWeek: (recurrence?.daysOfWeek || []).map(String),
    recurrenceEndType: recurrence?.endType || 'never',
    recurrenceCount: recurrence?.count || 10,
    recurrenceEndDate: recurrence?.endDate || '',
    category: event.category || '',
    color: event.color || 'var(--accent-blue)'
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
    daily: t('calendar.unitDay'),
    weekly: t('calendar.unitWeek'),
    monthly: t('calendar.unitMonth'),
    yearly: t('calendar.unitYear')
  }
  return units[type] || ''
}

// 保存日程
const saveEvent = async () => {
  if (!eventForm.value.title || !eventForm.value.start_time) {
    ElMessage.warning(t('calendar.titleAndStartRequired'))
    return
  }

  if (eventForm.value.end_time && eventForm.value.end_time < eventForm.value.start_time) {
    ElMessage.warning(t('calendar.endBeforeStart'))
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
      ElMessage.success(t('calendar.updateSuccess'))
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
      ElMessage.success(t('calendar.createSuccess'))
    }

    dialogVisible.value = false
    await loadEvents()
  } catch (error) {
    ElMessage.error(t('calendar.saveFailed'))
  }
}

// 删除日程
const deleteEvent = async (event) => {
  if (!event) return
  try {
    // 重复事件实例:跟编辑路径一样,实际删的是整个系列(原始 id)。
    // 弹窗里明确告诉用户,避免他以为只是删了"这一次"。
    const isInstance = !!event._isRecurrenceInstance
    const msg = isInstance
      ? (t('calendar.deleteRecurringMsg') || '该事件属于一个重复系列,删除将移除整个系列(所有日期都不再出现)。是否继续?')
      : t('calendar.confirmDeleteMsg')
    await ElMessageBox.confirm(msg, t('calendar.confirmDeleteTitle'), {
      type: 'warning'
    })

    const targetId = isInstance ? event._originalId : event.id
    const db = await getDatabase()
    await db.execute('DELETE FROM calendar_events WHERE id = ?', [targetId])
    ElMessage.success(t('calendar.deleteSuccess'))
    // 关掉详情对话框,否则它仍展示已删除的事件
    viewDialogVisible.value = false
    viewingEvent.value = null
    await loadEvents()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('calendar.deleteFailed'))
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
    return t('calendar.noRepeat')
  }

  const rule = parseRecurrenceRule(event.repeat_rule)
  if (!rule) return t('calendar.noRepeat')
  
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
      return `${reminder}${t('calendar.minutesBefore')}`
    } else if (reminder < 1440) {
      return `${Math.floor(reminder / 60)}${t('calendar.hoursBefore')}`
    } else {
      return `${Math.floor(reminder / 1440)}${t('calendar.daysBefore')}`
    }
  } else if (typeof reminder === 'object' && reminder.minutes) {
    return `${reminder.minutes}${t('calendar.minutesBefore')} (${reminder.type === 'sound' ? t('calendar.sound') : reminder.type === 'email' ? t('calendar.email') : t('calendar.notification')})`
  }
  return t('calendar.noReminder')
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

// 处理导入文件选择
const handleImportFileSelect = async () => {
  try {
    const selected = await openFile({
      filters: [{ name: t('calendar.calendarFile'), extensions: ['ics', 'json', 'csv'] }]
    })
    if (!selected) return

    const content = await readTextFile(selected)
    const name = selected.split(/[/\\]/).pop()
    let parsedEvents = []

    if (name.endsWith('.ics')) {
      parsedEvents = await importEventsFromICS(content)
    } else if (name.endsWith('.csv')) {
      parsedEvents = await importEventsFromCSV(content)
    } else if (name.endsWith('.json')) {
      parsedEvents = JSON.parse(content)
      if (!Array.isArray(parsedEvents)) throw new Error(t('calendar.invalidJsonFormat'))
    }

    importResult.value = { total: parsedEvents.length, events: parsedEvents }
  } catch (error) {
    if (error !== 'cancelled') {
      ElMessage.error(t('calendar.parseFailed') + ': ' + (error.message || error))
    }
  }
}

// 执行导入
const executeImport = async () => {
  if (!importResult.value || importResult.value.total === 0) return

  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    let successCount = 0

    for (const event of importResult.value.events) {
      if (!event.title || !event.start_time) continue
      await db.execute(
        `INSERT INTO calendar_events (title, description, start_time, end_time, location,
         reminder_minutes, repeat_rule, category, color, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.title, event.description || null, event.start_time, event.end_time || null,
          event.location || null, event.reminder_minutes || null, event.repeat_rule || null,
          event.category || null, event.color || 'var(--accent-blue)', now, now
        ]
      )
      successCount++
    }

    ElMessage.success(t('calendar.importSuccess', { count: successCount }))
    showImportDialog.value = false
    importFile.value = null
    importResult.value = null
    await loadEvents()
  } catch (error) {
    ElMessage.error(t('calendar.importFailed') + ': ' + (error.message || error))
  }
}
onMounted(async () => {
  await loadEvents()
  
  // 初始化列表视图日期范围（默认当前月）
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  listViewDateRange.value = [
    formatLocalDate(firstDay),
    formatLocalDate(lastDay)
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
/* ===== 布局 ===== */
.calendar-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, var(--el-fill-color-light) 0%, var(--el-fill-color-light) 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  min-height: 58px;
  box-sizing: border-box;
  backdrop-filter: blur(18px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
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
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumb i {
  color: var(--accent-blue);
}

.breadcrumb-link {
  color: var(--accent-blue);
  cursor: pointer;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-sep {
  color: var(--text-tertiary);
}

.view-switcher {
  margin-left: 8px;
}

.category-filter {
  width: 150px;
}

.header-actions {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  flex-shrink: 0;
}

.toolbar-btn {
  border: 1px solid rgba(60, 40, 20, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(244, 247, 251, 0.95));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* 新增(Plus)按钮 type="primary" 默认白图标,但 .toolbar-btn 把背景洗成白渐变 → 看不见。
   四个按钮里只有 Plus 是 primary,其它(Bell/Upload/Download)本来就是深色图标,
   统一指定深色不会影响它们。 */
.toolbar-btn :deep(.el-icon) {
  color: var(--el-text-color-primary);
}

.content-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 14px 18px 18px;
  background: linear-gradient(180deg, var(--bg-primary), color-mix(in srgb, var(--bg-primary) 92%, var(--bg-secondary) 8%));
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.calendar-workspace {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 20px;
  /* design-refresh.css 把 .calendar-workspace 设成 display:flex 但没给方向,
     默认 row 会让 .week-view / .day-view / .list-view 按内容宽收缩(只有月视图
     因为 el-calendar 内部 <table width:100%> 才被撑满,看起来正常)。
     显式声明 column 让子视图 stretch 到 100% 宽。 */
  display: flex;
  flex-direction: column;
}

.calendar-workspace::-webkit-scrollbar {
  width: 6px;
}

.calendar-workspace::-webkit-scrollbar-track {
  background: transparent;
}

.calendar-workspace::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.24);
  border-radius: 999px;
}

.calendar-workspace::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.36);
}

/* ===== 月视图 - el-calendar 覆写 ===== */
.calendar-container {
  background: rgba(255, 255, 255, 0.94);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(60, 40, 20, 0.05);
  border: 1px solid rgba(60, 40, 20, 0.08);
}

.calendar-container :deep(.el-calendar) {
  --el-calendar-border: var(--border-color);
  background: transparent;
}

.calendar-container :deep(.el-calendar__header) {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
}

/* el-calendar 头部 "上个月 / 今天 / 下个月" 默认是 el-button-group(三按钮粘连),
   按设计要求加间距,并把每颗都恢复独立圆角。 */
.calendar-container :deep(.el-calendar__button-group .el-button) {
  border-radius: 6px !important;
  margin-left: 0 !important;
}
.calendar-container :deep(.el-calendar__button-group .el-button + .el-button) {
  margin-left: 8px !important;
}

.calendar-container :deep(.el-calendar__body) {
  padding: 8px;
}

.calendar-container :deep(.el-calendar-table thead th) {
  font-size: var(--font-size-caption);
  font-weight: 600;
  color: var(--text-secondary);
  padding: 8px 0;
}

.calendar-container :deep(.el-calendar-table .el-calendar-day) {
  /* 与下面 .calendar-day 的 96px 保持一致,避免 td / div 高度错位。
     从 110 收到 96,配合 .day-events 60→48,省 6 行 × 14px ≈ 84px,消月视图滚动条。 */
  height: 96px;
  padding: 0;
}

.calendar-container :deep(.el-calendar-table td) {
  border: 1px solid var(--divider);
}

.calendar-container :deep(.el-calendar-table td.is-selected) {
  /* 选中日期:橙色淡底,跟 today 的蓝底区分。无边框。 */
  background: color-mix(in srgb, var(--color-orange, #ff9500) 14%, transparent) !important;
}

.calendar-container :deep(.el-calendar-table .prev, .el-calendar-table .next) {
  opacity: 0.4;
}

/* ===== 日历单元格 ===== */
.calendar-day {
  height: 100%;
  /* 限定上下界,避免一格 88px(0 事件) / 一格 134px(3 事件) 让整张表格行高错位。
     固定 height + overflow:hidden 让网格规整;事件数过多走 +N 折叠提示。
     从 110 收到 96 配合月视图消滚动条(见 .el-calendar-day 同步修改)。 */
  height: 96px;
  max-height: 96px;
  padding: 6px 8px;
  cursor: pointer;
  transition: background var(--transition-fast);
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-radius: 4px;
  overflow: hidden;
}

.calendar-day:hover {
  background: var(--accent-blue-bg);
}

.day-top {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.day-top .day-number {
  font-size: var(--font-size-body);
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1;
}

.day-top .lunar-date {
  font-size: 10px;
  color: var(--text-tertiary);
  line-height: 1;
}

.solar-term {
  font-size: 10px;
  color: var(--color-green);
  font-weight: 600;
  line-height: 1.2;
}

.holiday-label {
  font-size: 10px;
  color: var(--color-orange);
  font-weight: 600;
  line-height: 1.2;
}

.comp-day-label {
  font-size: 10px;
  color: var(--color-red, var(--color-red));
  font-weight: 600;
  line-height: 1.2;
}

/* 日期状态 */
/* editorial-flat.css 用 .app-content ... :is(.calendar-day, ...) { border-radius:0 !important;
   box-shadow:none !important } 把"今天"的视觉指示抹掉了。这里用 .calendar-container
   后代把特异性提一档抢回来。今天用蓝底,选中用橙底,两种态颜色明确区分,无边框。 */
.calendar-container .calendar-day.is-today {
  background: var(--accent-blue-bg) !important;
  border-radius: 6px !important;
}

.calendar-day.is-today .day-top .day-number {
  color: var(--accent-blue);
  font-weight: 700;
}

.calendar-day.is-holiday {
  background: rgba(255, 149, 0, 0.05);
}

.calendar-day.is-comp-day {
  background: rgba(239, 68, 68, 0.04);
}

/* ===== 事件条 (月视图单元格内) ===== */
.day-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: auto;
  /* 与 .calendar-day 的固定高度配合:事件区上限 48px(随 96 同步收),超出由 .slice(0,3) +
     event-more 接住,即便 slice 失效(数据异常)也被父级 overflow:hidden 兜住。 */
  max-height: 48px;
  overflow: hidden;
  min-height: 0;
}

.event-bar {
  display: flex;
  align-items: center;
  padding: 1px 5px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--event-color, var(--accent-blue)) 15%, transparent);
  border-left: 2.5px solid var(--event-color, var(--accent-blue));
  cursor: pointer;
  transition: background var(--transition-fast);
  overflow: hidden;
}

.event-bar:hover {
  background: color-mix(in srgb, var(--event-color, var(--accent-blue)) 25%, transparent);
}

.event-bar-title {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
}

.event-more {
  font-size: 10px;
  color: var(--text-tertiary);
  padding-left: 6px;
  line-height: 1.4;
}

/* ===== 周视图 ===== */
.week-view {
  background: rgba(255, 255, 255, 0.94);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(60, 40, 20, 0.05);
  border: 1px solid rgba(60, 40, 20, 0.08);
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: var(--space-sm);
  margin-bottom: var(--space-md);
}

.week-day {
  text-align: center;
  padding: var(--space-xs) 0;
}

.week-day .day-label {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  font-weight: 500;
  margin-bottom: 2px;
}

.week-day .day-number {
  font-size: var(--font-size-headline);
  font-weight: 600;
  color: var(--text-primary);
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.week-day.is-weekend .day-label {
  color: var(--color-orange);
}

.week-day.is-today .day-number {
  background: var(--accent-blue);
  color: var(--el-color-white);
}

.week-content {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  min-height: 420px;
}

.week-column {
  border-radius: var(--radius-sm);
  padding: var(--space-xs);
  min-height: 400px;
  background: var(--bg-secondary);
  transition: background var(--transition-fast);
}

.week-column.is-today {
  background: var(--accent-blue-bg);
}

.week-column.is-weekend {
  background: rgba(255, 149, 0, 0.03);
}

.week-event {
  padding: 6px 8px;
  margin-bottom: 4px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-left: 3px solid var(--event-color, var(--accent-blue));
  background: var(--bg-primary);
  box-shadow: var(--shadow-sm);
}

.week-event:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.week-event .event-time {
  font-size: 10px;
  font-weight: 600;
  color: var(--event-color, var(--accent-blue));
  margin-bottom: 2px;
}

.week-event .event-title {
  font-size: var(--font-size-caption);
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.week-empty {
  height: 100%;
}

/* ===== 日视图 ===== */
.day-view {
  background: rgba(255, 255, 255, 0.94);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(60, 40, 20, 0.05);
  border: 1px solid rgba(60, 40, 20, 0.08);
}

.day-header h3 {
  margin: 0 0 var(--space-lg) 0;
  font-size: var(--font-size-title3);
  font-weight: 600;
  color: var(--text-primary);
}

.day-events-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.day-event-item {
  display: flex;
  gap: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--event-color, var(--accent-blue));
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.day-event-item:hover {
  background: var(--bg-secondary);
  border-color: var(--border-color-strong);
  box-shadow: var(--shadow-card-hover);
}

.event-time-block {
  min-width: 80px;
  flex-shrink: 0;
}

.time-start {
  font-weight: 600;
  color: var(--accent-blue);
  font-size: var(--font-size-body);
}

.time-end {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.event-details {
  flex: 1;
  min-width: 0;
}

.event-details .event-title {
  font-size: var(--font-size-body);
  font-weight: 600;
  color: var(--text-primary);
}

.event-details .event-location {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 4px;
}

/* ===== 列表视图 ===== */
.list-view {
  background: rgba(255, 255, 255, 0.94);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(60, 40, 20, 0.05);
  border: 1px solid rgba(60, 40, 20, 0.08);
}

.list-toolbar {
  margin-bottom: var(--space-lg);
}

.event-list-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.event-list-view .event-card {
  cursor: pointer;
  transition: var(--transition-normal);
}

.event-list-view .event-card:hover {
  box-shadow: var(--shadow-card-hover);
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

/* ===== 通用 ===== */
.el-empty {
  padding: 32px 0;
}
</style>

