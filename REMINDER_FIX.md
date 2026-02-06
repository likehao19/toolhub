# 日程提醒修复说明

## 问题描述

用户创建了一个 2026-02-01 16:50 的日程，设置提前5分钟提醒，但是在 16:45 时没有收到提醒通知。

## 问题原因

1. **查询时间范围问题**：原来的查询条件是 `start_time > currentTime`（开始时间大于当前时间），这导致如果当前时间已经过了提醒时间点（如16:45），但日程还没开始（16:50），这个日程不会被查询出来。

2. **检查频率问题**：原来是60秒检查一次，如果用户刚好在两次检查之间创建日程，可能要等最多60秒才能收到提醒。

## 修复内容

### 1. 修改查询时间范围 (`reminderService.js`)

**修改前：**
```javascript
// 查询未来2小时内的日程
const futureTime = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()

const events = await db.select(
  `SELECT * FROM calendar_events 
   WHERE start_time > ? 
   AND start_time <= ?
   ORDER BY start_time ASC`,
  [currentTime, futureTime]
)
```

**修改后：**
```javascript
// 查询"当前时间前1小时到未来2小时"的日程（确保不遗漏提醒）
const pastTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
const futureTime = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()

const events = await db.select(
  `SELECT * FROM calendar_events 
   WHERE start_time >= ? 
   AND start_time <= ?
   ORDER BY start_time ASC`,
  [pastTime, futureTime]
)
```

**改进点：**
- 查询范围从"未来2小时"改为"过去1小时到未来2小时"
- 查询条件从 `>` 改为 `>=`，包含边界值
- 确保即使提醒时间已过，只要在容错范围内（±5分钟），仍然能触发提醒

### 2. 增加详细日志

添加了详细的控制台日志，方便调试：

```javascript
console.log('[提醒服务] 检查日程提醒，时间范围:', {
  past: pastTime,
  current: currentTime,
  future: futureTime
})

console.log(`[提醒服务] 找到 ${events.length} 个待检查的日程`)

console.log(`[提醒服务] 日程 "${event.title}" (${event.start_time})，提醒规则:`, reminderMinutes)

console.log(`[提醒服务]   - 提前${minutes}分钟提醒时间: ${reminderTime.toISOString()}, 时间差: ${Math.round(timeDiff / 1000)}秒`)
```

### 3. 优化检查频率

**修改前：** 每60秒检查一次
**修改后：** 每30秒检查一次

```javascript
checkInterval = setInterval(async () => {
  try {
    await checkTodoReminders()
    await checkEventReminders()
  } catch (error) {
    console.error('[提醒服务] 检查提醒时出错:', error)
  }
}, 30000) // 30秒检查一次
```

### 4. 添加手动触发功能

新增 `manualCheckReminders()` 函数，可以立即触发检查：

```javascript
/**
 * 手动触发检查（用于调试或即时检查）
 */
export async function manualCheckReminders() {
  console.log('[提醒服务] 手动触发检查...')
  try {
    await checkTodoReminders()
    await checkEventReminders()
    console.log('[提醒服务] 手动检查完成')
  } catch (error) {
    console.error('[提醒服务] 手动检查失败:', error)
    throw error
  }
}
```

### 5. 添加测试按钮（开发调试）

在日历页面头部添加了一个"测试提醒"按钮（铃铛图标），点击后会立即触发提醒检查，并在控制台输出详细日志。

## 使用方法

### 场景1：正常使用

1. 创建日程并设置提醒时间（如提前5分钟）
2. 提醒服务每30秒会自动检查一次
3. 在提醒时间点的±5分钟内，会弹出通知

### 场景2：调试测试

1. 创建日程并设置提醒
2. 点击日历页面头部的"测试提醒"按钮（铃铛图标）
3. 查看浏览器控制台（F12），会显示详细的检查日志：
   - 查询的时间范围
   - 找到的日程数量
   - 每个日程的提醒规则
   - 每个提醒点的时间差
   - 是否触发提醒

## 提醒触发条件

提醒会在以下条件**全部满足**时触发：

1. 日程在查询时间范围内（当前时间前1小时到未来2小时）
2. 日程设置了提醒规则（reminder_rules）
3. 当前时间与提醒时间的差值在±5分钟内（300秒）
4. 该提醒点尚未触发过（防重复）

## 容错机制

- **时间容错**：提醒时间允许±5分钟的误差
- **防重复**：使用 Set 记录已触发的提醒，避免重复通知
- **查询范围宽容**：向前查询1小时，确保不遗漏刚过提醒时间点的日程

## 示例

创建日程：
- 标题：团队会议
- 开始时间：2026-02-01 16:50
- 提醒：提前5分钟

预期行为：
- 提醒时间：16:45
- 容错范围：16:40 - 16:50
- 只要在这个范围内检查到，就会触发提醒
- 每30秒检查一次，最多延迟30秒

## 控制台日志示例

```
[提醒服务] 正在初始化...
[提醒服务] 数据库表字段检查完成
[提醒服务] 执行初始检查...
[提醒服务] 检查日程提醒，时间范围: {
  past: "2026-02-01T07:47:30.000Z",
  current: "2026-02-01T08:47:30.000Z", 
  future: "2026-02-01T10:47:30.000Z"
}
[提醒服务] 找到 1 个待检查的日程
[提醒服务] 日程 "团队会议" (2026-02-01T08:50:00.000Z)，提醒规则: [5]
[提醒服务]   - 提前5分钟提醒时间: 2026-02-01T08:45:00.000Z, 时间差: -150秒
[提醒服务]   ✓ 触发提醒！
[提醒服务] 启动成功，每30秒检查一次提醒
```

## 注意事项

1. 应用必须保持运行才能收到提醒
2. 提醒通知会显示在桌面右下角（或配置的位置）
3. 如果错过了提醒时间超过5分钟，提醒不会再触发
4. 测试按钮仅用于开发调试，正式版本可以移除
