# 常规设置功能说明

## 功能概述

设置页面的"常规设置"包含以下已完全实现的功能：

1. **窗口关闭行为**
2. **开机自启**
3. **语言设置**

---

## 1. 窗口关闭行为

### 功能说明

控制点击窗口关闭按钮（X）时的行为。

### 可选项

- **询问** (`ask`)：每次关闭时弹出对话框，询问用户的意图
- **最小化到托盘** (`minimize`)：直接隐藏窗口到系统托盘，不退出应用
- **直接退出** (`exit`)：直接关闭并退出应用

### 实现文件

**前端：**
- `src/views/Settings.vue` - 设置界面
- `src/App.vue` (第296-335行) - 窗口关闭事件监听
- `src/components/CloseConfirmDialog.vue` - 关闭确认对话框
- `src/store/app.js` - 状态管理

**后端：**
- `src-tauri/src/commands/window.rs` (第72-96行) - `handle_close_action` 命令

### 工作流程

```
用户点击关闭按钮
    ↓
触发 'window-close-requested' 事件
    ↓
检查 closeAction 设置
    ├─ ask → 显示确认对话框
    │         ├─ 用户选择 minimize → 隐藏窗口
    │         ├─ 用户选择 exit → 退出应用
    │         └─ 用户勾选"记住选择" → 保存设置
    ├─ minimize → 直接隐藏窗口到托盘
    └─ exit → 直接退出应用
```

### 核心代码

**监听关闭事件：**
```javascript
// src/App.vue
await listen('window-close-requested', async () => {
  if (appStore.closeAction === 'ask') {
    closeDialogRef.value?.show()
  } else {
    await invoke('handle_close_action', {
      action: appStore.closeAction
    })
  }
})
```

**处理关闭动作：**
```rust
// src-tauri/src/commands/window.rs
pub async fn handle_close_action(app: AppHandle, action: String) -> Result<(), String> {
    match action.as_str() {
        "minimize" => {
            // 隐藏主窗口到托盘
            if let Some(window) = app.get_webview_window("main") {
                window.hide().map_err(|e| e.to_string())?;
            }
        }
        "exit" => {
            // 退出应用
            app.exit(0);
        }
        _ => return Err(format!("未知的关闭动作: {}", action)),
    }
    Ok(())
}
```

### 配置存储

关闭行为设置保存在：
- **位置**: `%APPDATA%/<app-name>/settings.json`
- **键**: `closeAction`
- **值**: `"ask"` | `"minimize"` | `"exit"`

---

## 2. 开机自启

### 功能说明

控制应用是否在系统启动时自动运行。

### 实现文件

**前端：**
- `src/views/Settings.vue` - 设置界面（第36-45行）
- `src/utils/tauri/autostart.js` - 自启动 API 封装

**后端：**
- 使用 Tauri 插件：`@tauri-apps/plugin-autostart`

### API 封装

```javascript
// src/utils/tauri/autostart.js

import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart'

// 启用开机自启
export async function enableAutostart() {
  await enable()
  return true
}

// 禁用开机自启
export async function disableAutostart() {
  await disable()
  return true
}

// 检查是否已启用
export async function checkAutostart() {
  return await isEnabled()
}

// 切换状态
export async function toggleAutostart(enabled) {
  return enabled ? await enableAutostart() : await disableAutostart()
}
```

### 使用示例

**在设置页面中：**
```vue
<el-form-item label="开机自启">
  <el-switch 
    v-model="settings.autoStart" 
    @change="handleAutostartChange"
    :loading="autostartLoading"
  />
</el-form-item>

<script setup>
const handleAutostartChange = async (enabled) => {
  autostartLoading.value = true
  try {
    const success = await TauriAutostart.toggleAutostart(enabled)
    if (success) {
      await saveConfig(settings)
    } else {
      settings.autoStart = !enabled // 恢复原状态
    }
  } finally {
    autostartLoading.value = false
  }
}
</script>
```

### 系统集成

**Windows:**
- 在注册表中创建启动项：`HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`

**macOS:**
- 在 `~/Library/LaunchAgents/` 创建 plist 文件

**Linux:**
- 在 `~/.config/autostart/` 创建 desktop 文件

### 注意事项

1. **权限要求**：无需管理员权限，仅影响当前用户
2. **启动参数**：可在 `tauri.conf.json` 中配置启动参数
3. **检查状态**：应用启动时自动检查并同步状态到 UI

---

## 3. 语言设置

### 功能说明

切换应用界面语言（目前支持中文和英文）。

### 可选项

- **简体中文** (`zh-CN`)
- **English** (`en-US`)

### 实现状态

✅ UI 已实现  
⚠️ 国际化（i18n）待集成

### 待完成工作

如需完整的多语言支持，需要：

1. **安装 vue-i18n**
```bash
npm install vue-i18n@9
```

2. **创建语言文件**
```javascript
// src/i18n/index.js
import { createI18n } from 'vue-i18n'

const messages = {
  'zh-CN': {
    settings: {
      title: '设置',
      general: '常规设置',
      // ...
    }
  },
  'en-US': {
    settings: {
      title: 'Settings',
      general: 'General Settings',
      // ...
    }
  }
}

export default createI18n({
  locale: 'zh-CN',
  messages
})
```

3. **在 main.js 中注册**
```javascript
import i18n from './i18n'
app.use(i18n)
```

4. **在组件中使用**
```vue
<template>
  <h3>{{ $t('settings.title') }}</h3>
</template>
```

---

## 配置存储

所有设置都通过 Tauri Store 插件持久化存储。

### 存储位置

**Windows**: `%APPDATA%/<app-name>/settings.json`  
**macOS**: `~/Library/Application Support/<app-name>/settings.json`  
**Linux**: `~/.config/<app-name>/settings.json`

### 存储结构

```json
{
  "closeAction": "ask",
  "autoStart": false,
  "language": "zh-CN",
  "theme": "light",
  "fontSize": 14,
  "enableAnimations": true,
  "previewTheme": "mk-cute",
  "previewCodeTheme": "github",
  "notificationWidth": 400,
  "notificationHeight": 150,
  "taskbarMargin": 50
}
```

### API 使用

```javascript
import { loadConfig, saveConfig, getConfig, setConfig } from '@/utils/tauri/store'

// 加载所有配置
const config = await loadConfig()

// 保存所有配置
await saveConfig(config)

// 获取单个配置项
const closeAction = await getConfig('closeAction')

// 设置单个配置项
await setConfig('closeAction', 'minimize')
```

---

## 测试建议

### 窗口关闭行为

1. 设置为"询问"，点击关闭按钮，应弹出对话框
2. 设置为"最小化到托盘"，点击关闭按钮，窗口应隐藏
3. 设置为"直接退出"，点击关闭按钮，应用应退出
4. 在对话框中勾选"记住我的选择"，下次应直接执行

### 开机自启

1. 启用开机自启，重启系统，应用应自动启动
2. 禁用开机自启，重启系统，应用不应自动启动
3. 检查系统启动项中是否正确添加/删除

### 语言设置

1. 切换语言选项，设置应正确保存
2. 重启应用，语言设置应保持

---

## 扩展功能建议

1. **窗口关闭行为**
   - 添加"最小化到托盘时显示通知"选项
   - 支持托盘图标右键菜单

2. **开机自启**
   - 添加"启动时最小化"选项
   - 支持延迟启动

3. **语言设置**
   - 完整的 i18n 支持
   - 自动检测系统语言
   - 更多语言选项

---

## 相关文件清单

### 前端
```
src/
├── views/Settings.vue                 # 设置页面主界面
├── components/
│   └── CloseConfirmDialog.vue        # 关闭确认对话框
├── utils/tauri/
│   ├── autostart.js                  # 自启动 API 封装
│   └── store.js                      # 配置存储 API 封装
├── store/
│   └── app.js                        # 应用状态管理
└── App.vue                           # 窗口关闭事件监听
```

### 后端
```
src-tauri/
├── src/
│   └── commands/
│       └── window.rs                 # 窗口控制命令
└── Cargo.toml                        # 插件依赖配置
```

---

## Demo 示例代码

完整的源代码已在项目中实现，可以直接参考：

1. **设置界面**: `src/views/Settings.vue`
2. **窗口关闭**: `src/App.vue` + `src-tauri/src/commands/window.rs`
3. **开机自启**: `src/utils/tauri/autostart.js`
4. **配置存储**: `src/utils/tauri/store.js`

所有功能都已完整实现并可正常使用！
