# 系统托盘功能更新说明

## 更新概述

系统托盘功能已更新，实现了更智能的窗口关闭行为管理。

## ✨ 新功能

### 1. 智能关闭确认对话框

当用户点击窗口关闭按钮时，会弹出确认对话框，提供以下选项：

- **📥 最小化到托盘** - 将窗口隐藏到系统托盘，应用继续在后台运行
- **❌ 完全退出** - 完全关闭应用程序
- **✅ 记住我的选择** - 勾选后下次不再询问，直接执行选择的操作

### 2. 用户偏好设置存储

用户的关闭行为偏好会保存到本地，支持三种模式：

- **每次询问** (默认) - 每次关闭时都会弹出确认对话框
- **最小化到托盘** - 点击关闭按钮时直接最小化到托盘
- **直接退出** - 点击关闭按钮时直接退出应用

### 3. 设置管理界面

在首页的"系统托盘演示"卡片中，提供了：

- 关闭行为设置单选框
- 当前设置状态显示
- 测试按钮（最小化到托盘、显示窗口）
- 重置设置按钮

## 📂 修改的文件

### 后端文件

#### `src-tauri/src/lib.rs`
```rust
// 新增功能：
// 1. 监听窗口关闭事件并阻止默认行为
// 2. 发送事件到前端触发对话框
// 3. 添加 handle_close_action 命令处理用户选择
```

**关键代码：**
- 窗口关闭事件监听：`window.on_window_event()`
- 事件发送：`window.emit("window-close-requested", ())`
- 关闭操作处理：`handle_close_action` command

### 前端文件

#### `src/store/app.js`
```javascript
// 新增状态：
closeAction: 'ask' | 'minimize' | 'exit'
rememberCloseChoice: boolean

// 新增方法：
setCloseAction(action)
setRememberCloseChoice(remember)
```

#### `src/components/CloseConfirmDialog.vue` (新建)
```vue
// 关闭确认对话框组件
// 功能：显示两个操作按钮和记住选择复选框
```

#### `src/App.vue`
```vue
// 新增功能：
// 1. 监听 'window-close-requested' 事件
// 2. 根据用户偏好决定是否显示对话框
// 3. 处理用户确认并保存偏好设置
```

#### `src/views/Home.vue`
```vue
// 更新功能：
// 1. 添加关闭行为设置单选框
// 2. 添加当前设置显示
// 3. 添加重置设置按钮
// 4. 优化 UI 布局
```

## 🚀 使用方法

### 基本使用

1. **点击窗口关闭按钮**
   - 首次点击会弹出确认对话框
   - 选择您想要的操作（最小化或退出）
   - 可选择"记住我的选择"

2. **通过设置管理**
   - 打开应用主页
   - 找到"系统托盘演示"卡片
   - 通过单选框修改关闭行为
   - 点击"重置设置"恢复默认

3. **系统托盘交互**
   - 左键单击托盘图标：切换窗口显示/隐藏
   - 右键单击托盘图标：打开托盘菜单
     - 显示窗口
     - 隐藏窗口
     - 退出

### 代码示例

#### 监听关闭事件

```javascript
// 在 App.vue 或其他组件中
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

onMounted(async () => {
  await listen('window-close-requested', async () => {
    // 处理关闭请求
    if (userPreference === 'ask') {
      // 显示对话框
    } else {
      // 直接执行操作
      await invoke('handle_close_action', { action: userPreference })
    }
  })
})
```

#### 调用关闭操作

```javascript
import { invoke } from '@tauri-apps/api/core'

// 最小化到托盘
await invoke('handle_close_action', { action: 'minimize' })

// 完全退出
await invoke('handle_close_action', { action: 'exit' })
```

## 🎯 工作流程

```
用户点击关闭按钮
       ↓
Rust 拦截关闭事件并阻止默认行为
       ↓
发送 'window-close-requested' 事件到前端
       ↓
前端检查用户偏好 (closeAction)
       ↓
    ┌─────┴─────┐
    ↓           ↓
  'ask'      其他选项
    ↓           ↓
显示对话框  直接执行操作
    ↓
用户选择并确认
    ↓
保存偏好（如果勾选记住）
    ↓
调用 handle_close_action 执行操作
```

## ⚙️ 配置说明

### Pinia Store 配置

```javascript
// src/store/app.js
{
  closeAction: 'ask',           // 关闭行为：'ask' | 'minimize' | 'exit'
  rememberCloseChoice: false    // 是否记住用户选择
}
```

### 持久化存储

用户的偏好设置会自动保存到 localStorage，应用重启后保持。

存储键：`app-store`

## 🔄 重置设置

如果需要重置为默认设置：

1. **通过 UI**: 点击首页的"重置设置"按钮
2. **手动**: 删除 localStorage 中的 `app-store` 键
3. **代码**:
   ```javascript
   appStore.setCloseAction('ask')
   appStore.setRememberCloseChoice(false)
   ```

## 📋 测试清单

- [x] 点击关闭按钮显示确认对话框
- [x] 选择"最小化到托盘"隐藏窗口
- [x] 选择"完全退出"关闭应用
- [x] 勾选"记住选择"后下次不再询问
- [x] 通过设置界面修改关闭行为
- [x] 重置设置按钮恢复默认
- [x] 偏好设置持久化保存
- [x] 托盘图标点击切换窗口
- [x] 托盘右键菜单正常工作

## 🐛 故障排除

### 对话框不显示

1. 检查 `closeAction` 是否为 `'ask'`
2. 检查 `CloseConfirmDialog` 组件是否正确导入
3. 查看浏览器控制台是否有错误

### 关闭按钮无反应

1. 确认运行的是 Tauri 应用 (`npm run tauri dev`)
2. 检查 Rust 后端是否正确监听事件
3. 查看控制台日志

### 设置不保存

1. 检查 Pinia 持久化插件是否正确配置
2. 清除浏览器缓存后重试
3. 检查 localStorage 是否可用

## 📝 注意事项

1. **浏览器模式限制**
   - 在浏览器中运行 (`npm run dev`) 时，关闭确认功能不可用
   - 必须运行 Tauri 应用 (`npm run tauri dev`) 才能测试完整功能

2. **权限要求**
   - 需要 `core:window:allow-hide` 权限
   - 需要 `core:window:allow-show` 权限
   - 这些权限已在 `src-tauri/capabilities/default.json` 中配置

3. **跨平台兼容性**
   - Windows、macOS、Linux 均支持
   - 托盘图标位置因系统而异（Windows 任务栏、macOS 菜单栏、Linux 系统托盘）

## 🎉 完成状态

所有功能已完成并测试通过 ✅

- [x] Rust 后端事件拦截
- [x] 前端事件监听
- [x] 关闭确认对话框
- [x] 用户偏好存储
- [x] 设置管理界面
- [x] 功能测试
- [x] 文档编写

## 📚 相关文档

- [系统托盘功能说明](./SYSTEM_TRAY.md)
- [Tauri 窗口事件文档](https://tauri.app/v1/api/js/window#windowevent)
- [Pinia 状态管理文档](https://pinia.vuejs.org/)
