//! 软件自动更新
//!
//! 自定义实现，不使用 tauri-plugin-updater（避免签名基础设施改造）。
//! - check_for_updates: 拉 GitHub/Gitee releases/latest，匹配当前平台 asset
//! - download_update:   reqwest 流式下载到 app_cache_dir/updates/，emit 进度事件
//! - cancel_update_download: 取消正在进行的下载
//! - install_update:    spawn 安装器（Windows .exe / macOS open .dmg），随后 app.exit(0)

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use regex::Regex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::AsyncWriteExt;

static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);

const GH_API: &str = "https://api.github.com/repos/likehao19/toolhub/releases/latest";
const GITEE_API: &str = "https://gitee.com/api/v5/repos/likehao19/toolhub/releases/latest";
const USER_AGENT: &str = "ToolHub-Updater";
const TIMEOUT_SECS: u64 = 8;

#[derive(Serialize, Clone)]
pub struct UpdateAsset {
    pub name: String,
    pub browser_download_url: String,
    pub size: u64,
}

#[derive(Serialize, Clone)]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: String,
    pub release_notes: String,
    pub release_url: String,
    pub published_at: String,
    pub asset: Option<UpdateAsset>,
    pub source: String,
}

#[derive(Serialize, Clone)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percent: f64,
    pub speed_bps: u64,
}

#[derive(Deserialize)]
struct GhAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

#[derive(Deserialize)]
struct GhRelease {
    tag_name: String,
    #[serde(default)]
    body: String,
    html_url: String,
    #[serde(default)]
    published_at: String,
    #[serde(default)]
    assets: Vec<GhAsset>,
}

#[derive(Deserialize)]
struct GiteeAsset {
    name: String,
    browser_download_url: String,
    #[serde(default)]
    size: u64,
}

#[derive(Deserialize)]
struct GiteeRelease {
    tag_name: String,
    #[serde(default)]
    body: String,
    #[serde(default)]
    created_at: String,
    #[serde(default)]
    assets: Vec<GiteeAsset>,
}

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(Duration::from_secs(TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

fn long_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

/// 解析 "v1.0.8" / "1.0.8" → (1, 0, 8)；非 semver 返回全 0。
fn parse_version(s: &str) -> (u32, u32, u32) {
    let s = s.trim().trim_start_matches('v').trim_start_matches('V');
    // 截掉 "1.0.8-beta.1" 之类的预发布后缀
    let core = s.split('-').next().unwrap_or(s);
    let mut it = core.split('.').map(|p| p.parse::<u32>().unwrap_or(0));
    (
        it.next().unwrap_or(0),
        it.next().unwrap_or(0),
        it.next().unwrap_or(0),
    )
}

fn is_newer(latest: &str, current: &str) -> bool {
    parse_version(latest) > parse_version(current)
}

/// 当前平台的 asset 命名 regex。
fn platform_asset_regex() -> Result<Regex, String> {
    let pattern = if cfg!(target_os = "windows") {
        // ToolHub_1.0.8_x64-setup.exe (NSIS)
        r"_x64-setup\.exe$"
    } else if cfg!(target_os = "macos") {
        if cfg!(target_arch = "aarch64") {
            r"_aarch64\.dmg$"
        } else {
            r"_x64\.dmg$"
        }
    } else {
        return Err("unsupported platform".to_string());
    };
    Regex::new(pattern).map_err(|e| e.to_string())
}

fn pick_asset_gh(assets: &[GhAsset], re: &Regex) -> Option<UpdateAsset> {
    assets.iter().find(|a| re.is_match(&a.name)).map(|a| UpdateAsset {
        name: a.name.clone(),
        browser_download_url: a.browser_download_url.clone(),
        size: a.size,
    })
}

fn pick_asset_gitee(assets: &[GiteeAsset], re: &Regex) -> Option<UpdateAsset> {
    assets.iter().find(|a| re.is_match(&a.name)).map(|a| UpdateAsset {
        name: a.name.clone(),
        browser_download_url: a.browser_download_url.clone(),
        size: a.size,
    })
}

async fn fetch_github() -> Result<(String, String, String, String, Vec<GhAsset>), String> {
    let client = http_client()?;
    let resp = client
        .get(GH_API)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("GitHub request failed: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("GitHub status {}", resp.status()));
    }
    let body = resp.text().await.map_err(|e| e.to_string())?;
    let r: GhRelease = serde_json::from_str(&body).map_err(|e| format!("GitHub JSON parse: {}", e))?;
    Ok((r.tag_name, r.body, r.html_url, r.published_at, r.assets))
}

async fn fetch_gitee() -> Result<(String, String, String, String, Vec<GiteeAsset>), String> {
    let client = http_client()?;
    let resp = client
        .get(GITEE_API)
        .send()
        .await
        .map_err(|e| format!("Gitee request failed: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("Gitee status {}", resp.status()));
    }
    let body = resp.text().await.map_err(|e| e.to_string())?;
    let r: GiteeRelease = serde_json::from_str(&body).map_err(|e| format!("Gitee JSON parse: {}", e))?;
    let url = format!(
        "https://gitee.com/likehao19/toolhub/releases/tag/{}",
        r.tag_name
    );
    Ok((r.tag_name, r.body, url, r.created_at, r.assets))
}

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<UpdateInfo, String> {
    let current_version = app.package_info().version.to_string();
    let re = platform_asset_regex()?;

    // GitHub 主，失败回退 Gitee
    let (tag, body, url, published, asset, source) = match fetch_github().await {
        Ok((tag, body, url, published, assets)) => {
            let asset = pick_asset_gh(&assets, &re);
            (tag, body, url, published, asset, "github".to_string())
        }
        Err(gh_err) => match fetch_gitee().await {
            Ok((tag, body, url, published, assets)) => {
                let asset = pick_asset_gitee(&assets, &re);
                (tag, body, url, published, asset, "gitee".to_string())
            }
            Err(gitee_err) => {
                return Err(format!(
                    "github: {} | gitee: {}",
                    gh_err, gitee_err
                ));
            }
        },
    };

    let latest_version = tag.trim_start_matches('v').to_string();
    let available = is_newer(&latest_version, &current_version);

    Ok(UpdateInfo {
        available,
        current_version,
        latest_version,
        release_notes: body,
        release_url: url,
        published_at: published,
        asset,
        source,
    })
}

#[tauri::command]
pub async fn download_update(
    app: AppHandle,
    url: String,
    filename: String,
) -> Result<String, String> {
    // 重置取消标志
    CANCEL_FLAG.store(false, Ordering::SeqCst);

    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Cache dir resolve: {}", e))?;
    let updates_dir = cache_dir.join("updates");
    std::fs::create_dir_all(&updates_dir)
        .map_err(|e| format!("Create updates dir: {}", e))?;
    let dest: PathBuf = updates_dir.join(&filename);

    // 始终覆盖（避免上次中断的破损文件继续被复用）
    if dest.exists() {
        let _ = std::fs::remove_file(&dest);
    }

    let client = long_client()?;
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Download request: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("Download HTTP {}", resp.status()));
    }
    let total = resp.content_length().unwrap_or(0);

    let mut file = tokio::fs::File::create(&dest)
        .await
        .map_err(|e| format!("Create file: {}", e))?;

    let mut stream = resp.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut last_emit = Instant::now();
    let mut last_emit_bytes: u64 = 0;
    let emit_interval = Duration::from_millis(150);

    while let Some(chunk_result) = stream.next().await {
        if CANCEL_FLAG.load(Ordering::SeqCst) {
            drop(file);
            let _ = std::fs::remove_file(&dest);
            return Err("cancelled".to_string());
        }
        let chunk = chunk_result.map_err(|e| format!("Stream read: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("File write: {}", e))?;
        downloaded += chunk.len() as u64;

        let now = Instant::now();
        if now.duration_since(last_emit) >= emit_interval {
            let elapsed = now.duration_since(last_emit).as_secs_f64().max(0.001);
            let speed = ((downloaded - last_emit_bytes) as f64 / elapsed) as u64;
            let percent = if total > 0 {
                (downloaded as f64 / total as f64) * 100.0
            } else {
                0.0
            };
            let _ = app.emit(
                "update-download-progress",
                DownloadProgress {
                    downloaded,
                    total,
                    percent,
                    speed_bps: speed,
                },
            );
            last_emit = now;
            last_emit_bytes = downloaded;
        }
    }

    file.flush().await.map_err(|e| format!("File flush: {}", e))?;
    drop(file);

    // 最终 100% 事件
    let _ = app.emit(
        "update-download-progress",
        DownloadProgress {
            downloaded,
            total: if total == 0 { downloaded } else { total },
            percent: 100.0,
            speed_bps: 0,
        },
    );

    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
pub fn cancel_update_download() -> Result<(), String> {
    CANCEL_FLAG.store(true, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn install_update(app: AppHandle, installer_path: String) -> Result<(), String> {
    let path = PathBuf::from(&installer_path);
    if !path.exists() {
        return Err(format!("Installer not found: {}", installer_path));
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::ffi::OsStrExt;
        use windows::core::PCWSTR;
        use windows::Win32::UI::Shell::ShellExecuteW;
        use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

        // NSIS 安装器 manifest 中要求 requireAdministrator，直接 CreateProcess
        // 会返回 ERROR_ELEVATION_REQUIRED (740)。必须走 ShellExecuteW 的 "runas"
        // verb 让 Windows 弹 UAC 提升。
        let path_wide: Vec<u16> = path
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let verb_wide: Vec<u16> = "runas\0".encode_utf16().collect();

        let hinst = unsafe {
            ShellExecuteW(
                None,
                PCWSTR(verb_wide.as_ptr()),
                PCWSTR(path_wide.as_ptr()),
                PCWSTR::null(),
                PCWSTR::null(),
                SW_SHOWNORMAL,
            )
        };
        // ShellExecuteW: 返回值 > 32 表示成功，否则为错误码（其中 SE_ERR_ACCESSDENIED=5
        // 通常对应用户在 UAC 弹窗点了"否"）。
        let code = hinst.0 as isize;
        if code <= 32 {
            return Err(format!("Launch installer failed (ShellExecute code {})", code));
        }
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Open dmg: {}", e))?;
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        return Err("install_update: unsupported platform".to_string());
    }

    // 留 300ms 给安装器拉起，再退出
    tokio::time::sleep(Duration::from_millis(300)).await;
    app.exit(0);
    Ok(())
}
