# Maven 仓库可视化工具方案

## 1. 概述

在工具箱中新增 **Maven 仓库管理器**，提供本地 `.m2/repository` 浏览、私服连接、依赖完整性检查、依赖树可视化、POM 生成与复制等功能。

---

## 2. 功能模块

### 2.1 本地仓库浏览

**入口**：自动检测 `~/.m2/repository`，支持手动选择自定义路径（如 `settings.xml` 中配置的 `<localRepository>`）。

**浏览方式**：
- 树形结构展示 `groupId → artifactId → version`
- 搜索过滤：支持按 `groupId:artifactId` 模糊搜索
- 列表视图：平铺展示所有 artifact，按最后修改时间排序

**每个 artifact 展示信息**：

| 字段 | 说明 |
|---|---|
| GAV 坐标 | `groupId:artifactId:version` |
| 文件列表 | `.jar`、`.pom`、`.sha1`、`.md5`、`-sources.jar`、`-javadoc.jar` |
| 文件大小 | 每个文件的实际大小 |
| 最后修改 | 文件修改时间 |
| 完整性状态 | ✅ 完整 / ⚠️ 缺失文件 / ❌ 校验失败 |

**目录解析规则**：
```
.m2/repository/
  └── org/apache/commons/         ← groupId: org.apache.commons
      └── commons-lang3/          ← artifactId: commons-lang3
          └── 3.12.0/             ← version: 3.12.0
              ├── commons-lang3-3.12.0.jar
              ├── commons-lang3-3.12.0.jar.sha1
              ├── commons-lang3-3.12.0.pom
              ├── commons-lang3-3.12.0.pom.sha1
              └── _remote.repositories
```

### 2.2 私服仓库浏览

**支持的私服类型**：
- Nexus Repository (v2/v3 REST API)
- JFrog Artifactory (REST API)
- 自定义 Maven 仓库（基于目录索引的 HTTP 浏览）

**连接配置**：
- 仓库 URL（如 `https://nexus.company.com/repository/maven-public/`）
- 认证方式：用户名/密码 或 Bearer Token
- 可从本地 `~/.m2/settings.xml` 自动解析 `<server>` 和 `<mirror>` 配置

**API 调用**：

| 私服类型 | 搜索 API | 示例 |
|---|---|---|
| Nexus v3 | `GET /service/rest/v1/search?repository=maven-public&name=commons-lang3` | REST JSON |
| Nexus v2 | `GET /service/local/lucene/search?g=org.apache&a=commons-lang3` | XML |
| Artifactory | `GET /api/search/gavc?g=org.apache&a=commons-lang3` | REST JSON |
| 通用 HTTP | 目录遍历 `GET /org/apache/commons/commons-lang3/` | HTML 解析 |

### 2.3 依赖完整性检查

对选定的 artifact 或整个仓库执行检查，报告问题列表。

**检查项**：

| # | 检查项 | 严重级别 | 说明 |
|---|---|---|---|
| 1 | `.jar` 是否存在 | ❌ 严重 | 打包类型为 `jar` 时必须存在（`pom` 类型除外） |
| 2 | `.pom` 是否存在 | ❌ 严重 | 所有 artifact 必须有 POM |
| 3 | `.jar.sha1` 是否存在 | ⚠️ 警告 | 缺失则无法验证 jar 完整性 |
| 4 | `.pom.sha1` 是否存在 | ⚠️ 警告 | 缺失则无法验证 pom 完整性 |
| 5 | SHA1 校验是否匹配 | ❌ 严重 | 读取 `.sha1` 文件内容，与实际文件计算的 SHA1 比较 |
| 6 | MD5 校验是否匹配 | ⚠️ 警告 | 同上，MD5 |
| 7 | POM 中 `<dependencies>` 声明的传递依赖是否在本地存在 | ❌ 严重 | 解析 POM XML，逐一检查每个 dependency 的 GAV 是否在本地仓库有对应目录 |
| 8 | `_remote.repositories` 是否存在 | ℹ️ 信息 | 标识 artifact 来源仓库 |
| 9 | SNAPSHOT 版本 `maven-metadata-*.xml` 是否存在 | ⚠️ 警告 | SNAPSHOT 需要 metadata 解析实际版本 |

**SHA1 校验算法**：
```rust
// Rust 端
use sha1::{Sha1, Digest};

fn verify_sha1(file_path: &str, expected_sha1: &str) -> bool {
    let bytes = std::fs::read(file_path).unwrap();
    let hash = Sha1::digest(&bytes);
    let actual = format!("{:x}", hash);
    actual.trim() == expected_sha1.trim()
}
```

**POM 依赖解析**：
```xml
<!-- 解析 POM 中的 dependencies 段 -->
<dependencies>
  <dependency>
    <groupId>org.slf4j</groupId>
    <artifactId>slf4j-api</artifactId>
    <version>1.7.36</version>
    <scope>compile</scope>           <!-- compile/provided/runtime/test/system -->
  </dependency>
</dependencies>
```

检查逻辑：
1. 读取并解析 `.pom` XML
2. 提取所有 `<dependency>` 节点
3. 排除 `<scope>test</scope>` 和 `<scope>provided</scope>`
4. 处理 `<properties>` 变量替换（如 `${project.version}`）
5. 处理 `<dependencyManagement>` 中的版本覆盖
6. 处理 `<parent>` 继承（递归查找 parent POM）
7. 对每个 compile/runtime 依赖，检查本地仓库是否存在对应 `groupId/artifactId/version` 目录

**批量检查模式**：
- 支持全仓库扫描（后台线程，进度条显示）
- 按严重级别分组展示结果
- 导出检查报告为 CSV / JSON

### 2.4 依赖树可视化

**数据来源（两种模式）**：

#### 模式 A：基于 Java 项目 `pom.xml`

用户选择一个 Java 项目目录，工具执行：

```bash
mvn dependency:tree -DoutputType=text -DoutputFile=dep-tree.txt
```

或解析 `mvn dependency:tree -DoutputType=dot` 的输出生成图形。

如果用户未安装 Maven，则回退到手动解析 `pom.xml`：
1. 解析项目 `pom.xml` 的 `<dependencies>`
2. 递归解析每个依赖的 `.pom` 文件（从本地仓库读取）
3. 构建完整依赖树

#### 模式 B：基于单个 artifact GAV

输入 `groupId:artifactId:version`，从本地仓库读取 POM 并递归构建依赖树。

**可视化展示**：

```
my-project:1.0.0
├── spring-boot-starter-web:3.2.0 [compile]
│   ├── spring-boot-starter:3.2.0
│   │   ├── spring-boot:3.2.0
│   │   ├── spring-boot-autoconfigure:3.2.0
│   │   └── spring-core:6.1.1
│   ├── spring-boot-starter-json:3.2.0
│   │   ├── jackson-databind:2.15.3
│   │   │   ├── jackson-core:2.15.3
│   │   │   └── jackson-annotations:2.15.3
│   │   └── jackson-datatype-jdk8:2.15.3
│   └── spring-boot-starter-tomcat:3.2.0
│       └── tomcat-embed-core:10.1.16
├── mysql-connector-java:8.0.33 [runtime]
└── ❌ lombok:1.18.30 [缺失!]
```

**交互功能**：
- 展开/折叠子树
- 搜索定位节点
- 高亮标记：缺失依赖（红色）、冲突版本（橙色）、可选依赖（灰色）
- 点击节点显示详情（GAV、scope、文件完整性、传递路径）
- 冲突检测：同一 artifactId 多个版本时标注冲突，展示 Maven 的"最近者优先"选择结果

### 2.5 POM 生成 & 复制

**GAV 坐标复制**（一键复制多种格式）：

```xml
<!-- Maven -->
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-lang3</artifactId>
    <version>3.12.0</version>
</dependency>
```

```groovy
// Gradle
implementation 'org.apache.commons:commons-lang3:3.12.0'
```

```groovy
// Gradle Kotlin DSL
implementation("org.apache.commons:commons-lang3:3.12.0")
```

```scala
// SBT
libraryDependencies += "org.apache.commons" % "commons-lang3" % "3.12.0"
```

**POM 生成器**：
- 用户勾选多个 artifact → 生成完整 `<dependencies>` 段
- 支持设置 scope（compile / provided / runtime / test）
- 一键复制到剪贴板

### 2.6 附加功能

| 功能 | 说明 |
|---|---|
| 仓库统计 | 总 artifact 数、总大小、按 groupId 分布饼图 |
| 清理工具 | 删除损坏的 artifact、清理 SNAPSHOT 旧版本、删除 `_remote.repositories` |
| 版本比较 | 同一 artifact 不同版本间的 POM diff |
| 快速修复 | 缺失文件一键从私服重新下载 |

---

## 3. 技术架构

### 3.1 Rust 后端命令

| 命令 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `maven_scan_repo` | `{ path }` | `Vec<MavenArtifact>` | 扫描本地仓库目录，返回所有 artifact 列表 |
| `maven_get_artifact` | `{ path, groupId, artifactId, version }` | `ArtifactDetail` | 获取单个 artifact 详情（文件列表、大小、时间） |
| `maven_check_integrity` | `{ path, groupId?, artifactId?, version? }` | `Vec<IntegrityIssue>` | 完整性检查（可选范围：单个/全部） |
| `maven_verify_checksum` | `{ filePath, checksumPath }` | `ChecksumResult` | SHA1/MD5 校验 |
| `maven_parse_pom` | `{ pomPath }` | `PomInfo` | 解析 POM XML，提取 GAV + dependencies + parent |
| `maven_dep_tree` | `{ pomPath, repoPath }` | `DepTreeNode` | 递归构建依赖树 |
| `maven_search_remote` | `{ url, auth?, query }` | `Vec<RemoteArtifact>` | 搜索私服仓库 |
| `maven_download_artifact` | `{ url, auth?, gav, repoPath }` | `DownloadResult` | 从私服下载修复缺失 artifact |
| `maven_parse_settings` | `{ settingsPath? }` | `MavenSettings` | 解析 `settings.xml` 获取本地仓库路径和镜像配置 |
| `maven_repo_stats` | `{ path }` | `RepoStats` | 仓库统计信息 |

### 3.2 数据结构

```rust
#[derive(Serialize)]
pub struct MavenArtifact {
    pub group_id: String,
    pub artifact_id: String,
    pub version: String,
    pub packaging: String,          // jar, pom, war, aar...
    pub has_jar: bool,
    pub has_pom: bool,
    pub has_sources: bool,
    pub has_javadoc: bool,
    pub has_sha1: bool,
    pub has_md5: bool,
    pub jar_size: Option<u64>,
    pub last_modified: u64,         // timestamp
    pub integrity_status: String,   // "ok", "warning", "error"
    pub dir_path: String,           // 物理路径
}

#[derive(Serialize)]
pub struct IntegrityIssue {
    pub group_id: String,
    pub artifact_id: String,
    pub version: String,
    pub severity: String,           // "error", "warning", "info"
    pub check_type: String,         // "missing_jar", "missing_pom", "sha1_mismatch" ...
    pub message: String,
    pub file_path: Option<String>,
}

#[derive(Serialize)]
pub struct DepTreeNode {
    pub group_id: String,
    pub artifact_id: String,
    pub version: String,
    pub scope: String,
    pub packaging: String,
    pub optional: bool,
    pub exists_locally: bool,       // 本地仓库是否存在
    pub conflict_version: Option<String>,  // 冲突的其他版本
    pub children: Vec<DepTreeNode>,
}

#[derive(Serialize)]
pub struct PomInfo {
    pub group_id: String,
    pub artifact_id: String,
    pub version: String,
    pub packaging: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub parent: Option<ParentRef>,
    pub properties: HashMap<String, String>,
    pub dependencies: Vec<PomDependency>,
    pub dependency_management: Vec<PomDependency>,
}

#[derive(Serialize)]
pub struct PomDependency {
    pub group_id: String,
    pub artifact_id: String,
    pub version: Option<String>,
    pub scope: Option<String>,
    pub optional: bool,
    pub exclusions: Vec<String>,    // "groupId:artifactId"
}

#[derive(Serialize)]
pub struct RepoStats {
    pub total_artifacts: u64,
    pub total_size: u64,
    pub group_count: u64,
    pub top_groups: Vec<(String, u64)>,  // groupId → artifact count
    pub issue_count: u64,
}
```

### 3.3 Rust 依赖

```toml
# Cargo.toml 新增
sha1 = "0.10"             # SHA1 计算
md-5 = "0.10"             # MD5 计算
quick-xml = "0.31"        # XML 解析（POM / settings.xml）
walkdir = "2"             # 目录递归遍历
```

### 3.4 前端页面结构

```
┌─ Header: breadcrumb (工具箱 / Maven 仓库管理器) ──────────────────────────────┐
├─ Toolbar: [本地仓库路径] [私服配置] [刷新] [全量检查] ──────────────────────────┤
├─ Main area (flex row) ─────────────────────────────────────────────────────────┤
│ ┌─ Left: 仓库树 (300px) ─────┐ ┌─ Right: 详情面板 (flex:1) ──────────────┐  │
│ │ 🔍 搜索框                   │ │ Tab: [概览] [文件] [依赖] [POM]        │  │
│ │ 📁 org.apache               │ │                                        │  │
│ │   📁 commons                 │ │ 概览 Tab:                              │  │
│ │     📦 commons-lang3         │ │   GAV 坐标 + 一键复制                   │  │
│ │       📋 3.12.0  ✅          │ │   完整性检查结果                        │  │
│ │       📋 3.11.0  ⚠️          │ │   文件列表 + 状态                      │  │
│ │   📁 maven                   │ │                                        │  │
│ │     📦 maven-core            │ │ 依赖 Tab:                              │  │
│ │       📋 3.9.6  ❌           │ │   依赖树可视化（展开/折叠）             │  │
│ │                              │ │   缺失依赖高亮                          │  │
│ │ ──── 仓库统计 ────           │ │                                        │  │
│ │ 2,456 artifacts · 1.2 GB   │ │ POM Tab:                               │  │
│ └──────────────────────────────┘ │   POM 原文 + 语法高亮                   │  │
│                                  │   POM 生成器（多格式复制）              │  │
│                                  └────────────────────────────────────────┘  │
├─ Status bar: Ready · 问题: 12 error, 34 warning ───────────────────────────────┤
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 关键流程

### 4.1 仓库扫描流程

```
用户打开工具
  │
  ├─→ 自动解析 ~/.m2/settings.xml
  │     └─→ 读取 <localRepository> 配置
  │     └─→ 读取 <mirrors> 和 <servers> 配置
  │
  ├─→ Rust: maven_scan_repo(repoPath)
  │     └─→ walkdir 递归遍历
  │     └─→ 识别 version 目录（包含 .pom 或 .jar）
  │     └─→ 快速检测文件存在性（不计算 checksum）
  │     └─→ 返回 artifact 列表（按 groupId 分组）
  │
  └─→ 前端构建树形结构，展示在左侧面板
```

### 4.2 完整性检查流程

```
用户点击 [全量检查] 或 选中 artifact 点击 [检查]
  │
  ├─→ Rust: maven_check_integrity(scope)
  │     │
  │     ├─→ 遍历每个 artifact 目录
  │     │     ├─→ 检查 .jar 存在（packaging != pom 时）
  │     │     ├─→ 检查 .pom 存在
  │     │     ├─→ 检查 .sha1 / .md5 存在
  │     │     ├─→ 校验 sha1: 读取文件计算 → 比对 .sha1 内容
  │     │     └─→ 校验 md5: 同上
  │     │
  │     ├─→ 解析 .pom 中的 <dependencies>
  │     │     ├─→ 变量替换 ${xxx}
  │     │     ├─→ 排除 test/provided scope
  │     │     └─→ 检查每个依赖在本地是否存在
  │     │
  │     └─→ 返回 Vec<IntegrityIssue>
  │
  └─→ 前端分组展示：errors / warnings / info
        └─→ 支持按 severity 筛选、导出报告
```

### 4.3 依赖树构建流程

```
用户选择 artifact 或项目 pom.xml
  │
  ├─→ Rust: maven_dep_tree(pomPath, repoPath)
  │     │
  │     ├─→ 解析根 POM
  │     │     ├─→ 处理 <parent> 继承
  │     │     ├─→ 合并 <dependencyManagement>
  │     │     └─→ 解析 <properties> 变量
  │     │
  │     ├─→ 对每个 dependency:
  │     │     ├─→ 变量替换 version
  │     │     ├─→ 在本地仓库查找对应 .pom
  │     │     ├─→ 如果存在 → 递归解析（深度限制 20 层）
  │     │     ├─→ 如果不存在 → 标记 exists_locally = false
  │     │     └─→ 检测版本冲突（同 artifactId 不同 version）
  │     │
  │     └─→ 返回 DepTreeNode 树
  │
  └─→ 前端树形渲染
        ├─→ 缺失节点红色高亮 + ❌ 图标
        ├─→ 冲突节点橙色标注
        └─→ 可展开/折叠/搜索
```

---

## 5. UI 交互细节

### 5.1 仓库树（左侧面板）

- 默认只加载第一级 groupId 段（懒加载子节点）
- 每个 version 节点右侧显示状态图标：✅ ⚠️ ❌
- 右键菜单：检查完整性 / 复制 GAV / 删除 artifact / 在文件管理器中打开
- 支持多选（Ctrl+Click）批量操作

### 5.2 详情面板（右侧）

**概览 Tab**：
- GAV 信息卡片 + 四种格式一键复制按钮（Maven / Gradle / Gradle KTS / SBT）
- 文件状态表格：文件名、大小、校验状态
- 完整性问题列表（如果有）

**文件 Tab**：
- artifact 目录下所有文件列表
- 支持查看 POM 原文（语法高亮）
- 支持在文件管理器中打开

**依赖 Tab**：
- 依赖树组件（可展开/折叠）
- 筛选：显示全部 / 仅 compile / 仅缺失
- 搜索框快速定位

**POM Tab**：
- POM 原文展示（XML 语法高亮，使用 CodeMirror）
- POM 生成器：勾选依赖 → 生成 `<dependencies>` XML
- 下载 POM 文件

### 5.3 全量检查对话框

- 进度条显示扫描进度
- 实时更新问题数量
- 完成后展示报告摘要：
  - ❌ N 个严重问题（缺失 jar/pom、校验失败）
  - ⚠️ N 个警告（缺失 sha1/md5）
  - ✅ N 个正常 artifact
- 支持导出报告

---

## 6. 实现优先级

| 阶段 | 功能 | 复杂度 |
|---|---|---|
| P0 | 本地仓库浏览（树形 + 搜索） | 中 |
| P0 | Artifact 详情展示（文件列表 + GAV 复制） | 低 |
| P0 | POM 解析 + XML 展示 | 中 |
| P1 | 完整性检查（文件存在 + SHA1 校验） | 中 |
| P1 | 依赖树可视化（本地 POM 递归解析） | 高 |
| P1 | POM 生成器（多格式复制） | 低 |
| P2 | 传递依赖缺失检查 | 高 |
| P2 | 私服浏览（Nexus/Artifactory API） | 高 |
| P2 | 仓库统计 + 清理工具 | 中 |
| P3 | 从私服下载修复缺失 artifact | 中 |
| P3 | Java 项目 `mvn dependency:tree` 集成 | 中 |

---

## 7. 注册清单

按工具箱标准 7 处注册：

| # | 文件 | 改动 |
|---|---|---|
| 1 | `src/views/Toolbox.vue` | devTools 数组添加 `maven-repo` 条目 |
| 2 | `src/views/Toolbox.vue` | openTool 添加路由跳转 |
| 3 | `src/router/index.js` | 添加 `/toolbox/maven-repo` 路由 |
| 4 | `src/components/ProductivitySidebar.vue` | toolPathMap 添加映射 |
| 5 | `src/i18n/locales/zh-CN.js` | toolbox.tools.mavenRepo + mavenRepo 命名空间 |
| 6 | `src/i18n/locales/en-US.js` | 同上英文 |
| 7 | `src-tauri/Cargo.toml` | 添加 sha1, md-5, quick-xml, walkdir |
| 8 | `src-tauri/src/commands/maven.rs` | 新建 Rust 后端 |
| 9 | `src/views/MavenRepo.vue` | 新建 Vue 页面 |
