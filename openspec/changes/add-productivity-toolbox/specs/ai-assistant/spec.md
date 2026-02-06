## ADDED Requirements

### Requirement: AI 服务集成
系统应集成 AI 服务用于笔记分析和辅助。

#### Scenario: 配置 AI 服务
- **WHEN** 用户在设置中配置 AI
- **THEN** 用户可以选择 AI 提供商（OpenAI、Claude、自定义）
- **AND** 可以输入 API key
- **AND** 可以选择模型
- **AND** 配置安全保存

#### Scenario: 测试 AI 连接
- **WHEN** 用户测试 AI 连接
- **THEN** 系统向配置的 API 发送测试请求
- **AND** 验证 API key 和端点
- **AND** 显示成功或错误消息

### Requirement: AI 笔记分析
系统应提供 AI 驱动的笔记分析。

#### Scenario: 分析笔记内容
- **WHEN** 用户在笔记上点击"使用 AI 分析"
- **THEN** 系统将笔记内容发送到 AI 服务
- **AND** 请求分析（摘要、关键词、见解）
- **AND** 在面板或对话框中显示结果

#### Scenario: 未配置的 AI 分析
- **WHEN** 用户尝试使用 AI 分析但未配置
- **THEN** 系统提示用户配置 AI 设置
- **AND** 重定向到设置 > AI 配置

#### Scenario: 处理 AI API 错误
- **WHEN** AI API 调用失败
- **THEN** 系统显示用户友好的错误消息
- **AND** 建议检查 API key 和网络连接
- **AND** 记录错误用于调试

### Requirement: AI API 抽象层
系统应为多个 AI 提供商提供抽象层。

#### Scenario: 支持 OpenAI
- **WHEN** 用户选择 OpenAI 作为提供商
- **THEN** 系统使用 OpenAI API 格式
- **AND** 支持 GPT 模型
- **AND** 处理 OpenAI 特定参数

#### Scenario: 支持 Claude
- **WHEN** 用户选择 Claude 作为提供商
- **THEN** 系统使用 Anthropic API 格式
- **AND** 支持 Claude 模型
- **AND** 处理 Claude 特定参数

#### Scenario: 支持自定义端点
- **WHEN** 用户选择自定义提供商
- **THEN** 用户可以输入自定义 API 端点
- **AND** 系统使用通用 API 格式
- **AND** 支持自定义头部和参数

### Requirement: AI 响应处理
系统应适当处理和显示 AI 响应。

#### Scenario: 显示 AI 分析
- **WHEN** AI 返回分析结果
- **THEN** 系统显示格式化的响应
- **AND** 支持响应中的 Markdown 格式化
- **AND** 允许用户复制或保存结果

#### Scenario: 处理流式响应
- **WHEN** AI 服务支持流式传输
- **THEN** 系统在结果到达时显示部分结果
- **AND** 实时更新显示
- **AND** 显示加载指示器

#### Scenario: 缓存 AI 响应
- **WHEN** 用户请求分析相同笔记内容
- **THEN** 系统首先检查缓存
- **AND** 如果可用则返回缓存结果
- **AND** 允许用户强制刷新

