# Change: 添加便签（Sticky Notes）功能

## Why
用户需要一个轻量级、快速访问的可视化工作区，可以在桌面独立窗口中查看和管理日常任务、文档、收藏和日程，类似物理便签墙的数字化版本。传统笔记功能过于复杂，不适合快速记录和一目了然的信息展示。

## What Changes
- 添加全新的便签（Sticky Notes）模块，支持独立窗口运行
- 初始窗口尺寸 350x400，可调整大小（最小300x350）
- 左侧彩色页签导航（4种颜色），右侧对应颜色内容区
- 包含4个功能板块：文档速览、资源收藏、日程规划、任务清单
- 与现有模块深度联动（笔记、书签、日程、待办）
- 简洁紧凑的UI设计，包含关闭和置顶按钮
- 支持无窗口装饰的独立浮窗模式
- 在左侧导航菜单中添加入口

## Impact
- 新增能力：`sticky-notes` 规范
- 影响代码：
  - `src-tauri/tauri.conf.json` - 添加独立窗口配置
  - `src/views/StickyNotes.vue` - 主组件
  - `src/router/index.js` - 路由配置
  - `src/App.vue` - 侧边栏菜单
  - `src/utils/stickyNotes.js` - 工具函数
- 关联模块：与 notes、bookmarks、calendar、todos 集成
- 用户体验：提供快速可视化的信息中心，提升工作效率
