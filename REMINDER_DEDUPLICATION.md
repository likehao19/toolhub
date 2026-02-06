# 提醒去重机制说明

## 问题

之前的实现会导致提醒重复触发，每次检查（30秒一次）都可能再次弹出通知。

## 解决方案

实现了**持久化 + 内存双层去重机制**：

### 1. 非重复项目（只提醒一次）

#### 待办提醒
- **普通提醒类型**（on_start, on_due, before_due）：
  - 触发提醒后，在数据库中标记 `reminder_sent = 1`
  - 下次检查时会跳过已标记的待办
  - 编辑待办时自动重置 `reminder_sent = 0`

- **过期提醒**（overdue）：
  - 每天提醒一次
  - 使用内存 Set 记录：`todo:{id}:{date}`
  - 每天自动清理前一天的记录

#### 日程提醒
- **非重复日程**：
  - 触发任意一个提醒时间点后，在数据库中标记 `reminder_sent = 1`
  - 下次检查时会跳过已标记的日程
  - 编辑日程时自动重置 `reminder_sent = 0`

### 2. 重复项目（每次都提醒）

#### 重复日程
- 使用内存 Set 记录：`event:repeat:{id}:{minutes}:{date}`
- 每天每个提醒时间点只提醒一次
- 每天自动清理前一天的记录
- 不写入数据库（因为需要每天重复提醒）

## 实现细节

### 数据库字段

**todos 表：**
```sql
reminder_sent INTEGER DEFAULT 0  -- 0=未提醒, 1=已提醒
```

**calendar_events 表：**
```sql
reminder_sent INTEGER DEFAULT 0  -- 0=未提醒, 1=已提醒
```

### 核心逻辑

**待办提醒（非过期类型）：**
```javascript
// 检查是否已提醒
if (reminderType !== 'overdue' && todo.reminder_sent === 1) {
  continue // 跳过已提醒
}

// 触发提醒后标记
if (shouldNotify && reminderType !== 'overdue') {
  await triggerTodoReminder(todo, notifyMessage)
  await db.execute('UPDATE todos SET reminder_sent = 1 WHERE id = ?', [todo.id])
}
```

**待办提醒（过期类型）：**
```javascript
// 每天一次，使用内存记录
const itemKey = `todo:${todo.id}:${today}`
if (notifiedItems.has(itemKey)) {
  continue // 今天已提醒过
}

if (shouldNotify) {
  await triggerTodoReminder(todo, notifyMessage)
  notifiedItems.add(itemKey) // 记录在内存中
}
```

**日程提醒（非重复）：**
```javascript
// 检查是否已提醒
if (!isRepeating && event.reminder_sent === 1) {
  continue // 跳过已提醒
}

// 触发提醒后标记
if (shouldNotify && !isRepeating) {
  await triggerEventReminder(event, minutes)
  await db.execute('UPDATE calendar_events SET reminder_sent = 1 WHERE id = ?', [event.id])
  break // 触发一个提醒点后就退出
}
```

**日程提醒（重复）：**
```javascript
// 每天一次，使用内存记录
const todayStr = now.toISOString().split('T')[0]
const itemKey = `event:repeat:${event.id}:${minutes}:${todayStr}`

if (!notifiedItems.has(itemKey)) {
  await triggerEventReminder(event, minutes)
  notifiedItems.add(itemKey)
}
```

### 重置机制

**编辑待办时：**
```javascript
// Todos.vue - saveTodo()
await db.execute(
  `UPDATE todos SET ..., reminder_sent = 0, ... WHERE id = ?`,
  [...]
)
```

**编辑日程时：**
```javascript
// Calendar.vue - saveEvent()
await db.execute(
  'UPDATE calendar_events SET ..., reminder_sent = 0, ... WHERE id = ?',
  [...]
)
```

### 清理机制

**清理过期内存记录：**
```javascript
// 待办过期提醒记录
for (const key of notifiedItems) {
  if (key.startsWith('todo:')) {
    const parts = key.split(':')
    const dateStr = parts[2]
    if (dateStr && dateStr < today) {
      notifiedItems.delete(key)
    }
  }
}

// 重复日程记录
for (const key of notifiedItems) {
  if (key.startsWith('event:repeat:')) {
    const parts = key.split(':')
    const dateStr = parts[parts.length - 1]
    if (dateStr && dateStr < todayStr) {
      notifiedItems.delete(key)
    }
  }
}
```

## 提醒场景对照表

| 类型 | 提醒频率 | 存储方式 | 重置时机 |
|------|---------|---------|---------|
| 待办-开始日期 | 一次 | 数据库 | 编辑待办 |
| 待办-截止日期 | 一次 | 数据库 | 编辑待办 |
| 待办-提前N天 | 一次 | 数据库 | 编辑待办 |
| 待办-过期 | 每天一次 | 内存 | 每天自动 |
| 日程-非重复 | 一次 | 数据库 | 编辑日程 |
| 日程-重复 | 每天一次 | 内存 | 每天自动 |

## 使用示例

### 场景1：一次性会议提醒
```
创建日程：明天下午2点开会
设置提醒：提前15分钟
重复规则：不重复

结果：
- 明天下午1:45 会收到提醒
- 只提醒一次
- 编辑日程后可以再次提醒
```

### 场景2：每周例会提醒
```
创建日程：每周一上午10点例会
设置提醒：提前5分钟
重复规则：每周（周一）

结果：
- 每周一上午9:55 会收到提醒
- 每周都会提醒
- 每天只提醒一次
```

### 场景3：任务截止提醒
```
创建待办：月度报告
截止日期：本月30日
提醒类型：截止日期提醒
提醒时间：09:00

结果：
- 30日上午9:00 会收到提醒
- 只提醒一次
- 编辑待办后可以再次提醒
```

### 场景4：过期任务提醒
```
创建待办：紧急任务
截止日期：昨天
提醒类型：过期提醒
提醒时间：09:00

结果：
- 每天上午9:00 都会收到提醒
- 直到完成任务或关闭提醒
```

## 优点

1. ✅ **避免重复**：非重复项目只提醒一次
2. ✅ **持久化**：重启应用后仍然记得已提醒
3. ✅ **可编辑**：编辑后可以再次提醒
4. ✅ **支持重复**：重复项目每天提醒
5. ✅ **自动清理**：内存记录每天自动清理
6. ✅ **性能优化**：不频繁写数据库（重复项目用内存）

## 数据库更新

如果升级自旧版本，需要确保表结构包含 `reminder_sent` 字段。

提醒服务启动时会自动检查并添加缺失的字段：

```javascript
// reminderService.js - ensureReminderColumns()
if (!todosColumnNames.includes('reminder_sent')) {
  await db.execute('ALTER TABLE todos ADD COLUMN reminder_sent INTEGER DEFAULT 0')
}

// calendar_events 表类似处理
```

## 测试建议

1. **非重复日程**：创建一个5分钟后的日程，提前3分钟提醒
   - 应在提醒时间弹出一次
   - 30秒后检查，不应再次弹出

2. **重复日程**：创建一个每天的日程，提前5分钟提醒
   - 今天应提醒一次
   - 明天同一时间应再次提醒

3. **待办提醒**：创建一个今天截止的待办
   - 应在设定时间提醒一次
   - 编辑待办后应可以再次提醒

4. **过期提醒**：创建一个昨天截止的待办，设置过期提醒
   - 今天应提醒一次
   - 明天同一时间应再次提醒
