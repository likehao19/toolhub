# 便签功能技术设计文档

## Context

便签功能是一个轻量级的可视化工作区，旨在为用户提供快速访问常用信息的独立窗口。设计灵感来自物理便签墙，通过彩色页签和直观的UI，让用户可以一目了然地查看和管理日常任务。

**背景：**
- 现有笔记、书签、日程、待办功能分散在不同页面
- 用户需要频繁切换页面查看信息
- 缺少快速浏览和操作的聚合视图
- 需要一个桌面级的独立工作区

**约束：**
- 必须与现有模块无缝集成，避免数据重复
- 窗口需要轻量级，启动和响应要快速
- UI 需要简洁直观，减少认知负担
- 数据同步需要实时，保证一致性

**利益相关者：**
- 终端用户：需要高效的信息浏览和任务管理
- 开发者：需要清晰的架构和可维护的代码

## Goals / Non-Goals

**Goals:**
- ✅ 提供独立的桌面窗口，支持无边框和置顶
- ✅ 聚合4个核心功能：文档、书签、日程、待办
- ✅ 与现有模块双向同步，数据实时更新
- ✅ 简洁的UI设计，快速响应，低资源占用
- ✅ 支持键盘快捷键，提升操作效率

**Non-Goals:**
- ❌ 不在便签中直接创建复杂内容（如编辑长文档）
- ❌ 不替代主窗口的完整功能模块
- ❌ 不引入新的数据存储结构
- ❌ 不支持多个便签窗口同时打开

## Decisions

### Decision 1: 独立窗口架构

**选择：** 使用 Tauri 的 `WebviewWindow` 创建独立窗口，而非内嵌对话框

**理由：**
- 独立窗口可以完全脱离主窗口运行
- 支持桌面级操作（拖拽、置顶、最小化）
- 性能更好，不影响主窗口渲染
- 用户体验更接近原生桌面应用

**替代方案：**
- Modal 对话框：被拒绝，因为无法独立于主窗口，不能置顶
- iframe 嵌入：被拒绝，因为数据隔离问题和性能损耗

### Decision 2: 彩色页签导航

**选择：** 左侧垂直页签，固定宽度60px，使用图标+颜色标识

**理由：**
- 视觉上清晰，快速识别不同功能
- 垂直布局节省水平空间
- 颜色编码符合认知心理学（快速分类）
- 固定宽度保证UI稳定性

**颜色方案：**
- 文档速览：蓝色 (#4F46E5) - 专业、信息
- 资源收藏：粉色 (#EC4899) - 活跃、创意
- 日程规划：绿色 (#10B981) - 成长、时间
- 任务清单：橙色 (#F59E0B) - 警示、行动

### Decision 3: 数据同步机制

**选择：** 基于 EventBus 的全局事件系统 + localStorage 状态持久化

**架构：**
```
主窗口模块 ──[数据变更]──> 触发全局事件
                              ↓
便签窗口 ──[监听事件]──> 重新加载数据
                              ↓
                        更新UI显示
```

**实现细节：**
- 使用 `window.dispatchEvent` 和 `window.addEventListener`
- 事件名称规范：`sticky-notes-update-{module}`
- 事件数据携带：`{ detail: { module, action, data } }`
- 双向同步：便签窗口的操作也触发主窗口更新

**优点：**
- 解耦，不依赖组件层级
- 实时性高，事件即时传播
- 易于调试和扩展

**替代方案：**
- Vuex/Pinia 全局状态：被拒绝，因为跨窗口状态共享复杂
- 轮询数据库：被拒绝，因为性能损耗和延迟

### Decision 4: 组件结构

**选择：** 主组件 + 4个独立子组件

```
StickyNotes.vue (主容器)
├── SidebarTabs.vue (左侧页签)
└── ContentArea.vue (右侧内容)
    ├── DocumentPreview.vue (文档速览)
    ├── BookmarkGrid.vue (资源收藏)
    ├── ScheduleView.vue (日程规划)
    └── TaskList.vue (任务清单)
```

**理由：**
- 职责分离，便于维护
- 懒加载子组件，提升性能
- 可复用性强

### Decision 5: 状态管理

**选择：** 组件内部 `ref/reactive` + localStorage 持久化

**保存内容：**
- 当前选中的页签
- 窗口位置和尺寸
- 窗口置顶状态
- 各模块的缓存数据（带过期时间）

**存储键：**
```javascript
{
  'sticky-notes-state': {
    activeTab: 'documents',
    alwaysOnTop: false,
    position: { x: 100, y: 100 },
    size: { width: 350, height: 400 }
  },
  'sticky-notes-cache-documents': { data: [...], timestamp: 123456 },
  'sticky-notes-cache-bookmarks': { data: [...], timestamp: 123456 },
  // ...
}
```

**缓存策略：**
- 缓存有效期：5分钟
- 切换页签时检查缓存，过期则重新加载
- 接收到更新事件时立即失效缓存

## Technical Stack

### 前端
- **框架：** Vue 3 (Composition API)
- **UI 库：** Element Plus
- **样式：** Scoped CSS + CSS Variables
- **图标：** Element Plus Icons

### 后端/桌面
- **框架：** Tauri v2
- **窗口管理：** `@tauri-apps/api/webviewWindow`
- **数据库：** SQLite (复用现有数据库)

### 工具函数
- `src/utils/stickyNotes.js` - 业务逻辑
- `src/utils/database.js` - 数据库操作（复用）

## Data Flow

### 打开窗口流程
```
用户点击菜单
  ↓
检查窗口是否已存在
  ↓ (存在)
  聚焦现有窗口
  ↓ (不存在)
创建新窗口 (WebviewWindow)
  ↓
加载 /sticky-notes 路由
  ↓
从 localStorage 恢复状态
  ↓
加载当前页签数据
  ↓
渲染UI
```

### 数据同步流程
```
主窗口：用户完成待办
  ↓
更新数据库
  ↓
触发全局事件: 'sticky-notes-update-todos'
  ↓
便签窗口：监听到事件
  ↓
失效任务清单缓存
  ↓
重新从数据库加载
  ↓
更新任务列表UI
```

### 页签切换流程
```
用户点击页签
  ↓
保存当前页签到 localStorage
  ↓
更新 activeTab 状态
  ↓
检查目标页签缓存
  ↓ (缓存有效)
  直接渲染缓存数据
  ↓ (缓存过期/不存在)
  显示加载状态
  ↓
从数据库加载数据
  ↓
更新缓存
  ↓
渲染UI
```

## API Design

### 工具函数 (`src/utils/stickyNotes.js`)

```javascript
// 打开便签窗口
export async function openStickyNotesWindow()

// 关闭便签窗口
export async function closeStickyNotesWindow()

// 切换置顶状态
export async function toggleAlwaysOnTop(state: boolean)

// 触发数据同步事件
export function notifyDataUpdate(module: string, data: any)

// 加载文档列表
export async function loadRecentDocuments(limit: number = 10)

// 加载常用书签
export async function loadFrequentBookmarks(limit: number = 12)

// 加载日程数据
export async function loadSchedule(days: number = 7)

// 加载待办任务
export async function loadTasks()

// 完成任务
export async function completeTask(taskId: number)

// 保存窗口状态
export function saveWindowState(state: object)

// 恢复窗口状态
export function restoreWindowState(): object
```

### 全局事件

```javascript
// 笔记更新
window.dispatchEvent(new CustomEvent('sticky-notes-update-documents', {
  detail: { action: 'created', noteId: 123 }
}))

// 书签更新
window.dispatchEvent(new CustomEvent('sticky-notes-update-bookmarks', {
  detail: { action: 'added', bookmarkId: 456 }
}))

// 日程更新
window.dispatchEvent(new CustomEvent('sticky-notes-update-schedule', {
  detail: { action: 'modified', eventId: 789 }
}))

// 待办更新
window.dispatchEvent(new CustomEvent('sticky-notes-update-tasks', {
  detail: { action: 'completed', taskId: 101 }
}))
```

## Window Configuration

### tauri.conf.json

```json
{
  "app": {
    "windows": [
      {
        "label": "sticky-notes",
        "title": "便签",
        "url": "sticky-notes",
        "width": 350,
        "height": 400,
        "minWidth": 300,
        "minHeight": 350,
        "resizable": true,
        "center": true,
        "decorations": false,
        "transparent": false,
        "alwaysOnTop": false,
        "skipTaskbar": false,
        "visible": false
      }
    ]
  }
}
```

### Capabilities

```json
{
  "identifier": "sticky-notes-window",
  "windows": ["sticky-notes"],
  "permissions": [
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:window:allow-close",
    "core:window:allow-set-focus",
    "core:window:allow-set-always-on-top",
    "core:window:allow-set-position",
    "core:window:allow-set-size",
    "core:window:allow-start-dragging",
    "sql:allow-load",
    "sql:allow-select",
    "sql:allow-execute"
  ]
}
```

## UI Layout

### 整体布局（350x400）
```
┌──────────────────────┐
│  🔝  ✖               │ ← 控制栏(40px)
├────┬─────────────────┤
│    │                 │
│ 📄 │                 │
│    │   内容区域       │
│ ⭐ │ (动态背景色)     │
│    │                 │
│ 📅 │                 │
│    │                 │
│ ✓  │                 │
│    │                 │
└────┴─────────────────┘
 50px    300px (自适应)
```

### 页签区域
- 宽度：50px 固定（紧凑型）
- 高度：每个页签 70px
- 布局：垂直居中
- 图标大小：24px
- 高亮：当前页签背景亮度提升

### 内容区域
- 左内边距：12px
- 右内边距：12px
- 上内边距：40px (为控制栏留空)
- 下内边距：12px
- 背景：对应页签颜色的渐变

### 窗口控制栏
- 高度：40px
- 按钮尺寸：28x28px
- 间距：8px

## Performance Considerations

### 优化策略

1. **懒加载**
   - 仅加载当前激活页签的数据
   - 其他页签数据在切换时再加载

2. **缓存机制**
   - 缓存有效期：5分钟
   - 内存缓存 + localStorage 持久化
   - 事件驱动的缓存失效

3. **虚拟滚动**
   - 当列表项 > 20 时启用虚拟滚动
   - 使用 `vue-virtual-scroller` 或自实现

4. **节流/防抖**
   - 窗口 resize 事件：节流 200ms
   - 搜索输入：防抖 300ms
   - 滚动事件：节流 100ms

5. **按需导入**
   - Element Plus 组件按需导入
   - 图标按需加载

## Security Considerations

### 数据安全
- 密码数据不在便签中显示
- 书签URL经过XSS过滤
- localStorage数据不包含敏感信息

### 窗口安全
- 禁用窗口调试工具（生产环境）
- 限制窗口最小尺寸，防止UI破坏
- 窗口关闭时清理敏感内存数据

## Risks / Trade-offs

### Risk 1: 数据同步延迟
**风险：** 主窗口和便签窗口数据不一致

**缓解措施：**
- 使用事件驱动的即时同步
- 添加重试机制（失败时重试3次）
- 显示同步状态指示器

### Risk 2: 窗口管理复杂性
**风险：** 多个独立窗口导致状态管理混乱

**缓解措施：**
- 限制只能打开一个便签窗口
- 窗口状态集中管理在 `stickyNotes.js`
- 明确的窗口生命周期管理

### Risk 3: 性能损耗
**风险：** 额外窗口占用资源

**缓解措施：**
- 懒加载和缓存机制
- 窗口未激活时暂停数据刷新
- 优化查询语句，使用索引

### Trade-off: 功能简化 vs 完整性
**权衡：** 便签中不支持直接编辑，只能查看和跳转

**决定：** 保持简化，理由：
- 符合"快速浏览"的定位
- 避免功能重复和数据冲突
- 降低开发和维护成本

## Migration Plan

### 阶段1：基础框架（Week 1）
- [ ] 窗口配置和路由
- [ ] 基础UI布局
- [ ] 页签切换逻辑

### 阶段2：核心功能（Week 2-3）
- [ ] 文档速览功能
- [ ] 资源收藏功能
- [ ] 日程规划功能
- [ ] 任务清单功能

### 阶段3：同步与优化（Week 4）
- [ ] 数据同步机制
- [ ] 窗口控制功能
- [ ] 性能优化
- [ ] 测试和修复

### 回滚计划
- 保留主窗口完整功能，便签是增强而非替代
- 如果出现严重问题，可以直接隐藏菜单入口
- 数据库结构不变，无需回滚数据

## Open Questions

1. **是否支持自定义页签顺序？**
   - 建议：V1 保持固定顺序，V2 考虑自定义

2. **是否需要主题切换（深色/浅色）？**
   - 建议：跟随主应用设置

3. **窗口位置是否需要多显示器支持？**
   - 建议：V1 单显示器，V2 扩展

4. **是否需要快捷键冲突检测？**
   - 建议：使用不常用的组合键，降低冲突概率

5. **数据量大时的分页策略？**
   - 建议：默认显示前20条，滚动加载更多
