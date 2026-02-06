-- 数据库初始化 Schema
-- 版本: 1

-- Schema 版本表
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 密码表
CREATE TABLE IF NOT EXISTS passwords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    username TEXT,
    password TEXT NOT NULL, -- 加密存储
    website TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_accessed_at TEXT
);

-- 书签表
CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    favicon_url TEXT,
    category TEXT,
    tags TEXT, -- JSON 数组字符串
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    access_count INTEGER DEFAULT 0,
    last_accessed_at TEXT
);

-- 待办表
CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_date TEXT,
    due_date TEXT,
    priority INTEGER DEFAULT 0, -- 0: 低, 1: 中, 2: 高
    category TEXT,
    status INTEGER DEFAULT 0, -- 0: 待办, 1: 进行中, 2: 已完成
    parent_id INTEGER, -- 父任务 ID，用于子任务
    progress REAL DEFAULT 0.0, -- 0.0 - 1.0
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (parent_id) REFERENCES todos(id) ON DELETE CASCADE
);

-- 日程表
CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT,
    location TEXT,
    reminder_minutes INTEGER, -- 提前提醒分钟数
    reminder_sent INTEGER DEFAULT 0, -- 是否已发送提醒
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_passwords_title ON passwords(title);
CREATE INDEX IF NOT EXISTS idx_passwords_updated_at ON passwords(updated_at);

CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category);
CREATE INDEX IF NOT EXISTS idx_bookmarks_access_count ON bookmarks(access_count);

CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_start_date ON todos(start_date);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON todos(parent_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_reminder_sent ON calendar_events(reminder_sent);

-- 插入初始版本
INSERT OR IGNORE INTO schema_version (version) VALUES (1);

