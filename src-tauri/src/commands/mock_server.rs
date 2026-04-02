use axum::{
    body::Body,
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use tauri::Emitter;
use tokio::sync::{oneshot, RwLock};
use tower_http::cors::CorsLayer;

// ---- Mock 规则数据结构 ----

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MockRule {
    pub id: String,
    pub method: String,
    pub path: String,
    #[serde(rename = "statusCode")]
    pub status_code: u16,
    pub delay: u64,
    pub enabled: bool,
    #[serde(rename = "responseBody")]
    pub response_body: String,
    #[serde(default)]
    pub expectations: Vec<MockExpectation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MockExpectation {
    pub name: String,
    pub enabled: bool,
    pub conditions: Vec<MockCondition>,
    #[serde(rename = "responseBody")]
    pub response_body: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MockCondition {
    pub path: String,
    pub operator: String,
    pub value: String,
}

// ---- 全局状态 ----

struct MockServerHandle {
    shutdown_tx: oneshot::Sender<()>,
}

static MOCK_SERVER: OnceLock<RwLock<Option<MockServerHandle>>> = OnceLock::new();
static MOCK_RULES: OnceLock<RwLock<Vec<MockRule>>> = OnceLock::new();
static MOCK_LOG_TX: OnceLock<RwLock<Option<tauri::AppHandle>>> = OnceLock::new();

fn get_mock_server() -> &'static RwLock<Option<MockServerHandle>> {
    MOCK_SERVER.get_or_init(|| RwLock::new(None))
}

fn get_mock_rules() -> &'static RwLock<Vec<MockRule>> {
    MOCK_RULES.get_or_init(|| RwLock::new(Vec::new()))
}

fn get_mock_log() -> &'static RwLock<Option<tauri::AppHandle>> {
    MOCK_LOG_TX.get_or_init(|| RwLock::new(None))
}

// ---- Tauri 命令 ----

#[tauri::command]
pub async fn start_mock_server(
    app: tauri::AppHandle,
    port: u16,
    rules: Vec<MockRule>,
) -> Result<String, String> {
    // 先停掉旧的
    stop_mock_server_inner().await;

    // 更新规则
    {
        let mut r = get_mock_rules().write().await;
        *r = rules;
    }
    // 保存 app handle 用于日志事件
    {
        let mut log = get_mock_log().write().await;
        *log = Some(app);
    }

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    let app_router = Router::new()
        .fallback(mock_handler)
        .layer(CorsLayer::very_permissive());

    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("端口 {} 绑定失败: {}", port, e))?;

    tokio::spawn(async move {
        axum::serve(listener, app_router)
            .with_graceful_shutdown(async { let _ = shutdown_rx.await; })
            .await
            .ok();
    });

    {
        let mut handle = get_mock_server().write().await;
        *handle = Some(MockServerHandle { shutdown_tx });
    }

    Ok(format!("Mock server started on port {}", port))
}

#[tauri::command]
pub async fn stop_mock_server() -> Result<String, String> {
    stop_mock_server_inner().await;
    Ok("Mock server stopped".to_string())
}

#[tauri::command]
pub async fn update_mock_rules(rules: Vec<MockRule>) -> Result<(), String> {
    let mut r = get_mock_rules().write().await;
    *r = rules;
    Ok(())
}

async fn stop_mock_server_inner() {
    let mut handle = get_mock_server().write().await;
    if let Some(h) = handle.take() {
        let _ = h.shutdown_tx.send(());
    }
}

// ---- Mock 请求处理 ----

async fn mock_handler(request: Request<Body>) -> Response {
    let req_method = request.method().to_string().to_uppercase();
    let req_path = request.uri().path().to_string();

    let body_bytes = axum::body::to_bytes(request.into_body(), 1024 * 1024)
        .await
        .unwrap_or_default();

    let rules = get_mock_rules().read().await;

    // 先精确匹配方法+路径，再宽松匹配仅路径
    let rule = rules
        .iter()
        .find(|r| r.enabled && r.method.to_uppercase() == req_method && path_matches(&r.path, &req_path))
        .or_else(|| rules.iter().find(|r| r.enabled && path_matches(&r.path, &req_path)));

    let rule = match rule {
        Some(r) => r.clone(),
        None => {
            return (
                StatusCode::NOT_FOUND,
                [(axum::http::header::CONTENT_TYPE, "application/json")],
                format!(r#"{{"error":"No mock rule for {} {}"}}"#, req_method, req_path),
            ).into_response();
        }
    };

    // 释放读锁
    drop(rules);

    // 延迟（不阻塞其他请求，tokio::time::sleep 是真异步）
    if rule.delay > 0 {
        tokio::time::sleep(tokio::time::Duration::from_millis(rule.delay.min(30000))).await;
    }

    // 期望匹配
    let body_str = String::from_utf8_lossy(&body_bytes).to_string();
    let response_body = match_expectation(&rule.expectations, &body_str)
        .unwrap_or_else(|| rule.response_body.clone());

    // 发送日志事件
    if let Some(app) = &*get_mock_log().read().await {
        let _ = app.emit("mock-request-log", serde_json::json!({
            "method": req_method,
            "path": req_path,
            "status": rule.status_code,
            "delay": rule.delay,
            "time": chrono_now(),
        }));
    }

    let status = StatusCode::from_u16(rule.status_code).unwrap_or(StatusCode::OK);
    (
        status,
        [(axum::http::header::CONTENT_TYPE, "application/json"),
         (axum::http::header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")],
        response_body,
    ).into_response()
}

fn path_matches(pattern: &str, actual: &str) -> bool {
    if pattern == actual {
        return true;
    }
    // 支持 /api/users/:id 路径参数
    let pattern_parts: Vec<&str> = pattern.split('/').collect();
    let actual_parts: Vec<&str> = actual.split('/').collect();
    if pattern_parts.len() != actual_parts.len() {
        return false;
    }
    pattern_parts.iter().zip(actual_parts.iter()).all(|(p, a)| {
        p.starts_with(':') || p.starts_with('*') || *p == *a
    })
}

fn match_expectation(expectations: &[MockExpectation], body: &str) -> Option<String> {
    let body_json: serde_json::Value = serde_json::from_str(body).unwrap_or(serde_json::Value::Null);

    // 第一轮：匹配有条件的期望
    for exp in expectations {
        if !exp.enabled || exp.conditions.is_empty() {
            continue;
        }
        let all_match = exp.conditions.iter().all(|cond| {
            let actual = get_json_path(&body_json, &cond.path);
            match cond.operator.as_str() {
                "==" => actual.map(|v| value_to_string(v) == cond.value).unwrap_or(false),
                "!=" => actual.map(|v| value_to_string(v) != cond.value).unwrap_or(true),
                "contains" => actual.map(|v| value_to_string(v).contains(&cond.value)).unwrap_or(false),
                "exists" => actual.is_some(),
                _ => false,
            }
        });
        if all_match {
            // 有专属响应体就返回，否则 None 让调用方用默认响应
            return if exp.response_body.is_empty() { None } else { Some(exp.response_body.clone()) };
        }
    }

    // 第二轮：无条件的兜底期望
    for exp in expectations {
        if exp.enabled && exp.conditions.is_empty() && !exp.response_body.is_empty() {
            return Some(exp.response_body.clone());
        }
    }

    None
}

fn get_json_path<'a>(value: &'a serde_json::Value, path: &str) -> Option<&'a serde_json::Value> {
    let clean = path.strip_prefix("body.").unwrap_or(path);
    let mut current = value;
    for key in clean.split('.') {
        // 支持数组下标：list.0.name
        if let Ok(idx) = key.parse::<usize>() {
            current = current.get(idx)?;
        } else {
            current = current.get(key)?;
        }
    }
    Some(current)
}

fn value_to_string(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => s.clone(),
        other => other.to_string(),
    }
}

fn chrono_now() -> String {
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    format!("{}", ts)
}
