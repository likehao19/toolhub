use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs::{self, File};
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom};
use std::path::Path;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, OnceLock, RwLock,
};
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

const LARGE_LOG_LINE_THRESHOLD: usize = 10_000;
const AI_BLOCK_LIMIT: usize = 12;
const ROOT_CAUSE_LIMIT: usize = 5;
const TOP_COUNT_LIMIT: usize = 10;
const SEARCH_TEXT_LIMIT: usize = 12_000;
const PREVIEW_TEXT_LIMIT: usize = 600;
const PROGRESS_EMIT_INTERVAL_BYTES: u64 = 1_048_576;
/// 最大日志文件大小 500 MB
const MAX_LOG_FILE_SIZE: u64 = 500 * 1024 * 1024;
/// 会话闲置超时 30 分钟
const SESSION_IDLE_TIMEOUT_SECS: u64 = 30 * 60;
/// 最大并发索引线程数
const MAX_CONCURRENT_INDEX: usize = 4;
/// 行首级别检测最大偏移
const LEVEL_DETECT_PREFIX_LIMIT: usize = 80;

static LOG_SESSIONS: OnceLock<RwLock<HashMap<String, Arc<LogAnalysisSession>>>> = OnceLock::new();
static INDEX_SEMAPHORE: OnceLock<tokio::sync::Semaphore> = OnceLock::new();

fn get_index_semaphore() -> &'static tokio::sync::Semaphore {
    INDEX_SEMAPHORE.get_or_init(|| tokio::sync::Semaphore::new(MAX_CONCURRENT_INDEX))
}

fn get_sessions() -> &'static RwLock<HashMap<String, Arc<LogAnalysisSession>>> {
    LOG_SESSIONS.get_or_init(|| RwLock::new(HashMap::new()))
}

struct LogAnalysisSession {
    path: String,
    file_name: String,
    file_size: u64,
    cancel_flag: AtomicBool,
    state: RwLock<LogSessionState>,
    last_accessed: RwLock<Instant>,
}

struct LogSessionState {
    progress: LogAnalysisProgress,
    summary: Option<LogAnalysisSummary>,
    blocks: Vec<IndexedLogBlock>,
}

struct IndexedLogBlock {
    summary: LogBlockSummary,
    search_blob: String,
    caused_by_count: usize,
}

struct CurrentBlock {
    start_line: usize,
    end_line: usize,
    start_byte: u64,
    end_byte: u64,
    timestamp: String,
    level: String,
    has_exception: bool,
    lines: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StackFrame {
    pub full_class_name: String,
    pub method_name: String,
    pub file_name: String,
    pub line_number: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CountItem {
    pub name: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SignatureCountItem {
    pub signature: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LogAnalysisMeta {
    pub is_large_file: bool,
    pub total_block_count: usize,
    pub ai_block_limit: usize,
    pub indexed_elapsed_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LogBlockSummary {
    pub id: String,
    pub start_line: usize,
    pub end_line: usize,
    pub start_byte: u64,
    pub end_byte: u64,
    pub level: String,
    pub timestamp: String,
    pub headline: String,
    pub exception_type: String,
    pub message: String,
    pub has_exception: bool,
    pub has_stack_trace: bool,
    pub root_cause_line: String,
    pub stack_frame_count: usize,
    pub signature: String,
    pub preview_text: String,
    pub stack_frames: Vec<StackFrame>,
    pub referenced_classes: Vec<String>,
    pub root_cause_score: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LogAnalysisSummary {
    pub file_name: String,
    pub file_size: u64,
    pub total_lines: usize,
    pub total_blocks: usize,
    pub errors: usize,
    pub warnings: usize,
    pub stack_traces: usize,
    pub top_exceptions: Vec<CountItem>,
    pub frequent_blocks: Vec<SignatureCountItem>,
    pub root_cause_candidates: Vec<LogBlockSummary>,
    pub referenced_classes: Vec<String>,
    pub relevant_stack_frames: Vec<StackFrame>,
    pub meta: LogAnalysisMeta,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LogBlockPage {
    pub items: Vec<LogBlockSummary>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
    pub has_more: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LogBlockDetail {
    pub summary: LogBlockSummary,
    pub raw_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LogAnalysisProgress {
    pub session_id: String,
    pub bytes_read: u64,
    pub total_bytes: u64,
    pub lines_read: usize,
    pub blocks_indexed: usize,
    pub phase: String,
    pub completed: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenLogAnalysisOptions {
    pub path: String,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LogBlockQuery {
    pub mode: Option<String>,
    pub keyword: Option<String>,
    pub page: Option<usize>,
    pub page_size: Option<usize>,
}

#[tauri::command]
pub async fn open_log_analysis_session(
    app: AppHandle,
    options: OpenLogAnalysisOptions,
) -> Result<String, String> {
    let file_path = Path::new(&options.path);
    if !file_path.exists() {
        return Err(format!("文件不存在: {}", options.path));
    }
    if !file_path.is_file() {
        return Err(format!("路径不是文件: {}", options.path));
    }

    let metadata = fs::metadata(file_path).map_err(|e| format!("无法读取文件元数据: {}", e))?;

    // Fix 3: 文件大小限制
    if metadata.len() > MAX_LOG_FILE_SIZE {
        return Err(format!(
            "日志文件过大 ({:.1} MB)，最大支持 {} MB",
            metadata.len() as f64 / 1024.0 / 1024.0,
            MAX_LOG_FILE_SIZE / 1024 / 1024
        ));
    }

    let file_name = file_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("log")
        .to_string();
    let session_id = Uuid::new_v4().to_string();

    // Fix 2: 清理闲置超过 30 分钟的会话
    sweep_stale_sessions();

    let session = Arc::new(LogAnalysisSession {
        path: options.path.clone(),
        file_name,
        file_size: metadata.len(),
        cancel_flag: AtomicBool::new(false),
        state: RwLock::new(LogSessionState {
            progress: LogAnalysisProgress {
                session_id: session_id.clone(),
                bytes_read: 0,
                total_bytes: metadata.len(),
                lines_read: 0,
                blocks_indexed: 0,
                phase: "indexing".to_string(),
                completed: false,
                error: None,
            },
            summary: None,
            blocks: Vec::new(),
        }),
        last_accessed: RwLock::new(Instant::now()),
    });

    get_sessions()
        .write()
        .map_err(|e| format!("session lock error: {}", e))?
        .insert(session_id.clone(), session.clone());

    // Fix 9: 通过信号量限制并发索引线程
    let session_id_clone = session_id.clone();
    let app_handle = app.clone();
    let semaphore = get_index_semaphore();
    let permit = semaphore
        .acquire()
        .await
        .map_err(|e| format!("semaphore error: {}", e))?;
    // forget() 返回 ()，信号量许可靠 add_permits 手动归还
    permit.forget();
    std::thread::spawn(move || {
        index_log_session(&app_handle, &session_id_clone, session);
        // 归还信号量许可
        get_index_semaphore().add_permits(1);
    });

    Ok(session_id)
}

#[tauri::command]
pub async fn get_log_analysis_summary(session_id: String) -> Result<LogAnalysisSummary, String> {
    let session = get_session(&session_id)?;
    let state = session
        .state
        .read()
        .map_err(|e| format!("session state read error: {}", e))?;

    if let Some(error) = &state.progress.error {
        return Err(error.clone());
    }

    if state.progress.phase != "ready" {
        return Err("日志仍在解析中".to_string());
    }

    state
        .summary
        .clone()
        .ok_or_else(|| "日志摘要尚未生成".to_string())
}

#[tauri::command]
pub async fn query_log_blocks(
    session_id: String,
    query: LogBlockQuery,
) -> Result<LogBlockPage, String> {
    let session = get_session(&session_id)?;
    let state = session
        .state
        .read()
        .map_err(|e| format!("session state read error: {}", e))?;

    if let Some(error) = &state.progress.error {
        return Err(error.clone());
    }

    if state.progress.phase != "ready" {
        return Err("日志仍在解析中".to_string());
    }

    let mode = query.mode.unwrap_or_else(|| "issues".to_string());
    let keyword = query.keyword.unwrap_or_default().trim().to_lowercase();
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(50).clamp(10, 200);

    let filtered: Vec<LogBlockSummary> = state
        .blocks
        .iter()
        .filter(|block| block_matches(&block.summary, &block.search_blob, &mode, &keyword))
        .map(|block| block.summary.clone())
        .collect();

    let total = filtered.len();
    let start = (page - 1).saturating_mul(page_size);
    let items = if start >= total {
        Vec::new()
    } else {
        filtered.into_iter().skip(start).take(page_size).collect()
    };
    let has_more = start + items.len() < total;

    Ok(LogBlockPage {
        items,
        total,
        page,
        page_size,
        has_more,
    })
}

#[tauri::command]
pub async fn get_log_block_detail(
    session_id: String,
    block_id: String,
) -> Result<LogBlockDetail, String> {
    let session = get_session(&session_id)?;
    let summary = {
        let state = session
            .state
            .read()
            .map_err(|e| format!("session state read error: {}", e))?;

        if let Some(error) = &state.progress.error {
            return Err(error.clone());
        }

        if state.progress.phase != "ready" {
            return Err("日志仍在解析中".to_string());
        }

        state
            .blocks
            .iter()
            .find(|block| block.summary.id == block_id)
            .map(|block| block.summary.clone())
            .ok_or_else(|| format!("未找到日志块: {}", block_id))?
    };

    let raw_text = read_block_text(&session.path, summary.start_byte, summary.end_byte)?;
    Ok(LogBlockDetail { summary, raw_text })
}

#[tauri::command]
pub async fn cancel_log_analysis_session(session_id: String) -> Result<(), String> {
    let session = get_session(&session_id)?;
    session.cancel_flag.store(true, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub async fn close_log_analysis_session(session_id: String) -> Result<(), String> {
    get_sessions()
        .write()
        .map_err(|e| format!("session lock error: {}", e))?
        .remove(&session_id);
    Ok(())
}

fn get_session(session_id: &str) -> Result<Arc<LogAnalysisSession>, String> {
    let session = get_sessions()
        .read()
        .map_err(|e| format!("session lock error: {}", e))?
        .get(session_id)
        .cloned()
        .ok_or_else(|| format!("日志会话不存在: {}", session_id))?;

    // Fix 2: 刷新最后访问时间
    if let Ok(mut ts) = session.last_accessed.write() {
        *ts = Instant::now();
    }

    Ok(session)
}

/// Fix 2: 清理闲置超时的会话
fn sweep_stale_sessions() {
    let now = Instant::now();
    let mut sessions = match get_sessions().write() {
        Ok(s) => s,
        Err(_) => return,
    };
    sessions.retain(|_id, session| {
        let last = session.last_accessed.read().map(|t| *t).unwrap_or(now);
        now.duration_since(last).as_secs() < SESSION_IDLE_TIMEOUT_SECS
    });
}

fn index_log_session(app: &AppHandle, session_id: &str, session: Arc<LogAnalysisSession>) {
    match build_log_index(app, session_id, &session) {
        Ok((summary, blocks, progress)) => {
            if let Ok(mut state) = session.state.write() {
                state.summary = Some(summary.clone());
                state.blocks = blocks;
                state.progress = progress.clone();
            }
            let _ = app.emit(&format!("log-analysis-complete-{}", session_id), progress);
        }
        Err(error) => {
            let progress = LogAnalysisProgress {
                session_id: session_id.to_string(),
                bytes_read: 0,
                total_bytes: session.file_size,
                lines_read: 0,
                blocks_indexed: 0,
                phase: if session.cancel_flag.load(Ordering::Relaxed) {
                    "cancelled".to_string()
                } else {
                    "error".to_string()
                },
                completed: true,
                error: Some(error.clone()),
            };
            if let Ok(mut state) = session.state.write() {
                state.progress = progress.clone();
                state.summary = None;
                state.blocks.clear();
            }
            let _ = app.emit(&format!("log-analysis-complete-{}", session_id), progress);
        }
    }
}

fn build_log_index(
    app: &AppHandle,
    session_id: &str,
    session: &Arc<LogAnalysisSession>,
) -> Result<(LogAnalysisSummary, Vec<IndexedLogBlock>, LogAnalysisProgress), String> {
    let start = Instant::now();

    // Fix 5: 编码检测 — 先读前 8KB 判断编码
    let encoding = detect_file_encoding(&session.path)?;
    let use_encoding_rs = encoding != "utf-8";

    let file = File::open(&session.path).map_err(|e| format!("无法打开日志文件: {}", e))?;
    let mut reader = BufReader::new(file);
    let mut line_buffer = Vec::new();
    let mut blocks = Vec::<IndexedLogBlock>::new();
    let mut current: Option<CurrentBlock> = None;
    let mut line_no = 0usize;
    let mut bytes_read = 0u64;
    let mut next_progress = PROGRESS_EMIT_INTERVAL_BYTES;
    let mut exception_counts = HashMap::<String, usize>::new();
    let mut signature_counts = HashMap::<String, usize>::new();

    loop {
        if session.cancel_flag.load(Ordering::Relaxed) {
            let progress = LogAnalysisProgress {
                session_id: session_id.to_string(),
                bytes_read,
                total_bytes: session.file_size,
                lines_read: line_no,
                blocks_indexed: blocks.len(),
                phase: "cancelled".to_string(),
                completed: true,
                error: Some("日志解析已取消".to_string()),
            };
            if let Ok(mut state) = session.state.write() {
                state.progress = progress.clone();
            }
            return Err("日志解析已取消".to_string());
        }

        line_buffer.clear();
        let read_len = reader
            .read_until(b'\n', &mut line_buffer)
            .map_err(|e| format!("读取日志文件失败: {}", e))?;
        if read_len == 0 {
            break;
        }

        let line_start_byte = bytes_read;
        bytes_read += read_len as u64;
        line_no += 1;

        let line = normalize_line(&line_buffer, use_encoding_rs, &encoding);
        let timestamp = extract_timestamp(&line);
        let level = detect_level_prefix(&line);
        let starts_new_block = !timestamp.is_empty() || !level.is_empty() || (current.is_none() && !line.trim().is_empty());

        if current.is_none() {
            current = Some(CurrentBlock {
                start_line: line_no,
                end_line: line_no,
                start_byte: line_start_byte,
                end_byte: bytes_read,
                timestamp,
                level,
                has_exception: !extract_exception_type(&line).is_empty(),
                lines: vec![line],
            });
        } else if let Some(active) = current.as_mut() {
            let attach_to_current = is_stack_trace_line(&line)
                || is_caused_by_line(&line)
                || (timestamp.is_empty() && level.is_empty() && active.has_exception);

            if starts_new_block && !attach_to_current {
                push_current_block(
                    &mut blocks,
                    &mut current,
                    &session.file_name,
                    &mut exception_counts,
                    &mut signature_counts,
                );
                current = Some(CurrentBlock {
                    start_line: line_no,
                    end_line: line_no,
                    start_byte: line_start_byte,
                    end_byte: bytes_read,
                    timestamp,
                    level,
                    has_exception: !extract_exception_type(&line).is_empty(),
                    lines: vec![line],
                });
            } else {
                active.lines.push(line);
                active.end_line = line_no;
                active.end_byte = bytes_read;
                active.has_exception = active.has_exception || !extract_exception_type(active.lines.last().unwrap_or(&String::new())).is_empty();
            }
        }

        if bytes_read >= next_progress {
            let progress = LogAnalysisProgress {
                session_id: session_id.to_string(),
                bytes_read,
                total_bytes: session.file_size,
                lines_read: line_no,
                blocks_indexed: blocks.len(),
                phase: "indexing".to_string(),
                completed: false,
                error: None,
            };
            if let Ok(mut state) = session.state.write() {
                state.progress = progress.clone();
            }
            let _ = app.emit(&format!("log-analysis-progress-{}", session_id), progress);
            next_progress = bytes_read.saturating_add(PROGRESS_EMIT_INTERVAL_BYTES);
        }
    }

    push_current_block(
        &mut blocks,
        &mut current,
        &session.file_name,
        &mut exception_counts,
        &mut signature_counts,
    );

    for block in &mut blocks {
        block.summary.root_cause_score = score_root_cause_candidate(
            &block.summary,
            block.caused_by_count,
            *signature_counts.get(&block.summary.signature).unwrap_or(&0),
        );
    }

    let mut root_cause_candidates: Vec<LogBlockSummary> = blocks
        .iter()
        .map(|block| block.summary.clone())
        .filter(|block| !block.root_cause_line.is_empty() || !block.exception_type.is_empty())
        .collect();
    root_cause_candidates.sort_by(|a, b| {
        b.root_cause_score
            .cmp(&a.root_cause_score)
            .then_with(|| b.start_line.cmp(&a.start_line))
    });
    root_cause_candidates.truncate(ROOT_CAUSE_LIMIT);

    let relevant_stack_frames = extract_relevant_stack_frames(&root_cause_candidates, &blocks, 30);
    let referenced_classes = unique_referenced_classes(&blocks);
    let total_lines = line_no;
    let total_blocks = blocks.len();
    let errors = blocks
        .iter()
        .filter(|block| block.summary.level == "ERROR" || block.summary.has_exception)
        .count();
    let warnings = blocks
        .iter()
        .filter(|block| block.summary.level == "WARN")
        .count();
    let stack_traces = blocks
        .iter()
        .filter(|block| block.summary.has_stack_trace)
        .count();
    let elapsed_ms = start.elapsed().as_millis() as u64;

    let summary = LogAnalysisSummary {
        file_name: session.file_name.clone(),
        file_size: session.file_size,
        total_lines,
        total_blocks,
        errors,
        warnings,
        stack_traces,
        top_exceptions: top_exceptions(&exception_counts),
        frequent_blocks: top_signatures(&signature_counts),
        root_cause_candidates,
        referenced_classes,
        relevant_stack_frames,
        meta: LogAnalysisMeta {
            is_large_file: total_lines > LARGE_LOG_LINE_THRESHOLD,
            total_block_count: total_blocks,
            ai_block_limit: AI_BLOCK_LIMIT,
            indexed_elapsed_ms: elapsed_ms,
        },
    };

    let progress = LogAnalysisProgress {
        session_id: session_id.to_string(),
        bytes_read: session.file_size,
        total_bytes: session.file_size,
        lines_read: total_lines,
        blocks_indexed: total_blocks,
        phase: "ready".to_string(),
        completed: true,
        error: None,
    };

    if let Ok(mut state) = session.state.write() {
        state.progress = progress.clone();
    }
    let _ = app.emit(&format!("log-analysis-progress-{}", session_id), progress.clone());

    Ok((summary, blocks, progress))
}

fn push_current_block(
    blocks: &mut Vec<IndexedLogBlock>,
    current: &mut Option<CurrentBlock>,
    file_name: &str,
    exception_counts: &mut HashMap<String, usize>,
    signature_counts: &mut HashMap<String, usize>,
) {
    let Some(block) = current.take() else {
        return;
    };

    let raw_text = block.lines.join("\n");
    let first_line = block.lines.first().cloned().unwrap_or_default();
    let last_caused_by = block
        .lines
        .iter()
        .rev()
        .find(|line| is_caused_by_line(line))
        .cloned()
        .unwrap_or_default();
    let exception_line = block
        .lines
        .iter()
        .find(|line| !extract_exception_type(line).is_empty())
        .cloned()
        .unwrap_or_default();
    let root_cause_line = if !last_caused_by.is_empty() {
        last_caused_by.clone()
    } else {
        exception_line.clone()
    };
    let exception_type = extract_exception_type(if !last_caused_by.is_empty() {
        &last_caused_by
    } else {
        &first_line
    });
    let headline = extract_headline(if !root_cause_line.is_empty() {
        &root_cause_line
    } else {
        &first_line
    });
    let derived_level = detect_level(&raw_text);
    let level = if !block.level.is_empty() {
        block.level.clone()
    } else if !derived_level.is_empty() {
        derived_level
    } else if !exception_type.is_empty() {
        "ERROR".to_string()
    } else {
        String::new()
    };
    let stack_frames = extract_stack_frames(&raw_text);
    let referenced_classes = extract_referenced_classes(&stack_frames);
    let signature_seed = if !headline.is_empty() {
        headline.clone()
    } else {
        truncate_chars(&raw_text, 240)
    };
    let signature = signature_of(&signature_seed);
    let preview_text = truncate_chars(&raw_text, PREVIEW_TEXT_LIMIT);
    let caused_by_count = count_caused_by_lines(&block.lines);
    let search_blob = truncate_chars(&raw_text.to_lowercase(), SEARCH_TEXT_LIMIT);

    if !exception_type.is_empty() {
        *exception_counts.entry(exception_type.clone()).or_insert(0) += 1;
    }
    *signature_counts.entry(signature.clone()).or_insert(0) += 1;

    blocks.push(IndexedLogBlock {
        summary: LogBlockSummary {
            id: format!("{}-{}", file_name, blocks.len() + 1),
            start_line: block.start_line,
            end_line: block.end_line,
            start_byte: block.start_byte,
            end_byte: block.end_byte,
            level,
            timestamp: block.timestamp,
            headline,
            exception_type: exception_type.clone(),
            message: extract_message(if !root_cause_line.is_empty() {
                &root_cause_line
            } else {
                &first_line
            }),
            has_exception: !exception_type.is_empty(),
            has_stack_trace: !stack_frames.is_empty(),
            root_cause_line,
            stack_frame_count: stack_frames.len(),
            signature,
            preview_text,
            stack_frames,
            referenced_classes,
            root_cause_score: 0,
        },
        search_blob,
        caused_by_count,
    });
}

fn block_matches(block: &LogBlockSummary, search_blob: &str, mode: &str, keyword: &str) -> bool {
    let matches_keyword = keyword.is_empty() || search_blob.contains(keyword);
    if !matches_keyword {
        return false;
    }

    match mode {
        "all" => true,
        "error" => block.level == "ERROR" || block.has_exception,
        "warn" => block.level == "WARN",
        "exception" => block.has_exception,
        "stacktrace" => block.has_stack_trace,
        _ => block.level == "ERROR" || block.level == "WARN" || block.has_exception || block.has_stack_trace,
    }
}

fn read_block_text(path: &str, start_byte: u64, end_byte: u64) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| format!("无法打开日志文件: {}", e))?;
    file.seek(SeekFrom::Start(start_byte))
        .map_err(|e| format!("无法定位日志块: {}", e))?;

    let length = end_byte.saturating_sub(start_byte) as usize;
    let mut buffer = vec![0u8; length];
    file.read_exact(&mut buffer)
        .map_err(|e| format!("无法读取日志块: {}", e))?;

    // Fix 5: 复用编码检测
    let encoding = detect_file_encoding(path).unwrap_or_else(|_| "utf-8".to_string());
    let text = if encoding != "utf-8" {
        let enc = encoding_rs::Encoding::for_label(encoding.as_bytes())
            .unwrap_or(encoding_rs::UTF_8);
        let (cow, _, _) = enc.decode(&buffer);
        cow.into_owned()
    } else {
        String::from_utf8_lossy(&buffer).into_owned()
    };

    Ok(text
        .replace("\r\n", "\n")
        .trim_end_matches('\n')
        .to_string())
}

fn normalize_line(bytes: &[u8], use_encoding_rs: bool, encoding_name: &str) -> String {
    let text = if use_encoding_rs {
        let enc = encoding_rs::Encoding::for_label(encoding_name.as_bytes())
            .unwrap_or(encoding_rs::UTF_8);
        let (cow, _, _) = enc.decode(bytes);
        cow.into_owned()
    } else {
        String::from_utf8_lossy(bytes).into_owned()
    };
    text.replace("\r\n", "\n")
        .trim_end_matches('\n')
        .trim_end_matches('\r')
        .to_string()
}

/// Fix 5: 检测文件编码 — BOM 优先，否则尝试 UTF-8 校验，失败回退 GBK
fn detect_file_encoding(path: &str) -> Result<String, String> {
    let mut file = File::open(path).map_err(|e| format!("无法打开文件: {}", e))?;
    let mut header = vec![0u8; 8192.min(
        fs::metadata(path).map(|m| m.len() as usize).unwrap_or(8192),
    )];
    let n = file.read(&mut header).map_err(|e| format!("读取文件头失败: {}", e))?;
    let header = &header[..n];

    // BOM 检测
    if header.starts_with(&[0xEF, 0xBB, 0xBF]) {
        return Ok("utf-8".to_string());
    }
    if header.starts_with(&[0xFF, 0xFE]) {
        return Ok("utf-16le".to_string());
    }
    if header.starts_with(&[0xFE, 0xFF]) {
        return Ok("utf-16be".to_string());
    }

    // 尝试 UTF-8 校验
    match std::str::from_utf8(header) {
        Ok(_) => Ok("utf-8".to_string()),
        Err(_) => {
            // 回退到 GBK（中文 Windows 最常见的非 UTF-8 编码）
            Ok("gbk".to_string())
        }
    }
}

fn level_error_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\bERROR\b").unwrap())
}

fn level_warn_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\bWARN(?:ING)?\b").unwrap())
}

fn level_info_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\bINFO\b").unwrap())
}

fn level_debug_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\bDEBUG\b").unwrap())
}

fn level_trace_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\bTRACE\b").unwrap())
}

fn timestamp_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d{3})?)").unwrap()
    })
}

fn stack_trace_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^\s+at\s+[^()]+\([^()]+\)$").unwrap())
}

fn stack_more_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^\s*\.\.\.\s+\d+\s+more$").unwrap())
}

fn caused_by_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^\s*Caused by:").unwrap())
}

fn caused_by_exception_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"Caused by:\s+([\w.$]+(?:Exception|Error))").unwrap())
}

fn direct_exception_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"([\w.$]+(?:Exception|Error))(?:\:|$|\s)").unwrap())
}

fn caused_by_message_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"Caused by:\s+[\w.$]+(?:Exception|Error)\s*:\s*(.+)$").unwrap()
    })
}

fn direct_message_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"[\w.$]+(?:Exception|Error)\s*:\s*(.+)$").unwrap())
}

fn stack_frame_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"\bat\s+([\w.$]+)\.([\w$<>]+)\(([^:()]+)(?::(\d+))?\)").unwrap()
    })
}

fn digits_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\b\d+\b").unwrap())
}

fn hex_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"0x[0-9a-fA-F]+").unwrap())
}

/// Fix 6: 直接在原始字符串上匹配（case-insensitive regex），不再分配 to_uppercase
fn detect_level(line: &str) -> String {
    if level_error_regex().is_match(line) {
        "ERROR".to_string()
    } else if level_warn_regex().is_match(line) {
        "WARN".to_string()
    } else if level_info_regex().is_match(line) {
        "INFO".to_string()
    } else if level_debug_regex().is_match(line) {
        "DEBUG".to_string()
    } else if level_trace_regex().is_match(line) {
        "TRACE".to_string()
    } else {
        String::new()
    }
}

/// Fix 7: 仅在行首前 N 个字符内检测级别，避免消息体中的关键词误判为新 block
fn detect_level_prefix(line: &str) -> String {
    let prefix: String = line.chars().take(LEVEL_DETECT_PREFIX_LIMIT).collect();
    detect_level(&prefix)
}

fn extract_timestamp(line: &str) -> String {
    timestamp_regex()
        .captures(line)
        .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()))
        .unwrap_or_default()
}

fn is_stack_trace_line(line: &str) -> bool {
    stack_trace_regex().is_match(line) || stack_more_regex().is_match(line)
}

fn is_caused_by_line(line: &str) -> bool {
    caused_by_regex().is_match(line)
}

fn extract_exception_type(line: &str) -> String {
    if let Some(captures) = caused_by_exception_regex().captures(line) {
        return captures
            .get(1)
            .map(|m| m.as_str().to_string())
            .unwrap_or_default();
    }

    direct_exception_regex()
        .captures(line)
        .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()))
        .unwrap_or_default()
}

fn extract_headline(line: &str) -> String {
    truncate_chars(line.trim(), 300)
}

fn extract_message(line: &str) -> String {
    if let Some(captures) = caused_by_message_regex().captures(line) {
        return captures
            .get(1)
            .map(|m| m.as_str().trim().to_string())
            .unwrap_or_default();
    }

    direct_message_regex()
        .captures(line)
        .and_then(|cap| cap.get(1).map(|m| m.as_str().trim().to_string()))
        .unwrap_or_default()
}

fn signature_of(text: &str) -> String {
    let digits = digits_regex().replace_all(text, "#");
    hex_regex().replace_all(&digits, "0x#").trim().to_string()
}

fn extract_stack_frames(text: &str) -> Vec<StackFrame> {
    stack_frame_regex()
        .captures_iter(text)
        .map(|capture| StackFrame {
            full_class_name: capture
                .get(1)
                .map(|m| m.as_str().to_string())
                .unwrap_or_default(),
            method_name: capture
                .get(2)
                .map(|m| m.as_str().to_string())
                .unwrap_or_default(),
            file_name: capture
                .get(3)
                .map(|m| m.as_str().to_string())
                .unwrap_or_default(),
            line_number: capture.get(4).and_then(|m| m.as_str().parse::<usize>().ok()),
        })
        .collect()
}

fn extract_referenced_classes(stack_frames: &[StackFrame]) -> Vec<String> {
    let mut classes = HashSet::new();
    for frame in stack_frames {
        if !frame.full_class_name.is_empty() {
            classes.insert(frame.full_class_name.clone());
            if let Some(simple) = frame.full_class_name.rsplit('.').next() {
                if !simple.is_empty() {
                    classes.insert(simple.to_string());
                }
            }
        }
        if frame.file_name.ends_with(".java") {
            classes.insert(frame.file_name.trim_end_matches(".java").to_string());
        }
    }
    let mut result: Vec<String> = classes.into_iter().collect();
    result.sort();
    result
}

fn count_caused_by_lines(lines: &[String]) -> usize {
    lines.iter().filter(|line| is_caused_by_line(line)).count()
}

fn score_stack_frame(frame: &StackFrame) -> i32 {
    let mut score = 0;
    if frame.line_number.is_some() {
        score += 5;
    }
    if frame.file_name.ends_with(".java") {
        score += 3;
    }
    let class_name = frame.full_class_name.as_str();
    if !class_name.is_empty()
        && !class_name.starts_with("java.")
        && !class_name.starts_with("javax.")
        && !class_name.starts_with("sun.")
        && !class_name.starts_with("com.sun.")
        && !class_name.starts_with("org.springframework")
        && !class_name.starts_with("org.apache")
        && !class_name.starts_with("io.netty")
        && !class_name.starts_with("reactor")
    {
        score += 4;
    }
    if class_name.contains('.') {
        score += 1;
    }
    score
}

fn score_root_cause_candidate(
    block: &LogBlockSummary,
    caused_by_count: usize,
    signature_count: usize,
) -> i32 {
    let mut score = 0;
    score += caused_by_count as i32 * 5;
    if !block.root_cause_line.is_empty() {
        score += 4;
    }
    if !block.exception_type.is_empty() {
        score += 3;
    }
    if block.level == "ERROR" {
        score += 3;
    }
    if block.has_stack_trace {
        score += 2;
    }
    let frame_score = block
        .stack_frames
        .iter()
        .map(score_stack_frame)
        .max()
        .unwrap_or(0);
    score += frame_score;
    score += signature_count.min(3) as i32;
    score
}

fn unique_referenced_classes(blocks: &[IndexedLogBlock]) -> Vec<String> {
    let mut classes = HashSet::new();
    for block in blocks {
        for class_name in &block.summary.referenced_classes {
            classes.insert(class_name.clone());
        }
    }
    let mut result: Vec<String> = classes.into_iter().collect();
    result.sort();
    result
}

fn frame_key(frame: &StackFrame) -> String {
    format!(
        "{}:{}:{}:{}",
        frame.full_class_name,
        frame.method_name,
        frame.file_name,
        frame.line_number
            .map(|line| line.to_string())
            .unwrap_or_default()
    )
}

fn extract_relevant_stack_frames(
    root_cause_candidates: &[LogBlockSummary],
    blocks: &[IndexedLogBlock],
    limit: usize,
) -> Vec<StackFrame> {
    let mut seen = HashSet::new();
    let mut prioritized = Vec::<StackFrame>::new();

    for frame in root_cause_candidates.iter().flat_map(|block| block.stack_frames.iter()) {
        let key = frame_key(frame);
        if seen.insert(key) {
            prioritized.push(frame.clone());
        }
    }

    prioritized.sort_by(|a, b| score_stack_frame(b).cmp(&score_stack_frame(a)));
    if prioritized.len() >= limit {
        prioritized.truncate(limit);
        return prioritized;
    }

    for frame in blocks.iter().flat_map(|block| block.summary.stack_frames.iter()) {
        let key = frame_key(frame);
        if seen.insert(key) {
            prioritized.push(frame.clone());
            if prioritized.len() >= limit {
                break;
            }
        }
    }

    prioritized
}

fn top_exceptions(counts: &HashMap<String, usize>) -> Vec<CountItem> {
    let mut entries: Vec<CountItem> = counts
        .iter()
        .map(|(name, count)| CountItem {
            name: name.clone(),
            count: *count,
        })
        .collect();
    entries.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.name.cmp(&b.name)));
    entries.truncate(TOP_COUNT_LIMIT);
    entries
}

fn top_signatures(counts: &HashMap<String, usize>) -> Vec<SignatureCountItem> {
    let mut entries: Vec<SignatureCountItem> = counts
        .iter()
        .map(|(signature, count)| SignatureCountItem {
            signature: signature.clone(),
            count: *count,
        })
        .collect();
    entries.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.signature.cmp(&b.signature)));
    entries.truncate(TOP_COUNT_LIMIT);
    entries
}

fn truncate_chars(text: &str, limit: usize) -> String {
    text.chars().take(limit).collect()
}
