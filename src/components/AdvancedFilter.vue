<template>
  <el-drawer
    v-model="visible"
    title="高级筛选"
    :size="400"
    direction="rtl"
  >
    <el-form :model="filterForm" label-width="100px">
      <!-- 多条件组合 -->
      <el-form-item label="条件组合">
        <el-radio-group v-model="filterForm.logic">
          <el-radio label="AND">全部满足（AND）</el-radio>
          <el-radio label="OR">任一满足（OR）</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 日期范围筛选 -->
      <el-form-item label="日期范围" v-if="showDateRange">
        <el-date-picker
          v-model="filterForm.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
        <div style="margin-top: 8px;">
          <el-button-group>
            <el-button size="small" @click="setDateRange('today')">今天</el-button>
            <el-button size="small" @click="setDateRange('week')">本周</el-button>
            <el-button size="small" @click="setDateRange('month')">本月</el-button>
            <el-button size="small" @click="setDateRange('year')">本年</el-button>
          </el-button-group>
        </div>
      </el-form-item>

      <!-- 标签筛选 -->
      <el-form-item label="标签筛选" v-if="showTags && availableTags.length > 0">
        <el-select
          v-model="filterForm.tags"
          multiple
          placeholder="选择标签"
          style="width: 100%"
        >
          <el-option
            v-for="tag in availableTags"
            :key="tag"
            :label="tag"
            :value="tag"
          />
        </el-select>
        <div style="margin-top: 8px;">
          <el-radio-group v-model="filterForm.tagLogic" size="small">
            <el-radio label="AND">全部包含</el-radio>
            <el-radio label="OR">任一包含</el-radio>
          </el-radio-group>
        </div>
      </el-form-item>

      <!-- 分类筛选 -->
      <el-form-item label="分类筛选" v-if="showCategories && availableCategories.length > 0">
        <el-select
          v-model="filterForm.categories"
          multiple
          placeholder="选择分类"
          style="width: 100%"
        >
          <el-option
            v-for="cat in availableCategories"
            :key="cat"
            :label="cat"
            :value="cat"
          />
        </el-select>
      </el-form-item>

      <!-- 状态筛选 -->
      <el-form-item label="状态筛选" v-if="showStatus && availableStatus.length > 0">
        <el-select
          v-model="filterForm.status"
          multiple
          placeholder="选择状态"
          style="width: 100%"
        >
          <el-option
            v-for="status in availableStatus"
            :key="status.value"
            :label="status.label"
            :value="status.value"
          />
        </el-select>
      </el-form-item>

      <!-- 优先级筛选 -->
      <el-form-item label="优先级筛选" v-if="showPriority">
        <el-select
          v-model="filterForm.priority"
          multiple
          placeholder="选择优先级"
          style="width: 100%"
        >
          <el-option label="高" :value="2" />
          <el-option label="中" :value="1" />
          <el-option label="低" :value="0" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <div style="display: flex; justify-content: space-between;">
        <el-button @click="resetFilter">重置</el-button>
        <div>
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" @click="handleApply">应用</el-button>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  showDateRange: { type: Boolean, default: true },
  showTags: { type: Boolean, default: true },
  showCategories: { type: Boolean, default: true },
  showStatus: { type: Boolean, default: false },
  showPriority: { type: Boolean, default: false },
  availableTags: { type: Array, default: () => [] },
  availableCategories: { type: Array, default: () => [] },
  availableStatus: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'apply', 'reset'])

const visible = ref(false)
const filterForm = ref({
  logic: 'AND',
  dateRange: null,
  tags: [],
  tagLogic: 'AND',
  categories: [],
  status: [],
  priority: []
})

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

// 设置日期范围快捷选项
const setDateRange = (type) => {
  const today = new Date()
  let start, end
  
  switch (type) {
    case 'today':
      start = new Date(today)
      end = new Date(today)
      break
    case 'week':
      start = new Date(today)
      start.setDate(today.getDate() - today.getDay())
      end = new Date(start)
      end.setDate(start.getDate() + 6)
      break
    case 'month':
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      break
    case 'year':
      start = new Date(today.getFullYear(), 0, 1)
      end = new Date(today.getFullYear(), 11, 31)
      break
  }
  
  filterForm.value.dateRange = [
    start.toISOString().split('T')[0],
    end.toISOString().split('T')[0]
  ]
}

// 应用筛选
const handleApply = () => {
  emit('apply', { ...filterForm.value })
  visible.value = false
}

// 取消
const handleCancel = () => {
  visible.value = false
}

// 重置筛选
const resetFilter = () => {
  filterForm.value = {
    logic: 'AND',
    dateRange: null,
    tags: [],
    tagLogic: 'AND',
    categories: [],
    status: [],
    priority: []
  }
  emit('reset')
}
</script>

