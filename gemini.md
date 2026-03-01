# ToolHub 桌面工具箱 — Apple 风格 UI/UX 全面优化指南

## 你的角色（Role）

你是一名**资深桌面软件 UI/UX 设计专家与前端样式工程师**，长期负责 macOS / Windows 高端生产力工具的界面优化。
你精通 Apple Human Interface Guidelines（HIG），擅长通过**样式与布局层面**提升软件的专业度与质感。
你的设计产出应当像一个经验丰富的工程师手工打磨的结果，而非任何自动化工具的产出。

---

## 核心目标（Goal）

在**不修改任何业务逻辑代码**的前提下，对 ToolHub 桌面工具箱进行**视觉与交互层面的全面优化**，使其整体观感与使用体验对标 Apple 官方应用水准（参考：macOS System Settings、Finder、Notes、Reminders、Calendar）。

---

## 绝对约束（Hard Constraints）

以下规则必须严格遵守：

### 1. 禁止修改任何逻辑代码
- 不新增业务逻辑、不调整函数调用、数据结构、状态流转
- 仅允许修改或新增：CSS 样式、布局、间距、字体、颜色、阴影、圆角、过渡动画
- 可修改模板中的 class 绑定，但不能改变 DOM 结构和事件绑定

### 2. 禁止任何 AI 风格元素
- 禁止霓虹色、渐变炫光、未来感 UI、赛博朋克风格
- 禁止过度动效、夸张插画、粒子效果
- 禁止"概念设计""实验性设计"
- 不得出现任何暗示 AI 生成的设计痕迹

### 3. 必须使用全局样式系统
- 优先定义 CSS 自定义属性（Custom Properties）作为设计令牌
- 组件级样式引用全局变量，避免硬编码
- 确保"系统级一致性"

### 4. 不引入外部设计体系
- 不使用 Material Design / Fluent Design / Ant Design 语言
- 仅以 Apple HIG 为唯一参照

---

## 一、全局设计系统（Design Tokens）

### 1.1 颜色体系

```css
:root {
  /* —— 背景层级 —— */
  --bg-primary:        #ffffff;          /* 卡片、面板、弹层 */
  --bg-secondary:      #f5f5f7;          /* 页面主背景 */
  --bg-tertiary:       #e8e8ed;          /* 输入框、tag 背景 */
  --bg-grouped:        #f2f2f7;          /* 分组背景（Settings 风格） */

  /* —— 文字层级 —— */
  --text-primary:      #1d1d1f;          /* 标题、正文 */
  --text-secondary:    #6e6e73;          /* 次要文字、描述 */
  --text-tertiary:     #aeaeb2;          /* 占位符、禁用态 */
  --text-quaternary:   #c7c7cc;          /* 极弱文字 */

  /* —— 系统强调色 —— */
  --accent-blue:       #007aff;          /* 主操作、链接、选中态 */
  --accent-blue-hover: #0066d6;          /* 主色 hover */
  --accent-blue-active:#0055b3;          /* 主色 active */
  --accent-blue-bg:    rgba(0,122,255,0.08); /* 选中行背景 */

  /* —— 语义色（低饱和） —— */
  --color-red:         #ff3b30;          /* 删除、错误、高优先级 */
  --color-orange:      #ff9500;          /* 警告、日程 */
  --color-yellow:      #ffcc00;          /* 标记、星标 */
  --color-green:       #34c759;          /* 成功、已完成 */
  --color-teal:        #5ac8fa;          /* 信息 */
  --color-purple:      #af52de;          /* 任务分类 */

  /* —— 分割与边框 —— */
  --border-color:      rgba(0,0,0,0.06); /* 极弱分割线 */
  --border-color-strong:rgba(0,0,0,0.10);/* 强分割线 */
  --divider:           rgba(0,0,0,0.04); /* 区域间分割 */

  /* —— 阴影层级 —— */
  --shadow-sm:         0 0.5px 1px rgba(0,0,0,0.05);
  --shadow-md:         0 2px 8px rgba(0,0,0,0.08);
  --shadow-lg:         0 8px 24px rgba(0,0,0,0.12);
  --shadow-popover:    0 4px 16px rgba(0,0,0,0.14), 0 0 1px rgba(0,0,0,0.06);

  /* —— 圆角 —— */
  --radius-xs:         4px;              /* 小按钮、tag */
  --radius-sm:         6px;              /* 输入框、列表项 */
  --radius-md:         8px;              /* 卡片 */
  --radius-lg:         12px;             /* 大面板、模态框 */
  --radius-xl:         16px;             /* 弹窗 */

  /* —— 间距 —— */
  --space-xs:          4px;
  --space-sm:          8px;
  --space-md:          12px;
  --space-lg:          16px;
  --space-xl:          20px;
  --space-2xl:         24px;
  --space-3xl:         32px;

  /* —— 字体 —— */
  --font-family:       -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI",
                       "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --font-family-mono:  "SF Mono", "Fira Code", "Cascadia Code", "Consolas", monospace;

  /* —— 字号层级 —— */
  --font-size-caption2: 11px;            /* 极小标注 */
  --font-size-caption:  12px;            /* 标注、时间 */
  --font-size-footnote: 13px;            /* 脚注、辅助文字 */
  --font-size-body:     14px;            /* 正文 */
  --font-size-callout:  15px;            /* 强调正文 */
  --font-size-headline: 16px;            /* 小标题 */
  --font-size-title3:   18px;            /* 三级标题 */
  --font-size-title2:   22px;            /* 二级标题 */
  --font-size-title1:   26px;            /* 一级标题 */
  --font-size-large:    32px;            /* 大标题 */

  /* —— 字重 —— */
  --font-weight-regular:  400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;

  /* —— 动效 —— */
  --transition-fast:   120ms ease;
  --transition-normal: 200ms ease;
  --transition-smooth: 300ms cubic-bezier(0.25, 0.1, 0.25, 1);

  /* —— 布局尺寸 —— */
  --header-height:     38px;
  --sidebar-width:     220px;
  --sidebar-collapsed: 56px;
}
```

### 1.2 暗色模式

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary:        #1c1c1e;
    --bg-secondary:      #000000;
    --bg-tertiary:       #2c2c2e;
    --bg-grouped:        #1c1c1e;

    --text-primary:      #f5f5f7;
    --text-secondary:    #98989d;
    --text-tertiary:     #636366;
    --text-quaternary:   #48484a;

    --accent-blue:       #0a84ff;
    --accent-blue-hover: #409cff;
    --accent-blue-bg:    rgba(10,132,255,0.12);

    --color-red:         #ff453a;
    --color-orange:      #ff9f0a;
    --color-yellow:      #ffd60a;
    --color-green:       #30d158;
    --color-teal:        #64d2ff;
    --color-purple:      #bf5af2;

    --border-color:      rgba(255,255,255,0.08);
    --border-color-strong:rgba(255,255,255,0.12);
    --divider:           rgba(255,255,255,0.06);

    --shadow-sm:         0 0.5px 1px rgba(0,0,0,0.3);
    --shadow-md:         0 2px 8px rgba(0,0,0,0.4);
    --shadow-lg:         0 8px 24px rgba(0,0,0,0.5);
    --shadow-popover:    0 4px 16px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.3);
  }
}
```

---

## 二、全局布局架构

### 2.1 应用整体结构

```
┌──────────────────────────────────────────────────────────────┐
│  HeaderBar (38px 固定高度, 窗口拖拽区)                         │
├──────────┬───────────────────────────────────────────────────┤
│          │                                                   │
│ Sidebar  │              主内容区域                             │
│ (220px)  │           (flex: 1, 可滚动)                        │
│          │                                                   │
│ 可折叠    │  ┌─ 页面头部 (breadcrumb + actions) ────────────┐ │
│ → 56px   │  │                                              │ │
│          │  ├─ 页面主体 ───────────────────────────────────┤ │
│          │  │                                              │ │
│ ·工作台   │  │  各页面具体内容                                │ │
│ ·知识管理  │  │  （卡片/列表/表格/编辑器等）                    │ │
│ ·协作效率  │  │                                              │ │
│          │  └──────────────────────────────────────────────┘ │
│ ·工具箱   │                                                   │
│ ·系统设置  │                                                   │
├──────────┴───────────────────────────────────────────────────┤
│  （可选）全局浮层：右键菜单、搜索下拉、关闭确认弹窗               │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 布局样式规范

```css
/* 应用容器 */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-secondary);
  font-family: var(--font-family);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  margin-top: var(--header-height);
}

.app-content {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-secondary);
}
```

---

## 三、HeaderBar（顶部标题栏）优化

### 3.1 当前问题
- 高度 32px 略窄，操作区域紧凑
- logo 使用渐变色过于花哨
- 应用名称使用渐变文字，不符合 Apple 克制风格
- 搜索框直接内嵌标题栏，视觉层级混乱

### 3.2 优化方案

```
┌─ HeaderBar ──────────────────────────────────────────────────┐
│ [Logo] ToolHub          [🔍 全局搜索 ⌘K]    [📌][—][□][✕]   │
└──────────────────────────────────────────────────────────────┘
```

**样式要点：**

```css
.header-bar {
  height: var(--header-height);              /* 38px，macOS 标题栏标准 */
  background: var(--bg-primary);
  border-bottom: 0.5px solid var(--border-color-strong);
  backdrop-filter: saturate(180%) blur(20px); /* 毛玻璃效果 */
  -webkit-app-region: drag;
}

/* Logo：单色系统蓝图标，不使用渐变 */
.app-logo svg path {
  fill: var(--accent-blue);                  /* 单色填充，移除渐变 */
}

/* 应用名称：纯色，semibold，不使用渐变文字 */
.app-name {
  font-size: var(--font-size-footnote);      /* 13px */
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  letter-spacing: 0.3px;
  background: none;                          /* 移除渐变文字效果 */
  -webkit-text-fill-color: var(--text-primary);
}

/* 搜索框：圆角胶囊形，浅灰底色 */
.global-search .el-input {
  width: 260px;
  --el-input-bg-color: var(--bg-tertiary);
  --el-input-border-color: transparent;
  --el-input-hover-border-color: var(--border-color-strong);
  --el-input-focus-border-color: var(--accent-blue);
  border-radius: var(--radius-sm);
}

/* 窗口控制按钮 */
.header-button {
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  border-radius: var(--radius-xs);
  color: var(--text-secondary);
  transition: background var(--transition-fast);
}

.header-button:hover {
  background: var(--bg-tertiary);
}

/* 关闭按钮特殊处理 */
.close-button:hover {
  background: var(--color-red);
  color: #ffffff;
}

/* 搜索结果下拉面板 */
.search-results {
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popover);
  border: 0.5px solid var(--border-color);
}
```

---

## 四、ProductivitySidebar（左侧导航栏）优化

### 4.1 当前问题
- 宽度 240px 偏宽，占用过多水平空间
- 菜单项图标使用多种鲜艳颜色，视觉杂乱
- 选中态使用 `!important` 覆盖，强调过度
- 分组标题的展开/收起箭头与 Apple 风格不一致

### 4.2 导航结构分析

```
左侧导航菜单层级：

[独立项] 工作台             → /            （首页仪表盘）

[分组] 知识管理
  ├── 文档中心              → /notes       （文件夹 + 多格式编辑器）
  ├── 凭据管理              → /passwords   （加密密码存储）
  └── 资源收藏              → /bookmarks   （网址/资源书签）

[分组] 协作效率
  ├── 任务清单              → /todos       （待办事项管理）
  └── 日程规划              → /calendar    （日历 + 事件管理）

[底部固定]
  ├── 工具箱                → /toolbox     （工具集合入口）
  └── 系统设置              → /settings    （应用配置）
```

### 4.3 优化方案

**核心变更：**
- 宽度从 240px 收窄至 220px
- 图标统一使用单色（跟随文字颜色，选中时跟随强调色），移除逐项设定的彩色图标
- 选中态使用浅蓝底色 + 系统蓝文字，不使用 `!important`
- 分组标题使用全大写 caption 字号，与 macOS 系统偏好设置一致
- 底部"工具箱"与"系统设置"使用分割线与主菜单区隔

```css
.productivity-sidebar {
  width: var(--sidebar-width);               /* 220px */
  background: var(--bg-primary);
  border-right: 0.5px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-smooth);
  flex-shrink: 0;
}

.productivity-sidebar.collapsed {
  width: var(--sidebar-collapsed);           /* 56px */
}

/* 折叠按钮区域 */
.sidebar-header {
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-md);
}

/* 分组标题 — macOS Settings 风格 */
.section-header {
  padding: 18px 16px 6px 16px;
  font-size: var(--font-size-caption2);      /* 11px */
  font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  cursor: pointer;
  user-select: none;
}

/* 菜单项 */
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px 7px 20px;
  margin: 1px 8px;
  font-size: var(--font-size-body);          /* 14px */
  font-weight: var(--font-weight-regular);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

/* 图标统一单色 */
.menu-item .el-icon {
  font-size: 16px;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: color var(--transition-fast);
}

/* Hover 态 */
.menu-item:hover {
  background: var(--bg-tertiary);
}

.menu-item:hover .el-icon {
  color: var(--text-primary);
}

/* 选中态 — 系统蓝 */
.menu-item.active {
  background: var(--accent-blue-bg);
  color: var(--accent-blue);
  font-weight: var(--font-weight-medium);
}

.menu-item.active .el-icon {
  color: var(--accent-blue);
}

/* 底部固定区域 */
.menu-section-bottom {
  margin-top: auto;
  padding-top: var(--space-sm);
  border-top: 0.5px solid var(--border-color);
}

/* 工具箱 badge */
.tools-badge :deep(.el-badge__content) {
  background-color: var(--text-tertiary);
  font-size: 10px;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
  border-radius: 8px;
}

/* 滚动条 — 隐藏式 */
.sidebar-content::-webkit-scrollbar {
  width: 4px;
}
.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-content::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 2px;
}
.sidebar-content:hover::-webkit-scrollbar-thumb {
  background: var(--text-quaternary);
}
```

---

## 五、全局通用组件样式（common.css 重构）

### 5.1 页面容器

```css
.page-container {
  padding: var(--space-2xl);
  height: 100%;
  overflow-y: auto;
  background: var(--bg-secondary);
}
```

### 5.2 页面头部（Breadcrumb + Actions 条）

所有内页顶部统一使用此结构：左侧面包屑 + 右侧操作按钮

```css
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
  padding: var(--space-md) 0;
}

.page-header h2 {
  margin: 0;
  font-size: var(--font-size-title2);        /* 22px */
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

/* 面包屑 */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}
```

### 5.3 卡片

```css
.content-card {
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  border: 0.5px solid var(--border-color);
  transition: box-shadow var(--transition-normal);
}

/* Hover 效果 — 克制，仅加深阴影，不位移 */
.content-card:hover {
  box-shadow: var(--shadow-md);
  /* 移除 transform: translateY(-2px)，Apple 风格不做卡片悬浮 */
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  font-size: var(--font-size-headline);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}
```

### 5.4 按钮体系

**主次层级明确：**

| 层级 | 样式 | 使用场景 |
|------|------|---------|
| 主要（Primary） | 系统蓝填充，白字 | 每页最多 1 个核心操作 |
| 次要（Secondary） | 浅灰底色，深灰字 | 辅助操作（导入、导出） |
| 文字（Text） | 无底色，系统蓝字 | 行内操作（查看全部、编辑） |
| 图标（Icon-only） | 无底色，hover 显灰底 | 工具栏图标按钮 |
| 危险（Danger） | 红色文字或红色填充 | 删除操作 |

```css
/* 主要按钮 */
.btn-primary {
  background: var(--accent-blue);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  padding: 6px 14px;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.btn-primary:hover {
  background: var(--accent-blue-hover);
}
.btn-primary:active {
  background: var(--accent-blue-active);
}

/* 次要按钮 */
.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 6px 14px;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-regular);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.btn-secondary:hover {
  background: var(--border-color-strong);
}

/* 图标按钮 */
.btn-icon {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: var(--radius-xs);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast);
}
.btn-icon:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
```

### 5.5 输入框

```css
/* 统一 Element Plus 输入框覆盖 */
:root {
  --el-input-bg-color: var(--bg-primary);
  --el-input-border-color: var(--border-color-strong);
  --el-input-hover-border-color: var(--text-quaternary);
  --el-input-focus-border-color: var(--accent-blue);
  --el-input-border-radius: var(--radius-sm);
  --el-input-text-color: var(--text-primary);
  --el-input-placeholder-color: var(--text-tertiary);
}
```

### 5.6 列表与网格

```css
/* 网格布局 */
.item-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-lg);
}

/* 列表项 */
.list-item {
  padding: var(--space-md);
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
  cursor: pointer;
}
.list-item:hover {
  background: var(--bg-tertiary);
}

/* 排版 */
.item-title {
  font-size: var(--font-size-callout);       /* 15px */
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin-bottom: 2px;
}
.item-subtitle {
  font-size: var(--font-size-footnote);
  color: var(--text-secondary);
}
.time-text {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
}
.meta-tag {
  font-size: var(--font-size-caption2);
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}
```

### 5.7 工具栏与搜索条

```css
.toolbar {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  margin-bottom: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 0.5px solid var(--border-color);
}

.search-bar {
  margin-bottom: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 0.5px solid var(--border-color);
}
```

### 5.8 空状态

```css
.empty-state {
  text-align: center;
  padding: 60px var(--space-xl);
  color: var(--text-tertiary);
  font-size: var(--font-size-callout);
}
```

### 5.9 页面切换动画

```css
.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

---

## 六、逐页优化方案

---

### 6.1 工作台（Dashboard） — `/`

**页面功能：** 首页仪表盘，展示今日概览、待办、日程、最近笔记、快捷操作

**当前布局：**
```
┌─ 标题栏 ───────────────────────────────┐
│ 工作台                    [刷新]         │
├────────────────────────────────────────┤
│ ┌──────┐ ┌──────────┐ ┌──────────┐     │
│ │今日   │ │今日待办   │ │今日日程   │     │
│ │概览   │ │          │ │          │     │
│ └──────┘ └──────────┘ └──────────┘     │
│ ┌──────────┐ ┌──────────────────┐      │
│ │最近笔记   │ │ 快捷操作          │      │
│ └──────────┘ └──────────────────┘      │
└────────────────────────────────────────┘
```

**优化要点：**

- **标题栏**：移除 AI 助手按钮（MagicStick 图标），仅保留"刷新"按钮
- **今日概览卡片**：使用系统蓝或中性色调，日期数字用 `--font-size-large`（32px），`font-weight: 700`，月份和星期用 `--font-size-caption`
- **待办/日程/笔记卡片**：统一卡片结构 — 左上图标 + 标题 + 右上"查看全部"文字按钮
- **快捷操作网格**：使用 2×3 或 3×2 网格，每项为小型卡片，hover 加灰底，不使用大面积色块

```css
/* Dashboard 页面头部 */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2xl);
}
.dashboard-title {
  font-size: var(--font-size-title1);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

/* 卡片网格 */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-xl);
}

/* 今日概览卡片 — 不使用渐变背景，保持白色 */
.today-card {
  background: var(--bg-primary);
  border: 0.5px solid var(--border-color);
}
.today-day {
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  line-height: 1;
}
.today-meta {
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

/* 摘要统计 */
.summary-item .summary-label {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
}
.summary-item .summary-value {
  font-size: var(--font-size-headline);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}
.summary-divider {
  width: 1px;
  height: 24px;
  background: var(--border-color);
}

/* 卡片头部图标 — 使用浅色圆底 + 单色图标 */
.header-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}
.todos-bg {
  background: rgba(0,122,255,0.10);
  color: var(--accent-blue);
}
.events-bg {
  background: rgba(255,149,0,0.10);
  color: var(--color-orange);
}
.notes-bg {
  background: rgba(52,199,89,0.10);
  color: var(--color-green);
}

/* 待办列表项 */
.todo-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 0.5px solid var(--divider);
}
.todo-item:last-child {
  border-bottom: none;
}
.todo-text.completed {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

/* 日程列表项 */
.event-item {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-sm) 0;
  border-bottom: 0.5px solid var(--divider);
  cursor: pointer;
}
.time-badge {
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-medium);
  color: var(--accent-blue);
  min-width: 48px;
}
```

---

### 6.2 文档中心（NoteView） — `/notes`

**页面功能：** 知识库管理，左侧文件夹树 + 右侧多格式编辑器（Markdown / Excel / Word / TXT）

**当前布局：**
```
┌─ 头部（面包屑 + 文件名 + 操作按钮）─────────────┐
├──────────┬─────────────────────────────────────┤
│ 文件夹树  │ 编辑器区域                            │
│          │                                     │
│ ├─ 文件夹 │ ┌─ Markdown / Excel / Word ───────┐ │
│ │  ├─ 文件│ │                                 │ │
│ │  └─ 文件│ │      文档内容编辑                  │ │
│ ├─ 文件夹 │ │                                 │ │
│ │  └─ ...│ └─────────────────────────────────┘ │
│          │                                     │
│ [新建文件夹]│                                     │
│ [新建文件] │                                     │
└──────────┴─────────────────────────────────────┘
```

**优化要点：**

- **文件夹树**：参考 Finder 侧边栏样式 — 行高 28px，图标 14px，缩进 16px/级，选中行背景 `var(--accent-blue-bg)`
- **分割线拖拽手柄**：1px 宽度，hover 时变为 2px 蓝色，暗示可拖拽
- **编辑器切换**：基于文件类型无缝切换，标签栏使用 segmented control 风格
- **面包屑**：`知识库 / 文件夹名` 格式，分隔符用 `/` 浅灰色
- **操作按钮**：编辑、删除、历史 — 使用图标按钮 (btn-icon)，不使用文字

```css
/* 文件树 */
.folder-tree {
  padding: var(--space-sm) 0;
}
.folder-tree-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 4px 12px;
  font-size: var(--font-size-footnote);
  color: var(--text-primary);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background var(--transition-fast);
  user-select: none;
}
.folder-tree-item:hover {
  background: var(--bg-tertiary);
}
.folder-tree-item.active {
  background: var(--accent-blue-bg);
  color: var(--accent-blue);
}
.folder-tree-item .el-icon {
  font-size: 14px;
  color: var(--text-secondary);
}
.folder-tree-item.active .el-icon {
  color: var(--accent-blue);
}

/* 编辑器区域 */
.editor-container {
  flex: 1;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* 拖拽分割手柄 */
.resize-handle {
  width: 1px;
  background: var(--border-color);
  cursor: col-resize;
  transition: all var(--transition-fast);
}
.resize-handle:hover {
  width: 2px;
  background: var(--accent-blue);
}
```

---

### 6.3 凭据管理（Passwords） — `/passwords`

**页面功能：** 加密密码存储，左侧分类 + 右侧密码条目列表

**当前布局：**
```
┌─ 头部（搜索 + 回收站/审计/导入导出/锁/新建）────┐
├──────────┬───────────────────────────────────┤
│ 分类侧边栏 │ 密码条目列表                       │
│          │                                   │
│ · 全部    │ ┌─ 条目 ─────────────────────┐   │
│ · 常用    │ │ [图标] 名称    ****    [复制]│   │
│ · 社交    │ └───────────────────────────┘   │
│ · 工作    │ ┌─ 条目 ─────────────────────┐   │
│ · 金融    │ │ [图标] 名称    ****    [复制]│   │
│           │ └───────────────────────────┘   │
│ [+新分类]  │                                   │
└──────────┴───────────────────────────────────┘
```

**优化要点：**

- **页面头部按钮**：按主次排列 — [+ 新建] 为 Primary，[导入][导出] 为 Secondary，[回收站][审计][锁定] 为 Icon-only
- **分类侧边栏**：与文档中心左侧保持一致的侧边栏样式（行高、字号、缩进）
- **密码条目**：使用纯白卡片行布局，密码字段用 `••••••` 遮罩，显示/复制按钮为图标按钮
- **安全审计**：使用进度条展示密码强度，颜色语义化（红/橙/绿）

```css
/* 密码条目行 */
.password-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-primary);
  border-bottom: 0.5px solid var(--divider);
  transition: background var(--transition-fast);
}
.password-item:hover {
  background: var(--bg-tertiary);
}

/* 密码遮罩字体 */
.password-mask {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-body);
  color: var(--text-secondary);
  letter-spacing: 2px;
}
```

---

### 6.4 资源收藏（Bookmarks） — `/bookmarks`

**页面功能：** 网址/资源书签管理，左侧分类 + 右侧书签卡片网格

**当前布局：**
```
┌─ 头部（搜索 + 导入/导出/新建）────────────────┐
├──────────┬───────────────────────────────────┤
│ 分类侧边栏 │ 书签卡片网格                       │
│          │                                   │
│ · 全部    │ ┌──────┐ ┌──────┐ ┌──────┐      │
│ · 常用    │ │icon  │ │icon  │ │icon  │      │
│ · 开发    │ │名称   │ │名称   │ │名称   │      │
│ · 设计    │ │描述   │ │描述   │ │描述   │      │
│           │ │url   │ │url   │ │url   │      │
│ [+新分类]  │ └──────┘ └──────┘ └──────┘      │
└──────────┴───────────────────────────────────┘
```

**优化要点：**

- **书签卡片**：使用 `minmax(240px, 1fr)` 网格，卡片内上方显示 favicon + 名称，下方显示 URL 截断，hover 显示完整 URL tooltip
- **favicon 占位**：当无 favicon 时，使用网站首字母 + 浅色圆角方块作为占位
- **卡片交互**：hover 加深阴影，不做位移动画
- **星标收藏**：使用实心/空心星标图标，位于卡片右上角

```css
/* 书签卡片 */
.bookmark-card {
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 0.5px solid var(--border-color);
  padding: var(--space-lg);
  transition: box-shadow var(--transition-normal);
}
.bookmark-card:hover {
  box-shadow: var(--shadow-md);
}

/* Favicon */
.bookmark-favicon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-headline);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
}

/* URL 显示 */
.bookmark-url {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

---

### 6.5 任务清单（Todos） — `/todos`

**页面功能：** 待办事项管理，左侧分类筛选 + 右侧任务列表

**当前布局：**
```
┌─ 头部（侧边栏切换 + 面包屑 + 搜索 + 新建）────┐
├──────────┬───────────────────────────────────┤
│ 筛选侧边栏 │ 任务列表                           │
│          │                                   │
│ · 全部    │ ☐ 任务标题      [重要]    截止日期  │
│ · 今日    │ ☐ 任务标题              截止日期   │
│ · 重要    │ ☑ 任务标题（已完成）                │
│ · 已完成   │                                   │
│           │                                   │
│ 自定义分类  │                                   │
│ · 工作    │                                   │
│ · 学习    │                                   │
└──────────┴───────────────────────────────────┘
```

**优化要点：**

- **筛选侧边栏**：参考 Apple Reminders 风格 — "今日"旁显示数字角标，"重要"使用旗标图标，选中态背景为系统蓝浅色
- **任务列表**：每行左侧圆形 checkbox（参考 Apple Reminders），右侧可选显示优先级标签和截止日期
- **优先级标签**：高→红色小圆点，中→橙色小圆点，低→不显示
- **已完成任务**：文字划线 + 灰色，checkbox 填充系统蓝

```css
/* 任务行 */
.todo-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  border-bottom: 0.5px solid var(--divider);
  transition: background var(--transition-fast);
}
.todo-item:hover {
  background: var(--bg-tertiary);
}

/* Checkbox 覆盖 — 圆形 */
.todo-item :deep(.el-checkbox__inner) {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid var(--text-quaternary);
}
.todo-item :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
}

/* 优先级指示器 */
.priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.priority-high { background: var(--color-red); }
.priority-medium { background: var(--color-orange); }

/* 截止日期 */
.due-date {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  white-space: nowrap;
}
.due-date.overdue {
  color: var(--color-red);
}
```

---

### 6.6 日程规划（Calendar） — `/calendar`

**页面功能：** 日历视图 + 事件管理，支持月/周/日/列表四种视图，含农历和节假日

**当前布局：**
```
┌─ 头部（面包屑 + 视图切换 + 分类筛选 + 导入导出新建）┐
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌─ 月视图 ──────────────────────────────────┐   │
│  │ 日 一 二 三 四 五 六                        │   │
│  │ ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐             │   │
│  │ │  ││  ││  ││  ││  ││  ││  │             │   │
│  │ │农历││  ││  ││  ││  ││  ││  │             │   │
│  │ │·· ││  ││  ││  ││  ││  ││  │             │   │
│  │ └──┘└──┘└──┘└──┘└──┘└──┘└──┘             │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
└──────────────────────────────────────────────────┘
```

**优化要点：**

- **视图切换器**：使用 Segmented Control 样式（圆角胶囊底色，选中项为白底 + 阴影），取代 radio-button-group
- **日历网格**：单元格边框使用 `var(--divider)` 极淡分割，今日单元格底部用系统蓝圆点标记（参考 Apple Calendar）
- **事件标记**：日期下方用小圆点指示有事件，不同分类用不同语义色
- **农历文字**：使用 `var(--font-size-caption2)` 和 `var(--text-tertiary)` 颜色
- **头部操作按钮**：[+ 新建日程] 为 Primary，[导入][导出] 为 Secondary，分类筛选为下拉选择器

```css
/* Segmented Control */
.view-switcher {
  display: inline-flex;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 2px;
}
.view-switcher-item {
  padding: 4px 14px;
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  border-radius: calc(var(--radius-sm) - 2px);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.view-switcher-item.active {
  background: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

/* 日历单元格 */
.calendar-cell {
  min-height: 80px;
  border: 0.5px solid var(--divider);
  padding: var(--space-xs);
}
.calendar-cell.today .day-number {
  background: var(--accent-blue);
  color: #ffffff;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-semibold);
}

/* 农历文字 */
.lunar-text {
  font-size: var(--font-size-caption2);
  color: var(--text-tertiary);
}

/* 事件圆点 */
.event-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-blue);
}
```

---

### 6.7 工具箱（Toolbox） — `/toolbox`

**页面功能：** 工具集合入口，按分类展示工具卡片网格

**当前布局：**
```
┌─ 头部（面包屑 + 自定义工具箱按钮）─────────────┐
├──────────────────────────────────────────────┤
│ 笔记工具                                      │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │emoji │ │emoji │ │emoji │ │emoji │         │
│ │名称   │ │名称   │ │名称   │ │名称   │         │
│ └──────┘ └──────┘ └──────┘ └──────┘         │
│                                              │
│ 开发工具                                      │
│ ┌──────┐ ┌──────┐ ┌──────┐                  │
│ │emoji │ │emoji │ │emoji │                  │
│ │名称   │ │名称   │ │名称   │                  │
│ └──────┘ └──────┘ └──────┘                  │
│                                              │
│ 实用工具 / 效率工具 / 网络工具 ...              │
└──────────────────────────────────────────────┘
```

**优化要点：**

- **分类标题**：移除 emoji 前缀，使用纯文字 + semibold 字重 + `--text-secondary` 颜色，与 macOS Launchpad 文件夹标题风格一致
- **工具卡片**：使用方形卡片（约 96px × 96px），居中图标 + 底部名称，hover 整体提亮背景
- **禁用态工具**：使用 opacity: 0.4 + 不可点击，底部"开发中"标签使用 `var(--text-tertiary)` 灰色
- **自定义按钮**：使用 Secondary 样式按钮

```css
/* 工具分类标题 */
.category-header {
  font-size: var(--font-size-headline);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  padding: var(--space-lg) 0 var(--space-md);
}

/* 工具卡片网格 */
.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 100px));
  gap: var(--space-lg);
}

/* 工具卡片 */
.tool-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-lg) var(--space-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.tool-card:hover {
  background: var(--bg-tertiary);
}
.tool-card.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-icon {
  font-size: 28px;
  line-height: 1;
}
.tool-name {
  font-size: var(--font-size-caption);
  color: var(--text-primary);
  text-align: center;
}

.dev-tag {
  font-size: var(--font-size-caption2) !important;
  color: var(--text-tertiary) !important;
  background: var(--bg-tertiary) !important;
  border: none !important;
}
```

---

### 6.8 系统设置（Settings） — `/settings`

**页面功能：** 应用配置，左侧设置菜单 + 右侧设置表单

**当前布局：**
```
┌─ 头部（面包屑：设置 / 当前项 + 保存/重置按钮）───┐
├──────────┬───────────────────────────────────┤
│ 设置菜单  │ 设置内容区域                        │
│          │                                   │
│ · 通用    │ [通用设置]                         │
│ · 外观    │ ┌─ 窗口与启动 ─────────────────┐  │
│ · 高级    │ │ 窗口关闭行为   (o)询问         │  │
│ · 快捷键  │ │ 开机自启       [开关]          │  │
│ · 便签    │ └─────────────────────────────┘  │
│          │ ┌─ 外观与主题 ─────────────────┐  │
│          │ │ 主题模式       浅色/深色/自动   │  │
│          │ │ 字体大小       [滑块]          │  │
│          │ └─────────────────────────────┘  │
└──────────┴───────────────────────────────────┘
```

**优化要点：**

- **整体风格**：完全参照 macOS System Settings — 左侧菜单用搜索框 + 图标列表，右侧使用 Grouped 分组卡片
- **左侧菜单**：每项使用 30px 行高，图标 16px，选中项使用 `var(--accent-blue-bg)` 背景 + `var(--accent-blue)` 文字
- **右侧分组卡片**：使用 `var(--bg-grouped)` 页面背景 + 纯白卡片区域，每个设置组用圆角卡片包裹
- **表单项**：label 居左 140px 固定宽度，控件居右对齐，行间距 16px
- **保存/重置按钮**：保存为 Primary 图标按钮，重置为 Icon-only 按钮

```css
/* Settings 整体布局 */
.settings-page-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-grouped);
}

/* 左侧设置菜单 */
.sidebar-left {
  width: 200px;
  background: var(--bg-primary);
  border-right: 0.5px solid var(--border-color);
  padding: var(--space-sm);
}
.sidebar-left .menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 6px 10px;
  margin: 1px 0;
  font-size: var(--font-size-footnote);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.sidebar-left .menu-item:hover {
  background: var(--bg-tertiary);
}
.sidebar-left .menu-item.active {
  background: var(--accent-blue-bg);
  color: var(--accent-blue);
}
.sidebar-left .menu-icon {
  font-size: 16px;
  color: var(--text-secondary);
}
.sidebar-left .menu-item.active .menu-icon {
  color: var(--accent-blue);
}

/* 右侧内容区域 */
.settings-section {
  max-width: 680px;
  margin: 0 auto;
}
.section-title {
  font-size: var(--font-size-title3);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-xl);
}

/* 设置分组卡片 */
.settings-section .el-card {
  border-radius: var(--radius-lg);
  border: 0.5px solid var(--border-color);
  box-shadow: none;
  margin-bottom: var(--space-xl);
}
.settings-section .el-card .card-header {
  font-size: var(--font-size-callout);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

/* 表单行 */
.settings-section .el-form-item {
  margin-bottom: var(--space-lg);
  border-bottom: 0.5px solid var(--divider);
  padding-bottom: var(--space-lg);
}
.settings-section .el-form-item:last-child {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}
```

---

### 6.9 数据统计（Statistics） — `/statistics`（隐藏页面，可通过路由访问）

**页面功能：** 使用分析与数据图表，展示笔记/待办/日程的统计信息

**优化要点：**

- **统计数字卡片**：顶部一行 3-4 列数字摘要卡片，数字用 `--font-size-title2` + `--font-weight-bold`
- **图表区域**：ECharts 图表背景使用 `var(--bg-primary)` 白色卡片，不添加额外装饰
- **时间范围选择器**：使用 Segmented Control 风格（7天/30天/90天/全部）
- **配色方案**：图表配色使用语义色的低饱和度版本

```css
/* 统计数字卡片 */
.stat-card {
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 0.5px solid var(--border-color);
  padding: var(--space-xl);
  text-align: center;
}
.stat-value {
  font-size: var(--font-size-title2);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}
.stat-label {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  margin-top: var(--space-xs);
}

/* 图表卡片 */
.chart-card {
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 0.5px solid var(--border-color);
  padding: var(--space-xl);
}
```

---

### 6.10 关于页面（About） — `/about`

**页面功能：** 项目信息展示，版本号、技术栈、功能列表

**优化要点：**

- **应用图标**：居中展示，使用 64px 方形圆角图标
- **版本号**：图标下方居中，使用 `--font-size-headline` + `--text-secondary`
- **信息列表**：使用表格化布局（标签 + 值），与 macOS 关于对话框一致
- **功能列表**：简洁的分组列表，不使用时间线 UI

```css
/* 关于页面 */
.about-container {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--space-3xl);
  text-align: center;
}
.about-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  margin: 0 auto var(--space-lg);
}
.about-version {
  font-size: var(--font-size-headline);
  color: var(--text-secondary);
  margin-bottom: var(--space-3xl);
}
.about-info-table {
  width: 100%;
  text-align: left;
}
.about-info-table td {
  padding: var(--space-sm) 0;
  font-size: var(--font-size-body);
  border-bottom: 0.5px solid var(--divider);
}
.about-info-table td:first-child {
  color: var(--text-secondary);
  width: 100px;
}
```

---

## 七、启动画面（Splash Screen）优化

### 当前问题
- 使用紫色渐变背景（`#667eea → #764ba2`），过于鲜艳
- 标题字号 32px 过大
- 脉冲动画过于花哨

### 优化方案

```css
/* 启动画面 — 纯白底色，简洁居中 */
.splash-screen {
  position: fixed;
  inset: 0;
  background: var(--bg-primary);            /* 纯白背景 */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.splash-logo svg {
  width: 56px;
  height: 56px;
}
.splash-logo svg path {
  fill: var(--text-primary);                /* 深灰单色 logo */
}

.splash-title {
  font-size: var(--font-size-title3);       /* 18px */
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  letter-spacing: 1px;
  margin-top: var(--space-lg);
}

/* 进度条 — 极细灰底蓝条 */
.progress-bar {
  width: 180px;
  height: 2px;
  background: var(--bg-tertiary);
  border-radius: 1px;
  margin-top: var(--space-xl);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--accent-blue);
  border-radius: 1px;
  transition: width var(--transition-smooth);
}

.progress-text {
  font-size: var(--font-size-caption);
  color: var(--text-tertiary);
  margin-top: var(--space-sm);
}
```

---

## 八、全局浮层与弹窗优化

### 8.1 右键菜单（ContextMenu）

```css
.context-menu {
  background: var(--bg-primary);
  border: 0.5px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popover);
  padding: var(--space-xs) 0;
  min-width: 160px;
  backdrop-filter: saturate(180%) blur(20px);
}

.context-menu-item {
  padding: 6px 12px;
  font-size: var(--font-size-footnote);
  color: var(--text-primary);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.context-menu-item:hover {
  background: var(--accent-blue);
  color: #ffffff;
  border-radius: var(--radius-xs);
  margin: 0 var(--space-xs);
}
```

### 8.2 关闭确认对话框（CloseConfirmDialog）

```css
.close-dialog {
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}
.close-dialog .el-dialog__header {
  padding: var(--space-xl) var(--space-2xl) var(--space-md);
}
.close-dialog .el-dialog__title {
  font-size: var(--font-size-headline);
  font-weight: var(--font-weight-semibold);
}
.close-dialog .el-dialog__body {
  padding: 0 var(--space-2xl) var(--space-xl);
  font-size: var(--font-size-body);
  color: var(--text-secondary);
}
.close-dialog .el-dialog__footer {
  padding: 0 var(--space-2xl) var(--space-xl);
}
```

---

## 九、Element Plus 全局覆盖

统一覆盖 Element Plus 组件的默认样式，使其贴合 Apple 风格：

```css
:root {
  /* Element Plus 颜色变量覆盖 */
  --el-color-primary: var(--accent-blue);
  --el-color-success: var(--color-green);
  --el-color-warning: var(--color-orange);
  --el-color-danger: var(--color-red);
  --el-color-info: var(--text-tertiary);

  --el-bg-color: var(--bg-primary);
  --el-bg-color-page: var(--bg-secondary);
  --el-bg-color-overlay: var(--bg-primary);

  --el-text-color-primary: var(--text-primary);
  --el-text-color-regular: var(--text-secondary);
  --el-text-color-secondary: var(--text-tertiary);
  --el-text-color-placeholder: var(--text-tertiary);

  --el-border-color: var(--border-color-strong);
  --el-border-color-light: var(--border-color);
  --el-border-color-lighter: var(--divider);

  --el-border-radius-base: var(--radius-sm);
  --el-border-radius-small: var(--radius-xs);
  --el-border-radius-round: 20px;

  --el-font-family: var(--font-family);
  --el-font-size-base: var(--font-size-body);
  --el-font-size-small: var(--font-size-footnote);
  --el-font-size-extra-small: var(--font-size-caption);

  --el-transition-duration: 200ms;

  /* Card */
  --el-card-border-radius: var(--radius-md);
  --el-card-border-color: var(--border-color);
  --el-card-padding: var(--space-xl);

  /* Dialog */
  --el-dialog-border-radius: var(--radius-xl);

  /* Switch */
  --el-switch-on-color: var(--accent-blue);
}

/* Tag — 低饱和度 */
.el-tag {
  border: none;
  font-weight: var(--font-weight-medium);
}
.el-tag--danger {
  background: rgba(255,59,48,0.10);
  color: var(--color-red);
}
.el-tag--warning {
  background: rgba(255,149,0,0.10);
  color: var(--color-orange);
}
.el-tag--success {
  background: rgba(52,199,89,0.10);
  color: var(--color-green);
}
.el-tag--info {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

/* Button — 移除默认 border */
.el-button--primary {
  border: none;
}
.el-button--default {
  border: 0.5px solid var(--border-color-strong);
}

/* Scrollbar — 极细隐藏式 */
.el-scrollbar__thumb {
  background: var(--text-quaternary);
  border-radius: 2px;
}
.el-scrollbar__bar {
  opacity: 0;
  transition: opacity var(--transition-normal);
}
.el-scrollbar:hover .el-scrollbar__bar {
  opacity: 1;
}
```

---

## 十、交互动效规范

### 10.1 原则
- 所有动效**快速、克制、不抢注意力**
- 仅用于**状态反馈**（hover、active、focus），不作装饰
- 移除所有 `scale()` 变换（当前侧边栏图标 hover 有 scale(1.1)，应移除）

### 10.2 统一规范

| 场景 | 属性 | 持续时间 | 缓动函数 |
|------|------|---------|---------|
| hover 背景变化 | background-color | 120ms | ease |
| 选中态切换 | background, color | 200ms | ease |
| 卡片阴影变化 | box-shadow | 200ms | ease |
| 侧边栏折叠 | width | 300ms | cubic-bezier(0.25,0.1,0.25,1) |
| 页面切换 | opacity | 150ms | ease |
| 弹窗出入 | opacity, transform | 200ms | ease |

### 10.3 移除项

```css
/* 移除以下样式 */
.menu-item:hover .el-icon {
  /* transform: scale(1.1); ← 移除 */
}
.menu-item.active .el-icon {
  /* transform: scale(1.15); ← 移除 */
}
.content-card:hover {
  /* transform: translateY(-2px); ← 移除 */
}
```

---

## 十一、自检清单

在输出每一份样式修改前，必须逐项确认：

- [ ] 看起来像 macOS 原生工具（System Settings / Finder / Notes / Calendar），而非概念设计
- [ ] 没有任何渐变色、霓虹色、高饱和炫彩
- [ ] 没有任何 AI 相关的 UI 元素（浮动球、AI 图标、智能提示）
- [ ] 颜色系统严格使用全局 CSS 变量，无硬编码
- [ ] 按钮层级清晰 — Primary / Secondary / Text / Icon-only / Danger 各有归属
- [ ] 所有 hover/active 反馈轻微且一致
- [ ] 字体层级通过字号和字重（非颜色）区分
- [ ] 阴影极弱，仅用于浮层和卡片层级区分
- [ ] 圆角统一（4/6/8/12/16px 体系），无夸张大圆角
- [ ] 间距统一（4/8/12/16/20/24/32px 体系），对齐精确
- [ ] 暗色模式所有变量正确切换
- [ ] 没有触碰任何逻辑代码（事件绑定、数据流、状态管理）

---

## 十二、最终原则

**这是一个给专业用户日常使用、长期陪伴的桌面工具，不是设计展览品。**

一切样式修改都服务于：**更清晰的信息层级、更高效的操作反馈、更耐看的视觉质感。**

克制即高级。
