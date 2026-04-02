# SQLite 数据库管理工具方案

## 概述

开发一个轻量级 SQLite 数据库管理工具，类似 Navicat / DB Browser for SQLite，支持打开本地 `.db`/`.sqlite` 文件，可视化浏览表结构、编辑数据、执行 SQL。

**对标工具**：DB Browser for SQLite、Navicat（SQLite 部分）、DBeaver

**核心定位**：日常开发中快速查看/修改 SQLite 数据库，不追求完整 DBA 功能，聚焦高频操作。

---

## 技术方案

### 架构

```
┌──────────────────────────────────────────────────┐
│                  Vue 3 前端                       │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ 连接管理  │  │  表数据浏览   │  │  SQL 编辑器 │  │
│  │ (左侧栏)  │  │  (中间主区)   │  │  (底部面板) │  │
│  └─────┬────┘  └──────┬───────┘  └─────┬──────┘  │
│        │              │                │          │
│        └──────────────┼────────────────┘          │
│                       │ invoke()                  │
├───────────────────────┼──────────────────────────┤
│                  Tauri IPC                        │
├───────────────────────┼──────────────────────────┤
│                       │                           │
│              Rust (rusqlite)                       │
│  ┌──────────────────────────────────────────┐     │
│  │  连接池: HashMap<String, Connection>     │     │
│  │  ├ sqlite_open(path) → conn_id          │     │
│  │  ├ sqlite_query(conn_id, sql) → rows    │     │
│  │  ├ sqlite_execute(conn_id, sql) → count │     │
│  │  ├ sqlite_tables(conn_id) → [table]     │     │
│  │  ├ sqlite_table_info(conn_id, t) → cols │     │
│  │  ├ sqlite_export(conn_id, t, fmt)       │     │
│  │  └ sqlite_close(conn_id)               │     │
│  └──────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
```

### Rust 依赖

```toml
# src-tauri/Cargo.toml 新增
[dependencies]
rusqlite = { version = "0.31", features = ["bundled"] }
```

> 使用 `bundled` feature 自带 SQLite 库，无需系统安装。已有的 `tauri-plugin-sql` 用于应用内部数据，`rusqlite` 用于用户打开的外部数据库文件。

### Tauri Commands

| Command | 参数 | 返回值 | 说明 |
|---------|------|--------|------|
| `sqlite_open` | `path: String` | `String` (conn_id) | 打开数据库文件 |
| `sqlite_close` | `conn_id: String` | `()` | 关闭连接 |
| `sqlite_tables` | `conn_id: String` | `Vec<TableInfo>` | 获取所有表/视图 |
| `sqlite_table_info` | `conn_id, table: String` | `Vec<ColumnInfo>` | 获取表结构 (PRAGMA table_info) |
| `sqlite_table_indexes` | `conn_id, table: String` | `Vec<IndexInfo>` | 获取表索引 |
| `sqlite_query` | `conn_id, sql: String, params: Vec<Value>` | `QueryResult` | 执行 SELECT，返回列名+行数据 |
| `sqlite_execute` | `conn_id, sql: String, params: Vec<Value>` | `ExecuteResult` | 执行 INSERT/UPDATE/DELETE，返回影响行数 |
| `sqlite_count` | `conn_id, table: String, where_clause: Option<String>` | `i64` | 快速获取行数 |
| `sqlite_insert_row` | `conn_id, table: String, data: Map<String, Value>` | `i64` (rowid) | 插入一行 |
| `sqlite_update_row` | `conn_id, table: String, data: Map, pk_col: String, pk_val: Value` | `usize` | 更新一行 |
| `sqlite_delete_rows` | `conn_id, table: String, pk_col: String, pk_vals: Vec<Value>` | `usize` | 删除多行 |
| `sqlite_export_csv` | `conn_id, table: String` | `String` (CSV 内容) | 导出表为 CSV |
| `sqlite_db_info` | `conn_id: String` | `DbInfo` | 数据库元信息（大小、页大小、版本） |

### 数据结构

```rust
#[derive(Serialize)]
pub struct TableInfo {
    pub name: String,
    pub table_type: String,   // "table" | "view"
    pub row_count: i64,
    pub sql: String,           // CREATE TABLE 语句
}

#[derive(Serialize)]
pub struct ColumnInfo {
    pub cid: i32,
    pub name: String,
    pub col_type: String,      // TEXT, INTEGER, REAL, BLOB, NULL
    pub notnull: bool,
    pub default_value: Option<String>,
    pub pk: bool,
}

#[derive(Serialize)]
pub struct IndexInfo {
    pub name: String,
    pub unique: bool,
    pub columns: Vec<String>,
    pub sql: Option<String>,
}

#[derive(Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub row_count: usize,
    pub elapsed_ms: u64,
}

#[derive(Serialize)]
pub struct ExecuteResult {
    pub affected_rows: usize,
    pub elapsed_ms: u64,
}

#[derive(Serialize)]
pub struct DbInfo {
    pub file_size: u64,
    pub page_size: i64,
    pub page_count: i64,
    pub sqlite_version: String,
    pub table_count: usize,
}
```

### 连接管理（数据持久化）

复用项目现有 `src/utils/database.js` 的 SQLite 数据库，新增一张连接历史表：

```sql
-- migration v8
CREATE TABLE IF NOT EXISTS sqlite_connections (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  path      TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used  INTEGER,
  pinned     INTEGER DEFAULT 0
);
```

---

## 功能模块

### 1. 连接管理（左侧栏）

- **打开文件**：通过 Tauri `dialog.open()` 选择 `.db`/`.sqlite`/`.sqlite3` 文件
- **连接历史**：记录打开过的数据库，显示名称、路径、最后使用时间
- **固定/取消固定**：常用数据库可置顶
- **删除历史**：从历史列表中移除（不删除文件）
- **拖拽打开**：支持将 `.db` 文件拖入窗口直接打开

### 2. 表浏览器（左侧栏下半部分）

连接成功后展示：
- **表列表**：树形结构，分 Tables / Views 两个分组
- 每个表显示名称 + 行数（badge）
- 右键菜单：查看数据、查看结构、导出 CSV、复制表名、删除表
- 搜索过滤：输入框快速过滤表名

### 3. 数据浏览/编辑（中间主区）

选中表后展示该表数据：

#### 3.1 表格展示
- **虚拟滚动表格**：使用 Element Plus `el-table` + 分页（每页 100 行）
- **列头信息**：列名 + 类型标签（TEXT/INTEGER/REAL/BLOB）
- **主键列高亮**：主键列名称加粗 + 🔑 图标
- **NULL 值显示**：灰色斜体 `NULL`
- **BLOB 值显示**：显示 `[BLOB: N bytes]` 占位，点击可预览（图片）或下载
- **长文本截断**：超过 200 字符截断，悬浮 tooltip 显示全文

#### 3.2 行内编辑
- **双击单元格**进入编辑模式（inline edit）
- 根据列类型自动选择编辑器：
  - TEXT → 普通输入框（长文本用 textarea）
  - INTEGER/REAL → 数字输入框
  - BLOB → 文件上传/十六进制编辑
  - NULL → 可设置为 NULL 的 checkbox
- **修改后高亮**（蓝色背景）标记脏数据
- **批量保存**：工具栏「保存修改」按钮一次提交所有修改
- **撤销修改**：工具栏「撤销」恢复到修改前

#### 3.3 数据操作
- **新增行**：底部追加空行，自动填充默认值
- **删除行**：勾选多行后批量删除，需确认对话框
- **刷新**：重新加载当前表数据
- **排序**：点击列头排序（ASC/DESC），支持多列排序
- **筛选**：列头筛选弹窗（等于、包含、大于、小于、IS NULL、IS NOT NULL）
- **导出**：当前表/查询结果导出为 CSV

#### 3.4 分页
- 底部分页栏：总行数、每页条数（50/100/200/500）、跳页
- 保持排序和筛选条件

### 4. 表结构查看（Tab 切换）

数据 Tab 旁边增加「结构」Tab：
- **列定义表格**：字段名、类型、NOT NULL、默认值、主键
- **索引列表**：索引名、唯一性、包含列
- **建表 SQL**：显示 `CREATE TABLE` 原始语句（语法高亮）
- **DDL 操作**（可选 P2）：
  - 添加列：弹窗输入列名、类型、默认值
  - 重命名表

### 5. SQL 编辑器（底部面板 / 独立 Tab）

- **SQL 输入区**：`<textarea>` 或轻量编辑器，支持：
  - SQL 关键字高亮（纯 CSS 方案或简单 tokenizer）
  - 自动补全表名/列名（基于已加载的 schema）
  - 多语句支持（`;` 分割）
  - 快捷键执行：`Ctrl+Enter` 执行选中语句 / 全部
  - 历史记录：最近 50 条执行过的 SQL
- **结果区**：
  - SELECT → 表格展示（复用数据浏览组件）
  - INSERT/UPDATE/DELETE → 显示影响行数 + 执行耗时
  - 错误 → 红色错误信息
- **工具栏**：
  - 执行 / 执行选中
  - 格式化 SQL（基础缩进对齐）
  - 清空
  - 导出结果

### 6. 数据库信息面板

Header 右侧或独立 Tab：
- 文件路径（可点击在资源管理器中定位）
- 文件大小
- SQLite 版本
- 表数量 / 视图数量
- 页大小 / 总页数

---

## 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│ 🗄️ 工具箱 / SQLite 管理器            [DB Info] [打开文件]  │
├──────────┬──────────────────────────────────────────────────┤
│ 连接历史 │  [数据] [结构] [SQL]                     表工具栏 │
│ ─────── │ ┌─────────────────────────────────────────────┐  │
│ 📁 app.db│ │ id │ name   │ email         │ created_at  │  │
│ 📁 test  │ │ 1  │ 张三   │ zhang@ex.com  │ 2024-01-01  │  │
│          │ │ 2  │ 李四   │ li@ex.com     │ 2024-01-02  │  │
│ Tables(5)│ │ 3  │ 王五   │ wang@ex.com   │ 2024-01-03  │  │
│  users   │ │ .. │ ..     │ ..            │ ..          │  │
│  orders  │ │    │        │               │             │  │
│  products│ ├─────────────────────────────────────────────┤  │
│  configs │ │ SQL:                              [▶ 执行]  │  │
│ Views(1) │ │ SELECT * FROM users WHERE id > 10           │  │
│  v_stats │ │                                             │  │
├──────────┼─────────────────────────────────────────────────┤
│ Ready │ users │ 1,234 行 │ 256 KB │ SQLite 3.45.0        │
└──────────┴─────────────────────────────────────────────────┘
```

### 布局详解

| 区域 | 宽度/高度 | 说明 |
|------|-----------|------|
| Header | 46px 固定 | 面包屑 + 操作按钮 |
| 左侧栏 | 240px，可折叠 | 上半：连接历史；下半：表/视图树 |
| 主内容区 | flex: 1 | Tabs (数据/结构/SQL) |
| SQL 面板 | 底部可拖拽高度，默认 200px | SQL 编辑 + 结果展示 |
| 状态栏 | 28px 固定 | 连接状态、当前表、行数、文件大小 |

---

## Rust 实现要点

### 连接池

```rust
use std::collections::HashMap;
use std::sync::OnceLock;
use tokio::sync::RwLock;
use rusqlite::Connection;

// rusqlite::Connection 不是 Send，需要用 Mutex 而非 RwLock
use std::sync::Mutex;

struct SqliteConn {
    conn: Mutex<Connection>,
    path: String,
}

static SQLITE_CONNS: OnceLock<RwLock<HashMap<String, SqliteConn>>> = OnceLock::new();

fn get_conns() -> &'static RwLock<HashMap<String, SqliteConn>> {
    SQLITE_CONNS.get_or_init(|| RwLock::new(HashMap::new()))
}
```

### 查询结果序列化

```rust
fn value_to_json(val: &rusqlite::types::Value) -> serde_json::Value {
    match val {
        rusqlite::types::Value::Null => serde_json::Value::Null,
        rusqlite::types::Value::Integer(i) => json!(i),
        rusqlite::types::Value::Real(f) => json!(f),
        rusqlite::types::Value::Text(s) => json!(s),
        rusqlite::types::Value::Blob(b) => json!(format!("[BLOB: {} bytes]", b.len())),
    }
}
```

### 安全考虑

- **参数化查询**：所有可视化编辑操作（增删改）必须使用 `?` 占位符，防止 SQL 注入
- **SQL 编辑器**：直接执行用户输入的 SQL（已授权场景，类似 Navicat）
- **只读模式**：提供只读打开选项 `SQLITE_OPEN_READ_ONLY`，避免误操作
- **大表保护**：SELECT 默认加 LIMIT 1000，防止一次加载过多数据

---

## 文件清单

```
src-tauri/
  Cargo.toml                        ← 新增 rusqlite 依赖
  src/commands/
    mod.rs                           ← 新增 pub mod sqlite;
    sqlite.rs                        ← 【新建】所有 SQLite 命令
  src/lib.rs                         ← 注册 sqlite_* 命令

src/
  views/
    SqliteManager.vue                ← 【新建】主页面
  utils/
    sqliteManager.js                 ← 【新建】invoke 封装 + 业务逻辑
    database.js                      ← 新增 v8 migration (连接历史表)
  i18n/locales/
    zh-CN.js                         ← 新增 sqliteManager section
    en-US.js                         ← 新增 sqliteManager section

  router/index.js                    ← 新增路由
  views/Toolbox.vue                  ← 注册工具卡片 + openTool
  components/ProductivitySidebar.vue ← toolPathMap 新增
```

---

## 注册方式

### 路由
```javascript
{
  path: '/toolbox/sqlite-manager',
  name: 'sqliteManager',
  component: () => import('@/views/SqliteManager.vue'),
  meta: { title: 'SQLite 管理器' }
}
```

### 工具箱
```javascript
// Toolbox.vue — devTools 中新增
{ id: 'sqlite-manager', name: t('toolbox.tools.sqliteManager'), icon: '🗄️', type: 'page', enabled: true }

// openTool() 中新增
if (tool.id === 'sqlite-manager') { router.push('/toolbox/sqlite-manager'); return }
```

### 侧边栏
```javascript
// ProductivitySidebar.vue — toolPathMap
'sqlite-manager': '/toolbox/sqlite-manager',
```

---

## i18n 键

```javascript
// zh-CN.js
sqliteManager: {
  title: 'SQLite 管理器',
  openFile: '打开数据库',
  recentDbs: '最近打开',
  noRecent: '暂无打开记录',
  clearRecent: '清空记录',
  pin: '置顶',
  unpin: '取消置顶',

  // 表浏览
  tables: '表',
  views: '视图',
  filterTables: '搜索表名...',
  rowCount: '行',
  viewData: '查看数据',
  viewStructure: '查看结构',
  exportCsv: '导出 CSV',
  copyName: '复制表名',
  dropTable: '删除表',
  confirmDropTable: '确定删除表 "{table}"？此操作不可撤销！',

  // 数据面板
  tabData: '数据',
  tabStructure: '结构',
  tabSql: 'SQL',
  refresh: '刷新',
  addRow: '新增行',
  deleteRows: '删除选中',
  saveChanges: '保存修改',
  discardChanges: '撤销修改',
  confirmDelete: '确定删除选中的 {count} 行？',
  unsavedChanges: '有未保存的修改，是否丢弃？',
  saved: '保存成功',
  noData: '表为空',
  selectTable: '选择左侧表开始浏览',

  // 表结构
  columnName: '字段名',
  columnType: '类型',
  notNull: '非空',
  defaultValue: '默认值',
  primaryKey: '主键',
  indexes: '索引',
  indexName: '索引名',
  unique: '唯一',
  indexColumns: '索引列',
  createSql: '建表 SQL',

  // 筛选
  filterEqual: '等于',
  filterContains: '包含',
  filterGt: '大于',
  filterLt: '小于',
  filterIsNull: 'IS NULL',
  filterIsNotNull: 'IS NOT NULL',
  clearFilter: '清除筛选',

  // SQL 编辑器
  execute: '执行',
  executeSelected: '执行选中',
  formatSql: '格式化',
  clearSql: '清空',
  sqlHistory: 'SQL 历史',
  sqlPlaceholder: 'SELECT * FROM table_name LIMIT 100;',
  affectedRows: '影响 {count} 行',
  queryTime: '耗时 {time}ms',
  sqlError: 'SQL 错误',
  exportResult: '导出结果',

  // 数据库信息
  dbInfo: '数据库信息',
  filePath: '文件路径',
  fileSize: '文件大小',
  sqliteVersion: 'SQLite 版本',
  pageSize: '页大小',
  pageCount: '总页数',
  tableCount: '表数量',
  openInExplorer: '在资源管理器中打开',

  // 状态栏
  connected: '已连接',
  disconnected: '未连接',
  readOnly: '只读',
},

// en-US.js
sqliteManager: {
  title: 'SQLite Manager',
  openFile: 'Open Database',
  recentDbs: 'Recent Databases',
  noRecent: 'No recent databases',
  clearRecent: 'Clear History',
  pin: 'Pin',
  unpin: 'Unpin',

  tables: 'Tables',
  views: 'Views',
  filterTables: 'Filter tables...',
  rowCount: 'rows',
  viewData: 'View Data',
  viewStructure: 'View Structure',
  exportCsv: 'Export CSV',
  copyName: 'Copy Name',
  dropTable: 'Drop Table',
  confirmDropTable: 'Drop table "{table}"? This cannot be undone!',

  tabData: 'Data',
  tabStructure: 'Structure',
  tabSql: 'SQL',
  refresh: 'Refresh',
  addRow: 'Add Row',
  deleteRows: 'Delete Selected',
  saveChanges: 'Save Changes',
  discardChanges: 'Discard',
  confirmDelete: 'Delete {count} selected row(s)?',
  unsavedChanges: 'Unsaved changes will be lost. Continue?',
  saved: 'Saved',
  noData: 'Table is empty',
  selectTable: 'Select a table to browse',

  columnName: 'Column',
  columnType: 'Type',
  notNull: 'Not Null',
  defaultValue: 'Default',
  primaryKey: 'Primary Key',
  indexes: 'Indexes',
  indexName: 'Index Name',
  unique: 'Unique',
  indexColumns: 'Columns',
  createSql: 'CREATE SQL',

  filterEqual: 'Equal',
  filterContains: 'Contains',
  filterGt: 'Greater than',
  filterLt: 'Less than',
  filterIsNull: 'IS NULL',
  filterIsNotNull: 'IS NOT NULL',
  clearFilter: 'Clear Filter',

  execute: 'Execute',
  executeSelected: 'Execute Selected',
  formatSql: 'Format',
  clearSql: 'Clear',
  sqlHistory: 'SQL History',
  sqlPlaceholder: 'SELECT * FROM table_name LIMIT 100;',
  affectedRows: '{count} row(s) affected',
  queryTime: '{time}ms elapsed',
  sqlError: 'SQL Error',
  exportResult: 'Export Result',

  dbInfo: 'Database Info',
  filePath: 'File Path',
  fileSize: 'File Size',
  sqliteVersion: 'SQLite Version',
  pageSize: 'Page Size',
  pageCount: 'Page Count',
  tableCount: 'Table Count',
  openInExplorer: 'Open in Explorer',

  connected: 'Connected',
  disconnected: 'Disconnected',
  readOnly: 'Read Only',
},
```

---

## 开发计划

### P0 — 核心可用（能打开、能看、能查）

1. Rust 侧：`sqlite_open`、`sqlite_close`、`sqlite_tables`、`sqlite_table_info`、`sqlite_query`、`sqlite_db_info`
2. 前端：打开文件 → 表列表 → 点击表 → 数据表格分页展示
3. SQL 编辑器基础版（textarea + 执行 + 结果表格）
4. 连接历史持久化

### P1 — 数据编辑（能改）

5. 行内编辑 + 批量保存（`sqlite_update_row`）
6. 新增行（`sqlite_insert_row`）
7. 删除行（`sqlite_delete_rows`）
8. 表结构 Tab（PRAGMA table_info + index_list）

### P2 — 体验增强

9. 列排序、列筛选
10. 导出 CSV（`sqlite_export_csv`）
11. SQL 自动补全（表名/列名）
12. SQL 历史记录
13. 拖拽打开文件
14. 只读模式

### P3 — 高级功能

15. DDL 操作（添加列、重命名表）
16. BLOB 预览（图片类型自动检测）
17. 数据库对比（两个 db 文件 schema diff）
18. 多 Tab 支持（同时打开多个表/查询）

---

## 注意事项

### 性能
- `rusqlite::Connection` 不是 `Send`，需要 `Mutex` 包装而非直接用 `RwLock`
- 大表查询强制 LIMIT 分页，前端默认 100 行/页
- 表列表的行数统计用 `SELECT COUNT(*)` 异步加载，不阻塞 UI
- 查询结果的 BLOB 列不传输实际内容，仅传大小

### 安全
- 可视化操作（CRUD）全部使用参数化查询
- SQL 编辑器允许直接执行（用户自主），但 DROP/DELETE 操作需确认
- 文件路径不做限制（用户通过 dialog 选择）

### 错误处理
- 文件不存在 / 无权限 → 弹出明确错误提示
- 文件被锁定（其他进程占用）→ 提示"数据库已被占用"
- SQL 语法错误 → 显示 rusqlite 错误信息 + 错误位置
- 连接断开 → 状态栏变灰，操作前自动重试

### 兼容性
- 支持 SQLite 3.x 所有版本的数据库文件
- 支持 WAL 模式的数据库
- 文件扩展名：`.db`、`.sqlite`、`.sqlite3`、`.s3db`
