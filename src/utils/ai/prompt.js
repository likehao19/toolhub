/**
 * AI Prompt 模板模块
 * 管理各种系统提示词
 */

/**
 * 系统基础提示词
 */
export const SYSTEM_PROMPT = `你是ToolHub应用的智能助手，专门帮助用户管理各种信息。

你可以帮助用户：
1. 创建和管理笔记（支持Markdown格式）
2. 创建和管理日程安排（支持自然语言时间）
3. 保存和管理密码（可以生成强密码）
4. 添加和管理书签
5. 创建和管理待办事项

请用简洁、友好的语言回复用户。当用户请求创建内容时，请识别其意图并提取必要参数。`

/**
 * 意图识别提示词模板
 */
export const INTENT_RECOGNITION_PROMPT = (userInput) => `
分析用户输入并识别其意图：
用户输入: "${userInput}"

可能的意图类型：
- create_note: 用户想创建笔记或文档
- create_event: 用户想创建日程、提醒或会议
- create_password: 用户想保存密码或账号信息
- create_bookmark: 用户想收藏网站或添加书签
- create_todo: 用户想创建任务或待办事项
- query: 用户在询问或查询信息
- unknown: 无法判断意图

只返回意图类型，不要其他内容。
`

/**
 * 参数提取提示词模板
 */
export const PARAM_EXTRACTION_PROMPTS = {
  create_note: (text) => `
从以下用户输入中提取笔记创建所需的参数：
"${text}"

请以JSON格式返回：
{
  "title": "笔记标题",
  "content": "笔记内容（如果用户要求生成内容，请生成完整的markdown格式内容）",
  "type": "笔记类型（技术/生活/工作/学习/其他）"
}

注意：
- 如果用户说"帮我写..."，需要生成完整内容
- 如果只是创建空笔记，content可以为空
- 标题要简洁明确
`,

  create_event: (text) => `
从以下用户输入中提取日程信息：
"${text}"

请以JSON格式返回：
{
  "title": "日程标题",
  "startTime": "开始时间（ISO 8601格式）",
  "reminder": "提前提醒时间（分钟数）"
}

注意：
- 将"明天"、"下周"等转换为具体日期
- 将"上午10点"等转换为完整时间
- 如果未提及提醒时间，默认为5分钟
`,

  create_password: (text) => `
从以下用户输入中提取密码信息：
"${text}"

请以JSON格式返回：
{
  "website": "网站名称或描述",
  "username": "用户名或账号",
  "password": "密码（如果未提供则为空字符串）"
}
`,

  create_bookmark: (text) => `
从以下用户输入中提取书签信息：
"${text}"

请以JSON格式返回：
{
  "url": "网站URL（确保格式正确）",
  "title": "网站标题（如果未提供，从URL推测）",
  "tags": ["标签1", "标签2"]
}
`,

  create_todo: (text) => `
从以下用户输入中提取待办信息：
"${text}"

请以JSON格式返回：
{
  "tasks": ["任务1", "任务2", "任务3"],
  "priority": "优先级（high/medium/low）",
  "dueDate": "截止日期（ISO 8601格式，未提及则为null）"
}

注意：
- 如果用户列举了多项（如"第一...第二..."），全部提取到tasks数组
- 如果只有一项任务，tasks也是数组格式
`
}

/**
 * 内容生成提示词模板
 */
export const CONTENT_GENERATION_PROMPTS = {
  note: (topic) => `
请生成一篇关于"${topic}"的笔记，使用Markdown格式。

要求：
- 结构清晰，包含标题、副标题
- 内容充实，包含关键要点
- 格式规范，适合阅读
- 长度适中（300-800字）

开始生成：
`,

  summary: (content) => `
请总结以下内容的要点：

${content}

要求：
- 3-5个要点
- 简洁明了
- 保留关键信息
`
}

/**
 * 确认提示词模板
 */
export const CONFIRMATION_PROMPT = (intent, params) => {
  const templates = {
    create_note: `我将创建一篇笔记：
标题：${params.title}
类型：${params.type || '其他'}
${params.content ? '已生成内容' : '空笔记'}`,

    create_event: `我将创建一个日程：
标题：${params.title}
时间：${new Date(params.startTime).toLocaleString('zh-CN')}
提醒：提前${params.reminder || 5}分钟`,

    create_password: `我将保存密码：
网站：${params.website}
用户名：${params.username}
${params.password ? '密码已提供' : '将自动生成强密码'}`,

    create_bookmark: `我将添加书签：
标题：${params.title || '未命名'}
URL：${params.url}
标签：${Array.isArray(params.tags) ? params.tags.join(', ') : '无'}`,

    create_todo: `我将创建${params.tasks.length}个待办事项：
${params.tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}
优先级：${params.priority || 'medium'}
${params.dueDate ? `截止：${new Date(params.dueDate).toLocaleDateString('zh-CN')}` : ''}`
  }

  return templates[intent] || '准备执行操作'
}
