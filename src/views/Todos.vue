<template>
  <div class="todos-page-wrapper">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <el-button size="small" circle @click="hideSidebar = !hideSidebar" :title="hideSidebar ? t('common.showSidebar') : t('common.hideSidebar')" class="sidebar-toggle-btn">
          <el-icon><ArrowLeft v-if="!hideSidebar" /><ArrowRight v-else /></el-icon>
        </el-button>
        <div class="page-title-block">
          <div class="page-eyebrow">Productivity</div>
          <div class="breadcrumb">
            <span>{{ t('todos.title') }}</span>
            <span class="breadcrumb-divider">/</span>
            <span>{{ currentCategoryName }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          :placeholder="t('todos.searchPlaceholder')"
          clearable
          style="width: 250px;"
          size="small"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <!-- 操作按钮组 -->
        <el-button size="small" circle @click="showCreateDialog" :title="t('todos.addTodo')" type="primary">
          <el-icon><Plus /></el-icon>
        </el-button>
      </div>
    </header>

    <div class="main-container" :class="{ 'sidebar-hidden': hideSidebar }">
      <!-- 左侧分类栏 -->
      <aside class="sidebar-left" v-show="!hideSidebar">
        <div class="sidebar-toolbar">
          <span class="sidebar-title">{{ t('common.category') }}</span>
          <div class="actions">
            <span class="sidebar-btn" :title="t('common.newCategory')" @click="showAddCategoryDialog">
              <i class="fa-solid fa-plus"></i>
            </span>
          </div>
        </div>
        
        <div class="category-list">
          <!-- 全部待办 -->
          <div 
            class="category-item" 
            :class="{ active: selectedCategory === null }"
            @click="selectCategory(null)"
          >
            <el-icon class="category-icon"><List /></el-icon>
            <span class="category-name">{{ t('todos.allTodos') }}</span>
            <span class="category-count">{{ todos.filter(t => !t.parent_id).length }}</span>
          </div>
          
          <!-- 今日待办 -->
          <div 
            class="category-item" 
            :class="{ active: selectedCategory === 'today' }"
            @click="selectCategory('today')"
          >
            <el-icon class="category-icon" style="color: var(--accent-blue);"><Calendar /></el-icon>
            <span class="category-name">{{ t('todos.todayTodos') }}</span>
            <span class="category-count">{{ getTodayCount() }}</span>
          </div>
          
          <!-- 重要待办 -->
          <div 
            class="category-item" 
            :class="{ active: selectedCategory === 'important' }"
            @click="selectCategory('important')"
          >
            <el-icon class="category-icon" style="color: var(--el-color-danger);"><StarFilled /></el-icon>
            <span class="category-name">{{ t('todos.important') }}</span>
            <span class="category-count">{{ getImportantCount() }}</span>
          </div>
          
          <!-- 已完成 -->
          <div 
            class="category-item" 
            :class="{ active: selectedCategory === 'completed' }"
            @click="selectCategory('completed')"
          >
            <el-icon class="category-icon" style="color: var(--el-color-success);"><CircleCheck /></el-icon>
            <span class="category-name">{{ t('todos.completedTodos') }}</span>
            <span class="category-count">{{ getCompletedCount() }}</span>
          </div>
          
          <!-- 自定义分类 -->
          <div class="category-divider"></div>
          <div 
            v-for="category in categories" 
            :key="category.id"
            class="category-item"
            :class="{ active: selectedCategory === category.id }"
            @click="selectCategory(category.id)"
          >
            <el-icon class="category-icon" :style="{ color: getIconColor(category.icon) }">
              <component :is="getCategoryIcon(category.icon)" />
            </el-icon>
            <span class="category-name">{{ category.name }}</span>
            <span class="category-count">{{ getCategoryCount(category.id) }}</span>
            <div class="category-actions">
              <i class="fa-solid fa-pen action-icon" @click.stop="editCategory(category)" :title="t('common.edit')"></i>
              <i class="fa-solid fa-trash action-icon del" @click.stop="deleteCategory(category)" :title="t('common.delete')"></i>
            </div>
          </div>
        </div>
      </aside>

      <!-- 中间内容区域 -->
      <main class="content-area">
        <!-- 待办列表 -->
        <div class="todo-list" v-loading="loading">
          <el-empty v-if="filteredTodos.length === 0" :description="t('todos.noTodos')" />

          <div v-else class="todo-cards">
            <div 
              v-for="todo in filteredTodos" 
              :key="todo.id"
              class="todo-card"
              :class="{ completed: todo.status === 2 }"
            >
              <!-- 第一行：标题和操作 -->
              <div class="card-row card-header-row">
                <div class="card-title-section">
                  <!-- 完成checkbox -->
                  <el-checkbox
                    :model-value="todo.status === 2"
                    @change="toggleTodo(todo)"
                    size="large"
                    :disabled="getSubtasksCount(todo.id) > 0"
                  />
                  <h3 class="card-title" :class="{ completed: todo.status === 2 }">
                    {{ todo.title }}
                  </h3>
                  <!-- 优先级标签 -->
                  <el-tag v-if="todo.priority === 2" type="danger" size="small">{{ t('todos.highPriority') }}</el-tag>
                  <el-tag v-else-if="todo.priority === 1" type="warning" size="small">{{ t('todos.medPriority') }}</el-tag>
                  <!-- 子任务进度 -->
                  <el-tag v-if="getSubtasksCount(todo.id) > 0" type="info" size="small">
                    {{ getCompletedSubtasksCount(todo.id) }}/{{ getSubtasksCount(todo.id) }}
                  </el-tag>
                </div>
                
                <!-- 操作按钮 -->
                <div class="card-actions">
                  <el-button 
                    text 
                    size="small"
                    @click="toggleSubtasks(todo.id)"
                    :title="t('todos.subtasks')"
                  >
                    <el-icon><List /></el-icon>
                  </el-button>
                  <el-button 
                    text 
                    size="small"
                    @click="editTodo(todo)"
                    :title="t('common.edit')"
                  >
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button 
                    text 
                    size="small"
                    type="danger"
                    @click="deleteTodo(todo)"
                    :title="t('common.delete')"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
              
              <!-- 进度条 -->
              <div v-if="getSubtasksCount(todo.id) > 0" class="progress-bar-container">
                <el-progress 
                  :percentage="getSubtasksProgress(todo.id)" 
                  :stroke-width="6"
                  :show-text="false"
                />
              </div>
              
              <!-- 第二行：详细信息 -->
              <div class="card-row card-info-row">
                <!-- 描述 -->
                <div class="info-item full-width" v-if="todo.description">
                  <span class="info-label">{{ t('todos.note') }}：</span>
                  <span class="info-value">{{ todo.description }}</span>
                </div>
                
                <!-- 开始日期 -->
                <div class="info-item" v-if="todo.start_date">
                  <span class="info-label">{{ t('todos.start') }}：</span>
                  <span class="info-value">{{ formatDate(todo.start_date) }}</span>
                </div>
                
                <!-- 截止日期 -->
                <div class="info-item" v-if="todo.due_date">
                  <span class="info-label">{{ t('todos.due') }}：</span>
                  <span class="info-value" :class="{ 'overdue': isOverdue(todo.due_date) }">
                    {{ formatDate(todo.due_date) }}
                  </span>
                </div>
                
                <!-- 分类 -->
                <div class="info-item" v-if="todo.category">
                  <span class="info-label">{{ t('todos.category') }}：</span>
                  <span class="info-value">{{ todo.category }}</span>
                </div>
              </div>
              
              <!-- 子任务列表 -->
              <div v-if="expandedTodos.includes(todo.id)" class="subtasks-container">
                <div class="subtasks-header">
                  <span>{{ t('todos.subtasks') }}</span>
                  <el-button 
                    text 
                    size="small" 
                    type="primary"
                    @click="addSubtask(todo)"
                  >
                    <el-icon><Plus /></el-icon>
                    {{ t('todos.addSubtask') }}
                  </el-button>
                </div>
                
                <div class="subtasks-list">
                  <div 
                    v-for="subtask in getSubtasks(todo.id)" 
                    :key="subtask.id"
                    class="subtask-item"
                  >
                    <el-checkbox
                      :model-value="subtask.status === 2"
                      @change="toggleSubtask(subtask)"
                    />
                    <span class="subtask-title" :class="{ completed: subtask.status === 2 }">
                      {{ subtask.title }}
                    </span>
                    <div class="subtask-actions">
                      <el-button 
                        text 
                        size="small"
                        @click="editSubtask(subtask)"
                        :title="t('common.edit')"
                      >
                        <el-icon><Edit /></el-icon>
                      </el-button>
                      <el-button 
                        text 
                        size="small"
                        type="danger"
                        @click="deleteSubtask(subtask)"
                        :title="t('common.delete')"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                  </div>
                  
                  <el-empty 
                    v-if="getSubtasks(todo.id).length === 0" 
                    :description="t('todos.noSubtasks')"
                    :image-size="60"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingTodo ? t('todos.editTodo') : t('todos.newTodo')"
      width="600px"
    >
      <el-form :model="todoForm" label-width="80px">
        <el-form-item :label="t('common.title')" required>
          <el-input v-model="todoForm.title" :placeholder="t('todos.todoTitle')" />
        </el-form-item>
        <el-form-item :label="t('common.description')">
          <el-input
            v-model="todoForm.description"
            type="textarea"
            :rows="3"
            :placeholder="t('todos.todoDesc')"
          />
        </el-form-item>
        <el-form-item :label="t('todos.startDate')">
          <el-date-picker
            v-model="todoForm.start_date"
            type="date"
            :placeholder="t('todos.selectStartDate')"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item :label="t('todos.dueDate')">
          <el-date-picker
            v-model="todoForm.due_date"
            type="date"
            :placeholder="t('todos.selectDueDate')"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item :label="t('todos.priority')">
          <el-radio-group v-model="todoForm.priority">
            <el-radio :value="0">{{ t('todos.priorityLow') }}</el-radio>
            <el-radio :value="1">{{ t('todos.priorityMed') }}</el-radio>
            <el-radio :value="2">{{ t('todos.priorityHigh') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="t('todos.category')">
          <el-select v-model="todoForm.category" :placeholder="t('todos.selectCategory')" style="width: 100%;" clearable>
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.name"
            />
          </el-select>
        </el-form-item>
        
        <!-- 提醒设置 -->
        <el-form-item :label="t('todos.reminder')">
          <el-switch v-model="todoForm.reminder_enabled" />
          <span style="margin-left: 10px; color: var(--el-text-color-secondary); font-size: 12px;">
            {{ t('todos.enableReminder') }}
          </span>
        </el-form-item>
        
        <template v-if="todoForm.reminder_enabled">
          <el-form-item :label="t('todos.reminderType')">
            <el-select v-model="todoForm.reminder_type" style="width: 100%;">
              <el-option :label="t('todos.onStart')" value="on_start" />
              <el-option :label="t('todos.onDue')" value="on_due" />
              <el-option :label="t('todos.beforeDue')" value="before_due" />
              <el-option :label="t('todos.overdue')" value="overdue" />
            </el-select>
          </el-form-item>
          
          <el-form-item :label="t('todos.reminderTime')">
            <el-time-picker
              v-model="todoForm.reminder_time"
              format="HH:mm"
              value-format="HH:mm"
              :placeholder="t('todos.selectReminderTime')"
              style="width: 100%;"
            />
            <div style="font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px;">
              {{ t('todos.reminderTimeHint') }}
            </div>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveTodo">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 添加分类对话框 -->
    <el-dialog
      v-model="showAddCategory"
      :title="t('common.newCategory')"
      width="400px"
    >
      <el-form :model="categoryForm" label-width="80px">
        <el-form-item :label="t('todos.categoryName')" required>
          <el-input v-model="categoryForm.name" :placeholder="t('todos.enterCategoryName')" />
        </el-form-item>
        
        <el-form-item :label="t('todos.icon')">
          <el-select v-model="categoryForm.icon" :placeholder="t('todos.selectIcon')">
            <el-option value="Folder" :label="t('todos.iconFolder')">
              <el-icon style="color: var(--el-text-color-secondary);"><Folder /></el-icon> {{ t('todos.iconFolder') }}
            </el-option>
            <el-option value="CollectionTag" :label="t('todos.iconTag')">
              <el-icon style="color: var(--accent-blue);"><CollectionTag /></el-icon> {{ t('todos.iconTag') }}
            </el-option>
            <el-option value="Calendar" :label="t('todos.iconCalendar')">
              <el-icon style="color: var(--el-color-success);"><Calendar /></el-icon> {{ t('todos.iconCalendar') }}
            </el-option>
            <el-option value="Briefcase" :label="t('todos.iconWork')">
              <el-icon style="color: var(--el-color-warning);"><Briefcase /></el-icon> {{ t('todos.iconWork') }}
            </el-option>
            <el-option value="Reading" :label="t('todos.iconStudy')">
              <el-icon style="color: #8E44AD;"><Reading /></el-icon> {{ t('todos.iconStudy') }}
            </el-option>
            <el-option value="ShoppingCart" :label="t('todos.iconShopping')">
              <el-icon style="color: #FF6B9D;"><ShoppingCart /></el-icon> {{ t('todos.iconShopping') }}
            </el-option>
            <el-option value="House" :label="t('todos.iconHome')">
              <el-icon style="color: var(--accent-blue);"><House /></el-icon> {{ t('todos.iconHome') }}
            </el-option>
            <el-option value="User" :label="t('todos.iconPersonal')">
              <el-icon style="color: var(--el-text-color-secondary);"><User /></el-icon> {{ t('todos.iconPersonal') }}
            </el-option>
            <el-option value="Football" :label="t('todos.iconSports')">
              <el-icon style="color: var(--color-red);"><Football /></el-icon> {{ t('todos.iconSports') }}
            </el-option>
            <el-option value="Present" :label="t('todos.iconGift')">
              <el-icon style="color: var(--color-orange);"><Present /></el-icon> {{ t('todos.iconGift') }}
            </el-option>
            <el-option value="Dish" :label="t('todos.iconFood')">
              <el-icon style="color: var(--color-orange);"><Dish /></el-icon> {{ t('todos.iconFood') }}
            </el-option>
            <el-option value="Connection" :label="t('todos.iconSocial')">
              <el-icon style="color: #9B59B6;"><Connection /></el-icon> {{ t('todos.iconSocial') }}
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddCategory = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveCategory">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- 编辑分类对话框 -->
    <el-dialog
      v-model="showEditCategory"
      :title="t('todos.editCategory')"
      width="400px"
    >
      <el-form :model="editCategoryForm" label-width="80px">
        <el-form-item :label="t('todos.categoryName')" required>
          <el-input v-model="editCategoryForm.name" :placeholder="t('todos.enterCategoryName')" />
        </el-form-item>
        
        <el-form-item :label="t('todos.icon')">
          <el-select v-model="editCategoryForm.icon" :placeholder="t('todos.selectIcon')">
            <el-option value="Folder" :label="t('todos.iconFolder')">
              <el-icon style="color: var(--el-text-color-secondary);"><Folder /></el-icon> {{ t('todos.iconFolder') }}
            </el-option>
            <el-option value="CollectionTag" :label="t('todos.iconTag')">
              <el-icon style="color: var(--accent-blue);"><CollectionTag /></el-icon> {{ t('todos.iconTag') }}
            </el-option>
            <el-option value="Calendar" :label="t('todos.iconCalendar')">
              <el-icon style="color: var(--el-color-success);"><Calendar /></el-icon> {{ t('todos.iconCalendar') }}
            </el-option>
            <el-option value="Briefcase" :label="t('todos.iconWork')">
              <el-icon style="color: var(--el-color-warning);"><Briefcase /></el-icon> {{ t('todos.iconWork') }}
            </el-option>
            <el-option value="Reading" :label="t('todos.iconStudy')">
              <el-icon style="color: #8E44AD;"><Reading /></el-icon> {{ t('todos.iconStudy') }}
            </el-option>
            <el-option value="ShoppingCart" :label="t('todos.iconShopping')">
              <el-icon style="color: #FF6B9D;"><ShoppingCart /></el-icon> {{ t('todos.iconShopping') }}
            </el-option>
            <el-option value="House" :label="t('todos.iconHome')">
              <el-icon style="color: var(--accent-blue);"><House /></el-icon> {{ t('todos.iconHome') }}
            </el-option>
            <el-option value="User" :label="t('todos.iconPersonal')">
              <el-icon style="color: var(--el-text-color-secondary);"><User /></el-icon> {{ t('todos.iconPersonal') }}
            </el-option>
            <el-option value="Football" :label="t('todos.iconSports')">
              <el-icon style="color: var(--color-red);"><Football /></el-icon> {{ t('todos.iconSports') }}
            </el-option>
            <el-option value="Present" :label="t('todos.iconGift')">
              <el-icon style="color: var(--color-orange);"><Present /></el-icon> {{ t('todos.iconGift') }}
            </el-option>
            <el-option value="Dish" :label="t('todos.iconFood')">
              <el-icon style="color: var(--color-orange);"><Dish /></el-icon> {{ t('todos.iconFood') }}
            </el-option>
            <el-option value="Connection" :label="t('todos.iconSocial')">
              <el-icon style="color: #9B59B6;"><Connection /></el-icon> {{ t('todos.iconSocial') }}
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditCategory = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="updateCategory">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
    
    <!-- 添加子任务对话框 -->
    <el-dialog
      v-model="showSubtaskDialog"
      :title="t('todos.addSubtask')"
      width="500px"
    >
      <el-form :model="subtaskForm" label-width="80px">
        <el-form-item :label="t('common.title')" required>
          <el-input v-model="subtaskForm.title" :placeholder="t('todos.subtaskTitle')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSubtaskDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveSubtask">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
    
    <!-- 编辑子任务对话框 -->
    <el-dialog
      v-model="showEditSubtaskDialog"
      :title="t('todos.editSubtask')"
      width="500px"
    >
      <el-form :model="editSubtaskForm" label-width="80px">
        <el-form-item :label="t('common.title')" required>
          <el-input v-model="editSubtaskForm.title" :placeholder="t('todos.subtaskTitle')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditSubtaskDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="updateSubtask">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Search, Edit, Delete, List, Calendar, StarFilled, CircleCheck, Folder, ArrowLeft, ArrowRight, CollectionTag, Briefcase, Reading, ShoppingCart, House, User, Football, Present, Dish, Connection } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'
import Database from '@tauri-apps/plugin-sql'

const DB_PATH = 'sqlite:productivity.db'
let dbInstance = null

async function getDatabase() {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH)
  }
  return dbInstance
}

// 状态
const todos = ref([])
const categories = ref([])
const searchKeyword = ref('')
const debouncedKeyword = ref('')
let _searchTimer = null
watch(searchKeyword, (v) => {
  clearTimeout(_searchTimer)
  _searchTimer = setTimeout(() => { debouncedKeyword.value = v }, 250)
})
const selectedCategory = ref('today')
const hideSidebar = ref(false)
const loading = ref(false)
const dialogVisible = ref(false)
const showAddCategory = ref(false)
const showEditCategory = ref(false)
const showSubtaskDialog = ref(false)
const showEditSubtaskDialog = ref(false)
const editingTodo = ref(null)
const editingCategory = ref(null)
const editingSubtask = ref(null)
const parentTodo = ref(null)
const expandedTodos = ref([])

// 表单
const todoForm = ref({
  title: '',
  description: '',
  start_date: '',
  due_date: '',
  priority: 0,
  category: '',
  reminder_enabled: false,
  reminder_type: 'on_due',
  reminder_time: '09:00'
})

const categoryForm = ref({
  name: '',
  icon: 'Folder'
})

const editCategoryForm = ref({
  name: '',
  icon: 'Folder'
})

const subtaskForm = ref({
  title: ''
})

const editSubtaskForm = ref({
  title: ''
})

// 当前分类名称
const currentCategoryName = computed(() => {
  if (selectedCategory.value === null) return t('todos.allTodos')
  if (selectedCategory.value === 'today') return t('todos.todayTodos')
  if (selectedCategory.value === 'important') return t('todos.important')
  if (selectedCategory.value === 'completed') return t('todos.completedTodos')
  const cat = categories.value.find(c => c.id === selectedCategory.value)
  return cat ? cat.name : t('todos.unknownCategory')
})

// 过滤后的待办
const filteredTodos = computed(() => {
  let result = todos.value.filter(t => !t.parent_id) // 只显示主任务

  // 分类筛选
  if (selectedCategory.value === 'today') {
    const today = new Date().toISOString().split('T')[0]
    result = result.filter(t => {
      if (t.status === 2) return false
      // 今日任务：截止日期是今天，或开始日期是今天
      const dueToday = t.due_date === today
      const startToday = t.start_date === today
      return dueToday || startToday
    })
  } else if (selectedCategory.value === 'important') {
    result = result.filter(t => t.priority === 2 && t.status !== 2)
  } else if (selectedCategory.value === 'completed') {
    result = result.filter(t => t.status === 2)
  } else if (selectedCategory.value && typeof selectedCategory.value === 'number') {
    const cat = categories.value.find(c => c.id === selectedCategory.value)
    if (cat) {
      result = result.filter(t => t.category === cat.name)
    }
  }

  // 搜索过滤
  if (debouncedKeyword.value) {
    const keyword = debouncedKeyword.value.toLowerCase()
    result = result.filter(t =>
      t.title?.toLowerCase().includes(keyword) ||
      t.description?.toLowerCase().includes(keyword)
    )
  }

  // 排序：未完成优先，高优先级优先，截止日期近的优先
  return result.sort((a, b) => {
    if (a.status !== b.status) return a.status - b.status
    if (a.priority !== b.priority) return b.priority - a.priority
    if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date)
    return new Date(b.created_at) - new Date(a.created_at)
  })
})

// 统计函数
const getTodayCount = () => {
  const today = new Date().toISOString().split('T')[0]
  return todos.value.filter(t => {
    if (t.parent_id || t.status === 2) return false
    // 今日任务：截止日期是今天，或开始日期是今天
    const dueToday = t.due_date === today
    const startToday = t.start_date === today
    return dueToday || startToday
  }).length
}

const getImportantCount = () => {
  return todos.value.filter(t => !t.parent_id && t.priority === 2 && t.status !== 2).length
}

const getCompletedCount = () => {
  return todos.value.filter(t => !t.parent_id && t.status === 2).length
}

const getCategoryCount = (categoryId) => {
  const cat = categories.value.find(c => c.id === categoryId)
  if (!cat) return 0
  return todos.value.filter(t => !t.parent_id && t.category === cat.name).length
}

// 获取分类图标
const getCategoryIcon = (iconName) => {
  const iconMap = {
    'Folder': Folder,
    'CollectionTag': CollectionTag,
    'Calendar': Calendar,
    'Briefcase': Briefcase,
    'Reading': Reading,
    'ShoppingCart': ShoppingCart,
    'House': House,
    'User': User,
    'Football': Football,
    'Present': Present,
    'Dish': Dish,
    'Connection': Connection
  }
  return iconMap[iconName] || Folder
}

// 获取图标颜色
const getIconColor = (iconName) => {
  const colorMap = {
    'Folder': 'var(--el-text-color-secondary)',
    'CollectionTag': 'var(--accent-blue)',
    'Calendar': 'var(--el-color-success)',
    'Briefcase': 'var(--el-color-warning)',
    'Reading': '#8E44AD',
    'ShoppingCart': '#FF6B9D',
    'House': 'var(--accent-blue)',
    'User': 'var(--el-text-color-secondary)',
    'Football': 'var(--color-red)',
    'Present': 'var(--color-orange)',
    'Dish': 'var(--color-orange)',
    'Connection': '#9B59B6'
  }
  return colorMap[iconName] || 'var(--el-text-color-secondary)'
}

// 获取子任务
const getSubtasks = (parentId) => {
  return todos.value.filter(t => t.parent_id === parentId)
}

// 获取子任务数量
const getSubtasksCount = (parentId) => {
  return getSubtasks(parentId).length
}

// 获取已完成子任务数量
const getCompletedSubtasksCount = (parentId) => {
  return getSubtasks(parentId).filter(t => t.status === 2).length
}

// 获取子任务进度
const getSubtasksProgress = (parentId) => {
  const subtasks = getSubtasks(parentId)
  if (subtasks.length === 0) return 0
  const completed = subtasks.filter(t => t.status === 2).length
  return Math.round((completed / subtasks.length) * 100)
}

// 切换子任务显示
const toggleSubtasks = (todoId) => {
  const index = expandedTodos.value.indexOf(todoId)
  if (index > -1) {
    expandedTodos.value.splice(index, 1)
  } else {
    expandedTodos.value.push(todoId)
  }
}

// 切换分类
const selectCategory = (categoryId) => {
  selectedCategory.value = categoryId
}

// 判断是否过期
const isOverdue = (dueDate) => {
  if (!dueDate) return false
  const today = new Date().toISOString().split('T')[0]
  return dueDate < today
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  // 用本地日期比较，避免 UTC 时区偏差
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = date - today
  const days = Math.round(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return t('todos.today')
  if (days === 1) return t('todos.tomorrow')
  if (days === -1) return t('todos.yesterday')
  if (days < 0) return t('todos.overdueDays', { days: Math.abs(days) })
  if (days < 7) return t('todos.daysLater', { days })
  return date.toLocaleDateString('zh-CN')
}

// 加载待办
const loadTodos = async () => {
  try {
    loading.value = true
    const db = await getDatabase()
    const result = await db.select(
      'SELECT * FROM todos ORDER BY priority DESC, due_date ASC, created_at DESC'
    )
    todos.value = result || []
  } catch (error) {
    ElMessage.error(t('todos.loadFailed'))
  } finally {
    loading.value = false
  }
}

// 加载分类
const loadCategories = async () => {
  try {
    const db = await getDatabase()
    
    // 检查表是否存在
    const tables = await db.select(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='todo_categories'"
    )
    
    if (tables.length === 0) {
      // 创建分类表
      await db.execute(`
        CREATE TABLE IF NOT EXISTS todo_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          icon TEXT DEFAULT 'Folder',
          created_at TEXT NOT NULL
        )
      `)
    }
    
    const result = await db.select('SELECT * FROM todo_categories ORDER BY created_at ASC')
    categories.value = result || []
  } catch (e) { /* ignore */ }
}

// 显示创建对话框
const showCreateDialog = () => {
  editingTodo.value = null
  todoForm.value = {
    title: '',
    description: '',
    start_date: '',
    due_date: '',
    priority: 0,
    category: '',
    reminder_enabled: false,
    reminder_type: 'on_due',
    reminder_time: '09:00'
  }
  dialogVisible.value = true
}

// 编辑待办
const editTodo = (todo) => {
  editingTodo.value = todo
  todoForm.value = {
    title: todo.title || '',
    description: todo.description || '',
    start_date: todo.start_date || '',
    due_date: todo.due_date || '',
    priority: todo.priority || 0,
    category: todo.category || '',
    reminder_enabled: todo.reminder_enabled === 1,
    reminder_type: todo.reminder_type || 'on_due',
    reminder_time: todo.reminder_time || '09:00'
  }
  dialogVisible.value = true
}

// 保存待办
const saveTodo = async () => {
  if (!todoForm.value.title) {
    ElMessage.warning(t('todos.titleRequired'))
    return
  }

  try {
    const db = await getDatabase()
    const now = new Date().toISOString()

    if (editingTodo.value) {
      // 更新
      await db.execute(
        `UPDATE todos SET title = ?, description = ?, start_date = ?, due_date = ?, priority = ?, category = ?, 
         reminder_enabled = ?, reminder_type = ?, reminder_time = ?, reminder_sent = 0, updated_at = ? WHERE id = ?`,
        [
          todoForm.value.title,
          todoForm.value.description,
          todoForm.value.start_date || null,
          todoForm.value.due_date || null,
          todoForm.value.priority,
          todoForm.value.category,
          todoForm.value.reminder_enabled ? 1 : 0,
          todoForm.value.reminder_type,
          todoForm.value.reminder_time,
          now,
          editingTodo.value.id
        ]
      )
      ElMessage.success(t('todos.updateSuccess'))
    } else {
      // 创建
      await db.execute(
        `INSERT INTO todos (title, description, start_date, due_date, priority, category, status, progress, 
         reminder_enabled, reminder_type, reminder_time, reminder_sent, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, 0, 0.0, ?, ?, ?, 0, ?, ?)`,
        [
          todoForm.value.title,
          todoForm.value.description,
          todoForm.value.start_date || null,
          todoForm.value.due_date || null,
          todoForm.value.priority,
          todoForm.value.category,
          todoForm.value.reminder_enabled ? 1 : 0,
          todoForm.value.reminder_type,
          todoForm.value.reminder_time,
          now,
          now
        ]
      )
      ElMessage.success(t('todos.createSuccess'))
    }

    dialogVisible.value = false
    await loadTodos()
  } catch (error) {
    ElMessage.error(t('common.saveFailed'))
  }
}

// 切换待办状态
const toggleTodo = async (todo) => {
  // 如果有子任务，不允许直接完成
  const subtasksCount = getSubtasksCount(todo.id)
  if (subtasksCount > 0 && todo.status !== 2) {
    ElMessage.warning(t('todos.completeSubtasksFirst'))
    return
  }
  
  try {
    const db = await getDatabase()
    const newStatus = todo.status === 2 ? 0 : 2
    const now = new Date().toISOString()
    
    await db.execute(
      'UPDATE todos SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?',
      [newStatus, newStatus === 2 ? now : null, now, todo.id]
    )
    
    await loadTodos()
    ElMessage.success(newStatus === 2 ? t('todos.todoCompleted') : t('todos.todoRestored'))
  } catch (error) {
    ElMessage.error(t('common.updateFailed'))
  }
}

// 添加子任务
const addSubtask = (todo) => {
  parentTodo.value = todo
  subtaskForm.value = { title: '' }
  showSubtaskDialog.value = true
}

// 保存子任务
const saveSubtask = async () => {
  if (!subtaskForm.value.title) {
    ElMessage.warning(t('todos.subtaskTitleRequired'))
    return
  }

  try {
    const db = await getDatabase()
    const now = new Date().toISOString()

    await db.execute(
      'INSERT INTO todos (title, parent_id, status, progress, created_at, updated_at) VALUES (?, ?, 0, 0.0, ?, ?)',
      [subtaskForm.value.title, parentTodo.value.id, now, now]
    )

    showSubtaskDialog.value = false
    await loadTodos()
    // 展开父任务
    if (!expandedTodos.value.includes(parentTodo.value.id)) {
      expandedTodos.value.push(parentTodo.value.id)
    }
    ElMessage.success(t('todos.subtaskAddSuccess'))
  } catch (error) {
    ElMessage.error(t('common.saveFailed'))
  }
}

// 切换子任务状态
const toggleSubtask = async (subtask) => {
  try {
    const db = await getDatabase()
    const newStatus = subtask.status === 2 ? 0 : 2
    const now = new Date().toISOString()

    await db.execute(
      'UPDATE todos SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?',
      [newStatus, newStatus === 2 ? now : null, now, subtask.id]
    )

    await loadTodos()
    
    // 检查所有子任务是否完成，如果是则自动完成父任务
    if (subtask.parent_id) {
      const subtasks = getSubtasks(subtask.parent_id)
      const allCompleted = subtasks.every(st => st.status === 2)
      
      if (allCompleted && subtasks.length > 0) {
        await db.execute(
          'UPDATE todos SET status = 2, completed_at = ?, updated_at = ? WHERE id = ?',
          [now, now, subtask.parent_id]
        )
        await loadTodos()
        ElMessage.success(t('todos.allSubtasksCompleted'))
      }
    }
  } catch (error) {
    ElMessage.error(t('common.updateFailed'))
  }
}

// 编辑子任务
const editSubtask = (subtask) => {
  editingSubtask.value = subtask
  editSubtaskForm.value = { title: subtask.title }
  showEditSubtaskDialog.value = true
}

// 更新子任务
const updateSubtask = async () => {
  if (!editSubtaskForm.value.title) {
    ElMessage.warning(t('todos.subtaskTitleRequired'))
    return
  }

  try {
    const db = await getDatabase()
    const now = new Date().toISOString()

    await db.execute(
      'UPDATE todos SET title = ?, updated_at = ? WHERE id = ?',
      [editSubtaskForm.value.title, now, editingSubtask.value.id]
    )

    showEditSubtaskDialog.value = false
    await loadTodos()
    ElMessage.success(t('todos.subtaskUpdateSuccess'))
  } catch (error) {
    ElMessage.error(t('common.updateFailed'))
  }
}

// 删除子任务
const deleteSubtask = async (subtask) => {
  try {
    await ElMessageBox.confirm(t('todos.confirmDeleteSubtask'), t('common.confirmDelete'), {
      type: 'warning'
    })

    const db = await getDatabase()
    await db.execute('DELETE FROM todos WHERE id = ?', [subtask.id])

    await loadTodos()
    ElMessage.success(t('common.deleteSuccess'))
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('common.deleteFailed'))
    }
  }
}

// 删除待办
const deleteTodo = async (todo) => {
  try {
    await ElMessageBox.confirm(t('todos.confirmDeleteTodo'), t('common.confirmDelete'), {
      type: 'warning'
    })

    const db = await getDatabase()
    await db.execute('DELETE FROM todos WHERE id = ? OR parent_id = ?', [todo.id, todo.id])
    ElMessage.success(t('common.deleteSuccess'))
    await loadTodos()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('common.deleteFailed'))
    }
  }
}

// 显示添加分类对话框
const showAddCategoryDialog = () => {
  categoryForm.value = { name: '', icon: 'Folder' }
  showAddCategory.value = true
}

// 保存分类
const saveCategory = async () => {
  if (!categoryForm.value.name) {
    ElMessage.warning(t('todos.categoryNameRequired'))
    return
  }

  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    
    await db.execute(
      'INSERT INTO todo_categories (name, icon, created_at) VALUES (?, ?, ?)',
      [categoryForm.value.name, categoryForm.value.icon, now]
    )

    ElMessage.success(t('todos.categoryCreateSuccess'))
    showAddCategory.value = false
    await loadCategories()
  } catch (error) {
    ElMessage.error(t('common.saveFailed'))
  }
}

// 编辑分类
const editCategory = (category) => {
  editingCategory.value = category
  editCategoryForm.value = { 
    name: category.name,
    icon: category.icon || 'Folder'
  }
  showEditCategory.value = true
}

// 更新分类
const updateCategory = async () => {
  if (!editCategoryForm.value.name) {
    ElMessage.warning(t('todos.categoryNameRequired'))
    return
  }

  try {
    const db = await getDatabase()
    
    await db.execute(
      'UPDATE todo_categories SET name = ?, icon = ? WHERE id = ?',
      [editCategoryForm.value.name, editCategoryForm.value.icon, editingCategory.value.id]
    )

    ElMessage.success(t('todos.categoryUpdateSuccess'))
    showEditCategory.value = false
    await loadCategories()
  } catch (error) {
    ElMessage.error(t('common.updateFailed'))
  }
}

// 删除分类
const deleteCategory = async (category) => {
  try {
    await ElMessageBox.confirm(t('todos.confirmDeleteCategory'), t('common.confirmDelete'), {
      type: 'warning'
    })

    const db = await getDatabase()
    await db.execute('UPDATE todos SET category = NULL WHERE category = ?', [category.name])
    await db.execute('DELETE FROM todo_categories WHERE id = ?', [category.id])

    ElMessage.success(t('common.deleteSuccess'))
    await loadCategories()
    await loadTodos()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('common.deleteFailed'))
    }
  }
}

onMounted(async () => {
  await loadCategories()
  await loadTodos()
})
</script>

<style scoped>
.todos-page-wrapper {
  min-height: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--el-fill-color-light) 0%, var(--el-fill-color-light) 100%);
}

.header {
  min-height: 58px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 249, 252, 0.82));
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
  padding: 0 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  backdrop-filter: blur(18px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.sidebar-toggle-btn {
  border: 1px solid rgba(60, 40, 20, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(242, 246, 251, 0.92));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
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
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 600;
}

.breadcrumb-divider {
  color: var(--text-quaternary);
  font-weight: 400;
}

.header-actions {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.main-container {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  flex: 1;
  overflow: hidden;
  min-height: 0;
  padding: 5px 5px 0;
  gap: 0;
}

.main-container.sidebar-hidden {
  grid-template-columns: minmax(0, 1fr);
}

.sidebar-left {
  min-width: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 96%, var(--accent-warm-soft) 4%), var(--bg-secondary));
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-right: none;
  border-radius: 18px 0 0 18px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.sidebar-toolbar {
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-weight: 700;
  font-size: 11px;
  color: var(--text-quaternary);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.sidebar-btn {
  cursor: pointer;
  color: var(--accent-blue);
  font-size: var(--font-size-body);
  padding: 4px 6px;
  border-radius: 8px;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.sidebar-btn:hover {
  background: rgba(255, 255, 255, 0.72);
}

.category-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 9px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  margin-bottom: 4px;
  position: relative;
  border: 1px solid transparent;
}

.category-item:hover {
  background: rgba(255, 255, 255, 0.58);
}

.category-item.active {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(240, 245, 251, 0.95));
  color: var(--accent-blue);
  border-color: rgba(194, 65, 12, 0.15);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.82), 0 6px 14px rgba(60, 40, 20, 0.05);
}

.category-item.active .category-icon {
  color: var(--accent-blue);
}

.category-icon {
  font-size: 18px;
  margin-right: 10px;
  color: var(--text-tertiary);
}

.category-name {
  flex: 1;
  font-size: var(--font-size-body);
}

.category-count {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  min-width: 20px;
  text-align: right;
}

.category-actions {
  display: none;
  gap: var(--space-sm);
  margin-left: var(--space-sm);
}

.category-item:hover .category-actions {
  display: flex;
}

.action-icon {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  cursor: pointer;
  padding: var(--space-xs);
}

.action-icon:hover {
  color: var(--accent-blue);
}

.action-icon.del:hover {
  color: var(--color-red);
}

.category-divider {
  height: 1px;
  background: var(--divider);
  margin: var(--space-md) 0;
}

.content-area {
  flex: 1;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  background: linear-gradient(180deg, var(--bg-primary), color-mix(in srgb, var(--bg-primary) 92%, var(--bg-secondary) 8%));
  border: 1px solid rgba(60, 40, 20, 0.08);
  border-radius: 0 18px 18px 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
}

.main-container.sidebar-hidden .content-area {
  border-radius: 18px;
}

.todo-list {
  flex: 1;
  overflow-y: auto;
  max-width: 1200px;
  padding: 16px 20px 22px;
}

.todo-list :deep(.el-empty) {
  min-height: 320px;
  border: 1px dashed rgba(60, 40, 20, 0.08);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,0.8), rgba(248, 244, 232,0.92));
}

.todo-list::-webkit-scrollbar {
  width: 6px;
}

.todo-list::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.24);
  border-radius: 999px;
}

.todo-list::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.36);
}

.todo-list::-webkit-scrollbar-track {
  background: transparent;
}

.todo-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 18px;
  padding: 18px 20px;
  box-shadow: 0 10px 30px rgba(60, 40, 20, 0.05);
  transition: box-shadow var(--transition-smooth), transform var(--transition-fast);
  border: 1px solid rgba(60, 40, 20, 0.08);
}

.todo-card:hover {
  box-shadow: 0 14px 34px rgba(60, 40, 20, 0.08);
  transform: translateY(-1px);
}

.todo-card.completed {
  opacity: 0.7;
}

.card-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
}

.card-header-row {
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.card-title-section {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
}

.card-title {
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.card-title.completed {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

.card-actions {
  display: flex;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.card-info-row {
  flex-wrap: wrap;
  padding-top: var(--space-sm);
  border-top: 1px solid var(--divider);
  gap: var(--space-lg);
}

.info-item {
  display: flex;
  align-items: center;
  font-size: var(--font-size-footnote);
}

.info-item.full-width {
  width: 100%;
}

.info-label {
  color: var(--text-tertiary);
  margin-right: var(--space-xs);
}

.info-value {
  color: var(--text-secondary);
}

.info-value.overdue {
  color: var(--color-red);
  font-weight: var(--font-weight-medium);
}

.progress-bar-container {
  margin-top: var(--space-md);
}

.subtasks-container {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--divider);
}

.subtasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
}

.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  transition: background var(--transition-normal);
}

.subtask-item:hover {
  background: var(--accent-blue-bg);
}

.subtask-title {
  flex: 1;
  font-size: var(--font-size-body);
  color: var(--text-secondary);
}

.subtask-title.completed {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

.subtask-actions {
  display: flex;
  gap: var(--space-xs);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.subtask-item:hover .subtask-actions {
  opacity: 1;
}
</style>
