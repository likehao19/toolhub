use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use russh::*;
use russh_keys::key;
use async_trait::async_trait;
use base64::Engine;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use aes_gcm::aead::Aead;
use sha1::Digest;

const B64: base64::engine::GeneralPurpose = base64::engine::general_purpose::STANDARD;

// ──────────────────── State ────────────────────

/// SSH 全局状态
pub struct SshState {
    sessions: Arc<Mutex<HashMap<String, SshSessionData>>>,
    sftp_cache: Arc<Mutex<HashMap<String, russh_sftp::client::SftpSession>>>,
    host_key_verifiers: Arc<Mutex<HashMap<String, HostKeyVerifier>>>,
}

impl SshState {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            sftp_cache: Arc::new(Mutex::new(HashMap::new())),
            host_key_verifiers: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

struct SshSessionData {
    handle: Arc<Mutex<client::Handle<SshHandler>>>,
    channel: Arc<Mutex<Channel<client::Msg>>>,
}

struct HostKeyVerifier {
    response: Arc<std::sync::Mutex<Option<bool>>>,
    notify: Arc<tokio::sync::Notify>,
}

// ──────────────────── Handler ────────────────────

struct SshHandler {
    app_handle: AppHandle,
    session_id: String,
    host_port: String,
    terminal_channel_id: Arc<std::sync::Mutex<Option<ChannelId>>>,
    // host key verification
    hk_response: Arc<std::sync::Mutex<Option<bool>>>,
    hk_notify: Arc<tokio::sync::Notify>,
}

/// 计算公钥指纹 (SHA1:xx:xx:...)
fn compute_fingerprint(key: &key::PublicKey) -> String {
    let repr = format!("{:?}", key);
    let hash = sha1::Sha1::digest(repr.as_bytes());
    hash.iter().map(|b| format!("{:02x}", b)).collect::<Vec<_>>().join(":")
}

/// 加载 known_hosts
fn load_known_hosts(app: &AppHandle) -> HashMap<String, String> {
    let Ok(dir) = app.path().app_data_dir() else { return HashMap::new() };
    let path = dir.join("ssh_known_hosts.json");
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_known_hosts(app: &AppHandle, hosts: &HashMap<String, String>) {
    if let Ok(dir) = app.path().app_data_dir() {
        let _ = std::fs::create_dir_all(&dir);
        let _ = std::fs::write(dir.join("ssh_known_hosts.json"), serde_json::to_string_pretty(hosts).unwrap_or_default());
    }
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct HostKeyEvent {
    fingerprint: String,
    host_port: String,
    is_new: bool,
    old_fingerprint: Option<String>,
}

#[async_trait]
impl client::Handler for SshHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        server_public_key: &key::PublicKey,
    ) -> Result<bool, Self::Error> {
        let fp = compute_fingerprint(server_public_key);
        let known = load_known_hosts(&self.app_handle);
        let stored = known.get(&self.host_port);

        match stored {
            Some(known_fp) if known_fp == &fp => return Ok(true),
            _ => {}
        }

        // 需要用户确认：新主机 或 指纹变更
        let event_data = HostKeyEvent {
            fingerprint: fp.clone(),
            host_port: self.host_port.clone(),
            is_new: stored.is_none(),
            old_fingerprint: stored.cloned(),
        };
        let event = format!("ssh-hostkey-verify-{}", self.session_id);
        let _ = self.app_handle.emit(&event, &event_data);

        // 等待用户响应（最多 60 秒）
        match tokio::time::timeout(
            std::time::Duration::from_secs(60),
            self.hk_notify.notified(),
        ).await {
            Ok(()) => {
                let accepted = self.hk_response.lock().unwrap().take().unwrap_or(false);
                Ok(accepted)
            }
            Err(_) => Ok(false),
        }
    }

    async fn data(
        &mut self,
        channel: ChannelId,
        data: &[u8],
        _session: &mut client::Session,
    ) -> Result<(), Self::Error> {
        let is_terminal = {
            let guard = self.terminal_channel_id.lock().unwrap();
            *guard == Some(channel)
        };
        if !is_terminal { return Ok(()); }
        let encoded = B64.encode(data);
        let event = format!("ssh-data-{}", self.session_id);
        let _ = self.app_handle.emit(&event, &encoded);
        Ok(())
    }

    async fn extended_data(
        &mut self,
        channel: ChannelId,
        _ext: u32,
        data: &[u8],
        _session: &mut client::Session,
    ) -> Result<(), Self::Error> {
        let is_terminal = {
            let guard = self.terminal_channel_id.lock().unwrap();
            *guard == Some(channel)
        };
        if !is_terminal { return Ok(()); }
        let encoded = B64.encode(data);
        let event = format!("ssh-data-{}", self.session_id);
        let _ = self.app_handle.emit(&event, &encoded);
        Ok(())
    }

    async fn channel_eof(
        &mut self, channel: ChannelId, _session: &mut client::Session,
    ) -> Result<(), Self::Error> {
        let is_terminal = { *self.terminal_channel_id.lock().unwrap() == Some(channel) };
        if is_terminal {
            let _ = self.app_handle.emit(&format!("ssh-closed-{}", self.session_id), "eof");
        }
        Ok(())
    }

    async fn channel_close(
        &mut self, channel: ChannelId, _session: &mut client::Session,
    ) -> Result<(), Self::Error> {
        let is_terminal = { *self.terminal_channel_id.lock().unwrap() == Some(channel) };
        if is_terminal {
            let _ = self.app_handle.emit(&format!("ssh-closed-{}", self.session_id), "closed");
        }
        Ok(())
    }
}

// ──────────────────── Types ────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SshConnectResult { pub success: bool, pub message: String }

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SftpEntry {
    pub name: String, pub path: String, pub is_dir: bool,
    pub size: u64, pub modified: Option<u64>, pub permissions: Option<String>,
}

// ──────────────────── 凭据加密 ────────────────────

fn get_or_create_key(app: &AppHandle) -> Result<[u8; 32], String> {
    let dir = app.path().app_data_dir().map_err(|e| format!("获取数据目录失败: {}", e))?;
    let key_path = dir.join("ssh_enc.key");
    if key_path.exists() {
        let data = std::fs::read(&key_path).map_err(|e| format!("读取密钥失败: {}", e))?;
        if data.len() == 32 {
            let mut key = [0u8; 32];
            key.copy_from_slice(&data);
            return Ok(key);
        }
    }
    let mut key = [0u8; 32];
    rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut key);
    let _ = std::fs::create_dir_all(&dir);
    std::fs::write(&key_path, &key).map_err(|e| format!("保存密钥失败: {}", e))?;
    Ok(key)
}

#[tauri::command]
pub async fn encrypt_credential(app_handle: AppHandle, plaintext: String) -> Result<String, String> {
    if plaintext.is_empty() { return Ok(String::new()) }
    let key = get_or_create_key(&app_handle)?;
    let cipher = Aes256Gcm::new_from_slice(&key).unwrap();
    let mut nonce_bytes = [0u8; 12];
    rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ct = cipher.encrypt(nonce, plaintext.as_bytes()).map_err(|e| format!("加密失败: {}", e))?;
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ct);
    Ok(B64.encode(&combined))
}

#[tauri::command]
pub async fn decrypt_credential(app_handle: AppHandle, ciphertext: String) -> Result<String, String> {
    if ciphertext.is_empty() { return Ok(String::new()) }
    let key = get_or_create_key(&app_handle)?;
    let combined = B64.decode(&ciphertext).map_err(|_| "base64 解码失败".to_string())?;
    if combined.len() < 13 { return Err("密文格式错误".into()) }
    let (nonce_bytes, ct) = combined.split_at(12);
    let cipher = Aes256Gcm::new_from_slice(&key).unwrap();
    let nonce = Nonce::from_slice(nonce_bytes);
    let pt = cipher.decrypt(nonce, ct).map_err(|_| "解密失败（密钥可能已变更）".to_string())?;
    String::from_utf8(pt).map_err(|_| "UTF-8 解码失败".into())
}

// ──────────────────── SSH 连接 ────────────────────

#[tauri::command]
pub async fn ssh_connect(
    app_handle: AppHandle,
    state: State<'_, SshState>,
    id: String,
    host: String,
    port: u16,
    username: String,
    auth_type: String,
    password: Option<String>,
    key_path: Option<String>,
    passphrase: Option<String>,
    cols: Option<u32>,
    rows: Option<u32>,
) -> Result<SshConnectResult, String> {
    let terminal_channel_id = Arc::new(std::sync::Mutex::new(None));
    let hk_response = Arc::new(std::sync::Mutex::new(None));
    let hk_notify = Arc::new(tokio::sync::Notify::new());

    // 注册 host key verifier 以便前端响应
    let verifier = HostKeyVerifier {
        response: hk_response.clone(),
        notify: hk_notify.clone(),
    };
    state.host_key_verifiers.lock().await.insert(id.clone(), verifier);

    let host_port = format!("{}:{}", host, port);
    let config = client::Config::default();
    let handler = SshHandler {
        app_handle: app_handle.clone(),
        session_id: id.clone(),
        host_port,
        terminal_channel_id: terminal_channel_id.clone(),
        hk_response,
        hk_notify,
    };

    let addr = format!("{}:{}", host, port);
    let mut handle = client::connect(Arc::new(config), &addr, handler)
        .await
        .map_err(|e| {
            // 清理 verifier
            let verifiers = state.host_key_verifiers.clone();
            let id_c = id.clone();
            tokio::spawn(async move { verifiers.lock().await.remove(&id_c); });
            format!("连接失败: {}", e)
        })?;

    // 清理 verifier
    state.host_key_verifiers.lock().await.remove(&id);

    // 认证
    let auth_ok = match auth_type.as_str() {
        "key" => {
            let key_file = key_path.ok_or("未指定密钥文件路径")?;
            let key_pair = if let Some(ref pass) = passphrase {
                russh_keys::load_secret_key(&key_file, Some(pass))
                    .map_err(|e| format!("加载密钥失败: {}", e))?
            } else {
                russh_keys::load_secret_key(&key_file, None)
                    .map_err(|e| format!("加载密钥失败: {}", e))?
            };
            handle.authenticate_publickey(&username, Arc::new(key_pair))
                .await.map_err(|e| format!("密钥认证失败: {}", e))?
        }
        _ => {
            let pwd = password.unwrap_or_default();
            handle.authenticate_password(&username, &pwd)
                .await.map_err(|e| format!("密码认证失败: {}", e))?
        }
    };

    if !auth_ok {
        return Ok(SshConnectResult { success: false, message: "认证失败：用户名或密码/密钥错误".into() });
    }

    let channel = handle.channel_open_session()
        .await.map_err(|e| format!("打开通道失败: {}", e))?;
    *terminal_channel_id.lock().unwrap() = Some(channel.id());

    let c = cols.unwrap_or(120);
    let r = rows.unwrap_or(36);
    channel.request_pty(false, "xterm-256color", c, r, 0, 0, &[])
        .await.map_err(|e| format!("请求 PTY 失败: {}", e))?;
    channel.request_shell(false)
        .await.map_err(|e| format!("请求 Shell 失败: {}", e))?;

    state.sessions.lock().await.insert(id.clone(), SshSessionData {
        handle: Arc::new(Mutex::new(handle)),
        channel: Arc::new(Mutex::new(channel)),
    });

    Ok(SshConnectResult { success: true, message: format!("已连接到 {}@{}:{}", username, host, port) })
}

/// 用户响应主机密钥确认
#[tauri::command]
pub async fn ssh_host_key_response(
    app_handle: AppHandle,
    state: State<'_, SshState>,
    id: String,
    accepted: bool,
    fingerprint: String,
    host_port: String,
) -> Result<(), String> {
    if accepted {
        let mut hosts = load_known_hosts(&app_handle);
        hosts.insert(host_port, fingerprint);
        save_known_hosts(&app_handle, &hosts);
    }
    if let Some(v) = state.host_key_verifiers.lock().await.get(&id) {
        *v.response.lock().unwrap() = Some(accepted);
        v.notify.notify_one();
    }
    Ok(())
}

#[tauri::command]
pub async fn ssh_write(state: State<'_, SshState>, id: String, data: String) -> Result<(), String> {
    let ch = { state.sessions.lock().await.get(&id).ok_or("会话不存在")?.channel.clone() };
    let result = ch.lock().await.data(data.as_bytes()).await.map_err(|_| "写入失败".to_string());
    result
}

#[tauri::command]
pub async fn ssh_resize(state: State<'_, SshState>, id: String, cols: u32, rows: u32) -> Result<(), String> {
    let ch = { state.sessions.lock().await.get(&id).ok_or("会话不存在")?.channel.clone() };
    let result = ch.lock().await.window_change(cols, rows, 0, 0).await.map_err(|e| format!("调整大小失败: {}", e));
    result
}

#[tauri::command]
pub async fn ssh_disconnect(state: State<'_, SshState>, id: String) -> Result<String, String> {
    state.sftp_cache.lock().await.remove(&id);
    let mut sessions = state.sessions.lock().await;
    if let Some(s) = sessions.remove(&id) {
        let _ = s.handle.lock().await.disconnect(Disconnect::ByApplication, "user disconnect", "").await;
        Ok("已断开连接".into())
    } else {
        Ok("会话不存在".into())
    }
}

#[tauri::command]
pub async fn ssh_list_sessions(state: State<'_, SshState>) -> Result<Vec<String>, String> {
    Ok(state.sessions.lock().await.keys().cloned().collect())
}

// ──────────────────── SFTP ────────────────────

async fn open_sftp(handle: &client::Handle<SshHandler>) -> Result<russh_sftp::client::SftpSession, String> {
    let channel = handle.channel_open_session().await.map_err(|e| format!("打开 SFTP 通道失败: {}", e))?;
    channel.request_subsystem(true, "sftp").await.map_err(|e| format!("请求 SFTP 子系统失败: {}", e))?;
    russh_sftp::client::SftpSession::new(channel.into_stream()).await.map_err(|e| format!("初始化 SFTP 失败: {}", e))
}

/// 从缓存取 SFTP session，无则新建
async fn get_sftp(state: &SshState, id: &str) -> Result<russh_sftp::client::SftpSession, String> {
    if let Some(sftp) = state.sftp_cache.lock().await.remove(id) {
        return Ok(sftp);
    }
    let handle_arc = { state.sessions.lock().await.get(id).ok_or("会话不存在")?.handle.clone() };
    let guard = handle_arc.lock().await;
    let result = open_sftp(&*guard).await;
    result
}

#[tauri::command]
pub async fn sftp_list(state: State<'_, SshState>, id: String, path: String) -> Result<Vec<SftpEntry>, String> {
    let sftp = get_sftp(&state, &id).await?;
    match sftp.read_dir(&path).await {
        Ok(entries) => {
            let mut result: Vec<SftpEntry> = Vec::new();
            for entry in entries {
                let name = entry.file_name();
                if name == "." || name == ".." { continue; }
                let full_path = if path.ends_with('/') { format!("{}{}", path, name) } else { format!("{}/{}", path, name) };
                let meta = entry.metadata();
                let is_dir = entry.file_type().is_dir();
                let size = meta.len();
                let modified = meta.modified().ok().map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs());
                let permissions = meta.permissions.map(|p| format!("{:o}", p));
                result.push(SftpEntry { name, path: full_path, is_dir, size, modified, permissions });
            }
            result.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
            state.sftp_cache.lock().await.insert(id, sftp);
            Ok(result)
        }
        Err(e) => Err(format!("读取目录失败: {}", e)),
    }
}

#[tauri::command]
pub async fn sftp_download(state: State<'_, SshState>, id: String, remote_path: String, local_path: String) -> Result<String, String> {
    let sftp = get_sftp(&state, &id).await?;
    match sftp.read(&remote_path).await {
        Ok(data) => {
            std::fs::write(&local_path, &data).map_err(|e| format!("写入本地文件失败: {}", e))?;
            state.sftp_cache.lock().await.insert(id, sftp);
            Ok(format!("下载完成: {}", remote_path))
        }
        Err(e) => Err(format!("读取远程文件失败: {}", e)),
    }
}

#[tauri::command]
pub async fn sftp_upload(state: State<'_, SshState>, id: String, local_path: String, remote_path: String) -> Result<String, String> {
    let sftp = get_sftp(&state, &id).await?;
    let data = std::fs::read(&local_path).map_err(|e| format!("读取本地文件失败: {}", e))?;
    match sftp.write(&remote_path, &data).await {
        Ok(_) => {
            state.sftp_cache.lock().await.insert(id, sftp);
            Ok(format!("上传完成: {}", remote_path))
        }
        Err(e) => Err(format!("上传文件失败: {}", e)),
    }
}

#[tauri::command]
pub async fn sftp_mkdir(state: State<'_, SshState>, id: String, path: String) -> Result<String, String> {
    let sftp = get_sftp(&state, &id).await?;
    match sftp.create_dir(&path).await {
        Ok(_) => { state.sftp_cache.lock().await.insert(id, sftp); Ok(format!("目录已创建: {}", path)) }
        Err(e) => Err(format!("创建目录失败: {}", e)),
    }
}

#[tauri::command]
pub async fn sftp_remove(state: State<'_, SshState>, id: String, path: String, is_dir: bool) -> Result<String, String> {
    let sftp = get_sftp(&state, &id).await?;
    let result = if is_dir { sftp.remove_dir(&path).await } else { sftp.remove_file(&path).await };
    match result {
        Ok(_) => { state.sftp_cache.lock().await.insert(id, sftp); Ok(format!("已删除: {}", path)) }
        Err(e) => Err(format!("删除失败: {}", e)),
    }
}

#[tauri::command]
pub async fn sftp_rename(state: State<'_, SshState>, id: String, old_path: String, new_path: String) -> Result<String, String> {
    let sftp = get_sftp(&state, &id).await?;
    match sftp.rename(&old_path, &new_path).await {
        Ok(_) => { state.sftp_cache.lock().await.insert(id, sftp); Ok(format!("重命名完成: {} → {}", old_path, new_path)) }
        Err(e) => Err(format!("重命名失败: {}", e)),
    }
}
