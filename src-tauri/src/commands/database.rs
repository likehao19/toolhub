//! 数据库相关命令

/// 获取数据库初始化 SQL
/// 返回初始化 SQL 语句，由前端执行
#[tauri::command]
pub fn get_database_init_sql() -> String {
    include_str!("../../migrations/001_initial_schema.sql").to_string()
}

