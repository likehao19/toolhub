## MODIFIED Requirements

### Requirement: Dashboard Data Display
首页仪表板 SHALL 展示实时的、与各模块数据同步的工作概览，而不是静态统计信息。

#### Scenario: 用户打开首页查看今日概览
- **WHEN** 用户导航到首页
- **THEN** 系统 SHALL 显示以下实时卡片：
  - 今日日期、星期、农历信息
  - 今日待办事项列表（从待办模块获取）
  - 今日日程安排（从日历模块获取）
  - 最近编辑的5篇笔记（从笔记模块获取）
  - 常用网站快捷入口（从书签模块获取）
  - 密码安全统计（从密码管理模块获取）

#### Scenario: 数据卡片快速操作
- **WHEN** 用户在首页卡片上点击快速操作按钮
- **THEN** 系统 SHALL 允许用户：
  - 标记待办为完成
  - 快速添加新待办
  - 打开笔记编辑
  - 访问书签网站
  - 跳转到对应模块详情页

#### Scenario: 数据加载性能
- **WHEN** 首页加载时
- **THEN** 系统 SHALL 在1秒内完成所有卡片数据的加载
- **AND** 使用骨架屏显示加载状态

## ADDED Requirements

### Requirement: Real-time Data Integration
仪表板 SHALL 直接从各模块数据库表读取最新数据，确保展示信息的实时性和一致性。

#### Scenario: 待办数据同步
- **WHEN** 用户在待办模块完成一个任务
- **THEN** 首页的待办卡片 SHALL 立即反映该变更

#### Scenario: 日程数据同步
- **WHEN** 用户在日历模块添加一个事件
- **THEN** 首页的日程卡片 SHALL 自动显示新事件

### Requirement: Card-based Layout
仪表板 SHALL 采用卡片式布局，每个功能区域独立展示。

#### Scenario: 响应式布局
- **WHEN** 窗口大小改变
- **THEN** 卡片 SHALL 自动调整为2列或1列布局
- **AND** 保持内容可读性

#### Scenario: 卡片交互
- **WHEN** 用户悬停在卡片上
- **THEN** 卡片 SHALL 显示提升效果和额外操作按钮

### Requirement: Empty State Handling
仪表板 SHALL 为每个卡片提供空状态提示和快速创建入口。

#### Scenario: 无待办事项时
- **WHEN** 用户今日没有待办事项
- **THEN** 待办卡片 SHALL 显示"暂无待办"
- **AND** 提供"添加待办"按钮

#### Scenario: 无日程安排时
- **WHEN** 用户今日没有日程
- **THEN** 日程卡片 SHALL 显示"今日无安排"
- **AND** 提供"添加日程"按钮

## REMOVED Requirements

### Requirement: Static Statistics Display
**Reason**: 静态统计数据不反映真实模块状态，对用户无实际价值

**Migration**: 
- 移除所有硬编码的统计数字
- 用实时数据卡片替代
- 用户无需手动迁移
