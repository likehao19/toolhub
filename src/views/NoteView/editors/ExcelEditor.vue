<template>
  <div class="excel-editor-wrapper">
    <!-- 工具栏 -->
    <div class="excel-toolbar" v-if="!readOnly" @mousedown.prevent>
      <!-- 撤销/重做 -->
      <div class="toolbar-group">
        <el-button size="small" :icon="RefreshLeft" @click="undo" title="撤销">撤销</el-button>
        <el-button size="small" :icon="RefreshRight" @click="redo" title="重做">重做</el-button>
      </div>

      <el-divider direction="vertical" />

      <!-- 行列操作 -->
      <div class="toolbar-group">
        <el-dropdown @command="handleRowColCommand" trigger="click">
          <el-button size="small">
            行列操作<el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="insertRowAbove">在上方插入行</el-dropdown-item>
              <el-dropdown-item command="insertRowBelow">在下方插入行</el-dropdown-item>
              <el-dropdown-item command="insertColLeft">在左侧插入列</el-dropdown-item>
              <el-dropdown-item command="insertColRight">在右侧插入列</el-dropdown-item>
              <el-dropdown-item divided command="removeRow">删除行</el-dropdown-item>
              <el-dropdown-item command="removeCol">删除列</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <el-divider direction="vertical" />

      <!-- 合并单元格 -->
      <div class="toolbar-group">
        <el-button size="small" @click="mergeCells" title="合并单元格">
          <el-icon><Grid /></el-icon>
          合并
        </el-button>
      </div>

      <el-divider direction="vertical" />

      <!-- 对齐方式 -->
      <div class="toolbar-group">
        <el-button-group size="small">
          <el-button @click="setAlignment('left')" title="左对齐">
            <span class="align-icon">⇤</span>
          </el-button>
          <el-button @click="setAlignment('center')" title="居中">
            <span class="align-icon">≡</span>
          </el-button>
          <el-button @click="setAlignment('right')" title="右对齐">
            <span class="align-icon">⇥</span>
          </el-button>
        </el-button-group>
      </div>

      <el-divider direction="vertical" />

      <!-- 字体样式 -->
      <div class="toolbar-group">
        <el-button-group size="small">
          <el-button @click="setFontStyle('bold')" title="加粗">
            <strong>B</strong>
          </el-button>
          <el-button @click="setFontStyle('italic')" title="斜体">
            <em>I</em>
          </el-button>
          <el-button @click="setFontStyle('underline')" title="下划线">
            <u>U</u>
          </el-button>
        </el-button-group>
      </div>

      <el-divider direction="vertical" />

      <!-- 背景色 -->
      <div class="toolbar-group">
        <el-color-picker 
          v-model="backgroundColor" 
          size="small" 
          @change="setBackgroundColor"
          show-alpha
          :predefine="predefineColors"
        />
        <span class="toolbar-label">背景色</span>
      </div>

      <el-divider direction="vertical" />

      <!-- 清除格式 -->
      <div class="toolbar-group">
        <el-button size="small" @click="clearFormatting" title="清除格式">
          <el-icon><Delete /></el-icon>
          清除格式
        </el-button>
      </div>
    </div>

    <!-- 表格 -->
    <div class="excel-table-container">
      <HotTable ref="hotTableRef" :settings="hotSettings" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { HotTable } from '@handsontable/vue3'
import { registerAllModules } from 'handsontable/registry'
import { registerLanguageDictionary, zhCN } from 'handsontable/i18n'
import { ElMessage } from 'element-plus'
import { 
  RefreshLeft, 
  RefreshRight, 
  ArrowDown, 
  Grid, 
  Delete
} from '@element-plus/icons-vue'
import 'handsontable/styles/handsontable.css'
import 'handsontable/styles/ht-theme-main.css'

// 注册所有 Handsontable 模块
registerAllModules()

// 注册中文语言包
registerLanguageDictionary(zhCN)

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  // Handsontable mergeCells 配置数组：
  // [{ row, col, rowspan, colspan }]
  merges: {
    type: Array,
    default: () => []
  },
  rows: {
    type: Number,
    default: 100
  },
  cols: {
    type: Number,
    default: 26
  },
  readOnly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const hotTableRef = ref(null)
const backgroundColor = ref('')
const lastSelection = ref(null) // 缓存最后的选择状态

const normalizeMerges = (merges) => {
  if (!Array.isArray(merges)) return []
  return merges
    .map((m) => ({
      row: Number.isFinite(m?.row) ? Math.max(0, Math.trunc(m.row)) : 0,
      col: Number.isFinite(m?.col) ? Math.max(0, Math.trunc(m.col)) : 0,
      rowspan: Number.isFinite(m?.rowspan) ? Math.max(1, Math.trunc(m.rowspan)) : 1,
      colspan: Number.isFinite(m?.colspan) ? Math.max(1, Math.trunc(m.colspan)) : 1
    }))
    .filter((m) => m.rowspan > 1 || m.colspan > 1)
}

const applyMergesToHot = (merges) => {
  const hot = hotTableRef.value?.hotInstance
  if (!hot) return
  const normalized = normalizeMerges(merges)

  // 表格尚未初始化出有效行列时，先不应用 merges，避免卡死/刷 warn
  const rowCount = hot.countRows?.() ?? 0
  const colCount = hot.countCols?.() ?? 0
  if (rowCount <= 0 || colCount <= 0) return

  // 过滤掉超出表格范围的 merges，避免 “outside of the table range” 反复警告
  const inRange = normalized.filter(m =>
    m.row >= 0 &&
    m.col >= 0 &&
    (m.row + m.rowspan) <= rowCount &&
    (m.col + m.colspan) <= colCount
  )

  // 通过 updateSettings 应用/覆盖 merges（包括清空）
  hot.updateSettings({ mergeCells: inRange })
  hot.render()
}

// 预定义颜色
const predefineColors = ref([
  '#ffffff',
  'var(--el-fill-color-light)',
  '#d9d9d9',
  '#bfbfbf',
  '#8c8c8c',
  '#595959',
  '#000000',
  'var(--color-red)',
  '#ff7a45',
  '#ffa940',
  '#ffc53d',
  '#ffec3d',
  '#bae637',
  '#73d13d',
  '#36cfc9',
  '#40a9ff',
  '#597ef7',
  '#9254de',
  '#f759ab'
])

// Handsontable 配置
const hotSettings = ref({
  data: [],
  colHeaders: true,
  rowHeaders: true,
  width: '100%',
  height: 'calc(100vh - 130px)',
  licenseKey: 'non-commercial-and-evaluation', // 非商业使用
  language: 'zh-CN', // 设置中文语言
  themeName: 'ht-theme-main',
  readOnly: props.readOnly, // 只读模式
  stretchH: 'all',
  autoWrapRow: true,
  autoWrapCol: true,
  mergeCells: [], // 合并单元格（由 props.merges 驱动）
  contextMenu: !props.readOnly ? {
    items: {
      'row_above': {
        name: '在上方插入行'
      },
      'row_below': {
        name: '在下方插入行'
      },
      'col_left': {
        name: '在左侧插入列'
      },
      'col_right': {
        name: '在右侧插入列'
      },
      'remove_row': {
        name: '删除行'
      },
      'remove_col': {
        name: '删除列'
      },
      'sp1': '---------',
      'mergeCells': {
        name: '合并单元格'
      },
      'sp2': '---------',
      'undo': {
        name: '撤销'
      },
      'redo': {
        name: '重做'
      },
      'sp3': '---------',
      'cut': {
        name: '剪切'
      },
      'copy': {
        name: '复制'
      },
      'paste': {
        name: '粘贴'
      },
      'sp4': '---------',
      'alignment': {
        name: '对齐方式'
      },
      'sp5': '---------',
      'clear_column': {
        name: '清除列内容'
      }
    }
  } : false, // 只读模式下禁用右键菜单
  manualColumnResize: !props.readOnly, // 只读模式下禁用调整列宽
  manualRowResize: !props.readOnly, // 只读模式下禁用调整行高
  manualColumnMove: !props.readOnly, // 只读模式下禁用移动列
  manualRowMove: !props.readOnly, // 只读模式下禁用移动行
  fillHandle: !props.readOnly, // 只读模式下禁用拖拽填充
  undo: !props.readOnly, // 只读模式下禁用撤销
  redo: !props.readOnly, // 只读模式下禁用重做
  copyPaste: true, // 允许复制
  dropdownMenu: !props.readOnly ? [
    'filter_by_condition',
    'filter_by_value',
    'filter_action_bar'
  ] : false, // 只读模式下禁用下拉菜单
  filters: !props.readOnly, // 只读模式下禁用筛选
  // 关闭 formulas，避免没有 hyperformula 时刷 engine 警告
  formulas: false,
  afterSelection: (row, col, row2, col2) => {
    // 缓存选择状态
    lastSelection.value = [row, col, row2, col2]
  },
  afterMergeCells: () => {
    // 合并变化后刷新渲染即可，保存时由 getMerges() 获取最新 merges
    if (hotTableRef.value?.hotInstance) {
      hotTableRef.value.hotInstance.render()
    }
  },
  afterUnmergeCells: () => {
    if (hotTableRef.value?.hotInstance) {
      hotTableRef.value.hotInstance.render()
    }
  },
  afterChange: (changes, source) => {
    if (source !== 'loadData' && !props.readOnly) {
      emitData()
    }
  },
  afterCreateRow: () => {
    if (!props.readOnly) {
      emitData()
    }
  },
  afterRemoveRow: () => {
    if (!props.readOnly) {
      emitData()
    }
  },
  afterCreateCol: () => {
    if (!props.readOnly) {
      emitData()
    }
  },
  afterRemoveCol: () => {
    if (!props.readOnly) {
      emitData()
    }
  }
})

// 初始化数据
const initData = () => {
  const rows = []
  for (let i = 0; i < props.rows; i++) {
    const row = []
    for (let j = 0; j < props.cols; j++) {
      row.push('')
    }
    rows.push(row)
  }
  return rows
}

// 触发数据更新
const emitData = () => {
  if (hotTableRef.value) {
    const hotInstance = hotTableRef.value.hotInstance
    if (hotInstance) {
      const data = hotInstance.getData()
      emit('update:modelValue', data)
      emit('change', data)
    }
  }
}

// 加载数据
const loadData = (data) => {
  if (hotTableRef.value) {
    const hotInstance = hotTableRef.value.hotInstance
    if (hotInstance) {
      // 确保数据至少有指定的行数和列数
      const normalizedData = []
      const MAX_RENDER_ROWS = 2000
      const MAX_RENDER_COLS = 200

      const rowCount = Math.min(Math.max(data.length, props.rows), MAX_RENDER_ROWS)
      const colCount = Math.min(Math.max(
        data.reduce((max, row) => Math.max(max, row.length), 0),
        props.cols
      ), MAX_RENDER_COLS)

      for (let i = 0; i < rowCount; i++) {
        const row = []
        for (let j = 0; j < colCount; j++) {
          row.push(data[i] && data[i][j] !== undefined ? data[i][j] : '')
        }
        normalizedData.push(row)
      }

      hotInstance.loadData(normalizedData)
      // 确保导入的合并单元格信息能应用到表格上
      applyMergesToHot(props.merges)
    }
  }
}

// 获取数据
const getData = () => {
  if (hotTableRef.value) {
    const hotInstance = hotTableRef.value.hotInstance
    if (hotInstance) {
      return hotInstance.getData()
    }
  }
  return []
}

// 获取当前合并单元格配置（用于保存回写到 xlsx）
const getMerges = () => {
  const hot = hotTableRef.value?.hotInstance
  const plugin = hot?.getPlugin?.('mergeCells')
  const collection = plugin?.mergedCellsCollection

  const list =
    collection?.getMergedCells?.() ??
    collection?.mergedCells ??
    []

  if (!Array.isArray(list)) return []
  return normalizeMerges(
    list.map((m) => ({
      row: m?.row,
      col: m?.col,
      rowspan: m?.rowspan,
      colspan: m?.colspan
    }))
  )
}

// 注意：不要 watch v-model 的 modelValue 并每次都 loadData
// 否则编辑单元格会触发父组件更新 -> 触发 watch -> 全量重载表格，容易卡死

// 监听 merges 变化（导入/切换文件时）
watch(() => props.merges, (newVal) => {
  nextTick(() => {
    applyMergesToHot(newVal)
  })
}, { deep: true, immediate: true })

// 组件挂载后初始化
onMounted(() => {
  nextTick(() => {
    if (props.modelValue && props.modelValue.length > 0) {
      loadData(props.modelValue)
    } else {
      hotSettings.value.data = initData()
    }
    applyMergesToHot(props.merges)
  })
})

// 工具栏操作函数
const undo = () => {
  if (hotTableRef.value?.hotInstance) {
    hotTableRef.value.hotInstance.undo()
  }
}

const redo = () => {
  if (hotTableRef.value?.hotInstance) {
    hotTableRef.value.hotInstance.redo()
  }
}

const handleRowColCommand = (command) => {
  const hot = hotTableRef.value?.hotInstance
  if (!hot) return

  let selected = hot.getSelected()
  
  // 如果没有选择，尝试使用缓存的选择
  if (!selected || selected.length === 0) {
    if (lastSelection.value) {
      selected = [lastSelection.value]
    } else {
      ElMessage.warning('请先选择单元格')
      return
    }
  }

  const [row, col] = selected[0]

  switch (command) {
    case 'insertRowAbove':
      hot.alter('insert_row_above', row, 1)
      break
    case 'insertRowBelow':
      hot.alter('insert_row_below', row, 1)
      break
    case 'insertColLeft':
      hot.alter('insert_col_start', col, 1)
      break
    case 'insertColRight':
      hot.alter('insert_col_end', col, 1)
      break
    case 'removeRow':
      hot.alter('remove_row', row, 1)
      break
    case 'removeCol':
      hot.alter('remove_col', col, 1)
      break
  }
}

const mergeCells = () => {
  const hot = hotTableRef.value?.hotInstance
  if (!hot) return

  let selected = hot.getSelected()
  
  // 如果没有选择，尝试使用缓存的选择
  if (!selected || selected.length === 0) {
    if (lastSelection.value) {
      selected = [lastSelection.value]
    } else {
      ElMessage.warning('请先选择要合并的单元格')
      return
    }
  }

  const [startRow, startCol, endRow, endCol] = selected[0]
  
  // 检查是否已经是合并单元格
  const mergedCells = hot.getPlugin('mergeCells')
  if (mergedCells) {
    const mergedCellInfo = mergedCells.mergedCellsCollection.get(startRow, startCol)
    if (mergedCellInfo) {
      // 取消合并
      mergedCells.unmerge(startRow, startCol, endRow, endCol)
      ElMessage.success('已取消合并')
    } else {
      // 合并单元格
      mergedCells.merge(startRow, startCol, endRow, endCol)
      ElMessage.success('已合并单元格')
    }
  }
}

const setAlignment = (align) => {
  const hot = hotTableRef.value?.hotInstance
  if (!hot) return

  let selected = hot.getSelected()
  
  // 如果没有选择，尝试使用缓存的选择
  if (!selected || selected.length === 0) {
    if (lastSelection.value) {
      selected = [lastSelection.value]
    } else {
      ElMessage.warning('请先选择单元格')
      return
    }
  }

  const [startRow, startCol, endRow, endCol] = selected[0]
  
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      hot.setCellMeta(row, col, 'className', `htCenter htMiddle ht${align.charAt(0).toUpperCase() + align.slice(1)}`)
    }
  }
  
  hot.render()
}

const setFontStyle = (style) => {
  const hot = hotTableRef.value?.hotInstance
  if (!hot) return

  let selected = hot.getSelected()
  
  // 如果没有选择，尝试使用缓存的选择
  if (!selected || selected.length === 0) {
    if (lastSelection.value) {
      selected = [lastSelection.value]
    } else {
      ElMessage.warning('请先选择单元格')
      return
    }
  }

  const [startRow, startCol, endRow, endCol] = selected[0]
  
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const currentClass = hot.getCellMeta(row, col).className || ''
      let newClass = currentClass
      
      if (style === 'bold') {
        newClass = currentClass.includes('htBold') 
          ? currentClass.replace('htBold', '').trim() 
          : `${currentClass} htBold`.trim()
      } else if (style === 'italic') {
        newClass = currentClass.includes('htItalic') 
          ? currentClass.replace('htItalic', '').trim() 
          : `${currentClass} htItalic`.trim()
      } else if (style === 'underline') {
        newClass = currentClass.includes('htUnderline') 
          ? currentClass.replace('htUnderline', '').trim() 
          : `${currentClass} htUnderline`.trim()
      }
      
      hot.setCellMeta(row, col, 'className', newClass)
    }
  }
  
  hot.render()
}

const setBackgroundColor = (color) => {
  const hot = hotTableRef.value?.hotInstance
  if (!hot || !color) return

  let selected = hot.getSelected()
  
  // 如果没有选择，尝试使用缓存的选择
  if (!selected || selected.length === 0) {
    if (lastSelection.value) {
      selected = [lastSelection.value]
    } else {
      ElMessage.warning('请先选择单元格')
      return
    }
  }

  const [startRow, startCol, endRow, endCol] = selected[0]
  
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      hot.setCellMeta(row, col, 'style', { background: color })
    }
  }
  
  hot.render()
  ElMessage.success('已设置背景色')
}

const clearFormatting = () => {
  const hot = hotTableRef.value?.hotInstance
  if (!hot) return

  let selected = hot.getSelected()
  
  // 如果没有选择，尝试使用缓存的选择
  if (!selected || selected.length === 0) {
    if (lastSelection.value) {
      selected = [lastSelection.value]
    } else {
      ElMessage.warning('请先选择单元格')
      return
    }
  }

  const [startRow, startCol, endRow, endCol] = selected[0]
  
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      hot.removeCellMeta(row, col, 'className')
      hot.removeCellMeta(row, col, 'style')
    }
  }
  
  hot.render()
  ElMessage.success('已清除格式')
}

// 暴露方法给父组件
defineExpose({
  getData,
  getMerges,
  loadData
})
</script>

<style scoped>
.excel-editor-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-fill-color-light);
}

.excel-toolbar {
  background: var(--bg-primary);
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 4px;
}

.align-icon {
  font-size: 16px;
  font-weight: bold;
}

.excel-table-container {
  flex: 1;
  overflow: hidden;
  padding: 10px;
}

.excel-editor-wrapper :deep(.handsontable) {
  font-size: 13px;
}

.excel-editor-wrapper :deep(.handsontable td),
.excel-editor-wrapper :deep(.handsontable th) {
  border-color: var(--border-color);
}

.excel-editor-wrapper :deep(.handsontable th) {
  background: var(--el-fill-color-light);
  color: var(--text-secondary);
  font-weight: 600;
}

.excel-editor-wrapper :deep(.handsontable .currentRow),
.excel-editor-wrapper :deep(.handsontable .currentCol) {
  background-color: var(--el-fill-color-light);
}

.excel-editor-wrapper :deep(.handsontable .area) {
  background-color: rgba(33, 150, 243, 0.1);
}

.excel-editor-wrapper :deep(.handsontable .htDimmed) {
  color: var(--text-tertiary);
}

/* ignore */
.excel-editor-wrapper :deep(.htBold) {
  font-weight: bold;
}

.excel-editor-wrapper :deep(.htItalic) {
  font-style: italic;
}

.excel-editor-wrapper :deep(.htUnderline) {
  text-decoration: underline;
}

.excel-editor-wrapper :deep(.htLeft) {
  text-align: left !important;
}

.excel-editor-wrapper :deep(.htCenter) {
  text-align: center !important;
}

.excel-editor-wrapper :deep(.htRight) {
  text-align: right !important;
}
</style>
