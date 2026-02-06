<template>
  <DocPage
    icon="🗄️"
    title="SQL 数据库"
    description="通过 @tauri-apps/plugin-sql 与 SQLite 数据库进行交互。支持所有 SQL 操作类型，包括 DDL（数据定义语言）、DML（数据操作语言）、DQL（数据查询语言）等。"
    :api="apiData"
    :methods="methodsData"
  >
    <template #basic>
      <CodeExample
        title="数据库连接"
        :code="connectCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="数据库类型">SQLite</el-descriptions-item>
              <el-descriptions-item label="数据库路径">sqlite:app.db</el-descriptions-item>
              <el-descriptions-item label="连接状态">
                <el-tag :type="dbConnected ? 'success' : 'info'">
                  {{ dbConnected ? '已连接' : '未连接' }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
            <el-button 
              type="primary" 
              @click="connectDatabase" 
              :loading="connecting"
              style="margin-top: 16px;"
            >
              <el-icon><Connection /></el-icon>
              连接数据库
            </el-button>
          </el-card>
        </template>
      </CodeExample>
    </template>

    <template #examples>
      <!-- DDL: CREATE TABLE -->
      <CodeExample
        title="DDL - 创建表 (CREATE TABLE)"
        :code="createTableCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="createTableForm" label-width="120px">
              <el-form-item label="表名">
                <el-input v-model="createTableForm.tableName" placeholder="例如: users" />
              </el-form-item>
              <el-form-item label="SQL 语句">
                <el-input
                  v-model="createTableForm.sql"
                  type="textarea"
                  :rows="8"
                  placeholder="CREATE TABLE IF NOT EXISTS users (&#10;  id INTEGER PRIMARY KEY AUTOINCREMENT,&#10;  name TEXT NOT NULL,&#10;  email TEXT UNIQUE,&#10;  age INTEGER,&#10;  created_at DATETIME DEFAULT CURRENT_TIMESTAMP&#10;);"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="executeCreateTable" :loading="loading">
                  <el-icon><Document /></el-icon>
                  执行创建表
                </el-button>
                <el-button @click="fillCreateTableExample">填充示例</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>

      <!-- DML: INSERT -->
      <CodeExample
        title="DML - 插入数据 (INSERT)"
        :code="insertCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="insertForm" label-width="120px">
              <el-form-item label="表名">
                <el-input v-model="insertForm.tableName" placeholder="例如: users" />
              </el-form-item>
              <el-form-item label="SQL 语句">
                <el-input
                  v-model="insertForm.sql"
                  type="textarea"
                  :rows="4"
                  placeholder="INSERT INTO users (name, email, age) VALUES (?, ?, ?);"
                />
              </el-form-item>
              <el-form-item label="参数值">
                <el-input
                  v-model="insertForm.params"
                  placeholder='例如: ["张三", "zhangsan@example.com", 25]'
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="executeInsert" :loading="loading">
                  <el-icon><Plus /></el-icon>
                  执行插入
                </el-button>
                <el-button @click="fillInsertExample">填充示例</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>

      <!-- DQL: SELECT -->
      <CodeExample
        title="DQL - 查询数据 (SELECT)"
        :code="selectCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="selectForm" label-width="120px">
              <el-form-item label="SQL 语句">
                <el-input
                  v-model="selectForm.sql"
                  type="textarea"
                  :rows="4"
                  placeholder="SELECT * FROM users WHERE age > ?;"
                />
              </el-form-item>
              <el-form-item label="参数值">
                <el-input
                  v-model="selectForm.params"
                  placeholder='例如: [18]'
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="executeSelect" :loading="loading">
                  <el-icon><Search /></el-icon>
                  执行查询
                </el-button>
                <el-button @click="fillSelectExample">填充示例</el-button>
              </el-form-item>
            </el-form>
            <el-table 
              v-if="selectResult.length > 0" 
              :data="selectResult" 
              border 
              style="margin-top: 16px;"
              max-height="300"
            >
              <el-table-column
                v-for="(column, index) in selectTableColumns"
                :key="index"
                :prop="column"
                :label="column"
                min-width="120"
              />
            </el-table>
            <el-empty v-else-if="selectExecuted && selectResult.length === 0" description="查询结果为空" />
          </el-card>
        </template>
      </CodeExample>

      <!-- DML: UPDATE -->
      <CodeExample
        title="DML - 更新数据 (UPDATE)"
        :code="updateCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="updateForm" label-width="120px">
              <el-form-item label="SQL 语句">
                <el-input
                  v-model="updateForm.sql"
                  type="textarea"
                  :rows="4"
                  placeholder="UPDATE users SET email = ?, age = ? WHERE id = ?;"
                />
              </el-form-item>
              <el-form-item label="参数值">
                <el-input
                  v-model="updateForm.params"
                  placeholder='例如: ["newemail@example.com", 30, 1]'
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="executeUpdate" :loading="loading">
                  <el-icon><Edit /></el-icon>
                  执行更新
                </el-button>
                <el-button @click="fillUpdateExample">填充示例</el-button>
              </el-form-item>
            </el-form>
            <el-alert
              v-if="updateResult.rowsAffected !== undefined"
              :title="`更新成功，影响行数: ${updateResult.rowsAffected}`"
              type="success"
              style="margin-top: 16px;"
            />
          </el-card>
        </template>
      </CodeExample>

      <!-- DML: DELETE -->
      <CodeExample
        title="DML - 删除数据 (DELETE)"
        :code="deleteCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="deleteForm" label-width="120px">
              <el-form-item label="SQL 语句">
                <el-input
                  v-model="deleteForm.sql"
                  type="textarea"
                  :rows="4"
                  placeholder="DELETE FROM users WHERE id = ?;"
                />
              </el-form-item>
              <el-form-item label="参数值">
                <el-input
                  v-model="deleteForm.params"
                  placeholder='例如: [1]'
                />
              </el-form-item>
              <el-form-item>
                <el-button type="danger" @click="executeDelete" :loading="loading">
                  <el-icon><Delete /></el-icon>
                  执行删除
                </el-button>
                <el-button @click="fillDeleteExample">填充示例</el-button>
              </el-form-item>
            </el-form>
            <el-alert
              v-if="deleteResult.rowsAffected !== undefined"
              :title="`删除成功，影响行数: ${deleteResult.rowsAffected}`"
              type="success"
              style="margin-top: 16px;"
            />
          </el-card>
        </template>
      </CodeExample>

      <!-- DDL: ALTER TABLE -->
      <CodeExample
        title="DDL - 修改表结构 (ALTER TABLE)"
        :code="alterTableCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="alterTableForm" label-width="120px">
              <el-form-item label="SQL 语句">
                <el-input
                  v-model="alterTableForm.sql"
                  type="textarea"
                  :rows="4"
                  placeholder="ALTER TABLE users ADD COLUMN phone TEXT;"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="executeAlterTable" :loading="loading">
                  <el-icon><Edit /></el-icon>
                  执行修改
                </el-button>
                <el-button @click="fillAlterTableExample">填充示例</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>

      <!-- DDL: DROP TABLE -->
      <CodeExample
        title="DDL - 删除表 (DROP TABLE)"
        :code="dropTableCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="dropTableForm" label-width="120px">
              <el-form-item label="SQL 语句">
                <el-input
                  v-model="dropTableForm.sql"
                  type="textarea"
                  :rows="3"
                  placeholder="DROP TABLE IF EXISTS users;"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="danger" @click="executeDropTable" :loading="loading">
                  <el-icon><Delete /></el-icon>
                  执行删除表
                </el-button>
                <el-button @click="fillDropTableExample">填充示例</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>

      <!-- 索引操作 -->
      <CodeExample
        title="索引操作 (CREATE INDEX / DROP INDEX)"
        :code="indexCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="indexForm" label-width="120px">
              <el-form-item label="SQL 语句">
                <el-input
                  v-model="indexForm.sql"
                  type="textarea"
                  :rows="4"
                  placeholder="CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="executeIndex" :loading="loading">
                  <el-icon><Document /></el-icon>
                  执行索引操作
                </el-button>
                <el-button @click="fillIndexExample">填充示例</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>

      <!-- 事务操作 -->
      <CodeExample
        title="事务操作 (TRANSACTION)"
        :code="transactionCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="transactionForm" label-width="120px">
              <el-form-item label="事务 SQL">
                <el-input
                  v-model="transactionForm.sql"
                  type="textarea"
                  :rows="8"
                  placeholder="BEGIN TRANSACTION;&#10;INSERT INTO users (name, email) VALUES ('用户1', 'user1@example.com');&#10;INSERT INTO users (name, email) VALUES ('用户2', 'user2@example.com');&#10;COMMIT;"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="executeTransaction" :loading="loading">
                  <el-icon><Document /></el-icon>
                  执行事务
                </el-button>
                <el-button @click="fillTransactionExample">填充示例</el-button>
                <el-button @click="fillRollbackExample">回滚示例</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </CodeExample>

      <!-- 自定义 SQL 执行 -->
      <CodeExample
        title="自定义 SQL 执行"
        :code="customSqlCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-form :model="customSqlForm" label-width="120px">
              <el-form-item label="SQL 语句">
                <el-input
                  v-model="customSqlForm.sql"
                  type="textarea"
                  :rows="6"
                  placeholder="输入任意 SQL 语句..."
                />
              </el-form-item>
              <el-form-item label="参数值（可选）">
                <el-input
                  v-model="customSqlForm.params"
                  placeholder='例如: ["value1", 123]'
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="executeCustomSql" :loading="loading">
                  <el-icon><Document /></el-icon>
                  执行 SQL
                </el-button>
                <el-button @click="clearCustomSql">清空</el-button>
              </el-form-item>
            </el-form>
            <el-table 
              v-if="customSqlResult.length > 0" 
              :data="customSqlResult" 
              border 
              style="margin-top: 16px;"
              max-height="300"
            >
              <el-table-column
                v-for="(column, index) in customSqlTableColumns"
                :key="index"
                :prop="column"
                :label="column"
                min-width="120"
              />
            </el-table>
            <el-alert
              v-if="customSqlExecuted && customSqlResult.length === 0 && customSqlMessage"
              :title="customSqlMessage"
              type="success"
              style="margin-top: 16px;"
            />
          </el-card>
        </template>
      </CodeExample>
    </template>
  </DocPage>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Connection, Plus, Search, Edit, Delete } from '@element-plus/icons-vue'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriSql } from '@/utils/tauri'

// API 数据
const apiData = [
  {
    name: 'getDatabase',
    description: '获取数据库实例，如果不存在则创建新连接',
    params: [
      { name: 'path', type: 'string', default: "'sqlite:app.db'", description: '数据库路径，格式为 sqlite:filename.db' }
    ],
    returns: 'Promise<Database>',
    example: "const db = await TauriSql.getDatabase('sqlite:app.db')"
  },
  {
    name: 'query',
    description: '执行 SQL 查询语句，返回查询结果数组',
    params: [
      { name: 'sql', type: 'string', description: 'SQL 查询语句' },
      { name: 'bindValues', type: 'Array', default: '[]', description: '参数绑定值数组' }
    ],
    returns: 'Promise<Array<Object>>',
    example: "const users = await TauriSql.query('SELECT * FROM users WHERE age > ?', [18])"
  },
  {
    name: 'execute',
    description: '执行 SQL 更新语句（INSERT, UPDATE, DELETE, CREATE, DROP 等），返回执行结果',
    params: [
      { name: 'sql', type: 'string', description: 'SQL 执行语句' },
      { name: 'bindValues', type: 'Array', default: '[]', description: '参数绑定值数组' }
    ],
    returns: 'Promise<Object>',
    example: "const result = await TauriSql.execute('INSERT INTO users (name) VALUES (?)', ['John'])"
  }
]

const methodsData = [
  {
    name: 'query',
    description: '执行 SELECT 查询，返回结果数组',
    usage: "await TauriSql.query('SELECT * FROM users')"
  },
  {
    name: 'execute',
    description: '执行 INSERT, UPDATE, DELETE, CREATE, DROP 等语句',
    usage: "await TauriSql.execute('INSERT INTO users (name) VALUES (?)', ['John'])"
  }
]

// 状态
const loading = ref(false)
const connecting = ref(false)
const dbConnected = ref(false)

// 表单数据
const createTableForm = ref({
  tableName: '',
  sql: ''
})

const insertForm = ref({
  tableName: '',
  sql: '',
  params: ''
})

const selectForm = ref({
  sql: '',
  params: ''
})

const updateForm = ref({
  sql: '',
  params: ''
})

const deleteForm = ref({
  sql: '',
  params: ''
})

const alterTableForm = ref({
  sql: ''
})

const dropTableForm = ref({
  sql: ''
})

const indexForm = ref({
  sql: ''
})

const transactionForm = ref({
  sql: ''
})

const customSqlForm = ref({
  sql: '',
  params: ''
})

// 结果数据
const selectResult = ref([])
const selectExecuted = ref(false)
const updateResult = ref({})
const deleteResult = ref({})
const customSqlResult = ref([])
const customSqlExecuted = ref(false)
const customSqlMessage = ref('')

// 计算属性
const selectTableColumns = computed(() => {
  if (selectResult.value.length === 0) return []
  return Object.keys(selectResult.value[0])
})

const customSqlTableColumns = computed(() => {
  if (customSqlResult.value.length === 0) return []
  return Object.keys(customSqlResult.value[0])
})

// 代码示例
const connectCode = `import { TauriSql } from '@/utils/tauri'

// 连接数据库（首次调用时自动连接）
const db = await TauriSql.getDatabase('sqlite:app.db')`

const createTableCode = `import { TauriSql } from '@/utils/tauri'

// 创建表
await TauriSql.execute(\`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    age INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
\`)`

const insertCode = `import { TauriSql } from '@/utils/tauri'

// 插入数据（使用参数绑定）
await TauriSql.execute(
  'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
  ['张三', 'zhangsan@example.com', 25]
)

// 插入多条数据
await TauriSql.execute(
  'INSERT INTO users (name, email) VALUES (?, ?)',
  ['李四', 'lisi@example.com']
)`

const selectCode = `import { TauriSql } from '@/utils/tauri'

// 查询所有数据
const allUsers = await TauriSql.query('SELECT * FROM users')

// 条件查询（使用参数绑定）
const adults = await TauriSql.query(
  'SELECT * FROM users WHERE age > ?',
  [18]
)

// 复杂查询
const result = await TauriSql.query(
  'SELECT name, email FROM users WHERE age BETWEEN ? AND ? ORDER BY created_at DESC',
  [18, 65]
)`

const updateCode = `import { TauriSql } from '@/utils/tauri'

// 更新数据
const result = await TauriSql.execute(
  'UPDATE users SET email = ?, age = ? WHERE id = ?',
  ['newemail@example.com', 30, 1]
)
// 重命名列（SQLite 3.25.0+）
await TauriSql.execute('ALTER TABLE users RENAME COLUMN old_name TO new_name')`

const dropTableCode = `import { TauriSql } from '@/utils/tauri'

// 删除表
await TauriSql.execute('DROP TABLE IF EXISTS users')`

const indexCode = `import { TauriSql } from '@/utils/tauri'

// 创建索引
await TauriSql.execute(
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
)

// 删除索引
await TauriSql.execute('DROP INDEX IF EXISTS idx_users_email')`

const transactionCode = `import { TauriSql } from '@/utils/tauri'

// 执行事务（多条 SQL 语句）
await TauriSql.execute(\`
  BEGIN TRANSACTION;
  INSERT INTO users (name, email) VALUES ('用户1', 'user1@example.com');
  INSERT INTO users (name, email) VALUES ('用户2', 'user2@example.com');
  COMMIT;
\`)

// 回滚事务
await TauriSql.execute(\`
  BEGIN TRANSACTION;
  INSERT INTO users (name, email) VALUES ('用户3', 'user3@example.com');
  ROLLBACK;
\`)`

const customSqlCode = `import { TauriSql } from '@/utils/tauri'

// 执行任意 SQL 语句
// 查询语句使用 query
const result = await TauriSql.query('SELECT * FROM users')

// 更新语句使用 execute
await TauriSql.execute('INSERT INTO users (name) VALUES (?)', ['John'])`

// 方法实现
const connectDatabase = async () => {
  connecting.value = true
  try {
    await TauriSql.getDatabase()
    dbConnected.value = true
    ElMessage.success('数据库连接成功')
  } catch (error) {
    ElMessage.error('连接失败: ' + (error.message || String(error)))
  } finally {
    connecting.value = false
  }
}

const parseParams = (paramsStr) => {
  if (!paramsStr || !paramsStr.trim()) return []
  try {
    return JSON.parse(paramsStr)
  } catch {
    ElMessage.warning('参数格式错误，应为 JSON 数组格式，例如: ["value1", 123]')
    return []
  }
}

const executeCreateTable = async () => {
  if (!createTableForm.value.sql.trim()) {
    ElMessage.warning('请输入 SQL 语句')
    return
  }
  loading.value = true
  try {
    await TauriSql.execute(createTableForm.value.sql)
    ElMessage.success('表创建成功')
    dbConnected.value = true
  } catch (error) {
    ElMessage.error('创建失败: ' + (error.message || String(error)))
  } finally {
    loading.value = false
  }
}

const fillCreateTableExample = () => {
  createTableForm.value.tableName = 'users'
  createTableForm.value.sql = `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  age INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`
}

const executeInsert = async () => {
  if (!insertForm.value.sql.trim()) {
    ElMessage.warning('请输入 SQL 语句')
    return
  }
  loading.value = true
  try {
    const params = parseParams(insertForm.value.params)
    const result = await TauriSql.execute(insertForm.value.sql, params)
    ElMessage.success(`插入成功，影响行数: ${result.rowsAffected || 1}`)
    dbConnected.value = true
  } catch (error) {
    ElMessage.error('插入失败: ' + (error.message || String(error)))
  } finally {
    loading.value = false
  }
}

const fillInsertExample = () => {
  insertForm.value.tableName = 'users'
  insertForm.value.sql = 'INSERT INTO users (name, email, age) VALUES (?, ?, ?);'
  insertForm.value.params = '["张三", "zhangsan@example.com", 25]'
}

const executeSelect = async () => {
  if (!selectForm.value.sql.trim()) {
    ElMessage.warning('请输入 SQL 语句')
    return
  }
  loading.value = true
  selectExecuted.value = false
  try {
    const params = parseParams(selectForm.value.params)
    const result = await TauriSql.query(selectForm.value.sql, params)
    selectResult.value = result
    selectExecuted.value = true
    ElMessage.success(`查询成功，返回 ${result.length} 条记录`)
    dbConnected.value = true
  } catch (error) {
    ElMessage.error('查询失败: ' + (error.message || String(error)))
    selectResult.value = []
    selectExecuted.value = true
  } finally {
    loading.value = false
  }
}

const fillSelectExample = () => {
  selectForm.value.sql = 'SELECT * FROM users WHERE age > ?;'
  selectForm.value.params = '[18]'
}

const executeUpdate = async () => {
  if (!updateForm.value.sql.trim()) {
    ElMessage.warning('请输入 SQL 语句')
    return
  }
  loading.value = true
  try {
    const params = parseParams(updateForm.value.params)
    const result = await TauriSql.execute(updateForm.value.sql, params)
    updateResult.value = result
    ElMessage.success(`更新成功，影响行数: ${result.rowsAffected || 0}`)
    dbConnected.value = true
  } catch (error) {
    ElMessage.error('更新失败: ' + (error.message || String(error)))
  } finally {
    loading.value = false
  }
}

const fillUpdateExample = () => {
  updateForm.value.sql = 'UPDATE users SET email = ?, age = ? WHERE id = ?;'
  updateForm.value.params = '["newemail@example.com", 30, 1]'
}

const executeDelete = async () => {
  if (!deleteForm.value.sql.trim()) {
    ElMessage.warning('请输入 SQL 语句')
    return
  }
  loading.value = true
  try {
    const params = parseParams(deleteForm.value.params)
    const result = await TauriSql.execute(deleteForm.value.sql, params)
    deleteResult.value = result
    ElMessage.success(`删除成功，影响行数: ${result.rowsAffected || 0}`)
    dbConnected.value = true
  } catch (error) {
    ElMessage.error('删除失败: ' + (error.message || String(error)))
  } finally {
    loading.value = false
  }
}

const fillDeleteExample = () => {
  deleteForm.value.sql = 'DELETE FROM users WHERE id = ?;'
  deleteForm.value.params = '[1]'
}

const executeAlterTable = async () => {
  if (!alterTableForm.value.sql.trim()) {
    ElMessage.warning('请输入 SQL 语句')
    return
  }
  loading.value = true
  try {
    await TauriSql.execute(alterTableForm.value.sql)
    ElMessage.success('表结构修改成功')
    dbConnected.value = true
  } catch (error) {
    ElMessage.error('修改失败: ' + (error.message || String(error)))
  } finally {
    loading.value = false
  }
}

const fillAlterTableExample = () => {
  alterTableForm.value.sql = 'ALTER TABLE users ADD COLUMN phone TEXT;'
}

const executeDropTable = async () => {
  if (!dropTableForm.value.sql.trim()) {
    ElMessage.warning('请输入 SQL 语句')
    return
  }
  loading.value = true
  try {
    await TauriSql.execute(dropTableForm.value.sql)
    ElMessage.success('表删除成功')
    dbConnected.value = true
  } catch (error) {
    ElMessage.error('删除失败: ' + (error.message || String(error)))
  } finally {
    loading.value = false
  }
}

const fillDropTableExample = () => {
  dropTableForm.value.sql = 'DROP TABLE IF EXISTS users;'
}

const executeIndex = async () => {
  if (!indexForm.value.sql.trim()) {
    ElMessage.warning('请输入 SQL 语句')
    return
  }
  loading.value = true
  try {
    await TauriSql.execute(indexForm.value.sql)
    ElMessage.success('索引操作成功')
    dbConnected.value = true
  } catch (error) {
    ElMessage.error('操作失败: ' + (error.message || String(error)))
  } finally {
    loading.value = false
  }
}

const fillIndexExample = () => {
  indexForm.value.sql = 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);'
}

const executeTransaction = async () => {
  if (!transactionForm.value.sql.trim()) {
    ElMessage.warning('请输入 SQL 语句')
    return
  }
  loading.value = true
  try {
    // 将事务 SQL 按分号分割，逐条执行
    const statements = transactionForm.value.sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    for (const statement of statements) {
      if (statement.toUpperCase().startsWith('SELECT')) {
        await TauriSql.query(statement)
      } else {
        await TauriSql.execute(statement)
      }
    }
    
    ElMessage.success('事务执行成功')
    dbConnected.value = true
  } catch (error) {
    ElMessage.error('事务执行失败: ' + (error.message || String(error)))
  } finally {
    loading.value = false
  }
}

const fillTransactionExample = () => {
  transactionForm.value.sql = `BEGIN TRANSACTION;
INSERT INTO users (name, email) VALUES ('用户1', 'user1@example.com');
INSERT INTO users (name, email) VALUES ('用户2', 'user2@example.com');
COMMIT;`
}

const fillRollbackExample = () => {
  transactionForm.value.sql = `BEGIN TRANSACTION;
INSERT INTO users (name, email) VALUES ('用户3', 'user3@example.com');
ROLLBACK;`
}

const executeCustomSql = async () => {
  if (!customSqlForm.value.sql.trim()) {
    ElMessage.warning('请输入 SQL 语句')
    return
  }
  loading.value = true
  customSqlExecuted.value = false
  customSqlMessage.value = ''
  try {
    const params = parseParams(customSqlForm.value.params)
    const sql = customSqlForm.value.sql.trim().toUpperCase()
    
    if (sql.startsWith('SELECT')) {
      const result = await TauriSql.query(customSqlForm.value.sql, params)
      customSqlResult.value = result
      customSqlMessage.value = `查询成功，返回 ${result.length} 条记录`
    } else {
      const result = await TauriSql.execute(customSqlForm.value.sql, params)
      customSqlResult.value = []
      customSqlMessage.value = `执行成功，影响行数: ${result.rowsAffected || 0}`
    }
    customSqlExecuted.value = true
    ElMessage.success(customSqlMessage.value)
    dbConnected.value = true
  } catch (error) {
    ElMessage.error('执行失败: ' + (error.message || String(error)))
    customSqlResult.value = []
    customSqlExecuted.value = true
  } finally {
    loading.value = false
  }
}

const clearCustomSql = () => {
  customSqlForm.value.sql = ''
  customSqlForm.value.params = ''
  customSqlResult.value = []
  customSqlExecuted.value = false
  customSqlMessage.value = ''
}

// 初始化时尝试连接数据库
connectDatabase()
</script>
