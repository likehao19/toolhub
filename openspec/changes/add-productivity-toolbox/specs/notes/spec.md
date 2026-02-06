## ADDED Requirements

### Requirement: 笔记管理
系统应提供一个笔记管理系统，支持 Markdown 编辑、文件组织和媒体展示。

#### Scenario: 创建新笔记
- **WHEN** 用户点击"新建笔记"或使用 `@note` 命令
- **THEN** 系统创建新笔记
- **AND** 打开 Markdown 编辑器
- **AND** 将笔记保存为 `.md` 文件到配置的存储位置

#### Scenario: 编辑笔记
- **WHEN** 用户从文件树中选择笔记
- **THEN** 系统将笔记内容加载到编辑器
- **AND** 用户可以编辑 Markdown 内容
- **AND** 更改自动保存或手动保存

#### Scenario: 删除笔记
- **WHEN** 用户右键点击笔记并选择"删除"
- **THEN** 系统提示确认
- **AND** 确认后删除笔记文件
- **AND** 从文件树中移除

#### Scenario: 创建文件夹
- **WHEN** 用户在文件树中右键点击并选择"新建文件夹"
- **THEN** 系统创建新文件夹
- **AND** 用户可以命名文件夹
- **AND** 文件夹出现在文件树中

#### Scenario: 在文件夹中组织笔记
- **WHEN** 用户将笔记拖拽到文件夹
- **THEN** 系统将笔记文件移动到文件夹目录
- **AND** 更新文件树结构

### Requirement: Markdown 编辑器
系统应提供一个支持预览和编辑功能的 Markdown 编辑器。

#### Scenario: 编辑 Markdown 内容
- **WHEN** 用户在编辑器中输入
- **THEN** 系统支持标准 Markdown 语法
- **AND** 提供语法高亮
- **AND** 支持实时预览或分屏视图

#### Scenario: 插入图片
- **WHEN** 用户在编辑器中插入图片
- **THEN** 系统将图片保存到图片文件夹
- **AND** 使用相对路径更新 Markdown
- **AND** 在预览中显示图片

#### Scenario: 插入视频
- **WHEN** 用户在编辑器中插入视频
- **THEN** 系统将视频保存到视频文件夹
- **AND** 使用相对路径更新 Markdown
- **AND** 在预览中显示视频播放器

### Requirement: 笔记存储
系统应将笔记存储为 Markdown 文件，并组织媒体文件夹。

#### Scenario: 保存笔记到本地文件
- **WHEN** 用户保存笔记
- **THEN** 系统将内容保存为 `.md` 文件
- **AND** 使用 UTF-8 编码
- **AND** 存储到配置的笔记目录

#### Scenario: 组织媒体文件
- **WHEN** 笔记包含图片或视频
- **THEN** 图片存储在 `notes/[note-name]/images/`
- **AND** 视频存储在 `notes/[note-name]/videos/`
- **AND** Markdown 引用使用相对路径

### Requirement: AI 笔记分析
系统应在配置后提供 AI 驱动的笔记分析。

#### Scenario: 使用 AI 分析笔记
- **WHEN** 用户在笔记上点击"使用 AI 分析"
- **THEN** 系统将笔记内容发送到配置的 AI 服务
- **AND** 显示分析结果（摘要、关键词、建议）
- **AND** 需要有效的 AI API 配置

#### Scenario: AI 配置缺失
- **WHEN** 用户尝试使用 AI 分析但未配置
- **THEN** 系统提示用户配置 AI 设置
- **AND** 重定向到设置 > AI 配置

