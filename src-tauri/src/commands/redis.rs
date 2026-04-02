//! Redis 客户端命令
//!
//! 提供 Redis 连接管理、键操作、命令执行等功能

use redis::aio::ConnectionManager;
use redis::{AsyncCommands, Client, Cmd, Value};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;
use tokio::sync::RwLock;
use uuid::Uuid;
use urlencoding::encode as url_encode;

// ---- 全局连接池 ----

static CONNECTIONS: OnceLock<RwLock<HashMap<String, ConnectionManager>>> = OnceLock::new();

fn get_connections() -> &'static RwLock<HashMap<String, ConnectionManager>> {
    CONNECTIONS.get_or_init(|| RwLock::new(HashMap::new()))
}

// ---- 数据类型 ----

#[derive(Serialize, Deserialize)]
pub struct ScanResult {
    pub cursor: u64,
    pub keys: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct KeyDetail {
    pub key: String,
    pub key_type: String,
    pub ttl: i64,
    pub size: i64,
    pub value: serde_json::Value,
}

#[derive(Serialize, Deserialize)]
pub struct RedisResult {
    pub result_type: String, // "string", "array", "integer", "nil", "error", "status"
    pub value: serde_json::Value,
}

// ---- 辅助函数 ----

async fn get_conn(conn_id: &str) -> Result<ConnectionManager, String> {
    let conns = get_connections().read().await;
    conns
        .get(conn_id)
        .cloned()
        .ok_or_else(|| format!("连接不存在: {}", conn_id))
}

fn build_url(host: &str, port: u16, password: &str, db: u8) -> String {
    if password.is_empty() {
        format!("redis://{}:{}/{}", host, port, db)
    } else {
        format!("redis://:{}@{}:{}/{}", url_encode(password), host, port, db)
    }
}

fn value_to_json(val: &Value) -> serde_json::Value {
    match val {
        Value::Nil => serde_json::Value::Null,
        Value::Int(i) => serde_json::json!(*i),
        Value::BulkString(bytes) => {
            match String::from_utf8(bytes.clone()) {
                Ok(s) => serde_json::json!(s),
                Err(_) => serde_json::json!(format!("<binary {} bytes>", bytes.len())),
            }
        }
        Value::Array(arr) => {
            serde_json::json!(arr.iter().map(value_to_json).collect::<Vec<_>>())
        }
        Value::SimpleString(s) => serde_json::json!(s),
        Value::Okay => serde_json::json!("OK"),
        Value::ServerError(e) => serde_json::json!(format!("ERR: {}", e.details().unwrap_or("unknown"))),
        _ => serde_json::json!(format!("{:?}", val)),
    }
}

fn value_type_str(val: &Value) -> &'static str {
    match val {
        Value::Nil => "nil",
        Value::Int(_) => "integer",
        Value::BulkString(_) | Value::SimpleString(_) => "string",
        Value::Array(_) => "array",
        Value::Okay => "status",
        Value::ServerError(_) => "error",
        _ => "unknown",
    }
}

// ---- Commands ----

#[tauri::command]
pub async fn redis_connect(
    host: String,
    port: u16,
    password: String,
    db: u8,
) -> Result<String, String> {
    let url = build_url(&host, port, &password, db);
    let client = Client::open(url).map_err(|e| format!("创建客户端失败: {}", e))?;
    let manager = ConnectionManager::new(client)
        .await
        .map_err(|e| format!("连接失败: {}", e))?;

    // 测试连接
    let mut conn = manager.clone();
    redis::cmd("PING")
        .query_async::<String>(&mut conn)
        .await
        .map_err(|e| format!("PING 失败: {}", e))?;

    let conn_id = Uuid::new_v4().to_string();
    get_connections()
        .write()
        .await
        .insert(conn_id.clone(), manager);

    Ok(conn_id)
}

#[tauri::command]
pub async fn redis_disconnect(conn_id: String) -> Result<(), String> {
    get_connections().write().await.remove(&conn_id);
    Ok(())
}

#[tauri::command]
pub async fn redis_test_connection(
    host: String,
    port: u16,
    password: String,
    db: u8,
) -> Result<bool, String> {
    let url = build_url(&host, port, &password, db);
    let client = Client::open(url).map_err(|e| format!("{}", e))?;
    let mut manager = ConnectionManager::new(client)
        .await
        .map_err(|e| format!("{}", e))?;
    redis::cmd("PING")
        .query_async::<String>(&mut manager)
        .await
        .map_err(|e| format!("{}", e))?;
    Ok(true)
}

#[tauri::command]
pub async fn redis_execute(
    conn_id: String,
    command: String,
    args: Vec<String>,
) -> Result<RedisResult, String> {
    let mut conn = get_conn(&conn_id).await?;
    let mut cmd = Cmd::new();
    cmd.arg(command);
    for a in &args {
        cmd.arg(a);
    }
    let val: Value = cmd
        .query_async(&mut conn)
        .await
        .map_err(|e| format!("{}", e))?;

    Ok(RedisResult {
        result_type: value_type_str(&val).to_string(),
        value: value_to_json(&val),
    })
}

#[tauri::command]
pub async fn redis_scan_keys(
    conn_id: String,
    pattern: String,
    cursor: u64,
    count: u64,
) -> Result<ScanResult, String> {
    let mut conn = get_conn(&conn_id).await?;
    let (next_cursor, keys): (u64, Vec<String>) = redis::cmd("SCAN")
        .arg(cursor)
        .arg("MATCH")
        .arg(&pattern)
        .arg("COUNT")
        .arg(count)
        .query_async(&mut conn)
        .await
        .map_err(|e| format!("SCAN 失败: {}", e))?;

    Ok(ScanResult {
        cursor: next_cursor,
        keys,
    })
}

#[tauri::command]
pub async fn redis_get_key_detail(conn_id: String, key: String) -> Result<KeyDetail, String> {
    let mut conn = get_conn(&conn_id).await?;

    // TYPE
    let key_type: String = redis::cmd("TYPE")
        .arg(&key)
        .query_async(&mut conn)
        .await
        .map_err(|e| format!("{}", e))?;

    // TTL
    let ttl: i64 = conn.ttl(&key).await.map_err(|e| format!("{}", e))?;

    // MEMORY USAGE（可能失败，降级为 -1）
    let size: i64 = redis::cmd("MEMORY")
        .arg("USAGE")
        .arg(&key)
        .query_async(&mut conn)
        .await
        .unwrap_or(-1);

    // VALUE — 根据类型获取
    let value = match key_type.as_str() {
        "string" => {
            let v: String = conn.get(&key).await.map_err(|e| format!("{}", e))?;
            serde_json::json!(v)
        }
        "hash" => {
            let v: Vec<(String, String)> = conn.hgetall(&key).await.map_err(|e| format!("{}", e))?;
            let map: serde_json::Map<String, serde_json::Value> = v
                .into_iter()
                .map(|(k, v)| (k, serde_json::json!(v)))
                .collect();
            serde_json::Value::Object(map)
        }
        "list" => {
            let v: Vec<String> = conn.lrange(&key, 0, 999).await.map_err(|e| format!("{}", e))?;
            serde_json::json!(v)
        }
        "set" => {
            let v: Vec<String> = conn.smembers(&key).await.map_err(|e| format!("{}", e))?;
            serde_json::json!(v)
        }
        "zset" => {
            let v: Vec<(String, f64)> = conn
                .zrange_withscores(&key, 0, 999)
                .await
                .map_err(|e| format!("{}", e))?;
            serde_json::json!(v.iter().map(|(m, s)| serde_json::json!({"member": m, "score": s})).collect::<Vec<_>>())
        }
        "stream" => {
            let val: Value = redis::cmd("XRANGE")
                .arg(&key)
                .arg("-")
                .arg("+")
                .arg("COUNT")
                .arg(100)
                .query_async(&mut conn)
                .await
                .map_err(|e| format!("{}", e))?;
            value_to_json(&val)
        }
        _ => serde_json::json!(null),
    };

    Ok(KeyDetail {
        key,
        key_type,
        ttl,
        size,
        value,
    })
}

#[tauri::command]
pub async fn redis_set_key(
    conn_id: String,
    key: String,
    value: String,
    key_type: String,
    ttl: Option<i64>,
) -> Result<(), String> {
    let mut conn = get_conn(&conn_id).await?;

    match key_type.as_str() {
        "string" => {
            conn.set::<_, _, ()>(&key, &value)
                .await
                .map_err(|e| format!("{}", e))?;
        }
        "hash" => {
            // value 是 JSON object
            let map: HashMap<String, String> =
                serde_json::from_str(&value).map_err(|e| format!("JSON 解析失败: {}", e))?;
            conn.del::<_, ()>(&key).await.map_err(|e| format!("{}", e))?;
            if !map.is_empty() {
                conn.hset_multiple::<_, _, _, ()>(&key, &map.into_iter().collect::<Vec<_>>())
                    .await
                    .map_err(|e| format!("{}", e))?;
            }
        }
        "list" => {
            let items: Vec<String> =
                serde_json::from_str(&value).map_err(|e| format!("JSON 解析失败: {}", e))?;
            conn.del::<_, ()>(&key).await.map_err(|e| format!("{}", e))?;
            if !items.is_empty() {
                conn.rpush::<_, _, ()>(&key, items)
                    .await
                    .map_err(|e| format!("{}", e))?;
            }
        }
        "set" => {
            let items: Vec<String> =
                serde_json::from_str(&value).map_err(|e| format!("JSON 解析失败: {}", e))?;
            conn.del::<_, ()>(&key).await.map_err(|e| format!("{}", e))?;
            if !items.is_empty() {
                conn.sadd::<_, _, ()>(&key, items)
                    .await
                    .map_err(|e| format!("{}", e))?;
            }
        }
        "zset" => {
            let items: Vec<(String, f64)> =
                serde_json::from_str(&value).map_err(|e| format!("JSON 解析失败: {}", e))?;
            conn.del::<_, ()>(&key).await.map_err(|e| format!("{}", e))?;
            if !items.is_empty() {
                let scored: Vec<(f64, String)> = items.into_iter().map(|(m, s)| (s, m)).collect();
                for (score, member) in scored {
                    conn.zadd::<_, _, _, ()>(&key, member, score)
                        .await
                        .map_err(|e| format!("{}", e))?;
                }
            }
        }
        _ => return Err(format!("不支持的类型: {}", key_type)),
    }

    if let Some(t) = ttl {
        if t > 0 {
            conn.expire::<_, ()>(&key, t)
                .await
                .map_err(|e| format!("{}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn redis_delete_keys(conn_id: String, keys: Vec<String>) -> Result<u64, String> {
    let mut conn = get_conn(&conn_id).await?;
    let count: u64 = conn.del(&keys).await.map_err(|e| format!("{}", e))?;
    Ok(count)
}

#[tauri::command]
pub async fn redis_rename_key(
    conn_id: String,
    old_key: String,
    new_key: String,
) -> Result<(), String> {
    let mut conn = get_conn(&conn_id).await?;
    redis::cmd("RENAME")
        .arg(&old_key)
        .arg(&new_key)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| format!("{}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn redis_set_ttl(conn_id: String, key: String, ttl: i64) -> Result<(), String> {
    let mut conn = get_conn(&conn_id).await?;
    if ttl < 0 {
        conn.persist::<_, ()>(&key)
            .await
            .map_err(|e| format!("{}", e))?;
    } else {
        conn.expire::<_, ()>(&key, ttl)
            .await
            .map_err(|e| format!("{}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn redis_server_info(conn_id: String) -> Result<serde_json::Value, String> {
    let mut conn = get_conn(&conn_id).await?;
    let info: String = redis::cmd("INFO")
        .query_async(&mut conn)
        .await
        .map_err(|e| format!("{}", e))?;

    // 解析 INFO 输出为分段 map
    let mut sections: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
    let mut current_section = String::from("server");

    for line in info.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if line.starts_with('#') {
            current_section = line.trim_start_matches('#').trim().to_lowercase();
            continue;
        }
        if let Some((k, v)) = line.split_once(':') {
            let section = sections
                .entry(current_section.clone())
                .or_insert_with(|| serde_json::json!({}));
            if let serde_json::Value::Object(map) = section {
                map.insert(k.to_string(), serde_json::json!(v));
            }
        }
    }

    Ok(serde_json::Value::Object(sections))
}

#[tauri::command]
pub async fn redis_db_size(conn_id: String) -> Result<u64, String> {
    let mut conn = get_conn(&conn_id).await?;
    let size: u64 = redis::cmd("DBSIZE")
        .query_async(&mut conn)
        .await
        .map_err(|e| format!("{}", e))?;
    Ok(size)
}

#[tauri::command]
pub async fn redis_select_db(conn_id: String, db: u8) -> Result<(), String> {
    let mut conn = get_conn(&conn_id).await?;
    redis::cmd("SELECT")
        .arg(db)
        .query_async::<()>(&mut conn)
        .await
        .map_err(|e| format!("{}", e))?;
    Ok(())
}
