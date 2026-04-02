# Tauri 原生窗口弹窗替换方案

> 目标：将项目中所有 `el-dialog` 和 `ElMessageBox` 替换为 Tauri 原生子窗口，统一风格，带软件图标和自定义关闭按钮。

---

## 一、现状统计

### 1.1 el-dialog 弹窗（共 37 个）

| # | 文件 | 变量名 | 标题 | 宽度 | 用途 |
|---|------|--------|------|------|------|
| **Passwords.vue（12个）** |
| 1 | Passwords.vue:299 | `dialogVisible` | 编辑/添加密码 | 500px | 密码表单 |
| 2 | Passwords.vue:377 | `categoryDialogVisible` | 编辑/添加分类 | 400px | 分类表单 |
| 3 | Passwords.vue:483 | `viewDialogVisible` | 密码详情 | 500px | 只读查看 |
| 4 | Passwords.vue:540 | `showPasswordGenerator` | 生成密码 | 500px | 密码生成器 |
| 5 | Passwords.vue:572 | `showImportDialog` | 导入密码 | 600px | 导入向导 |
| 6 | Passwords.vue:662 | `showExportMenu` | 导出密码 | 400px | 导出选项 |
| 7 | Passwords.vue:709 | `setMasterPasswordDialog` | 设置主密码 | 500px | 主密码设置 |
| 8 | Passwords.vue:754 | `historyDialog` | 密码历史记录 | 700px | 历史列表 |
| 9 | Passwords.vue:792 | `showRecycleBin` | 回收站 | 900px | 回收站表格 |
| 10 | Passwords.vue:846 | `securityAuditDialog` | 安全审计 | 800px | 审计报告 |
| 11 | Passwords.vue:926 | `addCredDialogVisible` | 添加凭据 | 460px | 系统凭据表单 |
| 12 | Passwords.vue:948 | `credDetailDialogVisible` | 凭据详情 | 500px | 只读查看 |
| **NoteView.vue（4个）** |
| 13 | NoteView.vue:265 | `showVersionDialog` | 版本历史 | 600px | 版本列表 |
| 14 | NoteView.vue:310 | `showCompareDialog` | 版本对比 | 90% | 差异对比 |
| 15 | NoteView.vue:341 | `showTemplateDialog` | 模板管理 | 800px | 模板CRUD |
| 16 | NoteView.vue:381 | `showFolderSelectDialog` | 选择导入文件夹 | 500px | 文件夹选择 |
| **Bookmarks.vue（4个）** |
| 17 | Bookmarks.vue:188 | `dialogVisible` | 编辑/添加书签 | 500px | 书签表单 |
| 18 | Bookmarks.vue:254 | `categoryDialogVisible` | 编辑/添加分类 | 400px | 分类表单 |
| 19 | Bookmarks.vue:286 | `showImportDialog` | 导入书签 | 600px | 导入向导 |
| 20 | Bookmarks.vue:351 | `showPreviewDialog` | 网站预览 | 80% | webview预览 |
| **Todos.vue（5个）** |
| 21 | Todos.vue:278 | `dialogVisible` | 创建/编辑待办 | 600px | 待办表单 |
| 22 | Todos.vue:372 | `showAddCategory` | 新建分类 | 400px | 分类表单 |
| 23 | Todos.vue:430 | `showEditCategory` | 编辑分类 | 400px | 分类表单 |
| 24 | Todos.vue:488 | `showSubtaskDialog` | 添加子任务 | 500px | 子任务表单 |
| 25 | Todos.vue:505 | `showEditSubtaskDialog` | 编辑子任务 | 500px | 子任务表单 |
| **Calendar.vue（4个）** |
| 26 | Calendar.vue:195 | `dialogVisible` | 创建/编辑事件 | 650px | 事件表单 |
| 27 | Calendar.vue:329 | `viewDialogVisible` | 事件详情 | 500px | 只读查看 |
| 28 | Calendar.vue:363 | `showCustomReminderDialog` | 自定义提醒 | 400px | 提醒设置 |
| 29 | Calendar.vue:392 | — | 重复规则设置 | 500px | 重复规则 |
| **AIConversation.vue（2个）** |
| 30 | AIConversation.vue:184 | `showSettingsDialog` | API设置 | 560px | API配置 |
| 31 | AIConversation.vue:422 | `showCustomApiDialog` | 添加/编辑自定义API | 460px | API表单 |
| **AIChat.vue（3个）** |
| 32 | AIChat.vue:35 | `showAddDialog` | 添加网站 | 460px | 网站表单 |
| 33 | AIChat.vue:63 | `showManageDialog` | 管理网站 | 700px | 网站列表 |
| 34 | AIChat.vue:85 | `showEditDialog` | 编辑网站 | 460px | 网站表单 |
| **其他** |
| 35 | Settings.vue:545 | `showMigrationDialog` | 迁移进度 | 500px | 进度条（不可关闭） |
| 36 | Settings.vue:567 | `showChangePasswordDialog` | 修改密码 | 450px | 密码表单 |
| 37 | CredentialManager.vue:132 | `addDialogVisible` | 添加凭据 | 460px | 凭据表单 |
| 38 | CredentialManager.vue:154 | `detailDialogVisible` | 凭据详情 | 500px | 只读查看 |
| **组件级** |
| 39 | CloseConfirmDialog.vue:2 | `dialogVisible` | 关闭确认 | 400px | 退出确认 |
| 40 | AIAssistant.vue:2 | `visible` | AI助手 | 700px | AI面板 |
| 41 | TodoDependencyGraph.vue:2 | `visible` | 依赖图 | 90% | 图表展示 |

### 1.2 ElMessageBox 弹窗（共 48 个）

#### confirm 确认框（37个）

| # | 文件 | 行号 | 用途 |
|---|------|------|------|
| **Passwords.vue（8个）** |
| 1 | Passwords.vue | 1702 | 删除有密码的分类 |
| 2 | Passwords.vue | 1708 | 删除空分类 |
| 3 | Passwords.vue | 2174 | 恢复历史版本 |
| 4 | Passwords.vue | 2218 | 软删除密码到回收站 |
| 5 | Passwords.vue | 2313 | 永久删除密码 |
| 6 | Passwords.vue | 2334 | 清空回收站 |
| 7 | Passwords.vue | 2581 | 删除系统凭据 |
| 8 | Passwords.vue | 2602 | 删除通行密钥 |
| **NoteView.vue（8个）** |
| 9 | NoteView.vue | 1351 | 删除文件夹 |
| 10 | NoteView.vue | 1692 | 删除文件 |
| 11 | NoteView.vue | 2068 | 恢复笔记版本 |
| 12 | NoteView.vue | 2253 | 删除模板 |
| 13 | NoteView.vue | 2574 | 文件覆盖确认 |
| 14 | NoteView.vue | 2632 | 移动文件夹确认 |
| 15 | NoteView.vue | 2709 | 移动文件确认 |
| 16 | NoteView.vue | 2810 | 粘贴覆盖确认 |
| **NoteEditor.vue（3个）** |
| 17 | NoteEditor.vue | 542 | 删除文件夹 |
| 18 | NoteEditor.vue | 635 | 文件操作菜单 |
| 19 | NoteEditor.vue | 669 | 删除文件 |
| **Todos.vue（3个）** |
| 20 | Todos.vue | 1042 | 删除子任务 |
| 21 | Todos.vue | 1061 | 删除待办 |
| 22 | Todos.vue | 1142 | 删除分类 |
| **AIConversation.vue（3个）** |
| 23 | AIConversation.vue | 766 | 删除对话 |
| 24 | AIConversation.vue | 928 | 删除自定义API |
| 25 | AIConversation.vue | 1148 | 清空对话 |
| **Bookmarks.vue（2个）** |
| 26 | Bookmarks.vue | 938 | 删除书签 |
| 27 | Bookmarks.vue | 1013 | 删除分类 |
| **CredentialManager.vue（2个）** |
| 28 | CredentialManager.vue | 354 | 删除凭据 |
| 29 | CredentialManager.vue | 375 | 删除通行密钥 |
| **Calendar.vue（1个）** |
| 30 | Calendar.vue | 907 | 删除事件 |
| **Settings.vue（3个）** |
| 31 | Settings.vue | 941 | 数据库迁移模式选择 |
| 32 | Settings.vue | 967 | 仅修改路径确认 |
| 33 | Settings.vue | 1467 | 重置所有设置 |
| **AIChat.vue（1个）** |
| 34 | AIChat.vue | 323 | 删除网站 |
| **其他** |
| 35 | FilePreview.vue | 259 | 未保存修改确认 |
| 36 | ProcessDemo.vue | 74/87 | 退出/重启应用 |
| 37 | ToolboxStickyNotes.vue | 352 | 重置便签设置 |

#### prompt 输入框（7个）

| # | 文件 | 行号 | 用途 |
|---|------|------|------|
| 1 | Passwords.vue | 1915 | 输入导出加密密码 |
| 2 | NoteView.vue | 2200 | 输入模板名称 |
| 3 | NoteView.vue | 2209 | 输入模板类型 |
| 4 | NoteEditor.vue | 451 | 输入新文件夹名 |
| 5 | NoteEditor.vue | 512 | 输入重命名文件夹名 |
| 6 | NoteEditor.vue | 646 | 输入重命名文件名 |
| 7 | NoteEditor.vue | 717 | 输入新笔记名 |

#### alert 提示框（3个）

| # | 文件 | 行号 | 用途 |
|---|------|------|------|
| 1 | About.vue | 105 | 显示应用信息 |
| 2 | SplashAnimationDemo.vue | 159 | 开发模式保存提示 |
| 3 | SplashAnimation.vue | 99 | 开发模式保存提示 |

---

## 二、改进方案

### 2.1 架构设计

```
┌─────────────────────────────────────────────────┐
│  主窗口 (main)                                   │
│                                                   │
│   调用 openDialog({ ... })                       │
│       ↓                                           │
│   WebviewWindow.create(label, options)            │
│       ↓                                           │
│   创建 Tauri 子窗口                               │
│       ↓                                           │
│   子窗口加载 /dialog/:type 路由                    │
│       ↓                                           │
│   ┌─────────────────────────────┐                │
│   │  子窗口                      │                │
│   │  ┌───────────────────────┐  │                │
│   │  │ TauriDialog 组件       │  │                │
│   │  │ ┌─ 自定义标题栏 ────┐ │  │                │
│   │  │ │ 🔧 标题    ─ □ ✕ │ │  │                │
│   │  │ └──────────────────┘ │  │                │
│   │  │ ┌─ 内容区 ─────────┐ │  │                │
│   │  │ │  <slot />         │ │  │                │
│   │  │ └──────────────────┘ │  │                │
│   │  │ ┌─ 底部按钮 ───────┐ │  │                │
│   │  │ │ 取消    确定      │ │  │                │
│   │  │ └──────────────────┘ │  │                │
│   │  └───────────────────────┘  │                │
│   └─────────────────────────────┘                │
│                                                   │
│   子窗口通过 emit('result') 返回数据              │
│   主窗口通过 listen('dialog-result') 接收         │
└─────────────────────────────────────────────────┘
```

### 2.2 弹窗分类与对应方案

将所有弹窗按类型归为 **4 类**，分别封装：

| 弹窗类型 | 数量 | 替换方案 | 窗口特征 |
|----------|------|---------|---------|
| **ConfirmDialog** 确认框 | 37 | 小型 Tauri 子窗口 | 400×200, 居中, 不可缩放, 模态 |
| **PromptDialog** 输入框 | 7 | 小型 Tauri 子窗口 | 400×220, 居中, 不可缩放, 模态 |
| **AlertDialog** 提示框 | 3 | 小型 Tauri 子窗口 | 400×180, 居中, 不可缩放, 模态 |
| **FormDialog** 表单/内容窗口 | 41 | 中大型 Tauri 子窗口 | 尺寸自定义, 居中, 可缩放, 模态 |

### 2.3 核心文件规划

```
src/
├── components/
│   └── TauriDialog/
│       ├── TauriDialogShell.vue      # 子窗口壳组件（标题栏+内容slot+底部按钮）
│       ├── useDialogWindow.js         # 封装 Tauri 子窗口创建/通信/关闭
│       ├── ConfirmDialog.vue          # 确认弹窗（替代 ElMessageBox.confirm）
│       ├── PromptDialog.vue           # 输入弹窗（替代 ElMessageBox.prompt）
│       └── AlertDialog.vue            # 提示弹窗（替代 ElMessageBox.alert）
├── router/
│   └── dialog.js                      # 弹窗子窗口路由 /dialog/:type
└── views/
    └── dialogs/                       # 各页面表单弹窗内容（替代 el-dialog）
        ├── PasswordFormDialog.vue     # 密码编辑表单
        ├── CategoryFormDialog.vue     # 分类编辑表单
        ├── BookmarkFormDialog.vue     # 书签编辑表单
        ├── ...                        # 其他表单弹窗
        └── index.js                   # 统一导出
```

### 2.4 TauriDialogShell.vue — 子窗口壳组件

所有弹窗子窗口共用此壳组件，提供：

- **自定义标题栏**：软件图标 + 标题文字 + 关闭按钮（拖拽区域）
- **内容区**：通过 `<slot>` 放入各类弹窗内容
- **底部操作区**：可选的 取消/确定 按钮

```vue
<template>
  <div class="tauri-dialog" data-tauri-drag-region>
    <!-- 标题栏 -->
    <header class="dialog-titlebar" data-tauri-drag-region>
      <div class="titlebar-left">
        <img src="/icon.png" class="titlebar-icon" />
        <span class="titlebar-title">{{ title }}</span>
      </div>
      <button class="titlebar-close" @click="handleClose">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </header>

    <!-- 内容区 -->
    <main class="dialog-body">
      <slot />
    </main>

    <!-- 底部按钮 -->
    <footer v-if="showFooter" class="dialog-footer">
      <slot name="footer">
        <button v-if="showCancel" class="btn-cancel" @click="handleCancel">
          {{ cancelText }}
        </button>
        <button class="btn-confirm" :class="confirmType" @click="handleConfirm">
          {{ confirmText }}
        </button>
      </slot>
    </footer>
  </div>
</template>
```

### 2.5 useDialogWindow.js — 核心封装

```js
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emit, listen } from '@tauri-apps/api/event'

/**
 * 打开一个 Tauri 子窗口弹窗
 * @param {Object} options
 * @param {string} options.type       - 弹窗路由类型，如 'confirm', 'password-form'
 * @param {string} options.title      - 窗口标题
 * @param {number} options.width      - 宽度 (px)
 * @param {number} options.height     - 高度 (px)
 * @param {boolean} options.resizable - 是否可缩放（默认 false）
 * @param {boolean} options.modal     - 是否模态（默认 true）
 * @param {Object} options.data       - 传给子窗口的数据
 * @returns {Promise<any>}            - 子窗口返回的结果
 */
export async function openDialog(options) {
  const {
    type,
    title = 'ToolHub',
    width = 400,
    height = 250,
    resizable = false,
    modal = true,
    data = {}
  } = options

  const label = `dialog-${type}-${Date.now()}`

  const webview = new WebviewWindow(label, {
    url: `/dialog/${type}?data=${encodeURIComponent(JSON.stringify(data))}`,
    title,
    width,
    height,
    resizable,
    center: true,
    decorations: false,       // 无系统标题栏，使用自定义
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    parent: 'main',           // 模态父窗口
  })

  return new Promise((resolve) => {
    const unlisten = listen(`dialog-result-${label}`, (event) => {
      resolve(event.payload)
      unlisten.then(fn => fn())
    })

    webview.onCloseRequested(() => {
      resolve(null) // 用户关闭窗口 = 取消
      unlisten.then(fn => fn())
    })
  })
}

// ==================== 快捷方法 ====================

/** 确认弹窗（替代 ElMessageBox.confirm） */
export function confirmDialog(message, title, options = {}) {
  return openDialog({
    type: 'confirm',
    title: title || '确认',
    width: 420,
    height: 220,
    data: {
      message,
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
      type: options.type || 'warning',  // warning | error | info
    }
  })
}

/** 输入弹窗（替代 ElMessageBox.prompt） */
export function promptDialog(message, title, options = {}) {
  return openDialog({
    type: 'prompt',
    title: title || '输入',
    width: 420,
    height: 240,
    data: {
      message,
      placeholder: options.placeholder || '',
      inputType: options.inputType || 'text',
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
    }
  })
}

/** 提示弹窗（替代 ElMessageBox.alert） */
export function alertDialog(message, title, options = {}) {
  return openDialog({
    type: 'alert',
    title: title || '提示',
    width: 420,
    height: 200,
    data: {
      message,
      confirmText: options.confirmText || '确定',
    }
  })
}
```

### 2.6 表单弹窗调用示例

**替换前（el-dialog）：**
```vue
<el-dialog v-model="dialogVisible" :title="t('passwords.addPassword')" width="500px">
  <!-- 表单内容 -->
</el-dialog>
```

**替换后（Tauri 子窗口）：**
```js
import { openDialog } from '@/components/TauriDialog/useDialogWindow'

const result = await openDialog({
  type: 'password-form',
  title: t('passwords.addPassword'),
  width: 520,
  height: 580,
  resizable: true,
  data: { mode: 'create', categoryId: selectedCategory.value }
})

if (result) {
  // result 包含子窗口提交的表单数据
  await savePassword(result)
}
```

**替换 ElMessageBox.confirm 前：**
```js
await ElMessageBox.confirm(
  t('passwords.confirmDeletePassword'),
  t('passwords.confirmDelete'),
  { type: 'warning' }
)
```

**替换后：**
```js
import { confirmDialog } from '@/components/TauriDialog/useDialogWindow'

const confirmed = await confirmDialog(
  t('passwords.confirmDeletePassword'),
  t('passwords.confirmDelete'),
  { type: 'warning' }
)
if (!confirmed) return
```

---

## 三、实施步骤

### 第一阶段：基础设施（优先级 P0）

1. 创建 `TauriDialogShell.vue` 壳组件（自定义标题栏、图标、关闭按钮）
2. 实现 `useDialogWindow.js` 核心 API
3. 配置 `/dialog/:type` 子窗口路由
4. 配置 `src-tauri/capabilities` 允许子窗口创建

### 第二阶段：替换 ElMessageBox（优先级 P1，共 47 个）

按影响面从小到大：

| 步骤 | 内容 | 文件数 | 弹窗数 |
|------|------|--------|--------|
| 2.1 | 封装 `ConfirmDialog.vue` + `confirmDialog()` | 1 | — |
| 2.2 | 封装 `PromptDialog.vue` + `promptDialog()` | 1 | — |
| 2.3 | 封装 `AlertDialog.vue` + `alertDialog()` | 1 | — |
| 2.4 | 替换 Passwords.vue 中 8 个 confirm | 1 | 8 |
| 2.5 | 替换 NoteView.vue 中 8 个 confirm | 1 | 8 |
| 2.6 | 替换 NoteEditor.vue 中 3 confirm + 4 prompt | 1 | 7 |
| 2.7 | 替换 Todos.vue 中 3 个 confirm | 1 | 3 |
| 2.8 | 替换 AIConversation.vue 中 3 个 confirm | 1 | 3 |
| 2.9 | 替换 Bookmarks.vue 中 2 个 confirm | 1 | 2 |
| 2.10 | 替换 CredentialManager.vue 中 2 个 confirm | 1 | 2 |
| 2.11 | 替换其余零散 confirm/alert/prompt | 6 | 14 |

### 第三阶段：替换 el-dialog 表单弹窗（优先级 P2，共 41 个）

按页面分批进行，每批独立可测：

| 步骤 | 内容 | 弹窗数 |
|------|------|--------|
| 3.1 | Passwords.vue — 12 个 el-dialog → 12 个子窗口页面 | 12 |
| 3.2 | NoteView.vue — 4 个 el-dialog → 4 个子窗口页面 | 4 |
| 3.3 | Bookmarks.vue — 4 个 el-dialog → 4 个子窗口页面 | 4 |
| 3.4 | Todos.vue — 5 个 el-dialog → 5 个子窗口页面 | 5 |
| 3.5 | Calendar.vue — 4 个 el-dialog → 4 个子窗口页面 | 4 |
| 3.6 | AIConversation.vue — 2 个 el-dialog | 2 |
| 3.7 | AIChat.vue — 3 个 el-dialog | 3 |
| 3.8 | Settings.vue — 2 个 el-dialog（迁移进度需特殊处理） | 2 |
| 3.9 | CredentialManager.vue — 2 个 el-dialog | 2 |
| 3.10 | 组件级 — CloseConfirmDialog, AIAssistant, TodoDependencyGraph | 3 |

### 第四阶段：清理（优先级 P3）

1. 移除 `ElMessageBox` 所有 import
2. 移除不再使用的 el-dialog 相关 CSS
3. 统一子窗口主题（跟随主窗口暗色/亮色模式）
4. 添加子窗口打开/关闭动画
5. 处理子窗口中的 i18n（子窗口需共享语言设置）

---

## 四、注意事项

### 4.1 数据通信

- **主窗口 → 子窗口**：通过 URL query 参数传递（轻量数据）或 `emit` 事件
- **子窗口 → 主窗口**：通过 `emit('dialog-result-{label}', payload)` 返回
- **大数据场景**（如回收站表格数据）：使用 Tauri `emit`/`listen` 事件，不走 URL

### 4.2 特殊弹窗处理

| 弹窗 | 特殊要求 | 处理方式 |
|------|---------|---------|
| Settings 迁移进度 | 不可关闭 | 子窗口 `closable: false`，不渲染关闭按钮 |
| NoteView 版本对比 | 90% 宽度 | 根据主窗口尺寸计算像素值 |
| Bookmarks 网站预览 | 80% 宽度 | 同上，且需要 webview 嵌套 |
| TodoDependencyGraph | 90% 宽度 | 近全屏子窗口 |
| CloseConfirmDialog | 退出确认 | 拦截主窗口 close 事件后弹出 |

### 4.3 子窗口主题同步

子窗口加载时需读取主窗口的主题设置（localStorage 或通过 Tauri 事件获取），确保暗色/亮色一致。

### 4.4 性能考虑

- 每个子窗口是独立的 WebView 实例，内存开销约 20-40MB
- 建议对高频弹窗（如 confirm）使用窗口复用机制而非每次新建
- 表单弹窗关闭后及时销毁 WebView

---

## 五、可复用的表单弹窗合并

部分弹窗结构相似，可以合并为通用组件：

| 通用组件 | 复用场景 | 复用次数 |
|---------|---------|---------|
| `CategoryFormDialog` | Passwords/Bookmarks/Todos 的分类编辑 | 5 |
| `DetailViewDialog` | Passwords/Credentials 的详情查看 | 3 |
| `ImportDialog` | Passwords/Bookmarks 的导入 | 2 |
| `HistoryDialog` | Passwords/NoteView 的历史记录 | 2 |

合并后预计 41 个 el-dialog 可缩减为约 **25 个**独立子窗口页面。
