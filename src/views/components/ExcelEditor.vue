<template>
  <div class="excel-editor">
    <div class="excel-toolbar">
      <input v-model="sheetName" class="sheet-name-input" @blur="updateSheetName">
      <button class="btn-small" @click="insertRow">插入行</button>
      <button class="btn-small" @click="insertCol">插入列</button>
      <button class="btn-small" @click="deleteRow">删除行</button>
      <button class="btn-small" @click="deleteCol">删除列</button>
    </div>
    <div class="excel-table-wrapper">
      <table class="excel-table">
        <thead>
          <tr>
            <th class="excel-header-cell"></th>
            <th v-for="col in columns" :key="col" class="excel-header-cell">{{ getColumnName(col) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in data" :key="rowIndex">
            <td class="excel-row-header">{{ rowIndex + 1 }}</td>
            <td v-for="(cell, colIndex) in row" :key="colIndex" class="excel-cell">
              <input
                v-model="data[rowIndex][colIndex]"
                class="excel-cell-input"
                @blur="handleCellChange"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      data: [],
      columns: [],
      sheetName: 'Sheet1',
      workbook: null
    })
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const data = ref([])
const columns = ref([])
const sheetName = ref('Sheet1')

// 初始化数据
const initData = () => {
  if (props.modelValue && props.modelValue.data) {
    data.value = props.modelValue.data.map(row => [...row])
    columns.value = [...(props.modelValue.columns || [])]
    sheetName.value = props.modelValue.sheetName || 'Sheet1'
  } else {
    // 默认20行20列
    const defaultRows = 20
    const defaultCols = 20
    data.value = Array(defaultRows).fill(0).map(() => Array(defaultCols).fill(''))
    columns.value = Array(defaultCols).fill(0).map((_, i) => i)
    sheetName.value = 'Sheet1'
  }
}

// 监听外部数据变化
watch(() => props.modelValue, initData, { immediate: true, deep: true })

// 更新数据到父组件
const updateValue = () => {
  emit('update:modelValue', {
    data: data.value.map(row => [...row]),
    columns: [...columns.value],
    sheetName: sheetName.value,
    workbook: props.modelValue?.workbook || null
  })
}

const updateSheetName = () => {
  updateValue()
}

const handleCellChange = () => {
  updateValue()
}

const insertRow = () => {
  const newRow = Array(columns.value.length).fill('')
  data.value.push(newRow)
  updateValue()
}

const insertCol = () => {
  columns.value.push(columns.value.length)
  data.value.forEach(row => {
    row.push('')
  })
  updateValue()
}

const deleteRow = () => {
  if (data.value.length > 1) {
    data.value.pop()
    updateValue()
  }
}

const deleteCol = () => {
  if (columns.value.length > 1) {
    columns.value.pop()
    data.value.forEach(row => {
      row.pop()
    })
    updateValue()
  }
}

const getColumnName = (colIndex) => {
  let result = ''
  let num = colIndex
  while (num >= 0) {
    result = String.fromCharCode(65 + (num % 26)) + result
    num = Math.floor(num / 26) - 1
  }
  return result
}

// 暴露方法供父组件调用
defineExpose({
  getData: () => ({
    data: data.value.map(row => [...row]),
    columns: [...columns.value],
    sheetName: sheetName.value,
    workbook: props.modelValue?.workbook || null
  })
})
</script>

<style scoped>
.excel-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.excel-toolbar {
  padding: 10px 20px;
  border-bottom: 1px solid var(--border-color, var(--el-border-color-light));
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--el-fill-color-lighter);
}

.sheet-name-input {
  padding: 4px 8px;
  border: 1px solid var(--border-color, var(--el-border-color-light));
  border-radius: 4px;
  font-size: 0.85rem;
}

.btn-small {
  padding: 4px 8px;
  border: 1px solid var(--border-color, var(--el-border-color-light));
  background: var(--bg-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-small:hover {
  background: var(--hover-bg, #edf2f7);
}

.excel-table-wrapper {
  flex: 1;
  overflow: auto;
}

.excel-table {
  border-collapse: collapse;
  width: 100%;
}

.excel-header-cell {
  background: var(--el-fill-color-light);
  border: 1px solid var(--border-color, var(--el-border-color-light));
  padding: 8px;
  font-weight: 600;
  text-align: center;
  min-width: 80px;
  position: sticky;
  top: 0;
  z-index: 1;
}

.excel-row-header {
  background: var(--el-fill-color-light);
  border: 1px solid var(--border-color, var(--el-border-color-light));
  padding: 8px;
  font-weight: 600;
  text-align: center;
  min-width: 50px;
  position: sticky;
  left: 0;
  z-index: 1;
}

.excel-cell {
  border: 1px solid var(--border-color, var(--el-border-color-light));
  padding: 0;
  position: relative;
}

.excel-cell-input {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  padding: 8px;
  font-size: 14px;
  background: transparent;
}

.excel-cell-input:focus {
  background: var(--bg-primary);
  box-shadow: inset 0 0 0 2px var(--accent-color, var(--accent-blue));
}
</style>
