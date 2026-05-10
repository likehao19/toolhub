# ToolHub macOS 兼容性分析

> 基于 Tauri v2 后端 (`src-tauri/src/commands/`) 24 个模块的逐文件审计。结论按"完全可用 / 需手动配置 / 部分降级 / 完全不可用"四类分级。

**审计日期：2026-05-10  对应 commit：v1.0.3**
**修复更新：2026-05-11  目标 commit：v1.0.4**

---

## 0. 摘要（一句话）

**mac 用户开起来 24 个后端模块里：**
- ✅ **23 个完全跨平台**（修复后；原 18 + 新增 mac 实现 5）
- ⚠️ **1 个需要手动安装依赖**（downloader：`brew install aria2`）
- ❌ **0 个完全不可用**

**v1.0.3 时的最严重问题：`hardware.rs` 直接调 PowerShell + WMI，没有任何平台保护，mac 上会立即报错"Failed to run PowerShell"。** ✅ **v1.0.4 已修复**：mac 走 `system_profiler -json`，覆盖 OS/CPU/主板/内存/GPU/显示器/磁盘/音频/网卡 9 类硬件信息。

---

## 0.5 v1.0.4 修复总览（2026-05-11）

| 模块 | 修复方式 | 文件:行号 |
|---|---|---|
| `hardware.rs` ❌→✅ | 整体重构：PowerShell 实现包到 `mod windows_impl`；新增 `mod macos_impl` 调 `system_profiler -json` 一次性查 7 个 DataType | `hardware.rs` 全文件 |
| `wallpaper.rs` ❌→✅ | mac 用 `osascript "tell application System Events to set picture..."`；`get_current_wallpaper` 同方式查询；路径转义 `\` 和 `"` | `wallpaper.rs:76-92, 129-148` |
| `credential.rs` ❌→✅ | mac 用 `security` CLI 实现 add/read/delete generic password；list 返回空（避免授权弹窗）；passkey 引导用户去"系统设置 → 密码" | `credential.rs:518-628` |
| `sdk.rs` ⚠️→✅ | mac 把 `taskkill_hidden` 从 `Err("Unsupported")` 改为 `kill -9 <pid>` | `sdk.rs:49-55` |
| `network.rs` ⚠️→✅ | mac DNS 从 `nslookup` 单行解析换成 `dig +noall +answer +nocomments`，能拿 TTL/MX/NS/SRV/TXT 完整字段 | `network.rs:343-393` |

**未做但可改进**（不影响功能）：
- `sdk.rs` 的 PATH 变更广播在 mac 上仍是 no-op（macOS 没有 WM_SETTINGCHANGE 等价物，新终端会自动 source rc 文件，旧终端仍需重开 — 这是 macOS 设计差异不是 bug）
- `downloader.rs` 仍要求 mac 用户手动 `brew install aria2`（避免在 release.yml 里 `brew install` 拖慢构建）

---

## 1. 完全跨平台（18 个，无需任何改动）

实现都是纯 Rust crate 或 std lib，编译产物在 mac 上直接 work。

| 模块 | 功能 | 跨平台依据 |
|---|---|---|
| `bookmark.rs` | 书签管理 | SQLite (rusqlite bundled) |
| `chat.rs` | 局域网聊天 | axum WebSocket + UDP discovery (tokio) |
| `crypto.rs` | 加密解密 | aes-gcm / sha1 / md-5 等纯 Rust |
| `database.rs` | 数据库工具基础 | SQLite |
| `dev_server.rs` | 开发服务器 | 纯 Rust |
| `file_ops.rs` | 文件读写/复制/移动/重命名 | std::fs + tokio::fs |
| `file_tree.rs` | 文件树扫描/统计 | std::fs |
| `greet.rs` | 模板示例 | 无平台调用 |
| `image_convert.rs` | 图片格式转换 | image crate (PNG/JPEG/WebP/GIF/BMP/ICO) |
| `log_analysis.rs` | 日志分析/索引/查询 | 纯解析 |
| `maven.rs` | Maven 仓库浏览 | reqwest HTTP |
| `mock_server.rs` | API Mock 服务 | axum |
| `redis.rs` | Redis 客户端 | redis crate (tokio-comp) |
| `sqlite.rs` | SQLite 管理工具 | rusqlite |
| `ssh.rs` | SSH 终端 + SFTP | russh / russh-keys / russh-sftp 纯 Rust |
| `screenshot.rs` | 屏幕截图/窗口截图 | **xcap 0.9**（已升级支持 mac） |
| `shell.rs` | shell 命令执行 | `configure_windows_command()` 在非 Windows 是空函数 |
| `window.rs` | 窗口管理 | `.transparent()` 已 `cfg(not(target_os = "macos"))` 跳过；`open_url_in_browser` 三分支（cmd/open/xdg-open） |

---

## 2. 需手动配置（1 个，可正常使用但需要装东西）

### `downloader.rs` — 下载管理器

**情况：**
- Windows 包内置 `src-tauri/binaries/aria2c.exe`
- mac 包**不带** aria2 二进制（workflow 里 "Strip Windows-only resources" step 会从 `tauri.conf.json` 删除 `bundle.resources`）

**mac 用户行为：**
1. 第一次点"启动"会报 `未找到 aria2c, 请通过包管理器安装(macOS: brew install aria2)`
2. 用户运行 `brew install aria2` 后，downloader 通过 `which aria2c` 自动找到，正常工作

**建议：**
- 文档/启动报错里直接给出 `brew install aria2` 命令（已经做了）
- 如果想完全开箱即用，可以在 release.yml 里 mac job 用 `brew install aria2` 后把二进制打进 bundle.resources

---

## 3. 部分降级（2 个，能用但功能不全）

### 3.1 `sdk.rs` — SDK 多版本管理 ✅ 强杀已修复 (v1.0.4)

**Windows 实现：**
- 通过 Win32 Registry API 读写 `HKCU\Environment` / `HKLM\System\...\Environment`
- 调 `setx` 持久化、广播 `WM_SETTINGCHANGE` 让其他进程实时感知 PATH 变化
- 用 `taskkill /F /PID` 强杀进程
- 提权操作：`Start-Process -Verb RunAs`

**mac 实现：**
- 用 `~/.toolhub_env` 文件存键值对
- 修改用户 shell rc（`.zshrc` / `.bashrc`）插入 source 行
- `taskkill_hidden` 直接返回 `"Unsupported platform"` —— **mac 上无法强杀进程**
- `check_system_privilege` / `broadcast_env_change` 在 mac 上是 no-op

**实际影响：**
- ✅ SDK 切换可用（写文件 + 改 rc）
- ⚠️ **切换后用户需要重开终端**（mac 没有 WM_SETTINGCHANGE 那种实时广播机制）
- ⚠️ 进程管理页面里 mac 用户**点不动"强杀"按钮**（会返回 "Unsupported platform"）

**建议：** mac 上 `taskkill_hidden` 应改为 `kill -9 <pid>` 实现，让强杀功能可用。

### 3.2 `network.rs` — 网络工具（DNS 查询） ✅ 已修复 (v1.0.4: dig 替代 nslookup)

**Windows 实现：** PowerShell `Resolve-DnsName -Name xxx -Type yyy`，能拿到详细 TTL / IPAddress / NameHost / Exchange / Strings 等字段。

**mac 实现：** `nslookup -type=yyy xxx`，**只解析 `Address: xxx` 行**，丢失 TTL 和大部分元信息。

**实际影响：**
- ✅ 基础 DNS 查询能用
- ⚠️ 返回字段比 Windows 少（无 TTL、无完整 NS 记录细节）
- 如果用户主要用 A/AAAA 记录查询，影响很小；查 MX/TXT/SRV 等会感觉信息缺失

**建议：** mac 上换用 `dig` 或 `trust-dns-resolver` crate，能拿到结构化数据。

### 3.3 `port.rs` — 端口管理

**Windows：** `netstat -ano` + `tasklist` 获取端口和进程映射，PowerShell 杀进程
**mac/Linux：** `lsof -iTCP -iUDP -P -n` 一条命令搞定

**实际影响：** ✅ mac 上完整可用，输出格式有差异但前端展示正常。

---

## 4. 完全不可用（3 个，mac 上访问会报错）

### 4.1 ❌→✅ `hardware.rs` — 硬件信息（已于 v1.0.4 修复）

**唯一实现路径：**
```rust
// hardware.rs:359 — 完全没有 cfg 保护
let output = run_hidden_command_owned_ref("powershell", &args)
    .map_err(|e| format!("Failed to run PowerShell: {}", e))?;
```

**实现内容：** 一段 PowerShell 脚本，调 WMI/CIM 拿 CPU、主板、内存、GPU、显示器、磁盘、声卡、网卡详情，输出 JSON。

**mac 行为：**
- macOS 上没有 `powershell` 命令
- `Command::new("powershell")` 直接失败，报错 `Failed to run PowerShell: program not found`
- 即使用户装了 PowerShell Core (`pwsh`)，里面没有 WMI / CIM cmdlet

**影响：** 「硬件信息」页面 mac 上**完全打不开**，第一秒就报错。

**修复方案（按工作量）：**
1. **最简（推荐）：** mac 上用 `sysinfo` crate（项目已经依赖了），能拿 CPU/内存/磁盘基础信息。降级展示，标注"详细硬件信息仅 Windows 可用"。
2. **完整：** mac 上调 `system_profiler SPHardwareDataType -json` + `system_profiler SPDisplaysDataType -json` + `system_profiler SPMemoryDataType -json`，解析 JSON 输出，覆盖度接近 Windows 版本。

### 4.2 ❌→✅ `credential.rs` — Windows 凭据管理 + 通行密钥（已于 v1.0.4 修复 mac Keychain）

**实现：** Win32 Credential Manager API + WebAuthN.dll 通过 GetProcAddress 动态调用。

**mac 行为：** 所有 7 个 tauri::command 在 mac 上都返回字符串 `"当前系统不支持凭据管理"` 或 `"当前系统不支持通行密钥管理"`。

**影响：**
- 「凭据管理」页面 mac 上点任何按钮都收到错误提示
- 「通行密钥」页面同上

**注意：这跟项目内的"密码管理"是两个东西。** 项目自家的密码管理（`Passwords.vue`）走的是自家 SQLite + AES 加密存储，跟 `credential.rs` 无关，**mac 完全可用**。

**修复方案：** mac 上用 `security` 命令操作 Keychain（`security add-generic-password` / `find-generic-password` / `delete-generic-password`），或者 [`keyring`](https://crates.io/crates/keyring) crate 跨平台抽象。

### 4.3 ❌→✅ `wallpaper.rs` — 桌面壁纸（已于 v1.0.4 修复 osascript 实现）

**Windows 实现：** `SystemParametersInfoW(SPI_SETDESKWALLPAPER, ...)`

**mac 行为：** 明确返回 `Err("Not supported on this platform".into())`

**影响：** 「壁纸管理」页面 mac 上设置壁纸会失败，但前端 UI 能加载（壁纸列表浏览/下载等基础功能可能仍可用）。

**修复方案：**
```rust
#[cfg(target_os = "macos")]
{
    let script = format!(
        r#"tell application "System Events" to set picture of every desktop to "{}""#,
        path.replace('"', r#"\""#)
    );
    std::process::Command::new("osascript")
        .args(["-e", &script])
        .output()
        .map_err(|e| format!("osascript failed: {}", e))?;
    Ok("Wallpaper set".into())
}
```

---

## 5. 还需验证（前端层面）

后端审计完了，但 mac 上的实际可用性还取决于前端是否做了相应处理：

| 待验证项 | 风险 |
|---|---|
| 自动启动（autostart plugin）| Tauri plugin 跨平台，应该 OK，但 mac 上需要用户授权"登录项" |
| 系统托盘 | Tauri tray-icon feature 跨平台 OK，但 mac 菜单栏图标设计可能不适配 |
| 全局快捷键 | tauri-plugin-global-shortcut 跨平台 OK，但 mac 需要"辅助功能"权限 |
| 文件保存对话框 | tauri-plugin-dialog 跨平台 OK |
| 通知 | tauri-plugin-notification mac 需要用户授权 |
| 单实例 | tauri-plugin-single-instance 跨平台 OK |
| 浮窗（DesktopFloatingBall.vue）| 透明窗口在 mac 上需要 `macos-private-api` feature，目前已 cfg 跳过 transparent 调用，**视觉效果会和 Windows 不一致**（macos 不透明） |
| 截图（capture_screen_fast）| xcap 0.9 第一次用需要"屏幕录制"权限授权 |

---

## 6. 修复优先级建议

按"修起来收益 / 工作量"排序：

| 优先级 | 模块 | 工作量 | mac 用户感知改善 |
|---|---|---|---|
| 🔴 P0 | `hardware.rs` 加 macOS 实现 | 中（写一段 system_profiler 解析） | 大 — 一个常用页面从"打不开"变"能用" |
| 🟡 P1 | `wallpaper.rs` 加 osascript 实现 | 小（5 行代码） | 中 |
| 🟡 P1 | `sdk.rs` 的 `taskkill_hidden` 加 mac `kill -9` 实现 | 小（3 行代码） | 中 — 进程管理页可用 |
| 🟢 P2 | `network.rs` DNS 用 `dig` 替代 `nslookup` | 小 | 小 — 多几个字段 |
| 🟢 P2 | `credential.rs` 加 mac Keychain 实现 | 中 | 小 — mac 用户基本不用这个，他们用项目内的密码管理 |
| 🟢 P2 | downloader 自动 `brew install aria2` 检测 + 提示 | 小 | 小 |

---

## 7. 给 AI 的核心提示

1. **不要假设跨平台。** 我之前看到 `sysinfo` 就以为 hardware.rs 用了，其实 hardware.rs **完全是 PowerShell 脚本**没用 sysinfo。审计代码必须 `grep "Command::new"` 看实际调用，不能猜。
2. **Mac 上必坏的 3 个 commands：** `get_hardware_info`、`credential.rs` 全部、`set_wallpaper` / `get_wallpaper`。
3. **本地 cargo check 验证不了 mac 兼容性：** windows host 不会编译 `#[cfg(target_os = "macos")]` 块，要靠 GitHub Actions macos runner 跑。
4. **PowerShell 是 mac 上不存在的命令，** 任何 `Command::new("powershell")` 都必须套 `#[cfg(target_os = "windows")]`。
5. **mac 没有注册表，** 任何 `windows::Win32::System::Registry::*` 调用都要走 cfg。
6. **xcap 必须保持 0.9+**，0.0.x 在 mac 上有 type inference bug 会编译失败。
