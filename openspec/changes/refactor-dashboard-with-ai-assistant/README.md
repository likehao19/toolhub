# 重构首页仪表板并集成AI智能助手 - OpenSpec提案

## 📋 提案概述

本提案旨在将ToolHub的首页从"静态信息展示"重构为"智能工作台"，并集成AI助手实现自然语言操作各模块功能。

## 🎯 核心目标

1. **首页重构**: 展示实时、有用的工作信息（待办、日程、笔记、书签、密码统计）
2. **AI助手**: 通过自然语言快速创建各模块数据
3. **效率提升**: 减少90%的点击和导航步骤

## 📁 提案文件结构

```
openspec/changes/refactor-dashboard-with-ai-assistant/
├── proposal.md          # 提案说明（Why, What, Impact）
├── tasks.md            # 实施任务清单（11个阶段，共60+任务）
├── design.md           # 技术设计文档（架构、决策、风险）
└── specs/              # 规格变更
    ├── dashboard/
    │   └── spec.md     # 仪表板规格（MODIFIED + ADDED + REMOVED）
    └── ai-assistant/
        └── spec.md     # AI助手规格（全新功能）
```

## 🚀 AI助手功能示例

### 支持的自然语言指令

| 指令示例 | 意图 | 操作结果 |
|---------|------|---------|
| "帮我写一个滕王阁序的md文档" | 创建笔记 | AI生成Markdown文档并创建笔记 |
| "明天上午10点开会提前五分钟提醒" | 创建日程 | 创建日程并设置提醒 |
| "存储QQ密码用户名abc密码123456" | 存储密码 | 加密保存密码到密码管理器 |
| "帮我收藏网站www.baidu.com" | 添加书签 | 创建书签并自动获取图标 |
| "我有任务：第一步买菜，第二步做饭" | 创建待办 | 批量创建待办事项 |

### 工作流程

```
用户输入指令
    ↓
AI意图识别 + 参数提取
    ↓
AI生成内容（如适用）
    ↓
展示预览 + 用户确认
    ↓
调用模块API创建数据
    ↓
显示成功 + 操作记录
```

## 📊 首页改进对比

### 改进前
- ❌ 静态统计数字（与实际数据不符）
- ❌ 无法快速操作
- ❌ 需要导航到各模块

### 改进后
- ✅ 实时数据展示（今日待办、日程、笔记等）
- ✅ 卡片快速操作（标记完成、快速添加）
- ✅ AI助手一键创建

## 🛠️ 技术架构

### 关键组件

1. **仪表板卡片**
   - TodayOverview (今日概览)
   - TodayTodos (今日待办)
   - TodayEvents (今日日程)
   - RecentNotes (最近笔记)
   - QuickBookmarks (常用网站)
   - PasswordSummary (密码统计)

2. **AI助手系统**
   - AIAssistant.vue (主组件)
   - Intent Recognition (意图识别)
   - Entity Extraction (参数提取)
   - Content Generation (内容生成)
   - Operation Dispatcher (操作调度)

3. **模块集成**
   - 每个模块提供 `createXXXByAI()` 方法
   - 接收结构化参数
   - 返回创建结果

### AI服务层

```
src/utils/ai/
├── intent.js      # 意图识别
├── parser.js      # 参数解析
├── api.js         # AI API封装
├── prompt.js      # Prompt模板
└── operations.js  # 操作调度器
```

## 📝 实施计划

### 阶段划分（tasks.md）

1. **阶段1**: 首页仪表板重构 (10个任务)
2. **阶段2**: AI助手核心功能 (10个任务)
3. **阶段3-7**: 各模块集成 (5×4=20个任务)
4. **阶段8**: AI服务工具类 (5个任务)
5. **阶段9**: UI/UX优化 (6个任务)
6. **阶段10**: 测试和优化 (7个任务)
7. **阶段11**: 文档和示例 (4个任务)

**总计**: 60+个任务，预计8-10天完成

## ⚠️ 风险和缓解

### 主要风险

1. **AI API成本** → 支持多种模型，设置配额限制
2. **意图识别错误** → 操作预览+确认机制
3. **时间解析歧义** → 显示解析结果供用户确认
4. **密码安全** → 使用自定义API，不记录敏感信息

## 📚 相关文档

- `proposal.md` - 详细提案说明
- `tasks.md` - 完整任务清单
- `design.md` - 技术设计和决策
- `specs/dashboard/spec.md` - 仪表板规格变更
- `specs/ai-assistant/spec.md` - AI助手完整规格

## ✅ 验证提案

运行以下命令验证提案格式：

```bash
openspec validate refactor-dashboard-with-ai-assistant --strict
```

## 🎬 下一步

1. ✅ 审查提案内容
2. ⏳ 获得批准
3. ⏳ 开始实施（按 tasks.md 顺序）
4. ⏳ 测试和迭代
5. ⏳ 部署上线
6. ⏳ 归档提案

---

**创建时间**: 2026-02-01  
**提案ID**: refactor-dashboard-with-ai-assistant  
**状态**: 待审核
