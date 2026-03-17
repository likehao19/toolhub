<template>
  <div class="statistics-page">
    <div class="page-header">
      <h2>{{ t('statistics.title') }}</h2>
      <div class="header-actions">
        <el-select v-model="timeRange" @change="loadStatistics" style="width: 150px;">
          <el-option :label="t('statistics.last7Days')" value="7" />
          <el-option :label="t('statistics.last30Days')" value="30" />
          <el-option :label="t('statistics.last90Days')" value="90" />
          <el-option :label="t('statistics.all')" value="all" />
        </el-select>
        <el-button @click="loadStatistics">
          <el-icon><Refresh /></el-icon>
          {{ t('statistics.refresh') }}
        </el-button>
      </div>
    </div>

    <div class="statistics-content">
      <!-- 笔记统计 -->
      <el-card class="stat-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>{{ t('statistics.noteStats') }}</span>
          </div>
        </template>
        <div class="stat-overview">
          <div class="stat-item">
            <div class="stat-value">{{ notesStats.totalNotes }}</div>
            <div class="stat-label">{{ t('statistics.totalNotes') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ formatNumber(notesStats.totalWords) }}</div>
            <div class="stat-label">{{ t('statistics.totalWords') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ notesStats.avgWords }}</div>
            <div class="stat-label">{{ t('statistics.avgWords') }}</div>
          </div>
        </div>
        <div class="chart-container">
          <v-chart :option="notesTrendOption" style="height: 300px;" />
        </div>
      </el-card>

      <!-- 待办统计 -->
      <el-card class="stat-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon><List /></el-icon>
            <span>{{ t('statistics.todoStats') }}</span>
          </div>
        </template>
        <div class="stat-overview">
          <div class="stat-item">
            <div class="stat-value">{{ todosStats.totalTodos }}</div>
            <div class="stat-label">{{ t('statistics.totalTodos') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ todosStats.completionRate.toFixed(1) }}%</div>
            <div class="stat-label">{{ t('statistics.completionRate') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ todosStats.avgCompletionHours.toFixed(1) }}</div>
            <div class="stat-label">{{ t('statistics.avgCompletionHours') }}</div>
          </div>
        </div>
        <div class="chart-container">
          <v-chart :option="todosTrendOption" style="height: 300px;" />
        </div>
        <div class="chart-container" style="margin-top: 20px;">
          <v-chart :option="todosPriorityOption" style="height: 250px;" />
        </div>
      </el-card>

      <!-- 日程统计 -->
      <el-card class="stat-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon><Calendar /></el-icon>
            <span>{{ t('statistics.eventStats') }}</span>
          </div>
        </template>
        <div class="stat-overview">
          <div class="stat-item">
            <div class="stat-value">{{ eventsStats.totalEvents }}</div>
            <div class="stat-label">{{ t('statistics.totalEvents') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ eventsStats.busiestDate.count }}</div>
            <div class="stat-label">{{ t('statistics.busiestDateCount') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ eventsStats.busiestDate.date || t('statistics.noData') }}</div>
            <div class="stat-label">{{ t('statistics.busiestDate') }}</div>
          </div>
        </div>
        <div class="chart-container">
          <v-chart :option="eventsDistributionOption" style="height: 300px;" />
        </div>
      </el-card>

      <!-- 密码统计 -->
      <el-card class="stat-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon><Lock /></el-icon>
            <span>{{ t('statistics.passwordStats') }}</span>
          </div>
        </template>
        <div class="stat-overview">
          <div class="stat-item">
            <div class="stat-value">{{ passwordsStats.totalPasswords }}</div>
            <div class="stat-label">{{ t('statistics.totalPasswords') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ passwordsStats.expiredPasswords }}</div>
            <div class="stat-label">{{ t('statistics.expiredPasswords') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ passwordsStats.weakPasswords }}</div>
            <div class="stat-label">{{ t('statistics.weakPasswords') }}</div>
          </div>
        </div>
        <div class="chart-container">
          <v-chart :option="passwordsStrengthOption" style="height: 300px;" />
        </div>
      </el-card>

      <!-- 生产力趋势分析 -->
      <el-card class="stat-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <el-icon><TrendCharts /></el-icon>
            <span>{{ t('statistics.productivityTrend') }}</span>
          </div>
        </template>
        <div class="chart-container">
          <v-chart :option="productivityTrendOption" style="height: 400px;" />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { t } from '@/i18n'
import { Document, List, Calendar, Lock, TrendCharts, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import * as statisticsAPI from '@/utils/statistics'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const timeRange = ref('30')
const notesStats = ref({
  totalNotes: 0,
  totalWords: 0,
  avgWords: 0,
  trend: []
})
const todosStats = ref({
  totalTodos: 0,
  completedTodos: 0,
  completionRate: 0,
  avgCompletionHours: 0,
  trend: [],
  priorityDistribution: { high: 0, medium: 0, low: 0 }
})
const eventsStats = ref({
  totalEvents: 0,
  categoryDistribution: {},
  density: [],
  busiestDate: { date: '', count: 0 }
})
const passwordsStats = ref({
  totalPasswords: 0,
  strengthDistribution: { strong: 0, medium: 0, weak: 0 },
  expiredPasswords: 0,
  weakPasswords: 0
})

// 格式化数字
const formatNumber = (num) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + t('statistics.tenThousand')
  }
  return num.toLocaleString()
}

// 笔记趋势图表
const notesTrendOption = computed(() => {
  const trend = notesStats.value.trend || []
  const days = timeRange.value === 'all' ? trend.length : parseInt(timeRange.value)
  const filteredTrend = trend.slice(-days)
  
  return {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: filteredTrend.map(d => {
        const date = new Date(d.date)
        return `${date.getMonth() + 1}/${date.getDate()}`
      })
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: t('statistics.createdCount'),
        type: 'line',
        data: filteredTrend.map(d => d.count),
        smooth: true,
        areaStyle: {},
        itemStyle: { color: '#409eff' }
      }
    ]
  }
})

// 待办趋势图表
const todosTrendOption = computed(() => {
  const trend = todosStats.value.trend || []
  const days = timeRange.value === 'all' ? trend.length : parseInt(timeRange.value)
  const filteredTrend = trend.slice(-days)
  
  return {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: [t('statistics.completed'), t('statistics.created')]
    },
    xAxis: {
      type: 'category',
      data: filteredTrend.map(d => {
        const date = new Date(d.date)
        return `${date.getMonth() + 1}/${date.getDate()}`
      })
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: t('statistics.completed'),
        type: 'line',
        data: filteredTrend.map(d => d.completed || 0),
        smooth: true,
        itemStyle: { color: '#67c23a' }
      },
      {
        name: t('statistics.created'),
        type: 'line',
        data: filteredTrend.map(d => d.created || 0),
        smooth: true,
        itemStyle: { color: '#409eff' }
      }
    ]
  }
})

// 待办优先级分布
const todosPriorityOption = computed(() => {
  const dist = todosStats.value.priorityDistribution || {}
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: t('statistics.priorityDistribution'),
        type: 'pie',
        radius: '60%',
        data: [
          { name: t('statistics.high'), value: dist.high || 0 },
          { name: t('statistics.medium'), value: dist.medium || 0 },
          { name: t('statistics.low'), value: dist.low || 0 }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
})

// 日程分布图表
const eventsDistributionOption = computed(() => {
  const distribution = eventsStats.value.categoryDistribution || {}
  const data = Object.entries(distribution).map(([name, value]) => ({
    name: name || t('statistics.uncategorized'),
    value
  }))
  
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: t('statistics.eventDistribution'),
        type: 'pie',
        radius: '60%',
        data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
})

// 密码强度分布
const passwordsStrengthOption = computed(() => {
  const dist = passwordsStats.value.strengthDistribution || {}
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: t('statistics.passwordStrength'),
        type: 'pie',
        radius: '60%',
        data: [
          { name: t('statistics.strong'), value: dist.strong || 0 },
          { name: t('statistics.medium'), value: dist.medium || 0 },
          { name: t('statistics.weak'), value: dist.weak || 0 }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
})

// 生产力趋势分析
const productivityTrendOption = computed(() => {
  const notesTrend = notesStats.value.trend || []
  const todosTrend = todosStats.value.trend || []
  const days = timeRange.value === 'all' ? Math.max(notesTrend.length, todosTrend.length) : parseInt(timeRange.value)
  
  // 合并数据
  const dates = []
  const notesData = []
  const todosData = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    dates.push(`${date.getMonth() + 1}/${date.getDate()}`)
    
    const noteItem = notesTrend.find(d => d.date === dateStr)
    notesData.push(noteItem ? noteItem.count : 0)

    const todoItem = todosTrend.find(d => d.date === dateStr)
    todosData.push(todoItem ? (todoItem.completed || 0) : 0)
  }
  
  return {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: [t('statistics.notesCreated'), t('statistics.todosCompleted')]
    },
    xAxis: {
      type: 'category',
      data: dates
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: t('statistics.notesCreated'),
        type: 'line',
        data: notesData,
        smooth: true,
        itemStyle: { color: '#409eff' }
      },
      {
        name: t('statistics.todosCompleted'),
        type: 'line',
        data: todosData,
        smooth: true,
        itemStyle: { color: '#67c23a' }
      }
    ]
  }
})

// 加载统计数据
const loadStatistics = async () => {
  try {
    const [notes, todos, events, passwords] = await Promise.all([
      statisticsAPI.getNotesStatistics(),
      statisticsAPI.getTodosStatistics(),
      statisticsAPI.getEventsStatistics(),
      statisticsAPI.getPasswordsStatistics()
    ])
    
    notesStats.value = notes
    todosStats.value = todos
    eventsStats.value = events
    passwordsStats.value = {
      ...passwords,
      weakPasswords: (passwords.strengthDistribution?.weak || 0)
    }
  } catch (error) {
    ElMessage.error(t('statistics.loadFailed'))
  }
}

onMounted(() => {
  loadStatistics()
})
</script>

<style scoped>
.statistics-page {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 24px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.statistics-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stat-card {
  background: #ffffff;
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.stat-overview {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.chart-container {
  margin-top: 20px;
}

/* ignore */
@media (prefers-color-scheme: dark) {
  .statistics-page {
    background: #1a1a1a;
  }

  .page-header {
    background: #2d2d2d;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .page-header h2 {
    color: #eee;
  }

  .stat-card {
    background: #2d2d2d;
  }

  .stat-overview {
    background: #1a1a1a;
  }

  .stat-value {
    color: #409eff;
  }

  .stat-label {
    color: #aaa;
  }
}
</style>

