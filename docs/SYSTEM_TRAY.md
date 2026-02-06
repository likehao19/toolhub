# 系统托盘功能说明

## 功能概述

系统托盘功能已完整实现，提供以下能力：
- 系统托盘图标显示
- 右键菜单（显示/隐藏窗口、退出）
- 单击托盘图标切换窗口显示状态
- JavaScript API 封装

## 已完成的任务

### 1. Rust 后端实现 ✅

**文件：** `src-tauri/src/lib.rs`

实现了完整的系统托盘逻辑：
- 托盘图标使用应用默认图标
- 创建了三个菜单项：显示窗口、隐藏窗口、退出
- 左键单击托盘图标可切换窗口显示/隐藏状态
- 右键单击显示托盘菜单

### 2. 依赖配置 ✅

**文件：** `src-tauri/Cargo.toml`

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
```

启用了 Tauri 2.0 的 `tray-icon` 功能。

### 3. 权限配置 ✅

**文件：** `src-tauri/capabilities/default.json`

添加了必要的托盘和窗口权限：
- `core:tray:allow-*` - 托盘相关权限
- `core:menu:allow-*` - 菜单相关权限
- `core:window:allow-show` - 显示窗口
- `core:window:allow-hide` - 隐藏窗口
- `core:window:allow-is-visible` - 检查窗口可见性

### 4. JavaScript API 封装 ✅

**文件：** `src/utils/tauri/tray.js`

提供了简单易用的 API：

```javascript
import { TauriTray } from '@/utils/tauri'

// 显示窗口
await TauriTray.TauriTray.showWindow()

// 隐藏窗口（最小化到托盘）
await TauriTray.TauriTray.hideWindow()

// 切换窗口显示状态
await TauriTray.TauriTray.toggleWindow()

// 检查窗口是否可见
const isVisible = await TauriTray.TauriTray.isWindowVisible()
```

### 5. 图标资源 ✅

使用项目中已有的图标资源：
- `src-tauri/icons/icon.ico` (Windows)
- `src-tauri/icons/icon.icns` (macOS)
- `src-tauri/icons/icon.png` (Linux)

### 6. UI 演示 ✅

**文件：** `src/views/Home.vue`

在首页添加了系统托盘功能演示卡片，包含：
- 功能说明
- "最小化到托盘" 按钮
- "显示窗口" 按钮

## 使用方法

### 在 Tauri 应用中运行

```bash
npm run tauri dev
```

### 测试托盘功能

1. **单击托盘图标**：切换窗口显示/隐藏
2. **右键托盘图标**：打开菜单
   - 显示窗口
   - 隐藏窗口
   - 退出
3. **使用按钮测试**：
   - 点击"📥 最小化到托盘"隐藏窗口
   - 点击"📤 显示窗口"重新显示窗口

### 在代码中使用

```vue
<script setup>
import { TauriTray } from '@/utils/tauri'
import { ElMessage } from 'element-plus'

const minimizeToTray = async () => {
  try {
    await TauriTray.TauriTray.hideWindow()
    ElMessage.success('已最小化到托盘')
  } catch (error) {
    ElMessage.error('操作失败: ' + error.message)
  }
}
</script>
```

## 托盘菜单说明

当前实现的托盘菜单包含以下选项：

1. **显示窗口** - 显示主窗口并聚焦
2. **隐藏窗口** - 隐藏主窗口到托盘
3. **退出** - 完全退出应用

## 自定义托盘菜单

如果需要自定义托盘菜单，可以修改 `src-tauri/src/lib.rs` 中的菜单创建代码：

```rust
// 创建托盘菜单
let show_i = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
let hide_i = MenuItem::with_id(app, "hide", "隐藏窗口", true, None::<&str>)?;
let settings_i = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?; // 新增
let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

let menu = Menu::with_items(app, &[&show_i, &hide_i, &settings_i, &quit_i])?;

// 处理菜单事件
.on_menu_event(|app, event| match event.id.as_ref() {
    "show" => { /* ... */ },
    "hide" => { /* ... */ },
    "settings" => {
        // 处理设置菜单点击
    },
    "quit" => { /* ... */ },
    _ => {}
})
```

## 注意事项

1. **系统托盘功能仅在桌面应用中生效**，浏览器预览（`npm run dev`）无法测试
2. **必须运行 `npm run tauri dev`** 才能看到托盘图标
3. Windows 系统可能需要在任务栏设置中启用"显示所有图标"
4. macOS 托盘图标会显示在顶部菜单栏
5. Linux 托盘支持取决于桌面环境

## 故障排除

### 托盘图标不显示

1. 确认是否运行了 `npm run tauri dev` 而不是 `npm run dev`
2. 检查 `src-tauri/Cargo.toml` 是否包含 `tray-icon` 功能
3. 检查 `src-tauri/capabilities/default.json` 是否包含托盘权限

### 点击菜单无反应

1. 检查控制台是否有权限错误
2. 确认 capabilities 配置中包含 `core:window:allow-show` 和 `core:window:allow-hide`
3. 重启 Tauri 开发服务器

### 编译错误

运行以下命令检查 Rust 代码：
```bash
cd src-tauri
cargo check
```

## 相关文件

- `src-tauri/src/lib.rs` - 托盘实现代码
- `src-tauri/Cargo.toml` - Rust 依赖配置
- `src-tauri/capabilities/default.json` - 权限配置
- `src/utils/tauri/tray.js` - JavaScript API
- `src/views/Home.vue` - UI 演示
- `src-tauri/icons/` - 托盘图标资源

## 完成状态

所有任务已完成 ✅

- [x] 4.1 添加 Tauri 系统托盘插件依赖
- [x] 4.2 在 `src-tauri/Cargo.toml` 中添加插件
- [x] 4.3 创建托盘图标资源文件
- [x] 4.4 在 `lib.rs` 中实现托盘菜单逻辑
- [x] 4.5 配置托盘事件监听器
- [x] 4.6 实现最小化到托盘功能
- [x] 4.7 创建 JavaScript 配置接口
- [x] 4.8 在 `tauri.conf.json` 中配置托盘权限
