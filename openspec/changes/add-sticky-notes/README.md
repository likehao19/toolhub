# 便签功能 (Sticky Notes) 提案

## 📋 概述

便签功能是一个轻量级的可视化工作区，提供独立桌面窗口，让用户快速浏览和管理日常任务、文档、收藏和日程。

**设计理念：** 物理便签墙的数字化版本 - 彩色、直观、快速访问

## 🎯 核心特性

### 1. 独立窗口运行
- 无边框、可拖动的桌面窗口
- 支持置顶功能，始终可见
- 窗口尺寸：350x400（可调整，最小300x350）

### 2. 彩色页签导航
左侧垂直页签，4种颜色标识不同功能：

| 页签 | 颜色 | 功能 |
|------|------|------|
| 📄 文档速览 | 蓝色 #4F46E5 | 最近编辑的笔记列表 |
| ⭐ 资源收藏 | 粉色 #EC4899 | 常用书签网格 |
| 📅 日程规划 | 绿色 #10B981 | 今日+未来7天日程 |
| ✓ 任务清单 | 橙色 #F59E0B | 未完成待办任务 |

### 3. 数据联动
- 与主应用的笔记、书签、日程、待办模块深度集成
- 实时双向同步，数据始终一致
- 基于事件驱动的更新机制

### 4. 简洁UI
- 顶部：置顶和关闭按钮
- 左侧：60px宽彩色页签
- 右侧：动态背景色内容区
- 无冗余元素，聚焦核心信息

## 🏗️ 技术架构

### 窗口管理
- **框架：** Tauri WebviewWindow
- **配置：** `tauri.conf.json` 中的 `sticky-notes` 窗口
- **权限：** `sticky-notes-window.json` 权限配置

### 组件结构
```
StickyNotes.vue (主容器)
├── SidebarTabs.vue (左侧页签)
└── ContentArea.vue (右侧内容)
    ├── DocumentPreview.vue (文档速览)
    ├── BookmarkGrid.vue (资源收藏)
    ├── ScheduleView.vue (日程规划)
    └── TaskList.vue (任务清单)
```

### 数据同步机制
```
主窗口操作 → 更新数据库 → 触发全局事件
                               ↓
便签窗口监听 → 失效缓存 → 重新加载 → 更新UI
```

### 状态管理
- **运行时：** Vue 3 Composition API (ref/reactive)
- **持久化：** localStorage
- **缓存策略：** 5分钟有效期，事件驱动失效

## 📁 文件清单

### 提案文档
- ✅ `proposal.md` - 提案说明
- ✅ `specs/sticky-notes/spec.md` - 详细需求规范
- ✅ `design.md` - 技术设计文档
- ✅ `tasks.md` - 实施任务清单（14个阶段，60+任务）
- ✅ `README.md` - 本文档

### 配置文件
- ✅ `src-tauri/tauri.conf.json` - 添加窗口配置
- ✅ `src-tauri/capabilities/sticky-notes-window.json` - 权限配置

### 待创建文件
- ⏳ `src/views/StickyNotes.vue`
- ⏳ `src/components/sticky-notes/SidebarTabs.vue`
- ⏳ `src/components/sticky-notes/ContentArea.vue`
- ⏳ `src/components/sticky-notes/DocumentPreview.vue`
- ⏳ `src/components/sticky-notes/BookmarkGrid.vue`
- ⏳ `src/components/sticky-notes/ScheduleView.vue`
- ⏳ `src/components/sticky-notes/TaskList.vue`
- ⏳ `src/utils/stickyNotes.js`
- ⏳ 路由和菜单更新

## 🎨 UI 预览

### 窗口布局（350x400）
```
┌──────────────────────┐
│  🔝    ✖             │ ← 控制栏
├────┬─────────────────┤
│    │                 │
│ 📄 │   文档速览       │
│    │ ┌─────────────┐ │
│ ⭐ │ │📝 项目.md   │ │
│    │ │  2分钟前     │ │
│ 📅 │ ├─────────────┤ │
│    │ │📝 会议.md   │ │
│ ✓  │ │  1小时前     │ │
│    │ └─────────────┘ │
│    │                 │
└────┴─────────────────┘
 50px      300px
```

### 颜色方案
- **文档速览背景：** 渐变蓝 `linear-gradient(135deg, #4F46E5, #6366F1)`
- **资源收藏背景：** 渐变粉 `linear-gradient(135deg, #EC4899, #F472B6)`
- **日程规划背景：** 渐变绿 `linear-gradient(135deg, #10B981, #34D399)`
- **任务清单背景：** 渐变橙 `linear-gradient(135deg, #F59E0B, #FBBF24)`

## 🚀 快速开始

### 验证提案
```bash
openspec validate add-sticky-notes --strict
```

### 开始实施
```bash
# 1. 查看任务清单
cat openspec/changes/add-sticky-notes/tasks.md

# 2. 查看设计文档
cat openspec/changes/add-sticky-notes/design.md

# 3. 查看详细规范
cat openspec/changes/add-sticky-notes/specs/sticky-notes/spec.md
```

## 📊 进度跟踪

- [x] 提案撰写
- [x] 规范定义
- [x] 设计文档
- [x] 任务分解
- [x] Tauri 配置
- [ ] 前端开发（14个阶段）
- [ ] 测试验证
- [ ] 文档完善

## 🔑 关键决策

1. **独立窗口 vs 对话框**
   - 选择：独立窗口
   - 理由：更好的桌面体验，支持置顶和拖拽

2. **数据同步机制**
   - 选择：事件驱动 + localStorage
   - 理由：实时性高，解耦性强

3. **缓存策略**
   - 选择：5分钟有效期
   - 理由：平衡性能和数据新鲜度

4. **功能边界**
   - 选择：查看为主，不支持复杂编辑
   - 理由：保持轻量，避免功能重复

## 📝 使用场景

### 场景1：快速查看今日任务
```
用户打开便签窗口 → 点击"任务清单"页签 → 查看未完成待办
→ 勾选完成某任务 → 主窗口同步更新
```

### 场景2：浏览常用网站
```
用户打开便签窗口 → 点击"资源收藏"页签 → 显示常用书签网格
→ 点击书签图标 → 浏览器打开对应网站
```

### 场景3：检查今日日程
```
用户打开便签窗口 → 点击"日程规划"页签 → 查看今天的会议
→ 点击某个日程 → 主窗口日历模块打开该日期
```

### 场景4：快速访问笔记
```
用户打开便签窗口 → 点击"文档速览"页签 → 看到最近编辑的笔记
→ 点击某个笔记 → 主窗口打开该笔记编辑
```

## 🛡️ 安全考虑

- ✅ 不显示密码等敏感数据
- ✅ URL 经过 XSS 过滤
- ✅ localStorage 不存储敏感信息
- ✅ 生产环境禁用开发者工具

## 🎯 性能目标

- 窗口启动时间：< 500ms
- 页签切换响应：< 100ms
- 数据同步延迟：< 50ms
- 内存占用：< 50MB

## 📚 参考文档

- [提案文档](./proposal.md)
- [详细规范](./specs/sticky-notes/spec.md)
- [技术设计](./design.md)
- [任务清单](./tasks.md)

## 🤝 贡献指南

1. 阅读提案和设计文档
2. 按照 tasks.md 的顺序实施
3. 每完成一个阶段，更新任务清单
4. 提交前运行 `openspec validate add-sticky-notes --strict`

## ❓ 常见问题

**Q: 为什么不能在便签中直接编辑笔记？**  
A: 保持轻量，避免功能重复。便签定位是"快速浏览"而非"深度编辑"。

**Q: 数据如何同步？**  
A: 基于全局事件系统。主窗口操作后触发事件，便签窗口监听并刷新。

**Q: 窗口关闭后数据会丢失吗？**  
A: 不会。窗口状态保存在 localStorage，重新打开时恢复。

**Q: 可以同时打开多个便签窗口吗？**  
A: 不可以。限制只能打开一个，避免状态管理混乱。

**Q: 支持自定义颜色吗？**  
A: V1 不支持，V2 考虑添加主题自定义功能。

---

**状态：** ✅ 提案已完成，等待审批

**验证：** ✅ `openspec validate add-sticky-notes --strict` 通过

**下一步：** 开始实施第一阶段任务（Tauri 配置与窗口设置）
