<template>
  <div class="todos-page-wrapper">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <!-- 折叠/展开侧边栏按钮 -->
        <el-button size="small" circle @click="hideSidebar = !hideSidebar" :title="hideSidebar ? '显示侧边栏' : '隐藏侧边栏'">
          <el-icon><ArrowLeft v-if="!hideSidebar" /><ArrowRight v-else /></el-icon>
        </el-button>
        <div class="breadcrumb">待办管理 / {{ currentCategoryName }}</div>
      </div>
      <div class="header-actions">
        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索待办..."
          clearable
          style="width: 250px;"
          size="small"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <!-- 操作按钮组 -->
        <el-button size="small" circle @click="showCreateDialog" title="添加待办" type="primary">
          <el-icon><Plus /></el-icon>
        </el-button>
      </div>
    </header>

    <div class="main-container">
      <!-- 左侧分类栏 -->
      <aside class="sidebar-left" v-show="!hideSidebar">
        <div class="sidebar-toolbar">
          <span class="sidebar-title">分类</span>
          <div class="actions">
            <span class="sidebar-btn" title="新建分类" @click="showAddCategoryDialog">
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
            <span class="category-name">全部待办</span>
            <span class="category-count">{{ todos.filter(t => !t.parent_id).length }}</span>
          </div>
          
          <!-- 今日待办 -->
          <div 
            class="category-item" 
            :class="{ active: selectedCategory === 'today' }"
            @click="selectCategory('today')"
          >
            <el-icon class="category-icon" style="color: #409eff;"><Calendar /></el-icon>
            <span class="category-name">今日</span>
            <span class="category-count">{{ getTodayCount() }}</span>
          </div>
          
          <!-- 重要待办 -->
          <div 
            class="category-item" 
            :class="{ active: selectedCategory === 'important' }"
            @click="selectCategory('important')"
          >
            <el-icon class="category-icon" style="color: #f56c6c;"><StarFilled /></el-icon>
            <span class="category-name">重要</span>
            <span class="category-count">{{ getImportantCount() }}</span>
          </div>
          
          <!-- 已完成 -->
          <div 
            class="category-item" 
            :class="{ active: selectedCategory === 'completed' }"
            @click="selectCategory('completed')"
          >
            <el-icon class="category-icon" style="color: #67c23a;"><CircleCheck /></el-icon>
            <span class="category-name">已完成</span>
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
              <i class="fa-solid fa-pen action-icon" @click.stop="editCategory(category)" title="编辑"></i>
              <i class="fa-solid fa-trash action-icon del" @click.stop="deleteCategory(category)" title="删除"></i>
            </div>
          </div>
        </div>
      </aside>

      <!-- 中间内容区域 -->
      <main class="content-area">
        <!-- 待办列表 -->
        <div class="todo-list" v-loading="loading">
          <el-empty v-if="filteredTodos.length === 0" description="暂无待办事项" />
          
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
                  <el-tag v-if="todo.priority === 2" type="danger" size="small">高优先级</el-tag>
                  <el-tag v-else-if="todo.priority === 1" type="warning" size="small">中优先级</el-tag>
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
                    title="子任务"
                  >
                    <el-icon><List /></el-icon>
                  </el-button>
                  <el-button 
                    text 
                    size="small"
                    @click="editTodo(todo)"
                    title="编辑"
                  >
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <el-button 
                    text 
                    size="small"
                    type="danger"
                    @click="deleteTodo(todo)"
                    title="删除"
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
                  <span class="info-label">备注：</span>
                  <span class="info-value">{{ todo.description }}</span>
                </div>
                
                <!-- 开始日期 -->
                <div class="info-item" v-if="todo.start_date">
                  <span class="info-label">开始：</span>
                  <span class="info-value">{{ formatDate(todo.start_date) }}</span>
                </div>
                
                <!-- 截止日期 -->
                <div class="info-item" v-if="todo.due_date">
                  <span class="info-label">截止：</span>
                  <span class="info-value" :class="{ 'overdue': isOverdue(todo.due_date) }">
                    {{ formatDate(todo.due_date) }}
                  </span>
                </div>
                
                <!-- 分类 -->
                <div class="info-item" v-if="todo.category">
                  <span class="info-label">分类：</span>
                  <span class="info-value">{{ todo.category }}</span>
                </div>
              </div>
              
              <!-- 子任务列表 -->
              <div v-if="expandedTodos.includes(todo.id)" class="subtasks-container">
                <div class="subtasks-header">
                  <span>子任务</span>
                  <el-button 
                    text 
                    size="small" 
                    type="primary"
                    @click="addSubtask(todo)"
                  >
                    <el-icon><Plus /></el-icon>
                    添加子任务
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
                        title="编辑"
                      >
                        <el-icon><Edit /></el-icon>
                      </el-button>
                      <el-button 
                        text 
                        size="small"
                        type="danger"
                        @click="deleteSubtask(subtask)"
                        title="删除"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                  </div>
                  
                  <el-empty 
                    v-if="getSubtasks(todo.id).length === 0" 
                    description="暂无子任务" 
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
      :title="editingTodo ? '编辑待办' : '新建待办'"
      width="600px"
    >
      <el-form :model="todoForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="todoForm.title" placeholder="待办标题" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="todoForm.description"
            type="textarea"
            :rows="3"
            placeholder="待办描述"
          />
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="todoForm.start_date"
            type="date"
            placeholder="选择开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="todoForm.due_date"
            type="date"
            placeholder="选择截止日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="todoForm.priority">
            <el-radio :value="0">低</el-radio>
            <el-radio :value="1">中</el-radio>
            <el-radio :value="2">高</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="todoForm.category" placeholder="选择分类" style="width: 100%;" clearable>
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.name"
            />
          </el-select>
        </el-form-item>
        
        <!-- 提醒设置 -->
        <el-form-item label="提醒">
          <el-switch v-model="todoForm.reminder_enabled" />
          <span style="margin-left: 10px; color: #909399; font-size: 12px;">
            启用后在设定时间提醒
          </span>
        </el-form-item>
        
        <template v-if="todoForm.reminder_enabled">
          <el-form-item label="提醒类型">
            <el-select v-model="todoForm.reminder_type" style="width: 100%;">
              <el-option label="开始日期提醒" value="on_start" />
              <el-option label="截止日期提醒" value="on_due" />
              <el-option label="截止前提醒" value="before_due" />
              <el-option label="过期提醒" value="overdue" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="提醒时间">
            <el-time-picker
              v-model="todoForm.reminder_time"
              format="HH:mm"
              value-format="HH:mm"
              placeholder="选择提醒时间"
              style="width: 100%;"
            />
            <div style="font-size: 12px; color: #909399; margin-top: 4px;">
              每天在此时间检查并提醒
            </div>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTodo">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加分类对话框 -->
    <el-dialog
      v-model="showAddCategory"
      title="新建分类"
      width="400px"
    >
      <el-form :model="categoryForm" label-width="80px">
        <el-form-item label="分类名称" required>
          <el-input v-model="categoryForm.name" placeholder="输入分类名称" />
        </el-form-item>
        
        <el-form-item label="图标">
          <el-select v-model="categoryForm.icon" placeholder="选择图标">
            <el-option value="Folder" label="文件夹">
              <el-icon style="color: #909399;"><Folder /></el-icon> 文件夹
            </el-option>
            <el-option value="CollectionTag" label="标签">
              <el-icon style="color: #409EFF;"><CollectionTag /></el-icon> 标签
            </el-option>
            <el-option value="Calendar" label="日历">
              <el-icon style="color: #67C23A;"><Calendar /></el-icon> 日历
            </el-option>
            <el-option value="Briefcase" label="工作">
              <el-icon style="color: #E6A23C;"><Briefcase /></el-icon> 工作
            </el-option>
            <el-option value="Reading" label="学习">
              <el-icon style="color: #8E44AD;"><Reading /></el-icon> 学习
            </el-option>
            <el-option value="ShoppingCart" label="购物">
              <el-icon style="color: #FF6B9D;"><ShoppingCart /></el-icon> 购物
            </el-option>
            <el-option value="House" label="家庭">
              <el-icon style="color: #3498DB;"><House /></el-icon> 家庭
            </el-option>
            <el-option value="User" label="个人">
              <el-icon style="color: #95A5A6;"><User /></el-icon> 个人
            </el-option>
            <el-option value="Football" label="运动">
              <el-icon style="color: #E74C3C;"><Football /></el-icon> 运动
            </el-option>
            <el-option value="Present" label="礼物">
              <el-icon style="color: #F39C12;"><Present /></el-icon> 礼物
            </el-option>
            <el-option value="Dish" label="饮食">
              <el-icon style="color: #E67E22;"><Dish /></el-icon> 饮食
            </el-option>
            <el-option value="Connection" label="社交">
              <el-icon style="color: #9B59B6;"><Connection /></el-icon> 社交
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddCategory = false">取消</el-button>
        <el-button type="primary" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>

    <!-- 编辑分类对话框 -->
    <el-dialog
      v-model="showEditCategory"
      title="编辑分类"
      width="400px"
    >
      <el-form :model="editCategoryForm" label-width="80px">
        <el-form-item label="分类名称" required>
          <el-input v-model="editCategoryForm.name" placeholder="输入分类名称" />
        </el-form-item>
        
        <el-form-item label="图标">
          <el-select v-model="editCategoryForm.icon" placeholder="选择图标">
            <el-option value="Folder" label="文件夹">
              <el-icon style="color: #909399;"><Folder /></el-icon> 文件夹
            </el-option>
            <el-option value="CollectionTag" label="标签">
              <el-icon style="color: #409EFF;"><CollectionTag /></el-icon> 标签
            </el-option>
            <el-option value="Calendar" label="日历">
              <el-icon style="color: #67C23A;"><Calendar /></el-icon> 日历
            </el-option>
            <el-option value="Briefcase" label="工作">
              <el-icon style="color: #E6A23C;"><Briefcase /></el-icon> 工作
            </el-option>
            <el-option value="Reading" label="学习">
              <el-icon style="color: #8E44AD;"><Reading /></el-icon> 学习
            </el-option>
            <el-option value="ShoppingCart" label="购物">
              <el-icon style="color: #FF6B9D;"><ShoppingCart /></el-icon> 购物
            </el-option>
            <el-option value="House" label="家庭">
              <el-icon style="color: #3498DB;"><House /></el-icon> 家庭
            </el-option>
            <el-option value="User" label="个人">
              <el-icon style="color: #95A5A6;"><User /></el-icon> 个人
            </el-option>
            <el-option value="Football" label="运动">
              <el-icon style="color: #E74C3C;"><Football /></el-icon> 运动
            </el-option>
            <el-option value="Present" label="礼物">
              <el-icon style="color: #F39C12;"><Present /></el-icon> 礼物
            </el-option>
            <el-option value="Dish" label="饮食">
              <el-icon style="color: #E67E22;"><Dish /></el-icon> 饮食
            </el-option>
            <el-option value="Connection" label="社交">
              <el-icon style="color: #9B59B6;"><Connection /></el-icon> 社交
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditCategory = false">取消</el-button>
        <el-button type="primary" @click="updateCategory">保存</el-button>
      </template>
    </el-dialog>
    
    <!-- 添加子任务对话框 -->
    <el-dialog
      v-model="showSubtaskDialog"
      title="添加子任务"
      width="500px"
    >
      <el-form :model="subtaskForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="subtaskForm.title" placeholder="子任务标题" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSubtaskDialog = false">取消</el-button>
        <el-button type="primary" @click="saveSubtask">保存</el-button>
      </template>
    </el-dialog>
    
    <!-- 编辑子任务对话框 -->
    <el-dialog
      v-model="showEditSubtaskDialog"
      title="编辑子任务"
      width="500px"
    >
      <el-form :model="editSubtaskForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="editSubtaskForm.title" placeholder="子任务标题" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditSubtaskDialog = false">取消</el-button>
        <el-button type="primary" @click="updateSubtask">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete, List, Calendar, StarFilled, CircleCheck, Folder, ArrowLeft, ArrowRight, CollectionTag, Briefcase, Reading, ShoppingCart, House, User, Football, Present, Dish, Connection } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
  if (selectedCategory.value === null) return '全部待办'
  if (selectedCategory.value === 'today') return '今日'
  if (selectedCategory.value === 'important') return '重要'
  if (selectedCategory.value === 'completed') return '已完成'
  const cat = categories.value.find(c => c.id === selectedCategory.value)
  return cat ? cat.name : '未知分类'
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
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
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
    'Folder': '#909399',
    'CollectionTag': '#409EFF',
    'Calendar': '#67C23A',
    'Briefcase': '#E6A23C',
    'Reading': '#8E44AD',
    'ShoppingCart': '#FF6B9D',
    'House': '#3498DB',
    'User': '#95A5A6',
    'Football': '#E74C3C',
    'Present': '#F39C12',
    'Dish': '#E67E22',
    'Connection': '#9B59B6'
  }
  return colorMap[iconName] || '#909399'
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
  const date = new Date(dateStr)
  const today = new Date()
  const diff = date - today
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '明天'
  if (days === -1) return '昨天'
  if (days < 0) return `过期${Math.abs(days)}天`
  if (days < 7) return `${days}天后`
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
    ElMessage.error('加载待办失败')
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
    ElMessage.warning('请填写标题')
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
      ElMessage.success('待办更新成功')
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
      ElMessage.success('待办创建成功')
    }

    dialogVisible.value = false
    await loadTodos()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 切换待办状态
const toggleTodo = async (todo) => {
  // 如果有子任务，不允许直接完成
  const subtasksCount = getSubtasksCount(todo.id)
  if (subtasksCount > 0 && todo.status !== 2) {
    ElMessage.warning('请先完成所有子任务')
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
    ElMessage.success(newStatus === 2 ? '待办已完成' : '待办已恢复')
  } catch (error) {
    ElMessage.error('更新失败')
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
    ElMessage.warning('请填写子任务标题')
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
    ElMessage.success('子任务添加成功')
  } catch (error) {
    ElMessage.error('保存失败')
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
        ElMessage.success('所有子任务已完成，待办已自动完成')
      }
    }
  } catch (error) {
    ElMessage.error('更新失败')
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
    ElMessage.warning('请填写子任务标题')
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
    ElMessage.success('子任务更新成功')
  } catch (error) {
    ElMessage.error('更新失败')
  }
}

// 删除子任务
const deleteSubtask = async (subtask) => {
  try {
    await ElMessageBox.confirm('确定要删除这个子任务吗？', '确认删除', {
      type: 'warning'
    })

    const db = await getDatabase()
    await db.execute('DELETE FROM todos WHERE id = ?', [subtask.id])

    await loadTodos()
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 删除待办
const deleteTodo = async (todo) => {
  try {
    await ElMessageBox.confirm('确定要删除这个待办吗？', '确认删除', {
      type: 'warning'
    })

    const db = await getDatabase()
    await db.execute('DELETE FROM todos WHERE id = ? OR parent_id = ?', [todo.id, todo.id])
    ElMessage.success('删除成功')
    await loadTodos()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
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
    ElMessage.warning('请填写分类名称')
    return
  }

  try {
    const db = await getDatabase()
    const now = new Date().toISOString()
    
    await db.execute(
      'INSERT INTO todo_categories (name, icon, created_at) VALUES (?, ?, ?)',
      [categoryForm.value.name, categoryForm.value.icon, now]
    )

    ElMessage.success('分类创建成功')
    showAddCategory.value = false
    await loadCategories()
  } catch (error) {
    ElMessage.error('保存失败')
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
    ElMessage.warning('请填写分类名称')
    return
  }

  try {
    const db = await getDatabase()
    
    await db.execute(
      'UPDATE todo_categories SET name = ?, icon = ? WHERE id = ?',
      [editCategoryForm.value.name, editCategoryForm.value.icon, editingCategory.value.id]
    )

    ElMessage.success('分类更新成功')
    showEditCategory.value = false
    await loadCategories()
  } catch (error) {
    ElMessage.error('更新失败')
  }
}

// 删除分类
const deleteCategory = async (category) => {
  try {
    await ElMessageBox.confirm('确定要删除这个分类吗？', '确认删除', {
      type: 'warning'
    })

    const db = await getDatabase()
    await db.execute('DELETE FROM todo_categories WHERE id = ?', [category.id])

    ElMessage.success('删除成功')
    await loadCategories()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(async () => {
  await loadCategories()
  await loadTodos()
})
</script>

<style scoped>
/* ignore */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

.todos-page-wrapper {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

/* ignore */
.header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.breadcrumb {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* ignore */
.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ignore */
.sidebar-left {
  width: 240px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-toolbar {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.sidebar-btn {
  cursor: pointer;
  color: #409eff;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
}

.sidebar-btn:hover {
  background: #f0f9ff;
}

.category-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
  position: relative;
}

.category-item:hover {
  background: #f5f7fa;
}

.category-item.active {
  background: #ecf5ff;
  color: #409eff;
}

.category-item.active .category-icon {
  color: #409eff;
}

.category-icon {
  font-size: 18px;
  margin-right: 10px;
  color: #909399;
}

.category-name {
  flex: 1;
  font-size: 14px;
}

.category-count {
  font-size: 12px;
  color: #909399;
  background: #f0f2f5;
  padding: 2px 8px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.category-actions {
  display: none;
  gap: 8px;
  margin-left: 8px;
}

.category-item:hover .category-actions {
  display: flex;
}

.action-icon {
  font-size: 12px;
  color: #909399;
  cursor: pointer;
  padding: 4px;
}

.action-icon:hover {
  color: #409eff;
}

.action-icon.del:hover {
  color: #f56c6c;
}

.category-divider {
  height: 1px;
  background: #e4e7ed;
  margin: 12px 0;
}

/* ignore */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.todo-list {
  max-width: 1200px;
}

.todo-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s;
  border: 1px solid #e4e7ed;
}

.todo-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.todo-card.completed {
  opacity: 0.7;
}

.card-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.card-header-row {
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.card-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin: 0;
  flex: 1;
}

.card-title.completed {
  text-decoration: line-through;
  color: #909399;
}

.card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.card-info-row {
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid #f0f2f5;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.info-item.full-width {
  width: 100%;
}

.info-label {
  color: #909399;
  margin-right: 4px;
}

.info-value {
  color: #606266;
}

.info-value.overdue {
  color: #f56c6c;
  font-weight: 500;
}

/* ignore */
.progress-bar-container {
  margin-top: 12px;
}

/* ignore */
.subtasks-container {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f2f5;
}

.subtasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
  color: #606266;
}

.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  transition: all 0.2s;
}

.subtask-item:hover {
  background: #ecf5ff;
}

.subtask-title {
  flex: 1;
  font-size: 14px;
  color: #606266;
}

.subtask-title.completed {
  text-decoration: line-through;
  color: #909399;
}

.subtask-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.subtask-item:hover .subtask-actions {
  opacity: 1;
}
</style>
