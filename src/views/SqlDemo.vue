<template>
  <div class="sql-demo-page">
    <TitleBar title="SQL 数据库 - Tauri 功能演示" />
    <div class="demo-view">
      <el-page-header @back="goBack">
        <template #content>
          <span class="page-title">🗄️ SQL 数据库</span>
        </template>
      </el-page-header>

      <div class="content-section">
        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">数据库信息</div>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="数据库类型">SQLite</el-descriptions-item>
            <el-descriptions-item label="数据库文件路径">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>{{ dbPath || '正在获取...' }}</span>
                <el-button
                  v-if="dbPath"
                  type="primary"
                  size="small"
                  text
                  @click="openDbDirectory"
                >
                  <el-icon><FolderOpened /></el-icon>
                  打开目录
                </el-button>
              </div>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">执行 SQL 语句</div>
          </template>
          <el-form :model="sqlForm" label-width="100px">
            <el-form-item label="SQL 语句">
              <el-input
                v-model="sqlForm.sql"
                type="textarea"
                :rows="6"
                placeholder="输入 SQL 语句，例如：CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="executeSql" :loading="loading">
                <el-icon><Document /></el-icon>
                执行 SQL
              </el-button>
              <el-button @click="initDatabase">初始化数据库</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="hover" class="demo-card" v-if="queryResult.length > 0">
          <template #header>
            <div class="card-header">查询结果</div>
          </template>
          <el-table :data="queryResult" border style="width: 100%">
            <el-table-column
              v-for="(value, key) in queryResult[0]"
              :key="key"
              :prop="key"
              :label="key"
            />
          </el-table>
        </el-card>

        <el-card shadow="hover" class="demo-card">
          <template #header>
            <div class="card-header">快速操作</div>
          </template>
          <el-space wrap direction="vertical" style="width: 100%">
            <el-button @click="quickSql('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);')">
              创建用户表
            </el-button>
            <el-button @click="insertSampleData">
              插入示例数据
            </el-button>
            <el-button @click="quickSql('SELECT * FROM users;')">
              查询所有用户
            </el-button>
            <el-button @click="quickSql('DROP TABLE IF EXISTS users;')">
              删除用户表
            </el-button>
          </el-space>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document, FolderOpened } from '@element-plus/icons-vue'
import TitleBar from '@/components/TitleBar.vue'
import { TauriSql } from '@/utils/tauri'
import { appDataDir, join } from '@tauri-apps/api/path'
import { openPath } from '@tauri-apps/plugin-opener'

const router = useRouter()
const loading = ref(false)
const sqlForm = ref({
  sql: ''
})
const queryResult = ref([])
const dbPath = ref('')

const executeSql = async () => {
  if (!sqlForm.value.sql.trim()) {
    ElMessage.warning('请输入 SQL 语句')
    return
  }

  loading.value = true
  try {
    const sql = sqlForm.value.sql.trim()
    if (sql.toUpperCase().startsWith('SELECT')) {
      const result = await TauriSql.query(sql)
      queryResult.value = result
      ElMessage.success(`查询成功，返回 ${result.length} 条记录`)
    } else {
      await TauriSql.execute(sql)
      queryResult.value = []
      ElMessage.success('执行成功')
    }
  } catch (error) {
    const errorMessage = error?.message || String(error) || '未知错误'
    ElMessage.error('执行失败: ' + errorMessage)
    queryResult.value = []
  } finally {
    loading.value = false
  }
}

const quickSql = async (sql, bindValues = []) => {
  sqlForm.value.sql = sql
  loading.value = true
  try {
    if (sql.toUpperCase().startsWith('SELECT')) {
      const result = await TauriSql.query(sql, bindValues)
      queryResult.value = result
      ElMessage.success(`查询成功，返回 ${result.length} 条记录`)
    } else {
      await TauriSql.execute(sql, bindValues)
      queryResult.value = []
      ElMessage.success('执行成功')
    }
  } catch (error) {
    const errorMessage = error?.message || String(error) || '未知错误'
    ElMessage.error('执行失败: ' + errorMessage)
    queryResult.value = []
  } finally {
    loading.value = false
  }
}

const insertSampleData = async () => {
  const sampleData = [
    ['Alice', 'alice@example.com'],
    ['Bob', 'bob@example.com'],
    ['Charlie', 'charlie@example.com']
  ]
  
  loading.value = true
  try {
    // 先确保表存在
    await TauriSql.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // 插入示例数据
    for (const [name, email] of sampleData) {
      await TauriSql.execute('INSERT INTO users (name, email) VALUES (?, ?);', [name, email])
    }
    ElMessage.success('示例数据插入成功')
    // 自动查询显示结果
    const result = await TauriSql.query('SELECT * FROM users;')
    queryResult.value = result
  } catch (error) {
    const errorMessage = error?.message || String(error) || '未知错误'
    ElMessage.error('插入失败: ' + errorMessage)
    // 如果表不存在，提示先创建表
    if (errorMessage.includes && errorMessage.includes('no such table')) {
      ElMessage.warning('请先创建用户表')
    }
  } finally {
    loading.value = false
  }
}

const initDatabase = async () => {
  loading.value = true
  try {
    await TauriSql.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)
    ElMessage.success('数据库初始化成功')
    // 初始化后自动查询表结构
    try {
      const result = await TauriSql.query('SELECT * FROM users;')
      queryResult.value = result
      if (result.length > 0) {
        ElMessage.info(`表中已有 ${result.length} 条记录`)
      }
    } catch (queryError) {
      // 查询失败不影响，可能是表刚创建还没有数据
      queryResult.value = []
    }
  } catch (error) {
    const errorMessage = error?.message || String(error) || '未知错误'
    ElMessage.error('初始化失败: ' + errorMessage)
  } finally {
    loading.value = false
  }
}

const loadDbPath = async () => {
  try {
    const dataDir = await appDataDir()
    const path = await join(dataDir, 'app.db')
    dbPath.value = path
  } catch (error) {
    dbPath.value = '无法获取路径'
  }
}

const openDbDirectory = async () => {
  try {
    const dataDir = await appDataDir()
    await openPath(dataDir)
  } catch (error) {
    ElMessage.error('打开目录失败: ' + error.message)
  }
}

onMounted(() => {
  loadDbPath()
})

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.sql-demo-page {
  width: 100%;
  height: 100vh;
  overflow: auto;
  background: #f5f7fa;
}

.demo-view {
  padding: 24px;
  padding-top: 56px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
}

.content-section {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.demo-card {
  width: 100%;
}

.card-header {
  font-weight: 600;
  font-size: 1.1rem;
}
</style>

