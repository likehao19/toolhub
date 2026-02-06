## ADDED Requirements

### Requirement: AI Assistant Dialog Interface
系统 SHALL 提供全局AI助手对话界面，允许用户通过自然语言操作各模块功能。

#### Scenario: 打开AI助手
- **WHEN** 用户点击AI助手浮动按钮或按下 Ctrl+K 快捷键
- **THEN** 系统 SHALL 显示AI助手对话框
- **AND** 自动聚焦到输入框

#### Scenario: 输入提示和示例
- **WHEN** 用户打开AI助手且输入框为空
- **THEN** 系统 SHALL 显示示例指令：
  - "帮我写一篇关于XX的文档"
  - "明天上午10点开会，提前5分钟提醒"
  - "保存QQ账号密码"
  - "收藏网站 www.example.com"

### Requirement: Natural Language Intent Recognition
AI助手 SHALL 能够识别用户的自然语言指令并提取操作意图。

#### Scenario: 创建笔记意图识别
- **WHEN** 用户输入"帮我写一个滕王阁序的md文档"
- **THEN** 系统 SHALL 识别意图为"create_note"
- **AND** 提取参数：title="滕王阁序", type="md", content_request="生成滕王阁序全文"

#### Scenario: 创建日程意图识别
- **WHEN** 用户输入"明天上午10点开会提前五分钟提醒"
- **THEN** 系统 SHALL 识别意图为"create_event"
- **AND** 提取参数：title="开会", start_time="明天10:00", reminder="5分钟"

#### Scenario: 创建密码意图识别
- **WHEN** 用户输入"存储QQ密码用户名abc密码123456"
- **THEN** 系统 SHALL 识别意图为"create_password"
- **AND** 提取参数：website="QQ", username="abc", password="123456"

#### Scenario: 创建书签意图识别
- **WHEN** 用户输入"帮我收藏这个网站：www.baidu.com"
- **THEN** 系统 SHALL 识别意图为"create_bookmark"
- **AND** 提取参数：url="www.baidu.com"

#### Scenario: 创建待办意图识别
- **WHEN** 用户输入"我有一项任务：第一步买菜，第二步做饭"
- **THEN** 系统 SHALL 识别意图为"create_todo"
- **AND** 提取参数：tasks=["买菜", "做饭"]

### Requirement: AI Content Generation
对于需要生成内容的操作，AI助手 SHALL 调用大模型生成相应内容。

#### Scenario: 生成笔记内容
- **WHEN** 用户请求创建文档且需要AI生成内容
- **THEN** 系统 SHALL 调用AI API生成文档正文
- **AND** 使用Markdown格式
- **AND** 在5秒内返回生成的内容

#### Scenario: AI生成失败处理
- **WHEN** AI API调用失败或超时
- **THEN** 系统 SHALL 显示错误提示
- **AND** 允许用户重试或手动创建

### Requirement: Operation Confirmation
在执行实际操作前，系统 SHALL 展示AI理解的内容并要求用户确认。

#### Scenario: 显示操作预览
- **WHEN** AI完成内容生成
- **THEN** 系统 SHALL 显示操作预览卡片，包含：
  - 操作类型（创建笔记/日程/密码等）
  - 提取的所有参数
  - 生成的内容（如适用）
  - "确认创建"和"取消"按钮

#### Scenario: 用户确认操作
- **WHEN** 用户点击"确认创建"
- **THEN** 系统 SHALL 调用对应模块的创建方法
- **AND** 显示操作成功提示
- **AND** 提供跳转到创建项的链接

#### Scenario: 用户取消操作
- **WHEN** 用户点击"取消"
- **THEN** 系统 SHALL 清除预览
- **AND** 保留对话历史
- **AND** 允许用户修改指令

### Requirement: Multi-turn Conversation
AI助手 SHALL 支持多轮对话和上下文保持。

#### Scenario: 追问补充信息
- **WHEN** 用户输入"帮我创建一个笔记"
- **THEN** AI SHALL 回复"好的，请问笔记的主题是什么？"
- **AND** 等待用户补充信息

#### Scenario: 上下文引用
- **WHEN** 用户在第二轮对话中说"就叫工作日志"
- **THEN** 系统 SHALL 结合上一轮对话理解为创建标题为"工作日志"的笔记

#### Scenario: 对话历史限制
- **WHEN** 对话轮次超过10轮
- **THEN** 系统 SHALL 只保留最近10轮对话
- **AND** 提示用户可以开始新对话

### Requirement: Module Integration API
各模块 SHALL 提供AI调用接口，接收结构化参数并创建数据。

#### Scenario: 笔记模块AI接口
- **WHEN** AI助手调用 `createNoteByAI(title, content, type)`
- **THEN** 笔记模块 SHALL 创建新笔记
- **AND** 返回笔记ID和成功状态

#### Scenario: 日程模块AI接口
- **WHEN** AI助手调用 `createEventByAI(title, startTime, reminder)`
- **THEN** 日程模块 SHALL 创建新日程
- **AND** 设置提醒
- **AND** 返回事件ID和成功状态

#### Scenario: 密码模块AI接口
- **WHEN** AI助手调用 `createPasswordByAI(website, username, password)`
- **THEN** 密码模块 SHALL 加密并存储密码
- **AND** 返回密码ID和成功状态

#### Scenario: 书签模块AI接口
- **WHEN** AI助手调用 `createBookmarkByAI(url, title, tags)`
- **THEN** 书签模块 SHALL 创建新书签
- **AND** 自动获取网站图标
- **AND** 返回书签ID和成功状态

#### Scenario: 待办模块AI接口
- **WHEN** AI助手调用 `createTodoByAI(tasks, priority)`
- **THEN** 待办模块 SHALL 批量创建待办事项
- **AND** 返回待办ID列表和成功状态

### Requirement: Operation History
系统 SHALL 记录AI助手执行的所有操作，支持查看和撤销。

#### Scenario: 记录操作日志
- **WHEN** AI助手成功创建任何数据
- **THEN** 系统 SHALL 记录操作类型、时间、参数和结果
- **AND** 在对话中显示"已创建"标记

#### Scenario: 查看操作历史
- **WHEN** 用户在AI助手中输入"查看我的操作历史"
- **THEN** 系统 SHALL 显示最近10条操作记录
- **AND** 每条记录显示时间、类型和操作对象

#### Scenario: 撤销操作
- **WHEN** 用户点击操作记录的"撤销"按钮
- **THEN** 系统 SHALL 删除对应的数据
- **AND** 显示撤销成功提示

### Requirement: Error Handling and Recovery
AI助手 SHALL 优雅地处理错误并提供恢复选项。

#### Scenario: API配置缺失
- **WHEN** 用户未在设置中配置AI API
- **THEN** 系统 SHALL 显示"请先配置AI API"提示
- **AND** 提供跳转到设置页面的按钮

#### Scenario: 参数提取失败
- **WHEN** AI无法从用户输入中提取必要参数
- **THEN** 系统 SHALL 询问用户提供缺失信息
- **AND** 显示需要哪些参数

#### Scenario: 模块创建失败
- **WHEN** 调用模块API创建数据失败
- **THEN** 系统 SHALL 显示具体错误信息
- **AND** 允许用户修改参数重试

### Requirement: Performance and Rate Limiting
AI助手 SHALL 控制API调用频率，避免过度消耗和高费用。

#### Scenario: 响应时间要求
- **WHEN** 用户发送指令
- **THEN** 系统 SHALL 在5秒内返回AI响应
- **AND** 显示处理进度

#### Scenario: 请求队列
- **WHEN** 用户在AI处理期间发送新指令
- **THEN** 系统 SHALL 提示"请等待当前操作完成"
- **AND** 可选地将新指令加入队列

#### Scenario: 每日配额提示
- **WHEN** AI API调用次数接近每日限额
- **THEN** 系统 SHALL 提示用户剩余配额
- **AND** 建议使用更经济的模型
