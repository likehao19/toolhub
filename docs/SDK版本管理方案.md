# SDK 版本管理方案

## 一、功能概述

提供 **Java JDK**、**Maven**、**Node.js**（含 npm）的多版本管理能力，支持一键切换环境变量，类似 nvm / jabba / sdkman 的桌面端集成方案。

### 两种模式

| 模式 | 说明 | 优先级 |
|------|------|--------|
| **本地导入**（默认） | 用户手动添加已安装的 SDK 路径 | 主要方式 |
| **远程下载** | 从可配置的服务器下载并自动安装 | 辅助方式 |

---

## 二、UI 设计

### 2.1 页面结构

```
┌─────────────────────────────────────────────────────┐
│  SDK 版本管理                              [设置⚙️]  │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│  Java    │  已安装版本                    [+ 添加]  │
│  Maven   │  ┌──────────────────────────────────┐    │
│  Node.js │  │ ● JDK 17.0.2    D:\jdk\17       │    │
│          │  │   JDK 11.0.18   D:\jdk\11  [切换]│    │
│          │  │   JDK 8u362     D:\jdk\8   [切换]│    │
│          │  └──────────────────────────────────┘    │
│          │                                          │
│          │  可下载版本              [刷新🔄]        │
│          │  ┌──────────────────────────────────┐    │
│          │  │   JDK 21.0.1           [下载⬇️]  │    │
│          │  │   JDK 20.0.2           [下载⬇️]  │    │
│          │  └──────────────────────────────────┘    │
│          │                                          │
│          │  当前环境                                │
│          │  JAVA_HOME = D:\jdk\17                   │
│          │  PATH 已包含: D:\jdk\17\bin              │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

### 2.2 左侧导航 Tab

- **Java** — 管理 JDK 版本，环境变量：`JAVA_HOME`、`PATH`
- **Maven** — 管理 Maven 版本，环境变量：`MAVEN_HOME`（`M2_HOME`）、`PATH`
- **Node.js** — 管理 Node.js 版本（自带 npm），环境变量：`NODE_HOME`、`PATH`

### 2.3 设置面板（右上角齿轮）

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| SDK 安装根目录 | 远程下载的 SDK 存放位置 | `D:\sdk\` |
| Java 下载镜像 | JDK 下载服务器地址 | `https://mirrors.tuna.tsinghua.edu.cn/Adoptium/` |
| Maven 下载镜像 | Maven 下载服务器地址 | `https://mirrors.tuna.tsinghua.edu.cn/apache/maven/` |
| Node.js 下载镜像 | Node 下载服务器地址 | `https://npmmirror.com/mirrors/node/` |
| 切换方式 | 用户级 / 系统级环境变量 | 用户级 |
| 自动检测 | 启动时自动扫描已安装版本 | 开启 |

---

## 三、数据结构

### 3.1 SDK 版本记录（SQLite）

```sql
-- SDK 配置表
CREATE TABLE sdk_config (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,       -- 'java' | 'maven' | 'node'
  version     TEXT NOT NULL,       -- '17.0.2'
  path        TEXT NOT NULL,       -- 'D:\jdk\17'
  source      TEXT DEFAULT 'local',-- 'local' | 'remote'
  is_active   INTEGER DEFAULT 0,  -- 1 = 当前激活版本
  alias       TEXT,                -- 用户自定义别名，如 'default'
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_sdk_type_version ON sdk_config(type, version);

-- 下载服务器配置表
CREATE TABLE sdk_mirror (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,       -- 'java' | 'maven' | 'node'
  name        TEXT NOT NULL,       -- 镜像名称
  base_url    TEXT NOT NULL,       -- 镜像基础 URL
  is_default  INTEGER DEFAULT 0,  -- 是否默认镜像
  created_at  TEXT DEFAULT (datetime('now'))
);
```

### 3.2 前端状态（Pinia Store）

```js
// src/store/sdkManager.js
export const useSdkStore = defineStore('sdkManager', {
  state: () => ({
    // 当前选中的 tab
    activeTab: 'java',

    // 已安装版本 { java: [...], maven: [...], node: [...] }
    installedVersions: {
      java: [],
      maven: [],
      node: []
    },

    // 可下载版本列表
    remoteVersions: {
      java: [],
      maven: [],
      node: []
    },

    // 当前激活版本
    activeVersions: {
      java: null,
      maven: null,
      node: null
    },

    // 镜像配置
    mirrors: {
      java: '',
      maven: '',
      node: ''
    },

    // SDK 安装根目录
    sdkRoot: 'D:\\sdk',

    // 下载任务队列
    downloadTasks: []
  })
})
```

---

## 四、核心实现

### 4.1 环境变量切换（Rust 端）

Windows 环境变量修改需要操作注册表，通过 Tauri Rust command 实现：

```rust
// src-tauri/src/commands/sdk_manager.rs

use winreg::enums::*;
use winreg::RegKey;
use std::path::Path;

/// 读取当前用户环境变量
#[tauri::command]
pub fn get_env_var(name: &str) -> Result<String, String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let env = hkcu.open_subkey("Environment")
        .map_err(|e| e.to_string())?;
    env.get_value(name).map_err(|e| e.to_string())
}

/// 设置用户级环境变量
#[tauri::command]
pub fn set_env_var(name: &str, value: &str) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let env = hkcu.open_subkey_with_flags("Environment", KEY_SET_VALUE)
        .map_err(|e| e.to_string())?;
    env.set_value(name, &value).map_err(|e| e.to_string())?;

    // 广播环境变量变更通知，让其他进程感知
    broadcast_env_change();
    Ok(())
}

/// 切换 PATH 中的 SDK 路径
#[tauri::command]
pub fn switch_sdk_path(old_bin: &str, new_bin: &str) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let env = hkcu.open_subkey_with_flags("Environment", KEY_READ | KEY_SET_VALUE)
        .map_err(|e| e.to_string())?;

    let current_path: String = env.get_value("Path").unwrap_or_default();

    // 替换或追加
    let new_path = if current_path.contains(old_bin) {
        current_path.replace(old_bin, new_bin)
    } else {
        format!("{};{}", new_bin, current_path)
    };

    env.set_value("Path", &new_path).map_err(|e| e.to_string())?;
    broadcast_env_change();
    Ok(())
}

/// 广播 WM_SETTINGCHANGE 通知其他进程刷新环境变量
fn broadcast_env_change() {
    use windows::Win32::UI::WindowsAndMessaging::*;
    use windows::Win32::Foundation::*;
    use windows::core::w;

    unsafe {
        SendMessageTimeoutW(
            HWND_BROADCAST,
            WM_SETTINGCHANGE,
            WPARAM(0),
            LPARAM(w!("Environment").as_ptr() as isize),
            SMTO_ABORTIFHUNG,
            5000,
            None,
        );
    }
}

/// 自动检测已安装的 SDK
#[tauri::command]
pub fn detect_installed_sdks(sdk_type: &str) -> Result<Vec<SdkInfo>, String> {
    match sdk_type {
        "java" => detect_java(),
        "maven" => detect_maven(),
        "node"  => detect_node(),
        _ => Err("未知的 SDK 类型".into())
    }
}

/// 验证 SDK 路径是否合法
#[tauri::command]
pub fn validate_sdk_path(sdk_type: &str, path: &str) -> Result<SdkInfo, String> {
    let p = Path::new(path);
    match sdk_type {
        "java" => {
            // 检查 bin/java.exe 是否存在
            let java_exe = p.join("bin").join("java.exe");
            if !java_exe.exists() {
                return Err("未找到 bin/java.exe，请确认路径正确".into());
            }
            // 执行 java -version 获取版本号
            let output = std::process::Command::new(java_exe)
                .arg("-version")
                .output()
                .map_err(|e| e.to_string())?;
            let version = parse_java_version(&String::from_utf8_lossy(&output.stderr));
            Ok(SdkInfo { version, path: path.into() })
        }
        "maven" => {
            let mvn_exe = p.join("bin").join("mvn.cmd");
            if !mvn_exe.exists() {
                return Err("未找到 bin/mvn.cmd，请确认路径正确".into());
            }
            // 从 lib 目录解析版本
            let version = parse_maven_version(p);
            Ok(SdkInfo { version, path: path.into() })
        }
        "node" => {
            let node_exe = p.join("node.exe");
            if !node_exe.exists() {
                return Err("未找到 node.exe，请确认路径正确".into());
            }
            let output = std::process::Command::new(node_exe)
                .arg("--version")
                .output()
                .map_err(|e| e.to_string())?;
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            Ok(SdkInfo { version, path: path.into() })
        }
        _ => Err("未知的 SDK 类型".into())
    }
}
```

### 4.2 版本切换流程（前端）

```js
// src/utils/sdkManager.js

import { invoke } from '@tauri-apps/api/core'

/**
 * 各 SDK 类型对应的环境变量名和 bin 子路径
 */
const SDK_ENV_MAP = {
  java:  { home: 'JAVA_HOME',  bin: 'bin' },
  maven: { home: 'MAVEN_HOME', bin: 'bin' },
  node:  { home: 'NODE_HOME',  bin: '' }  // node.exe 在根目录
}

/**
 * 切换 SDK 版本
 * @param {'java'|'maven'|'node'} type - SDK 类型
 * @param {string} newPath - 新版本根目录
 */
export async function switchVersion(type, newPath) {
  const config = SDK_ENV_MAP[type]

  // 1. 读取当前 HOME 变量，得到旧路径
  let oldPath = ''
  try {
    oldPath = await invoke('get_env_var', { name: config.home })
  } catch {
    // 首次设置，无旧值
  }

  // 2. 设置新的 HOME 变量
  await invoke('set_env_var', { name: config.home, value: newPath })

  // 3. 如果是 Maven，同时设置 M2_HOME（兼容旧版）
  if (type === 'maven') {
    await invoke('set_env_var', { name: 'M2_HOME', value: newPath })
  }

  // 4. 切换 PATH 中的 bin 路径
  const oldBin = oldPath ? `${oldPath}\\${config.bin}`.replace(/\\$/, '') : ''
  const newBin = `${newPath}\\${config.bin}`.replace(/\\$/, '')
  await invoke('switch_sdk_path', { oldBin, newBin })

  // 5. 更新数据库中的激活状态
  await updateActiveVersion(type, newPath)
}

/**
 * 获取当前 SDK 环境信息
 */
export async function getCurrentEnv(type) {
  const config = SDK_ENV_MAP[type]
  try {
    const home = await invoke('get_env_var', { name: config.home })
    const path = await invoke('get_env_var', { name: 'Path' })
    return { home, pathIncluded: path.includes(home) }
  } catch {
    return { home: '', pathIncluded: false }
  }
}
```

### 4.3 本地导入流程

```
用户点击 [+ 添加]
    ↓
弹出文件夹选择对话框（Tauri dialog）
    ↓
调用 validate_sdk_path 验证路径
    ├─ 失败 → 提示"路径无效，未找到 xxx"
    └─ 成功 → 返回版本号
           ↓
    写入 sdk_config 表
           ↓
    显示在已安装版本列表
           ↓
    用户点击 [切换] → 调用 switchVersion()
```

### 4.4 远程下载流程

```
用户切换到"可下载版本"区域
    ↓
从镜像服务器拉取版本列表
    ↓
用户选择版本，点击 [下载]
    ↓
下载进度条（Tauri HTTP 下载 + 进度回调）
    ↓
解压到 sdkRoot/java/17.0.2/
    ↓
自动调用 validate_sdk_path 验证
    ↓
写入 sdk_config 表（source = 'remote'）
    ↓
提示用户是否立即切换
```

#### 镜像列表获取示例

```js
/**
 * 获取远程可下载版本列表
 */
async function fetchRemoteVersions(type) {
  const mirrors = {
    java: 'https://mirrors.tuna.tsinghua.edu.cn/Adoptium/',
    maven: 'https://mirrors.tuna.tsinghua.edu.cn/apache/maven/maven-3/',
    node: 'https://npmmirror.com/mirrors/node/'
  }

  const baseUrl = store.mirrors[type] || mirrors[type]

  // 根据不同镜像解析版本列表
  // 各镜像返回格式不同，需要分别适配解析逻辑
  const response = await fetch(baseUrl)
  const html = await response.text()
  return parseVersionList(type, html)
}
```

---

## 五、自动检测策略

应用启动时自动扫描系统中已安装的 SDK：

| SDK | 检测方式 |
|-----|----------|
| **Java** | 1. 读取 `JAVA_HOME` 环境变量<br>2. 扫描常见路径：`C:\Program Files\Java\*`、`C:\Program Files\Eclipse Adoptium\*`<br>3. 执行 `where java` 查找 PATH 中的 java |
| **Maven** | 1. 读取 `MAVEN_HOME` / `M2_HOME`<br>2. 扫描：`C:\Program Files\apache-maven-*`<br>3. 执行 `where mvn` |
| **Node.js** | 1. 读取 `NODE_HOME`<br>2. 扫描：`C:\Program Files\nodejs\`、`%APPDATA%\nvm\*`（nvm-windows）<br>3. 执行 `where node` |

---

## 六、文件结构

```
src/
├── views/
│   └── SdkManager.vue            # 主页面
├── components/
│   └── sdk/
│       ├── SdkVersionList.vue     # 已安装版本列表
│       ├── SdkRemoteList.vue      # 远程下载列表
│       ├── SdkEnvInfo.vue         # 当前环境变量展示
│       └── SdkSettings.vue        # 镜像/目录配置弹窗
├── store/
│   └── sdkManager.js              # Pinia store
├── utils/
│   └── sdkManager.js              # 版本切换、检测等工具函数
└── i18n/locales/
    ├── zh-CN.js                   # + sdk 相关中文
    └── en-US.js                   # + sdk 相关英文

src-tauri/src/
├── commands/
│   └── sdk_manager.rs             # 环境变量操作、SDK检测、路径验证
└── Cargo.toml                     # + winreg, windows crate 依赖
```

---

## 七、依赖项

### Rust (Cargo.toml)

```toml
[target.'cfg(windows)'.dependencies]
winreg = "0.52"           # Windows 注册表操作
windows = { version = "0.58", features = [
  "Win32_UI_WindowsAndMessaging",
  "Win32_Foundation"
] }
zip = "2.0"               # 解压下载的 SDK 压缩包
```

### 前端 (package.json)

无新增依赖，使用现有的 Tauri API + Element Plus 组件。

---

## 八、安全与注意事项

1. **权限要求**：修改用户级环境变量无需管理员权限；修改系统级环境变量需要 UAC 提权
2. **PATH 防污染**：切换时先移除旧路径再添加新路径，避免 PATH 无限增长
3. **原子操作**：环境变量修改失败时回滚，不留半成品状态
4. **备份机制**：首次修改前备份当前环境变量到数据库，支持一键还原
5. **并发保护**：同一时间只允许一个切换操作，防止竞争条件
6. **广播通知**：修改后发送 `WM_SETTINGCHANGE` 广播，已打开的终端需重启才能生效（弹窗提醒用户）

---

## 九、实现优先级

| 阶段 | 内容 |
|------|------|
| **P0** | 本地导入 + 手动切换（Java/Maven/Node） |
| **P1** | 自动检测已安装版本、当前环境变量展示 |
| **P2** | 远程下载（镜像配置、下载进度、解压安装） |
| **P3** | 版本别名、环境变量备份还原、一键卸载已下载版本 |
