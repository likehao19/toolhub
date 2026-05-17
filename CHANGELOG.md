# 更新日志 / Changelog

所有显著变更都会记录在这里。版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

每一项以面向用户的语言书写——回答"这一版给我带来了什么"，而不是罗列 commit 信息。

---

## [1.0.9] - 2026-05-17

### 新增

- **应用内自动更新**：在"关于"页面一键检查、下载、安装新版本，不再需要手动到 Releases 页下载。下载有实时进度、速度显示与可取消；安装时自动拉起安装器并退出当前应用。源以 GitHub 为主、Gitee 为备，国内网络也能用。
- **应用日志面板**：设置页新增"日志"入口，可在应用内直接查看最近运行日志、打开日志目录、或清空旧日志。日志文件按 5MB 自动滚动保留。
- **更新日志面板**：设置页内可直接浏览历次版本的更新日志，不必跳到外部站点。

### 其他

- 设置页与关于页：界面整理，新功能对应文案补全简体中文 / English 双语。

---

## [1.0.8] - 2026-05-17

### 新增

- **API 调试台**：增加 cookie 管理、Postman 集合导入导出、Pre-request 脚本运行能力，HTTP 引擎支持 multipart/form-data 文件上传。
- 工具图标体系：新的 `ToolIcon` 组件与统一图标映射，工具栏视觉一致。
- 通用 Header 样式 composable：跨视图统一标题栏配色。

### 修复

- 主题：彻底清理 353 处硬编码的纯白 `rgba(255,255,255,...)`，统一走 `var(--surface-*)`，亮色/暗色模式下颜色不再撕裂。
- 主题：第二、三轮硬编码颜色清理（Tailwind 灰阶、命名色、品牌蓝），暗色模式下文字可读性大幅提升。
- 工具箱：页面切换瞬间的白闪、工具页 shell 暗色下的覆盖问题。
- 工具箱：亮色模式下原本偏冷的淡蓝色背景改为更暖的奶油色，长时间使用更舒适。

---

## [1.0.7] - 2026-05-13

### 修复

- macOS Intel 版本恢复发布：用 ARM runner 交叉编译到 `x86_64-apple-darwin`，绕开 GitHub Actions Intel runner 长期排队的问题。Intel Mac 用户重新有了原生包。

---

## [1.0.6] - 2026-05-13

### 修复

- 修复 GitHub Actions 在创建 release 时报 "Resource not accessible by integration"——给 workflow 顶层加 `permissions: contents: write`。
- 移除 macOS Intel 的 `macos-13` matrix（runner 排队问题），Intel Mac 用户暂时走 Rosetta 2 跑 ARM 版本（下一版恢复原生 Intel）。

---

## [1.0.5] - 2026-05-12

### 修复

- macOS：DNS 查询工具修复——`normalize_record_type` 去掉了 Windows-only 的 `cfg` 守卫，Mac 上现在能正常调用。

---

## [1.0.4] - 2026-05-11

### 修复

- macOS：硬件信息、壁纸、密码凭据、SDK、网络几个工具的 Mac 平台实现补齐，之前这些工具在 Mac 上不可用或不完整。

---

## [1.0.3] - 2026-05-10

### 修复

- macOS：bundle.targets 改成 `"all"`，让 macOS 构建产出 `.dmg/.app`（之前只配了 Windows 的 `msi/nsis`，Mac 上没有产出包）。

---

## [1.0.2] - 2026-05-10

### 修复

- macOS：编译错误修复（`window.rs` 和 `sdk.rs` 里的 Windows-only 代码缺少 cfg 守卫）。

---

## [1.0.1] - 2026-05-10

### 修复

- 升级 `xcap` 至 0.9，修复 macOS 编译时 `type annotations needed` 错误。
- 发版脚本：忽略所有 `.claude/` 路径下的本地状态变更，避免误判工作区脏。
- 发版脚本：推送 gitee 时绕过代理，速度大幅提升。

---

## [1.0.0] - 2026-05-10

### 首次发布

ToolHub 第一个正式版本。集合了开发者日常需要的多种工具：

- **工具箱主页**：可分类、可搜索的工具入口
- **API 调试台**：HTTP 请求构造、curl 解析、Mock 服务、批量测试、性能测试
- **笔记**：富文本/Markdown/Excel 多种编辑器，文件夹组织
- **聊天室**：局域网二进制 WebSocket 协议，支持大文件分片传输
- **下载管理器**：基于 aria2c 的多线程下载，BT/磁链支持
- **SDK 管理器**：JDK/Node/Python 等 SDK 多版本切换
- **更多**：截图、壁纸、SQLite、Redis、SSH、端口、Maven、加解密、正则、文件对比、日历、待办、密码本……
- 平台支持：Windows + macOS（Apple Silicon + Intel）
- 双语：简体中文 + English
- 主题：亮色 + 暗色
