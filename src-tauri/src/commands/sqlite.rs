use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::Instant;

use rusqlite::{Connection, OpenFlags};
use serde::Serialize;
use tokio::sync::RwLock;
use uuid::Uuid;

// ==================== Connection Pool ====================

struct SqliteConn {
    conn: Mutex<Connection>,
    path: String,
}

static SQLITE_CONNS: OnceLock<RwLock<HashMap<String, SqliteConn>>> = OnceLock::new();

fn get_pool() -> &'static RwLock<HashMap<String, SqliteConn>> {
    SQLITE_CONNS.get_or_init(|| RwLock::new(HashMap::new()))
}

// ==================== Serde Structs ====================

#[derive(Serialize)]
pub struct TableInfo {
    pub name: String,
    pub table_type: String,
    pub sql: String,
}

#[derive(Serialize)]
pub struct ColumnInfo {
    pub cid: i32,
    pub name: String,
    pub col_type: String,
    pub notnull: bool,
    pub default_value: Option<String>,
    pub pk: bool,
}

#[derive(Serialize)]
pub struct IndexInfo {
    pub name: String,
    pub unique: bool,
    pub columns: Vec<String>,
}

#[derive(Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub row_count: usize,
    pub elapsed_ms: u64,
}

#[derive(Serialize)]
pub struct ExecuteResult {
    pub affected_rows: usize,
    pub elapsed_ms: u64,
}

#[derive(Serialize)]
pub struct DbInfo {
    pub file_size: u64,
    pub page_size: i64,
    pub page_count: i64,
    pub sqlite_version: String,
    pub table_count: usize,
}

// ==================== Helper: query inside Mutex ====================

fn with_conn<F, T>(pool_entry: &SqliteConn, f: F) -> Result<T, String>
where
    F: FnOnce(&Connection) -> Result<T, String>,
{
    let conn = pool_entry
        .conn
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    f(&conn)
}

fn row_value(row: &rusqlite::Row, idx: usize) -> serde_json::Value {
    use rusqlite::types::ValueRef;
    match row.get_ref(idx) {
        Ok(ValueRef::Null) => serde_json::Value::Null,
        Ok(ValueRef::Integer(i)) => serde_json::json!(i),
        Ok(ValueRef::Real(f)) => serde_json::json!(f),
        Ok(ValueRef::Text(s)) => {
            serde_json::json!(String::from_utf8_lossy(s))
        }
        Ok(ValueRef::Blob(b)) => {
            serde_json::json!(format!("[BLOB: {} bytes]", b.len()))
        }
        Err(_) => serde_json::Value::Null,
    }
}

// ==================== Commands ====================

#[tauri::command]
pub async fn sqlite_open(path: String) -> Result<String, String> {
    let flags = OpenFlags::SQLITE_OPEN_READ_WRITE
        | OpenFlags::SQLITE_OPEN_CREATE
        | OpenFlags::SQLITE_OPEN_NO_MUTEX;

    let conn = Connection::open_with_flags(&path, flags)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Enable WAL mode for better concurrent access
    let _ = conn.execute_batch("PRAGMA journal_mode=WAL;");

    let conn_id = Uuid::new_v4().to_string();
    get_pool().write().await.insert(
        conn_id.clone(),
        SqliteConn {
            conn: Mutex::new(conn),
            path,
        },
    );
    Ok(conn_id)
}

#[tauri::command]
pub async fn sqlite_close(conn_id: String) -> Result<(), String> {
    get_pool()
        .write()
        .await
        .remove(&conn_id)
        .ok_or_else(|| "Connection not found".to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn sqlite_tables(conn_id: String) -> Result<Vec<TableInfo>, String> {
    let pool = get_pool().read().await;
    let entry = pool
        .get(&conn_id)
        .ok_or("Connection not found")?;

    with_conn(entry, |conn| {
        let mut stmt = conn
            .prepare(
                "SELECT name, type, sql FROM sqlite_master \
                 WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' \
                 ORDER BY type, name",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(TableInfo {
                    name: row.get(0)?,
                    table_type: row.get(1)?,
                    sql: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                })
            })
            .map_err(|e| e.to_string())?;

        let mut result = Vec::new();
        for r in rows {
            result.push(r.map_err(|e| e.to_string())?);
        }
        Ok(result)
    })
}

#[tauri::command]
pub async fn sqlite_table_info(
    conn_id: String,
    table: String,
) -> Result<Vec<ColumnInfo>, String> {
    let pool = get_pool().read().await;
    let entry = pool.get(&conn_id).ok_or("Connection not found")?;

    with_conn(entry, |conn| {
        let sql = format!("PRAGMA table_info(\"{}\")", table.replace('"', "\"\""));
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(ColumnInfo {
                    cid: row.get(0)?,
                    name: row.get(1)?,
                    col_type: row.get::<_, String>(2)?,
                    notnull: row.get::<_, i32>(3)? != 0,
                    default_value: row.get(4)?,
                    pk: row.get::<_, i32>(5)? != 0,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut result = Vec::new();
        for r in rows {
            result.push(r.map_err(|e| e.to_string())?);
        }
        Ok(result)
    })
}

#[tauri::command]
pub async fn sqlite_table_indexes(
    conn_id: String,
    table: String,
) -> Result<Vec<IndexInfo>, String> {
    let pool = get_pool().read().await;
    let entry = pool.get(&conn_id).ok_or("Connection not found")?;

    with_conn(entry, |conn| {
        let sql = format!("PRAGMA index_list(\"{}\")", table.replace('"', "\"\""));
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

        let index_list: Vec<(String, bool)> = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(1)?, row.get::<_, i32>(2)? != 0))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        let mut result = Vec::new();
        for (name, unique) in index_list {
            let col_sql = format!("PRAGMA index_info(\"{}\")", name.replace('"', "\"\""));
            let cols: Vec<String> = conn
                .prepare(&col_sql)
                .map_err(|e| e.to_string())?
                .query_map([], |row| row.get::<_, String>(2))
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();
            result.push(IndexInfo {
                name,
                unique,
                columns: cols,
            });
        }
        Ok(result)
    })
}

#[tauri::command]
pub async fn sqlite_query(
    conn_id: String,
    sql: String,
    params: Vec<serde_json::Value>,
) -> Result<QueryResult, String> {
    let pool = get_pool().read().await;
    let entry = pool.get(&conn_id).ok_or("Connection not found")?;

    with_conn(entry, |conn| {
        let start = Instant::now();
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

        let col_count = stmt.column_count();
        let columns: Vec<String> = (0..col_count)
            .map(|i| stmt.column_name(i).unwrap_or("?").to_string())
            .collect();

        let rusqlite_params = json_to_rusqlite_params(&params);
        let param_refs: Vec<&dyn rusqlite::types::ToSql> =
            rusqlite_params.iter().map(|p| p.as_ref()).collect();

        let mut rows_out = Vec::new();
        let mut qrows = stmt
            .query(param_refs.as_slice())
            .map_err(|e| e.to_string())?;

        while let Some(row) = qrows.next().map_err(|e| e.to_string())? {
            let mut rv = Vec::with_capacity(col_count);
            for i in 0..col_count {
                rv.push(row_value(row, i));
            }
            rows_out.push(rv);
        }

        let elapsed = start.elapsed().as_millis() as u64;
        let row_count = rows_out.len();
        Ok(QueryResult {
            columns,
            rows: rows_out,
            row_count,
            elapsed_ms: elapsed,
        })
    })
}

#[tauri::command]
pub async fn sqlite_execute(
    conn_id: String,
    sql: String,
    params: Vec<serde_json::Value>,
) -> Result<ExecuteResult, String> {
    let pool = get_pool().read().await;
    let entry = pool.get(&conn_id).ok_or("Connection not found")?;

    with_conn(entry, |conn| {
        let start = Instant::now();
        let rusqlite_params = json_to_rusqlite_params(&params);
        let param_refs: Vec<&dyn rusqlite::types::ToSql> =
            rusqlite_params.iter().map(|p| p.as_ref()).collect();

        let affected = conn
            .execute(&sql, param_refs.as_slice())
            .map_err(|e| e.to_string())?;

        Ok(ExecuteResult {
            affected_rows: affected,
            elapsed_ms: start.elapsed().as_millis() as u64,
        })
    })
}

#[tauri::command]
pub async fn sqlite_count(
    conn_id: String,
    table: String,
) -> Result<i64, String> {
    let pool = get_pool().read().await;
    let entry = pool.get(&conn_id).ok_or("Connection not found")?;

    with_conn(entry, |conn| {
        let sql = format!(
            "SELECT COUNT(*) FROM \"{}\"",
            table.replace('"', "\"\"")
        );
        conn.query_row(&sql, [], |row| row.get(0))
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub async fn sqlite_db_info(conn_id: String) -> Result<DbInfo, String> {
    let pool = get_pool().read().await;
    let entry = pool.get(&conn_id).ok_or("Connection not found")?;

    let file_size = std::fs::metadata(&entry.path)
        .map(|m| m.len())
        .unwrap_or(0);

    with_conn(entry, |conn| {
        let page_size: i64 = conn
            .query_row("PRAGMA page_size", [], |r| r.get(0))
            .unwrap_or(4096);
        let page_count: i64 = conn
            .query_row("PRAGMA page_count", [], |r| r.get(0))
            .unwrap_or(0);
        let sqlite_version: String = conn
            .query_row("SELECT sqlite_version()", [], |r| r.get(0))
            .unwrap_or_default();
        let table_count: usize = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
                [],
                |r| r.get::<_, usize>(0),
            )
            .unwrap_or(0);

        Ok(DbInfo {
            file_size,
            page_size,
            page_count,
            sqlite_version,
            table_count,
        })
    })
}

// ==================== Param Conversion ====================

fn json_to_rusqlite_params(
    params: &[serde_json::Value],
) -> Vec<Box<dyn rusqlite::types::ToSql>> {
    params
        .iter()
        .map(|v| -> Box<dyn rusqlite::types::ToSql> {
            match v {
                serde_json::Value::Null => Box::new(rusqlite::types::Null),
                serde_json::Value::Bool(b) => Box::new(*b),
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        Box::new(i)
                    } else if let Some(f) = n.as_f64() {
                        Box::new(f)
                    } else {
                        Box::new(n.to_string())
                    }
                }
                serde_json::Value::String(s) => Box::new(s.clone()),
                _ => Box::new(v.to_string()),
            }
        })
        .collect()
}
