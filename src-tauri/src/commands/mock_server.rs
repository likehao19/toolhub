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
    #[serde(default)]
    pub id: String,
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
//
// 旧版本只存 oneshot::Sender,stop 时光发信号就返回,axum task 还没真正退出端口就被旧实例占着,
// 紧接着的 start 立刻 bind 同一个端口会撞 EADDRINUSE。这里和 chat.rs 的修法对齐:
// 把 task JoinHandle 一起存,stop 时显式 abort+await。

struct MockServerHandle {
    shutdown_tx: oneshot::Sender<()>,
    task: tokio::task::JoinHandle<()>,
    /// 当前监听的端口。前端切走再切回 MockService 页面时,组件 local state 已经重置,
    /// 需要拿这个回填 mockPort,避免显示成默认值 9527 但实际跑在别的端口。
    port: u16,
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
    // 先停掉旧的(且会等到老 task 真正退出,端口才真正释放)
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

    let task = tokio::spawn(async move {
        axum::serve(listener, app_router)
            .with_graceful_shutdown(async { let _ = shutdown_rx.await; })
            .await
            .ok();
    });

    {
        let mut handle = get_mock_server().write().await;
        *handle = Some(MockServerHandle { shutdown_tx, task, port });
    }

    Ok(format!("Mock server started on port {}", port))
}

/// 查询 Mock 服务真实运行状态。前端组件每次重新挂载(切到别的页面再切回来)
/// 都需要调一次,把 mockRunning / mockPort 同步成后端真实情况,避免显示"已停止"
/// 但实际还在跑、或者反过来。
#[tauri::command]
pub async fn get_mock_server_status() -> Result<serde_json::Value, String> {
    let handle = get_mock_server().read().await;
    let (running, port) = match handle.as_ref() {
        Some(h) => (true, Some(h.port)),
        None => (false, None),
    };
    drop(handle);

    let rule_count = get_mock_rules().read().await.len();

    Ok(serde_json::json!({
        "running": running,
        "port": port,
        "ruleCount": rule_count,
    }))
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
    // 先把 handle 取出来释放写锁,免得 await task 时占着锁阻塞别人
    let handle = {
        let mut h = get_mock_server().write().await;
        h.take()
    };
    if let Some(h) = handle {
        let _ = h.shutdown_tx.send(());
        // await JoinHandle:axum::serve 收到 graceful_shutdown 信号后会停止接受新连接,
        // 处理完进行中的请求才退出,这一步保证端口在函数返回前真正释放。
        let _ = h.task.await;
    }
}

// ---- Mock 请求处理 ----

// 请求体上限:16 MB,Mock 经常被用于调试文件上传,1MB 太小。
const MAX_REQUEST_BODY: usize = 16 * 1024 * 1024;

async fn mock_handler(request: Request<Body>) -> Response {
    let req_method = request.method().to_string().to_uppercase();
    let req_path = request.uri().path().to_string();

    let body_bytes = axum::body::to_bytes(request.into_body(), MAX_REQUEST_BODY)
        .await
        .unwrap_or_default();

    let rules = get_mock_rules().read().await;

    // 严格匹配:method + path 必须同时对得上。
    // 旧实现做了第二轮"仅按路径"的 fallback,导致 DELETE /api/users 在没配 DELETE 规则时
    // 会误命中 GET /api/users 的响应,前端开发者会以为删除成功 → 这是相当隐蔽的事故面。
    // 现在路径匹配但方法不对 → 405,明确告诉调用方"该路径只接受 X 方法"。
    let path_hit_any = rules.iter().any(|r| r.enabled && path_matches(&r.path, &req_path));
    let rule = rules.iter().find(|r| {
        r.enabled && r.method.to_uppercase() == req_method && path_matches(&r.path, &req_path)
    });

    let rule = match rule {
        Some(r) => r.clone(),
        None => {
            drop(rules);
            // 区分 404(路径完全没配) 和 405(路径配了但 method 不对)
            let (status, msg) = if path_hit_any {
                (StatusCode::METHOD_NOT_ALLOWED,
                 format!(r#"{{"error":"Method {} not allowed for {}"}}"#, req_method, req_path))
            } else {
                (StatusCode::NOT_FOUND,
                 format!(r#"{{"error":"No mock rule for {} {}"}}"#, req_method, req_path))
            };
            emit_log(&req_method, &req_path, status.as_u16(), 0, None, None, &body_bytes);
            return (
                status,
                [(axum::http::header::CONTENT_TYPE, "application/json")],
                msg,
            ).into_response();
        }
    };

    // 释放读锁,接下来的 sleep / IO 不要占锁
    drop(rules);

    // 延迟(不阻塞其他请求,tokio::time::sleep 是真异步)
    if rule.delay > 0 {
        tokio::time::sleep(tokio::time::Duration::from_millis(rule.delay.min(30000))).await;
    }

    // 期望匹配:返回 (响应体, 命中的 expectation 名字)
    let body_str = String::from_utf8_lossy(&body_bytes).to_string();
    let (response_body, matched_exp) = match_expectation(&rule.expectations, &body_str)
        .map(|(body, name)| (body, Some(name)))
        .unwrap_or_else(|| (rule.response_body.clone(), None));

    // 发送日志事件:加上 matched_rule_id / matched_expectation / 请求 body 摘要,
    // 这样调试期望时能看到"我请求是什么 → 命中了哪条规则的哪个 expectation"。
    emit_log(
        &req_method, &req_path,
        rule.status_code, rule.delay,
        Some(&rule.id), matched_exp.as_deref(),
        &body_bytes,
    );

    // Content-Type 智能判断:旧实现一律 application/json,纯文本 mock 会被客户端 JSON.parse 报错。
    let content_type = guess_content_type(&response_body);

    let status = StatusCode::from_u16(rule.status_code).unwrap_or(StatusCode::OK);
    (
        status,
        [(axum::http::header::CONTENT_TYPE, content_type),
         (axum::http::header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")],
        response_body,
    ).into_response()
}

/// 按 body 内容首字符判断 Content-Type:
/// `{` / `[` 视为 JSON,`<` 视为 XML/HTML,其他文本。
/// 用户响应体里写裸文本时不再被强制解析成 JSON。
fn guess_content_type(body: &str) -> &'static str {
    let trimmed = body.trim_start();
    let first = trimmed.as_bytes().first().copied();
    match first {
        Some(b'{') | Some(b'[') => "application/json; charset=utf-8",
        Some(b'<') => {
            if trimmed.starts_with("<!DOCTYPE") || trimmed.starts_with("<html") || trimmed.starts_with("<HTML") {
                "text/html; charset=utf-8"
            } else {
                "application/xml; charset=utf-8"
            }
        }
        _ => "text/plain; charset=utf-8",
    }
}

/// 发送一条 mock-request-log 事件给前端展示。
/// 多了三个字段:matched_rule_id / matched_expectation / request_body(截前 1KB),
/// 调试条件期望时能直接在日志里看清"我发了什么 → 命中了哪条规则的哪个分支"。
fn emit_log(
    method: &str,
    path: &str,
    status: u16,
    delay: u64,
    matched_rule_id: Option<&str>,
    matched_expectation: Option<&str>,
    body_bytes: &[u8],
) {
    let log_handle = MOCK_LOG_TX.get();
    let Some(lock) = log_handle else { return };
    // 用 try_read 避免日志阻塞请求路径;拿不到就直接放弃这条日志。
    let Ok(guard) = lock.try_read() else { return };
    let Some(app) = guard.as_ref() else { return };

    // body 截断到 1KB 防止超大上传刷屏 / 触发 IPC 序列化爆炸
    const MAX_BODY_PREVIEW: usize = 1024;
    let body_preview = if body_bytes.len() > MAX_BODY_PREVIEW {
        format!(
            "{}…(+{} bytes)",
            String::from_utf8_lossy(&body_bytes[..MAX_BODY_PREVIEW]),
            body_bytes.len() - MAX_BODY_PREVIEW
        )
    } else {
        String::from_utf8_lossy(body_bytes).to_string()
    };

    let _ = app.emit("mock-request-log", serde_json::json!({
        "method": method,
        "path": path,
        "status": status,
        "delay": delay,
        "matchedRuleId": matched_rule_id,
        "matchedExpectation": matched_expectation,
        "requestBody": body_preview,
        "time": now_millis(),
    }));
}

fn path_matches(pattern: &str, actual: &str) -> bool {
    if pattern == actual {
        return true;
    }
    // 支持 /api/users/:id 路径参数 + /api/* 单段通配
    let pattern_parts: Vec<&str> = pattern.split('/').collect();
    let actual_parts: Vec<&str> = actual.split('/').collect();
    if pattern_parts.len() != actual_parts.len() {
        return false;
    }
    pattern_parts.iter().zip(actual_parts.iter()).all(|(p, a)| {
        p.starts_with(':') || p.starts_with('*') || *p == *a
    })
}

/// 期望匹配:返回 (响应体, 命中的 expectation 名),让上层把名字写进日志。
fn match_expectation(expectations: &[MockExpectation], body: &str) -> Option<(String, String)> {
    let body_json: serde_json::Value = serde_json::from_str(body).unwrap_or(serde_json::Value::Null);

    // 第一轮:匹配有条件的期望(精确优先)
    for exp in expectations {
        if !exp.enabled || exp.conditions.is_empty() {
            continue;
        }
        let all_match = exp.conditions.iter().all(|cond| {
            let actual = get_json_path(&body_json, &cond.path);
            evaluate_condition(actual, &cond.operator, &cond.value)
        });
        if all_match && !exp.response_body.is_empty() {
            return Some((exp.response_body.clone(), exp.name.clone()));
        }
    }

    // 第二轮:无条件的兜底期望
    for exp in expectations {
        if exp.enabled && exp.conditions.is_empty() && !exp.response_body.is_empty() {
            return Some((exp.response_body.clone(), exp.name.clone()));
        }
    }

    None
}

/// 期望条件求值。
/// 旧实现的 == 用纯字符串比,JSON `1.0` 和用户填的 `"1"` 会不相等;
/// 这里对数字做双向数值比较,布尔做大小写无关比较,用户填的不严格也能命中。
fn evaluate_condition(
    actual: Option<&serde_json::Value>,
    operator: &str,
    expected: &str,
) -> bool {
    match operator {
        "exists" => actual.is_some(),
        "==" => actual.map(|v| values_equal(v, expected)).unwrap_or(false),
        "!=" => actual.map(|v| !values_equal(v, expected)).unwrap_or(true),
        "contains" => actual.map(|v| value_to_string(v).contains(expected)).unwrap_or(false),
        _ => false,
    }
}

fn values_equal(actual: &serde_json::Value, expected: &str) -> bool {
    match actual {
        serde_json::Value::Number(n) => {
            // 数字 vs 字符串:1.0 == "1" 也算相等
            if let Ok(parsed) = expected.parse::<f64>() {
                n.as_f64().map(|x| (x - parsed).abs() < f64::EPSILON).unwrap_or(false)
            } else {
                n.to_string() == expected
            }
        }
        serde_json::Value::Bool(b) => expected.eq_ignore_ascii_case(if *b { "true" } else { "false" }),
        serde_json::Value::String(s) => s == expected,
        serde_json::Value::Null => expected.eq_ignore_ascii_case("null"),
        other => other.to_string() == expected,
    }
}

fn get_json_path<'a>(value: &'a serde_json::Value, path: &str) -> Option<&'a serde_json::Value> {
    let clean = path.strip_prefix("body.").unwrap_or(path);
    let mut current = value;
    for key in clean.split('.') {
        // 支持数组下标:list.0.name。键名是纯数字时会优先按数组处理(对象里也用数字键的极端
        // case 这里没法两全,文档说明即可)。
        if let Ok(idx) = key.parse::<usize>() {
            if let Some(v) = current.get(idx) {
                current = v;
                continue;
            }
        }
        current = current.get(key)?;
    }
    Some(current)
}

fn value_to_string(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::String(s) => s.clone(),
        other => other.to_string(),
    }
}

fn now_millis() -> String {
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    format!("{}", ts)
}
