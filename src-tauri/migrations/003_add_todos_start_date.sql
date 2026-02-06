-- 数据库 Schema 增强
-- 版本: 3
-- 为待办表添加 start_date 字段

-- 扩展待办表，添加开始日期字段
ALTER TABLE todos ADD COLUMN start_date TEXT;

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_todos_start_date ON todos(start_date);

-- 更新版本号
INSERT OR IGNORE INTO schema_version (version) VALUES (3);
