# ToolHub 发版与构建流程（AI 操作手册）

> 本文档供 AI 在帮助用户发版时参考。记录从代码改动到 GitHub Release 公开下载的完整链路、工具命令、典型失败和修复方式。**操作前先通读本文，确认环境与命令再执行。**

---

## 0. 项目背景与运行环境

| 项目 | 内容 |
|---|---|
| 仓库类型 | 双 remote（gitee + github） |
| `origin` (gitee) | `https://gitee.com/likehao19/toolhub.git` — 国内访问，**不走代理** |
| `github` | `https://github.com/likehao19/toolhub.git` — **必须走代理** |
| 代理地址 | `http://127.0.0.1:7890`（Clash 默认） |
| 本地分支 | `toolhub-dev-style`（开发分支） |
| 推送映射 | `origin/toolhub-dev-style` ↔ `github/main` |
| Tauri 版本 | v2 |
| 构建平台 | **Windows + macOS**（Linux 已移除，用户不需要） |
| Workflow 文件 | `.github/workflows/release.yml` |
| 触发条件 | 仅 push 形如 `v*.*.*` 的 tag 才触发构建 |
| 当前最新 release | 看 `git tag --list "v*"` 或 `gh release list` |

### 工具路径

```bash
# gh CLI 已安装在 Windows 默认路径，bash 里要用绝对路径调用
GH="/c/Program Files/GitHub CLI/gh.exe"

# 已登录账户：likehao19（token 在 keyring）
# 验证：$GH auth status
```

### git proxy 配置（已写在全局 ~/.gitconfig）

```
http.proxy = http://127.0.0.1:7890
https.proxy = http://127.0.0.1:7890
```

⚠️ 这意味着**任何 git 命令默认走代理**。推送 gitee 时必须用 `git -c http.proxy= -c https.proxy=` 临时禁用，否则会非常慢或失败。

---

## 1. 三种工作流总览

| 操作 | 命令 | 触发构建？ |
|---|---|---|
| 平常提交代码（开发中） | `npm run push` | ❌ |
| 发新版本 | `npm run release` | ✅ tag 推送后 |
| 修复构建失败 | 改代码 → 再 `npm run release` | ✅ |

**核心规则：只有 push 形如 `v*.*.*` 的 tag 才会触发 GitHub Actions 构建。** 普通 commit/push 不触发。

---

## 2. 平常提交代码（不发版）

### 2.1. 提交本地改动

```bash
git add <files>
git commit -m "feat: xxx"
```

⚠️ **不要使用 `git add -A` 或 `git add .`**：项目根目录有大量 `.claude/worktrees/` agent 工作目录、`.claude/scheduled_tasks.lock` 等 Claude Code 本地状态文件，不应进入 commit。仅 add 你需要的源码改动。

### 2.2. 同步推送两边

```bash
npm run push
```

实现：[`scripts/push-all.cjs`](../scripts/push-all.cjs)
- 自动获取当前本地分支名
- gitee：`git -c http.proxy= -c https.proxy= push origin <branch>:<branch>`（绕过代理）
- github：`git push github <branch>:main`（走代理）
- 任一失败不影响另一个继续推送

输出示例：
```
Local branch: toolhub-dev-style

--- pushing to gitee (origin/toolhub-dev-style) ---
... ok

--- pushing to github (github/main) ---
... ok

Summary:
  OK   gitee     origin/toolhub-dev-style
  OK   github    github/main
```

---

## 3. 发版完整流程

### 3.1. 决定版本类型

| 命令 | 跳变 | 用途 |
|---|---|---|
| `npm run release` | patch: `1.0.3 → 1.0.4` | bug 修复、小调整 |
| `npm run release:minor` | minor: `1.0.3 → 1.1.0` | 新功能、不破坏兼容 |
| `npm run release:major` | major: `1.0.3 → 2.0.0` | 破坏性变更 |
| `npm run release -- 1.5.0` | 指定具体版本 | 跳跃式发版 |

### 3.2. 脚本干了什么

[`scripts/release.cjs`](../scripts/release.cjs) 自动执行：

1. 读 `package.json` 当前版本，计算下一版本号
2. **检查工作区干净**（忽略 `.claude/` 路径下所有变动）
3. **检查 tag 不存在**（`git rev-parse v1.0.4` 不应该有结果）
4. 同时改写：
   - `package.json` 的 `version` 字段
   - `src-tauri/tauri.conf.json` 的 `version` 字段
5. `git commit -m "chore: release vX.Y.Z"`
6. 推送 commits：
   - gitee：绕过代理 push origin
   - github：走代理 push github main
7. `git tag vX.Y.Z`
8. 推送 tag 到两边（同样的代理策略）
9. 输出 Actions 和 Release URL

**触发的 GitHub Actions 在 tag push 后约 5-10 秒内启动。**

### 3.3. 失败处理

如果 `npm run release` 中途失败：

| 失败时机 | 已发生 | 后续怎么处理 |
|---|---|---|
| 工作区不干净 | 无 | commit 或 stash 后重跑 |
| tag 已存在 | 无 | 选下个版本号或删 tag |
| commit 阶段失败 | 版本号已写文件，可能未 commit | `git status` 看，手动 commit |
| 推 gitee 失败 | commit 已生成 | 后续单独 `git -c http.proxy= -c https.proxy= push origin` 补 |
| 推 github 失败 | commit 已生成、gitee 已推 | 后续单独 `git push github toolhub-dev-style:main` 补 |
| 推 tag 失败 | commit 已推 | 手动推 tag 触发构建 |

---

## 4. 监控构建

### 4.1. 找到最新 run ID

```bash
export HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890
"/c/Program Files/GitHub CLI/gh.exe" run list --repo likehao19/toolhub --workflow=Release --limit 1
```

输出第一行末尾就是 run ID（一串数字）。

### 4.2. 查看 run 状态

```bash
export HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890
"/c/Program Files/GitHub CLI/gh.exe" run view <RUN_ID> --repo likehao19/toolhub
```

会列出每个 job（Windows / macOS）的进度和每一步的状态。

### 4.3. 设置 cron 监控（推荐）

构建一次约 25-40 分钟。设置 cron 每 15 分钟轮询一次，避免占用 session：

```
CronCreate({
  cron: "X,Y,Z,W * * * *",   # 选 :03,18,33,48 等避开 :00/:30 整点
  recurring: true,
  prompt: |
    检查 GitHub Actions run <RUN_ID> 状态。
    
    ```
    export HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890
    "/c/Program Files/GitHub CLI/gh.exe" run view <RUN_ID> --repo likehao19/toolhub
    ```
    
    in_progress / queued: 报"构建中（已 N 分钟）"
    completed + 全 success: 列 assets，告知用户去 publish
    completed + 有 failure: 用 --log-failed 抓日志，分析原因，删 cron
})
```

### 4.4. 查看失败日志

```bash
export HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890
"/c/Program Files/GitHub CLI/gh.exe" run view <RUN_ID> --repo likehao19/toolhub --log-failed | grep -E "error\[|^error|failed to|##\[error\]" | head -10
```

输出量很大，**必须用 grep 过滤** 否则看不清。

---

## 5. 已知失败模式与修复（按出现频率排序）

> 这部分是踩过的坑。再遇到时直接对号入座。

### 5.1. vite build JavaScript heap OOM（macOS 上最常见）

**症状：** macOS job 1-2 分钟挂掉，日志含：
```
FATAL ERROR: Ineffective mark-compacts near heap limit
Allocation failed - JavaScript heap out of memory
```

**原因：** macOS runner 内存比 Windows 小，vite 默认堆 ~2GB 不够（项目依赖重：codemirror/univer/g6/element-plus/...）。

**修复：** workflow 已经加了 `NODE_OPTIONS: '--max-old-space-size=6144'` 在 tauri-action 的 env 里。如果再次出现，加大到 8192。

### 5.2. xcap 0.0.x 在 macOS 编译失败（type annotations needed）

**症状：**
```
error[E0282]: type annotations needed
  --> .../xcap-0.0.14/src/macos/boxed.rs:22:41
22 | CFRelease(self.cf_array_ref.to_void());
```

**原因：** 老版 xcap 配新版 core-foundation 类型推断失败（macOS-only 编译路径）。

**修复：** 升级 `Cargo.toml` 的 `xcap = "0.9"`（API 改成 `Result` 包装）。改 `src-tauri/src/commands/screenshot.rs`：
- `monitor.name()` → `monitor.name().unwrap_or_default()`
- `monitor.id()` / `.x()` / `.y()` / `.width()` / `.height()` → `.unwrap_or(0)`
- `monitor.scale_factor()` → `.unwrap_or(1.0)`
- `window.is_minimized()` → `.unwrap_or(false)`

### 5.3. Tauri WebviewWindowBuilder.transparent() macOS 找不到方法

**症状：**
```
error[E0599]: no method named `transparent` found for struct `WebviewWindowBuilder`
  --> src/commands/window.rs:391:10
```

**原因：** Tauri v2 在 macOS 上 `transparent` 方法需要 `macos-private-api` feature（启用后无法上架 App Store）。

**修复：** 在调用 `.transparent(true)` 处用 `cfg` 跳过 macOS：
```rust
let mut notif_builder = WebviewWindowBuilder::new(...)
    .title(...)
    .decorations(false)
    .always_on_top(true);
#[cfg(not(target_os = "macos"))]
{
    notif_builder = notif_builder.transparent(true);
}
```

### 5.4. borrow of moved value

**症状：** macOS 编译报 `error[E0382]: borrow of moved value: 'value'`，本地 windows 编译却没事。

**原因：** 某字段 cfg-gated 只在 macOS/Linux 编译，windows 看不到。结构体字段顺序 move 后又 borrow。

**修复：** 改字段顺序或先克隆。例：
```rust
// ❌ value 已 move 进 struct，下一行不能再用
Ok(EnvVarInfo {
    value,
    scope: if value.is_empty() { "none" } else { "process" }.to_string(),
})

// ✅ 先把布尔提取出来
let exists = !value.is_empty();
Ok(EnvVarInfo {
    exists,
    scope: if exists { "process" } else { "none" }.to_string(),
    value,
})
```

### 5.5. tauri-action: No artifacts were found

**症状：** Rust 编译成功（`Finished release profile`），最后报：
```
Looking for artifacts in:
/.../bundle/dmg/ToolHub_X.X.X_universal.dmg
##[error]No artifacts were found.
```

**原因：** `src-tauri/tauri.conf.json` 的 `bundle.targets` 只写了 `["msi", "nsis"]`，macOS 不知道要打什么包。

**修复：** 改成 `"targets": "all"`，让 tauri 按平台自适应（Windows = msi+nsis, macOS = dmg+app）。

### 5.6. Linux 不需要构建

**用户已明确不需要 Linux**。`release.yml` 的 matrix 不应包含 `ubuntu-*`。如果有人加回来，移除即可。

### 5.7. aria2c.exe 是 Windows-only 资源

`src-tauri/binaries/aria2c.exe` 只有 Windows 版。`tauri.conf.json` 里 `bundle.resources` 引用了它。macOS 构建会带着这个文件（无害但用不上）。

workflow 里有一个 step 叫 "Strip Windows-only resources for non-Windows builds"，会在非 Windows runner 上把 `bundle.resources` 字段删掉，避免找不到文件。**不要删除这步。**

---

## 6. 发布 release（draft → public）

构建成功后，tauri-action 创建的是 **draft release**，外部用户看不到。需要手动 publish。

### 6.1. 列出 release 的 assets 验证齐全

```bash
export HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890
"/c/Program Files/GitHub CLI/gh.exe" release view vX.Y.Z --repo likehao19/toolhub --json assets --jq '.assets[] | "\(.name)  (\(.size / 1024 / 1024 | floor) MB)"'
```

正常应有 **5** 个文件：

| 文件 | 平台 | 用途 |
|---|---|---|
| `ToolHub_X.X.X_x64_zh-CN.msi` | Windows | MSI 中文 |
| `ToolHub_X.X.X_x64_en-US.msi` | Windows | MSI 英文 |
| `ToolHub_X.X.X_x64-setup.exe` | Windows | NSIS 安装包 |
| `ToolHub_X.X.X_aarch64.dmg` | macOS Apple Silicon | M1/M2/M3 安装包 |
| `ToolHub_X.X.X_x64.dmg` | macOS Intel | Intel Mac 安装包 |

### 6.2. 发布

```bash
export HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890
"/c/Program Files/GitHub CLI/gh.exe" release edit vX.Y.Z --repo likehao19/toolhub --draft=false
```

成功输出 release 的公开 URL：
```
https://github.com/likehao19/toolhub/releases/tag/vX.Y.Z
```

### 6.3. 删除已发但有问题的 release

```bash
# 删除 release（保留 tag）
"/c/Program Files/GitHub CLI/gh.exe" release delete vX.Y.Z --repo likehao19/toolhub --yes

# 也要删 tag（github + gitee + 本地）
git push github :refs/tags/vX.Y.Z
git -c http.proxy= -c https.proxy= push origin :refs/tags/vX.Y.Z
git tag -d vX.Y.Z
```

---

## 7. release.yml workflow 解析

```yaml
name: Release
on:
  push:
    tags: ['v*.*.*']      # 仅 tag 触发
  workflow_dispatch:      # 也允许手动触发
```

**Matrix：**
```yaml
matrix:
  include:
    - platform: 'macos-14'                              # ARM runner
      args: '--target aarch64-apple-darwin'             # Apple Silicon (M1/M2/M3)
    - platform: 'macos-13'                              # Intel runner
      args: '--target x86_64-apple-darwin'              # Intel Mac
    - platform: 'windows-latest'
      args: ''
```

**为什么不用 universal？** universal binary 是 aarch64 + x86_64 两份合并，dmg 体积约 44MB（单架构 ~22MB 的 2 倍）。Apple Silicon 用户装 universal 浪费一半空间，所以拆成两个独立包，每个 ~22MB。

**关键 step：**

1. checkout, setup node 20 with npm cache
2. 装 Rust stable，macOS 额外装 `aarch64-apple-darwin,x86_64-apple-darwin` 两个 target
3. swatinem/rust-cache（Cargo target 缓存，命中后构建快很多）
4. `npm ci`
5. **Strip Windows-only resources** — macOS 上删 `bundle.resources` 字段（避开 aria2c.exe 问题）
6. `tauri-apps/tauri-action@v0`：
   - `NODE_OPTIONS: --max-old-space-size=6144`（修 macOS OOM）
   - `tagName: ${{ github.ref_name }}`（取触发的 tag 名）
   - `releaseDraft: true`（先 draft 不直接发）
   - `args: ${{ matrix.args }}`

**典型耗时：**
- Windows: 18-22 分钟（首次无缓存约 25 分钟）
- macOS aarch64 (M1 runner): 18-22 分钟
- macOS x86_64 (Intel runner): 20-25 分钟（Intel runner 略慢于 ARM）

**三个 job 并行跑**，总时长由最慢的决定，约 25 分钟。

---

## 8. release.cjs 工作区清洁规则

脚本会拒绝运行，如果工作区有非 `.claude/` 路径的未提交变动。

**应忽略（脚本已处理）：**
- `.claude/settings.local.json`
- `.claude/scheduled_tasks.lock`
- `.claude/worktrees/**`

**不应忽略（必须先 commit）：**
- `package.json` / `tauri.conf.json` 的版本字段（脚本会自己写）
- `src/**`、`src-tauri/**`、`scripts/**`、`docs/**` 的改动
- `.github/workflows/**` 的改动

---

## 9. 完整发版示例（v1.0.4 假想）

```bash
# 1. 改完代码 + 测试
# (假设要发 patch 版本)

# 2. 跑 release
export HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890
npm run release

# 输出：
# 1.0.3 -> 1.0.4 (tag: v1.0.4)
# ... commit pushed to gitee + github
# ... tag pushed to gitee + github
# Done. Watch: https://github.com/likehao19/toolhub/actions

# 3. 取 run ID（gh CLI 需要代理）
"/c/Program Files/GitHub CLI/gh.exe" run list --repo likehao19/toolhub --workflow=Release --limit 1
# 输出: in_progress  ...  v1.0.4  push  <RUN_ID>  ...

# 4. 设 cron 每 15 分钟监控（见 4.3）

# 5. 等通知 → 全 success

# 6. 列 assets 验证
"/c/Program Files/GitHub CLI/gh.exe" release view v1.0.4 --repo likehao19/toolhub --json assets --jq '.assets[].name'

# 7. publish
"/c/Program Files/GitHub CLI/gh.exe" release edit v1.0.4 --repo likehao19/toolhub --draft=false

# 8. 验证公开
curl -sI "https://github.com/likehao19/toolhub/releases/latest" | grep -i location
# 应重定向到 /releases/tag/v1.0.4
```

---

## 10. 关键文件清单

| 文件 | 作用 |
|---|---|
| `.github/workflows/release.yml` | GitHub Actions 构建 workflow |
| `scripts/push-all.cjs` | npm run push 脚本 |
| `scripts/release.cjs` | npm run release 脚本（自动 bump + commit + push + tag） |
| `package.json` | scripts.release / push / release:minor / release:major + version |
| `src-tauri/tauri.conf.json` | tauri 打包配置（version、bundle.targets="all"） |
| `src-tauri/Cargo.toml` | xcap = "0.9"（注意不要回退到 0.0.x） |
| `website/index.html` | 官网（GitHub Pages 部署），下载按钮 JS 自动拉 latest release |

---

## 11. 应急预案

### 想取消正在跑的构建

```bash
"/c/Program Files/GitHub CLI/gh.exe" run cancel <RUN_ID> --repo likehao19/toolhub
```

### 想重跑同一个 tag

```bash
# 删除现有 release（如果是 draft）
"/c/Program Files/GitHub CLI/gh.exe" release delete vX.Y.Z --repo likehao19/toolhub --yes

# 删除 tag
git push github :refs/tags/vX.Y.Z
git -c http.proxy= -c https.proxy= push origin :refs/tags/vX.Y.Z
git tag -d vX.Y.Z

# 重新打
git tag vX.Y.Z
git push github vX.Y.Z
git -c http.proxy= -c https.proxy= push origin vX.Y.Z
```

但**不推荐**重发同一版本号，正确做法是直接发下一个 patch（避免用户混淆）。

### 想跳过当前失败版本

直接发下一个版本号即可，失败的版本号也作废：
```bash
npm run release      # 自动跳到下一个 patch
```

---

## 12. 给 AI 的核心提示

1. **网络配置：** 操作 github 类资源（push、gh CLI、API、release edit）必须 `export HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890`；操作 gitee 必须用 `git -c http.proxy= -c https.proxy=` 临时禁用代理。
2. **gh CLI 路径：** Windows bash 下用绝对路径 `"/c/Program Files/GitHub CLI/gh.exe"`，不要假设 PATH 里有 gh。
3. **构建很慢：** Windows 18 分钟、macOS 25-30 分钟。**不要 sleep 轮询，用 cron 异步监控。**
4. **macOS 失败 ≠ 灾难：** 大部分是已知模式（见 §5），对号入座修复，迭代下一个 patch 即可。
5. **不要主动 commit 用户的 `.claude/` 状态文件**，那些是 Claude Code 本地状态。
6. **Publish release 是面向公众的动作**：必须用户明确说"发布/publish"才执行，不要主动 publish draft。
7. **Linux 不要加回 matrix。**用户明确不需要。
