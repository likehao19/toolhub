-- 数据库 Schema 增强
-- 版本: 2
-- 为增强功能添加新字段和表

-- 扩展密码表
ALTER TABLE passwords ADD COLUMN password_strength INTEGER DEFAULT 0; -- 密码强度: 0-弱, 1-中, 2-强
ALTER TABLE passwords ADD COLUMN expires_at TEXT; -- 过期时间
ALTER TABLE passwords ADD COLUMN last_audit_at TEXT; -- 最后审计时间

-- 扩展书签表
ALTER TABLE bookmarks ADD COLUMN snapshot_path TEXT; -- 网页快照路径
ALTER TABLE bookmarks ADD COLUMN read_later INTEGER DEFAULT 0; -- 是否标记为稍后阅读
ALTER TABLE bookmarks ADD COLUMN read_progress REAL DEFAULT 0.0; -- 阅读进度 0.0-1.0

-- 扩展待办表
ALTER TABLE todos ADD COLUMN dependency_ids TEXT; -- 依赖任务ID列表，JSON数组
ALTER TABLE todos ADD COLUMN estimated_hours REAL; -- 预估时间（小时）
ALTER TABLE todos ADD COLUMN tracked_hours REAL DEFAULT 0.0; -- 已追踪时间（小时）
ALTER TABLE todos ADD COLUMN template_id INTEGER; -- 模板ID

-- 扩展日程表
ALTER TABLE calendar_events ADD COLUMN repeat_rule TEXT; -- 重复规则，JSON格式
ALTER TABLE calendar_events ADD COLUMN repeat_end_date TEXT; -- 重复结束日期
ALTER TABLE calendar_events ADD COLUMN category TEXT; -- 事件分类
ALTER TABLE calendar_events ADD COLUMN color TEXT; -- 颜色标记
ALTER TABLE calendar_events ADD COLUMN reminder_rules TEXT; -- 提醒规则，JSON数组

-- 创建笔记元数据表（用于存储标签、分类等）
CREATE TABLE IF NOT EXISTS note_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_name TEXT NOT NULL UNIQUE, -- 笔记文件名（不含扩展名）
    tags TEXT, -- JSON 数组字符串
    category TEXT, -- 分类
    category_color TEXT, -- 分类颜色
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建笔记版本历史表
CREATE TABLE IF NOT EXISTS note_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_name TEXT NOT NULL, -- 笔记文件名
    version_number INTEGER NOT NULL, -- 版本号
    content_hash TEXT, -- 内容哈希
    saved_at TEXT NOT NULL DEFAULT (datetime('now')),
    change_summary TEXT, -- 变更摘要
    FOREIGN KEY (note_name) REFERENCES note_metadata(note_name) ON DELETE CASCADE
);

-- 创建标签表（通用标签系统）
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE, -- 标签名称
    color TEXT, -- 标签颜色
    category TEXT, -- 标签分类（notes, bookmarks, todos等）
    usage_count INTEGER DEFAULT 0, -- 使用次数
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建模板表
CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, -- 模板名称
    type TEXT NOT NULL, -- 模板类型: note, todo, event
    content TEXT, -- 模板内容（JSON格式）
    description TEXT, -- 模板描述
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建搜索历史表
CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL, -- 搜索关键词
    filters TEXT, -- 筛选条件，JSON格式
    module TEXT, -- 搜索的模块
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建保存的搜索表
CREATE TABLE IF NOT EXISTS saved_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, -- 搜索名称
    query TEXT, -- 搜索关键词
    filters TEXT, -- 筛选条件，JSON格式
    module TEXT, -- 搜索的模块
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_passwords_strength ON passwords(password_strength);
CREATE INDEX IF NOT EXISTS idx_passwords_expires_at ON passwords(expires_at);

CREATE INDEX IF NOT EXISTS idx_bookmarks_read_later ON bookmarks(read_later);
CREATE INDEX IF NOT EXISTS idx_bookmarks_tags ON bookmarks(tags);

CREATE INDEX IF NOT EXISTS idx_todos_dependency_ids ON todos(dependency_ids);
CREATE INDEX IF NOT EXISTS idx_todos_template_id ON todos(template_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_category ON calendar_events(category);
CREATE INDEX IF NOT EXISTS idx_calendar_events_repeat_rule ON calendar_events(repeat_rule);

CREATE INDEX IF NOT EXISTS idx_note_metadata_note_name ON note_metadata(note_name);
CREATE INDEX IF NOT EXISTS idx_note_metadata_tags ON note_metadata(tags);
CREATE INDEX IF NOT EXISTS idx_note_metadata_category ON note_metadata(category);

CREATE INDEX IF NOT EXISTS idx_note_versions_note_name ON note_versions(note_name);
CREATE INDEX IF NOT EXISTS idx_note_versions_saved_at ON note_versions(saved_at);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);

CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);
CREATE INDEX IF NOT EXISTS idx_search_history_module ON search_history(module);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at);

CREATE INDEX IF NOT EXISTS idx_saved_searches_module ON saved_searches(module);

-- 更新版本号
INSERT OR IGNORE INTO schema_version (version) VALUES (2);

