## ADDED Requirements

### Requirement: 设置模块
系统应提供一个分为多个部分的设置界面。

#### Scenario: 访问设置
- **WHEN** 用户在侧边栏点击设置
- **THEN** 系统显示设置页面
- **AND** 显示部分标签：常规、外观、存储、AI 配置

#### Scenario: 导航设置部分
- **WHEN** 用户点击部分标签
- **THEN** 系统显示该部分的设置
- **AND** 高亮显示活动标签

### Requirement: 常规设置
系统应提供常规应用设置。

#### Scenario: 配置窗口关闭行为
- **WHEN** 用户在常规设置中
- **THEN** 用户可以选择关闭行为："询问"、"最小化到托盘"、"退出"
- **AND** 设置保存到用户配置 JSON

#### Scenario: 配置自启动
- **WHEN** 用户在常规设置中
- **THEN** 用户可以切换"随系统启动"
- **AND** 设置保存并通过 Tauri autostart 插件应用

#### Scenario: 配置语言
- **WHEN** 用户在常规设置中
- **THEN** 用户可以选择应用语言
- **AND** 设置保存到用户配置

### Requirement: 外观设置
系统应提供外观自定义选项。

#### Scenario: 更改主题
- **WHEN** 用户在外观设置中
- **THEN** 用户可以选择主题："浅色"、"深色"、"自动"
- **AND** 主题立即应用
- **AND** 设置保存到用户配置

#### Scenario: 配置字体
- **WHEN** 用户在外观设置中
- **THEN** 用户可以选择字体系列和大小
- **AND** 更改应用到编辑器和 UI
- **AND** 设置保存到用户配置

### Requirement: 存储设置
系统应允许用户配置存储位置。

#### Scenario: 配置笔记存储位置
- **WHEN** 用户在存储设置中
- **THEN** 用户可以查看当前笔记目录
- **AND** 可以点击"更改"选择新目录
- **AND** 系统验证目录并更新配置

#### Scenario: 查看存储使用情况
- **WHEN** 用户在存储设置中
- **THEN** 系统显示存储使用统计
- **AND** 显示笔记大小、数据库大小、媒体文件大小

### Requirement: AI 配置
系统应提供 AI 服务配置。

#### Scenario: 配置 AI API
- **WHEN** 用户在 AI 配置中
- **THEN** 用户可以选择 AI 提供商："OpenAI"、"Claude"、"自定义"
- **AND** 可以输入 API Key
- **AND** 可以选择模型
- **AND** 设置安全保存

#### Scenario: 测试 AI 连接
- **WHEN** 用户点击"测试连接"
- **THEN** 系统向 AI API 发送测试请求
- **AND** 显示成功或错误消息
- **AND** 验证 API Key 和配置

#### Scenario: AI 配置必需
- **WHEN** 用户尝试使用 AI 功能但未配置
- **THEN** 系统提示配置 AI 设置
- **AND** 重定向到设置 > AI 配置

### Requirement: 设置持久化
系统应将设置持久化到用户目录。

#### Scenario: 保存设置
- **WHEN** 用户更改任何设置
- **THEN** 系统保存到用户配置 JSON 文件
- **AND** 文件位置：`{user_data_dir}/config.json`
- **AND** 使用 Tauri Store 存储简单设置

#### Scenario: 启动时加载设置
- **WHEN** 应用启动
- **THEN** 系统从配置文件加载设置
- **AND** 将设置应用到应用
- **AND** 如果配置文件不存在则使用默认值

