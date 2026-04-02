# Redis 客户端工具方案

## 概述

在工具箱中新增一个 Redis 可视化客户端工具，支持连接本地/远程 Redis 实例，提供键值浏览、数据编辑、命令行交互、性能监控等功能。定位为轻量级桌面 Redis 管理工具，类似 Another Redis Desktop Manager。

## 技术方案

### 架构

```
┌─────────────────────────────────────────────┐
│  Vue 前端（Element Plus）                     │
│  ┌──────────┬──────────┬──────────┐         │
│  │ 连接管理  │ 键值浏览  │ CLI 终端  │         │
│  └──────────┴──────────┴──────────┘         │
│              ↕ Tauri invoke                   │
├─────────────────────────────────────────────┤
│  Rust 后端 (src-tauri/src/commands/redis.rs) │
│  ┌──────────────────────────────────┐       │
│  │  redis crate（异步连接池）         │       │
│  └──────────────────────────────────┘       │
└─────────────────────────────────────────────┘
```

- **前端**：Vue 3 + Element Plus，负责 UI 展示和用户交互
- **后端**：Rust `redis` crate 管理连接，通过 Tauri commands 暴露给前端
- **存储**：连接配置存 SQLite（已有 `productivity.db`），密码加密存储

### Rust 依赖

```toml
# src-tauri/Cargo.toml
[dependencies]
redis = { version = "0.27", features = ["tokio-comp", "connection-manager"] }
```

### Tauri Commands（redis.rs）

| Command | 参数 | 说明 |
|---------|------|------|
| `redis_connect` | host, port, password?, db?, name | 建立连接，返回连接 ID |
| `redis_disconnect` | conn_id | 断开连接 |
| `redis_test_connection` | host, port, password?, db? | 测试连通性 |
| `redis_execute` | conn_id, command, args[] | 执行任意 Redis 命令，返回结果 |
| `redis_scan_keys` | conn_id, pattern, cursor, count | SCAN 扫描键（不用 KEYS *） |
| `redis_get_key_info` | conn_id, key | 获取键的类型、TTL、大小、值 |
| `redis_set_key` | conn_id, key, value, type, ttl? | 设置/更新键值 |
| `redis_delete_keys` | conn_id, keys[] | 批量删除键 |
| `redis_rename_key` | conn_id, old_key, new_key | 重命名键 |
| `redis_set_ttl` | conn_id, key, ttl | 设置过期时间 |
| `redis_server_info` | conn_id | INFO 命令，返回服务器信息 |
| `redis_db_size` | conn_id | DBSIZE 返回键数量 |
| `redis_flush_db` | conn_id | FLUSHDB（需二次确认） |
| `redis_slowlog` | conn_id, count | 获取慢查询日志 |

### 数据库表（migration v7）

```sql
CREATE TABLE IF NOT EXISTS redis_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  host TEXT NOT NULL DEFAULT '127.0.0.1',
  port INTEGER NOT NULL DEFAULT 6379,
  password TEXT DEFAULT '',          -- 加密存储
  db_index INTEGER DEFAULT 0,
  ssh_enabled INTEGER DEFAULT 0,
  ssh_host TEXT DEFAULT '',
  ssh_port INTEGER DEFAULT 22,
  ssh_user TEXT DEFAULT '',
  ssh_key_path TEXT DEFAULT '',
  color TEXT DEFAULT '',             -- 连接标识色
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT
);
```

## 功能模块

### 1. 连接管理

- 新增/编辑/删除/测试 Redis 连接
- 支持：单机直连、密码认证、指定 DB
- 连接列表左侧树形展示，带颜色标识
- 最近使用排序
- 连接成功后显示 DB0-DB15 列表及各库键数量

### 2. 键值浏览器（核心页面）

**左侧面板：键列表**
- 使用 SCAN 分页加载键（默认 pattern `*`，count 200）
- 支持模式匹配搜索（`user:*`、`cache:session:*`）
- 按 `:` 分隔符折叠成树形结构（如 `user:1001:name` → user / 1001 / name）
- 键类型图标区分：🔤 string、📋 list、📦 hash、🎯 set、📊 zset、🌊 stream
- 右键菜单：复制键名、删除、重命名、设置 TTL
- 批量选择 + 批量删除

**右侧面板：键详情/编辑**

根据数据类型展示不同的编辑器：

| 类型 | 展示方式 | 编辑操作 |
|------|---------|---------|
| String | 文本/JSON 格式化显示 | 直接编辑，JSON 自动格式化 |
| Hash | 表格（field → value） | 增/删/改 field |
| List | 有序列表，显示 index | 头部/尾部添加、删除、编辑元素 |
| Set | 成员列表 | 添加/删除成员 |
| ZSet | 表格（member → score），按 score 排序 | 添加/修改 score、删除成员 |
| Stream | 时间线列表 | 查看消息 ID 和 fields |

**通用功能：**
- TTL 显示 + 快捷修改（-1 永不过期）
- 内存占用显示（`MEMORY USAGE key`）
- 值的复制按钮
- JSON / Raw 视图切换
- 大值分段加载（> 10KB 时警告）

### 3. CLI 终端

- 底部可展开的命令行面板（类似 DevTools Console）
- 输入 Redis 命令，返回格式化结果
- 命令历史（↑↓ 翻阅）
- 自动补全常用命令（GET, SET, HGETALL, DEL, SCAN...）
- 结果高亮：字符串绿色、数字蓝色、nil 灰色、错误红色
- 支持多行命令（Shift+Enter 换行）
- `clear` 清屏

### 4. 服务器信息面板

- **概览卡片**：Redis 版本、运行时间、连接客户端数、内存使用
- **内存**：used_memory、peak、fragmentation_ratio，进度条可视化
- **统计**：ops/sec、命中率（keyspace_hits / total）
- **慢查询日志**：表格展示最近慢查询
- **客户端列表**：当前连接的客户端（CLIENT LIST）
- 自动刷新（可配置间隔 5s/10s/30s）

### 5. 数据导入/导出

- 导出选中键为 JSON 文件
- 导入 JSON 文件恢复键值
- 导出格式：`[{ key, type, ttl, value }]`

## 页面布局

```
┌──────────────────────────────────────────────────┐
│ 面包屑  工具箱 / Redis 客户端     [+ 新连接] [⚙]  │
├────────┬─────────────────────────────────────────┤
│ 连接    │  ┌─ 标签页 ─────────────────────────┐   │
│ ┌────┐ │  │ 🔍 键浏览 │ 💻 CLI │ 📊 服务器  │   │
│ │ 📦 │ │  ├────────────────────────────────────┤   │
│ │prod│ │  │ 左:键树    │  右:键详情/编辑      │   │
│ │ ├db0│ │  │ ┌───────┐ │  ┌──────────────────┐│   │
│ │ ├db1│ │  │ │ SCAN  │ │  │ key: user:1001   ││   │
│ │    │ │  │ │ tree.. │ │  │ type: hash       ││   │
│ │ 📦 │ │  │ │       │ │  │ TTL: 3600        ││   │
│ │local│ │  │ │       │ │  │ ┌──────┬───────┐ ││   │
│ │ ├db0│ │  │ │       │ │  │ │field │ value │ ││   │
│ │    │ │  │ │       │ │  │ │name  │ Alice │ ││   │
│ └────┘ │  │ └───────┘ │  │ │age   │ 25    │ ││   │
│        │  │            │  │ └──────┴───────┘ ││   │
│        │  │            │  └──────────────────┘│   │
│        │  └────────────────────────────────────┘   │
├────────┴─────────────────────────────────────────┤
│ 状态: 已连接 prod (db0) │ 键: 12,345 │ 内存: 128MB │
└──────────────────────────────────────────────────┘
```

## 文件清单

```
src-tauri/
  Cargo.toml                          # 添加 redis 依赖
  src/commands/redis.rs               # Redis Tauri commands（新增）
  src/commands/mod.rs                 # 注册 redis 模块
  src/lib.rs                          # 注册 redis commands

src/
  views/RedisClient.vue               # 主页面（新增）
  components/redis/
    RedisConnectionPanel.vue          # 左侧连接管理面板
    RedisKeyBrowser.vue               # 键列表树
    RedisKeyDetail.vue                # 键详情/编辑
    RedisTerminal.vue                 # CLI 终端
    RedisServerInfo.vue               # 服务器信息
    RedisConnectionDialog.vue         # 新建/编辑连接对话框
  utils/redisManager.js               # 前端业务逻辑（封装 invoke 调用）
  router/index.js                     # 添加路由
  i18n/locales/zh-CN.js               # 中文翻译
  i18n/locales/en-US.js               # 英文翻译
  utils/database.js                   # migration v7 — redis_connections 表
```

## 注册方式

**路由：**
```javascript
{
  path: '/toolbox/redis-client',
  name: 'redisClient',
  component: () => import('@/views/RedisClient.vue'),
  meta: { title: 'Redis 客户端' }
}
```

**工具箱注册（Toolbox.vue）：**
```javascript
// devTools 分组中添加
{ id: 'redis-client', name: t('toolbox.tools.redisClient'), icon: '🔴', type: 'page', enabled: true }
```

**openTool 路由跳转：**
```javascript
if (tool.id === 'redis-client') return router.push('/toolbox/redis-client')
```

## i18n 键

```javascript
// zh-CN
redisClient: {
  title: 'Redis 客户端',
  newConnection: '新建连接',
  testConnection: '测试连接',
  connectionName: '连接名称',
  host: '主机',
  port: '端口',
  password: '密码',
  database: '数据库',
  connected: '已连接',
  disconnected: '未连接',
  connectFailed: '连接失败',
  keyBrowser: '键浏览',
  cli: '命令行',
  serverInfo: '服务器信息',
  scanKeys: '扫描键',
  searchPattern: '搜索模式（支持通配符 *）',
  keyType: '类型',
  keyTtl: 'TTL',
  keyMemory: '内存占用',
  noExpiry: '永不过期',
  addField: '添加字段',
  deleteKey: '删除键',
  deleteConfirm: '确定删除 {count} 个键？',
  renameKey: '重命名',
  setTtl: '设置过期时间',
  exportKeys: '导出',
  importKeys: '导入',
  flushDb: '清空数据库',
  flushConfirm: '此操作不可逆，确定清空当前数据库所有键？',
  commandHint: '输入 Redis 命令...',
  serverVersion: 'Redis 版本',
  uptime: '运行时间',
  usedMemory: '已用内存',
  peakMemory: '峰值内存',
  connectedClients: '连接客户端',
  opsPerSec: '每秒操作数',
  hitRate: '缓存命中率',
  slowLog: '慢查询日志',
  totalKeys: '总键数',
}
```

## 开发计划

| 阶段 | 内容 | 优先级 |
|------|------|--------|
| P0 | Rust redis commands + 连接管理 + 键浏览（SCAN + 5种类型查看/编辑） | 核心 |
| P1 | CLI 终端（命令执行、历史、自动补全） | 高 |
| P1 | 服务器信息面板 | 高 |
| P2 | 键树形折叠、批量操作、导入导出 | 中 |
| P3 | SSH 隧道连接、Stream 类型完整支持 | 低 |

## 注意事项

1. **安全**：密码在 SQLite 中加密存储，不明文显示，invoke 传输走 IPC 不经网络
2. **性能**：必须用 SCAN 而非 KEYS，避免阻塞 Redis；大值分段加载
3. **连接管理**：Rust 侧用连接池（`ConnectionManager`），前端离开页面时主动断开
4. **错误处理**：网络超时、认证失败、命令错误均需友好提示
5. **危险操作**：FLUSHDB、批量删除需二次确认对话框
