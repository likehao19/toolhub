# Project Context

## Purpose
这是一个生产级的桌面应用模板项目，结合了现代前端技术栈和 Tauri 原生能力。项目旨在提供一个快速启动跨平台桌面应用的基础模板，包含完整的窗口管理、系统托盘、主题系统、文件操作等常用功能。

主要目标：
- 提供开箱即用的 Vue3 + Tauri 桌面应用模板
- 展示 Tauri 2 的核心功能和最佳实践
- 实现模块化、可维护的代码架构
- 支持 Windows、macOS、Linux 多平台构建

## Tech Stack

### 前端技术
- **Vue 3** (3.5.13) - 渐进式 JavaScript 框架，使用 Composition API
- **Vite** (6.0.3) - 极速构建工具和开发服务器
- **Vue Router** (4.6.4) - 官方路由管理器
- **Pinia** (3.0.4) - 状态管理库，配合 `pinia-plugin-persistedstate` 实现状态持久化
- **Element Plus** (2.13.0) - Vue 3 UI 组件库
- **unplugin-auto-import** - 自动导入 Vue API、Router、Pinia
- **unplugin-vue-components** - Element Plus 组件自动注册

### 后端技术
- **Tauri 2** - Rust 桌面应用框架
- **Rust** (Edition 2021) - 系统编程语言
- **Tokio** - 异步运行时
- **Serde** - 序列化/反序列化框架

### Tauri 插件
- tauri-plugin-single-instance - 单实例应用
- tauri-plugin-opener - 打开外部链接
- tauri-plugin-dialog - 文件对话框
- tauri-plugin-fs - 文件系统操作
- tauri-plugin-notification - 系统通知
- tauri-plugin-clipboard-manager - 剪贴板管理
- tauri-plugin-shell - Shell 命令执行
- tauri-plugin-process - 进程管理
- tauri-plugin-os - 操作系统信息
- tauri-plugin-store - 持久化存储
- tauri-plugin-http - HTTP 请求
- tauri-plugin-sql - SQLite 数据库
- tauri-plugin-websocket - WebSocket 支持
- tauri-plugin-upload - 文件上传
- tauri-plugin-global-shortcut - 全局快捷键
- tauri-plugin-cli - 命令行参数
- tauri-plugin-positioner - 窗口定位
- tauri-plugin-log - 日志记录
- tauri-plugin-updater - 自动更新
- tauri-plugin-autostart - 开机自启

### 构建工具
- **Vite** - 前端构建和开发服务器
- **Cargo** - Rust 包管理和构建工具
- **Tauri CLI** - Tauri 应用构建工具

## Project Conventions

### Code Style

#### 文件命名规范
- **组件文件**: PascalCase (如 `ThemeSettingCard.vue`, `TitleBar.vue`)
- **工具函数/Composables**: camelCase (如 `useWindow.js`, `useSettings.js`)
- **常量文件**: 使用 `index.js` 或 kebab-case
- **Rust 文件**: snake_case (如 `file_ops.rs`, `window.rs`)

#### 函数命名规范
- **事件处理函数**: `handle` 前缀 (如 `handleClick`, `handleClose`)
- **Composable 函数**: `use` 前缀 (如 `useWindow`, `useSettings`)
- **API 函数**: 动词开头 (如 `createWindow`, `fetchData`, `readFile`)
- **Rust 命令函数**: snake_case (如 `create_child_window`, `read_file_tree`)

#### 代码注释规范
- 所有导出的函数必须添加 JSDoc 注释，包含参数和返回值说明
- Rust 函数使用 `///` 文档注释
- 复杂逻辑应添加行内注释说明
- 组件 props 应添加类型和描述注释

#### 代码格式化
- JavaScript/Vue: 使用项目默认格式化配置
- Rust: 使用 `rustfmt` 标准格式化
- 使用单引号（JavaScript）
- 使用 2 空格缩进（JavaScript/Vue）
- 使用 4 空格缩进（Rust）

### Architecture Patterns

#### 分层架构
1. **API 层** (`src/api/`): 封装所有与 Rust 后端的通信，统一错误处理
2. **Composables 层** (`src/composables/`): 可复用的业务逻辑，使用 Vue Composition API
3. **组件层** (`src/components/`): UI 组件，保持单一职责原则
4. **视图层** (`src/views/`): 页面级组件，组合多个子组件
5. **工具层** (`src/utils/`): 工具函数，特别是 Tauri API 封装

#### 关注点分离
- **常量配置** (`src/constants/`): 所有魔法数字和字符串统一管理
- **状态管理** (`src/store/`): 全局状态使用 Pinia，支持持久化
- **路由管理** (`src/router/`): 页面路由配置，使用懒加载
- **类型定义** (`src/types/`): TypeScript 类型定义（预留）

#### 模块化原则
- 每个模块职责单一，易于测试和维护
- 通过 `index.js` 统一导出，简化导入路径
- 使用路径别名 `@` 指向 `src` 目录

#### Rust 后端架构
- **commands/** - Tauri 命令处理器，按功能模块划分
- **setup.rs** - 应用初始化配置（窗口、托盘等）
- **state.rs** - 应用状态管理
- **error.rs** - 统一错误处理
- **config.rs** - 配置常量

### Testing Strategy
目前项目尚未配置测试框架。建议后续添加：
- **单元测试**: 使用 Vitest 测试 Vue 组件和工具函数
- **集成测试**: 测试 Tauri 命令和 API 调用
- **E2E 测试**: 使用 Playwright 或 Tauri 测试工具

### Git Workflow
- 使用标准 Git Flow 或 GitHub Flow
- 提交信息使用中文或英文，清晰描述变更内容
- 主要分支：`main` (生产), `develop` (开发)
- 功能分支：`feature/功能名称`
- 修复分支：`fix/问题描述`

## Domain Context

### 核心功能模块
1. **窗口管理**
   - 启动画面（Splash Screen）600x400px
   - 无边框主窗口，自定义标题栏
   - 子窗口创建和管理
   - 窗口最小化/最大化/关闭控制

2. **系统托盘**
   - 最小化到托盘功能
   - 托盘菜单（显示/隐藏/退出）
   - 托盘图标点击事件处理

3. **主题系统**
   - 亮色/暗色主题切换
   - 使用 Pinia 持久化主题设置到 localStorage

4. **关闭行为定制**
   - 询问用户（默认）
   - 最小化到托盘
   - 直接退出
   - 记住用户选择

5. **文件操作**
   - 文件树读取（支持流式读取大目录）
   - 文件读写操作
   - 文件复制/移动/重命名
   - Base64 编码/解码

6. **其他原生能力**
   - 文件选择器/保存对话框
   - 系统通知
   - 剪贴板操作
   - Shell 命令执行
   - 进程管理
   - HTTP 请求
   - WebSocket 通信
   - SQLite 数据库
   - 全局快捷键
   - 自动更新

### 开发配置
- **开发服务器端口**: 1420
- **HMR 端口**: 1421
- **自动导入**: Vue API、Router、Pinia、Element Plus 组件
- **路径别名**: `@` 指向 `src` 目录

### 构建输出
- **Windows**: MSI 和 NSIS 安装程序，支持简体中文和英语
- **应用标识符**: `com.tauri-app.vue3-vite-tauri-template`
- **产品名称**: Vue3 Tauri Desktop App

## Important Constraints

### 技术约束
- 必须使用 Tauri 2 API，不兼容 Tauri 1.x
- 前端必须使用 Vue 3 Composition API 风格
- Rust 代码必须遵循 Rust 2021 Edition
- 所有 Tauri 命令必须通过 `invoke_handler` 注册

### 平台约束
- Windows: 需要 Windows 10 或更高版本
- macOS: 需要 macOS 10.13 或更高版本
- Linux: 需要支持的系统库（GTK3/GTK4）

### 安全约束
- 所有文件操作必须通过 Tauri 权限系统
- 外部链接必须使用 `tauri-plugin-opener` 打开
- Shell 命令执行需要用户明确授权

### 性能约束
- 大目录文件树读取使用流式处理，避免阻塞主线程
- 窗口操作使用异步 API
- 状态更新使用响应式系统，避免不必要的重渲染

## External Dependencies

### 核心服务
- **Tauri API** - 所有原生功能通过 Tauri API 访问
- **Element Plus** - UI 组件库，提供完整的组件系统

### 开发工具
- **Vite Dev Server** - 开发时的热模块替换
- **Tauri Dev** - Tauri 开发模式，连接前端和后端

### 运行时依赖
- **系统 WebView** - Tauri 使用系统 WebView（Windows: WebView2, macOS: WKWebView, Linux: WebKitGTK）
- **Rust 运行时** - 编译后的 Rust 二进制文件

### 构建时依赖
- **Node.js** - 前端构建环境
- **Rust Toolchain** - Rust 编译工具链
- **系统构建工具** - Windows: Visual Studio Build Tools, macOS: Xcode Command Line Tools, Linux: 系统开发库
