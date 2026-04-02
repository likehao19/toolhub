//! 壁纸管理命令

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use image::imageops::FilterType;
use image::GenericImageView;
use serde::Serialize;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// 支持的图片扩展名
const IMAGE_EXTS: &[&str] = &["jpg", "jpeg", "png", "bmp", "webp", "gif"];

/// 缩略图最大边长
const THUMB_SIZE: u32 = 320;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageEntry {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub thumb_base64: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BingImage {
    pub url: String,
    pub title: String,
    pub copyright: String,
    pub date: String,
}

/// 获取当前桌面壁纸路径
#[tauri::command]
pub fn get_current_wallpaper() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::WindowsAndMessaging::{
            SystemParametersInfoW, SPI_GETDESKWALLPAPER, SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS,
        };

        let mut buf = [0u16; 260];
        let ok = unsafe {
            SystemParametersInfoW(
                SPI_GETDESKWALLPAPER,
                buf.len() as u32,
                Some(buf.as_mut_ptr() as *mut _),
                SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
            )
        };
        match ok {
            Ok(_) => {
                let path = String::from_utf16_lossy(&buf);
                let path = path.trim_end_matches('\0').to_string();
                Ok(path)
            }
            Err(e) => Err(format!("Failed to get wallpaper: {}", e)),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Not supported on this platform".into())
    }
}

/// 设置桌面壁纸
#[tauri::command]
pub fn set_wallpaper(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("File not found: {}", path));
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::ffi::OsStrExt;
        use windows::Win32::UI::WindowsAndMessaging::{
            SystemParametersInfoW, SPI_SETDESKWALLPAPER, SPIF_SENDCHANGE, SPIF_UPDATEINIFILE,
        };

        let prepared_path = prepare_wallpaper_file(p)?;
        let wide: Vec<u16> = prepared_path
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        let ok = unsafe {
            SystemParametersInfoW(
                SPI_SETDESKWALLPAPER,
                0,
                Some(wide.as_ptr() as *mut _),
                SPIF_UPDATEINIFILE | SPIF_SENDCHANGE,
            )
        };
        match ok {
            Ok(_) => Ok(prepared_path.to_string_lossy().to_string()),
            Err(e) => Err(format!("Failed to set wallpaper: {}", e)),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Not supported on this platform".into())
    }
}

/// 扫描目录中的图片文件并生成缩略图
#[tauri::command]
pub fn scan_images(dir_path: String) -> Result<Vec<ImageEntry>, String> {
    let dir = Path::new(&dir_path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", dir_path));
    }

    let mut entries = Vec::new();

    for entry in WalkDir::new(dir).max_depth(1).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .unwrap_or_default();
        if !IMAGE_EXTS.contains(&ext.as_str()) {
            continue;
        }

        let meta = std::fs::metadata(path).map_err(|e| e.to_string())?;
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        // 生成缩略图 base64
        let thumb = match generate_thumbnail(path) {
            Ok(b64) => b64,
            Err(_) => String::new(),
        };

        entries.push(ImageEntry {
            path: path.to_string_lossy().to_string(),
            name,
            size: meta.len(),
            thumb_base64: thumb,
        });
    }

    // 按文件名排序
    entries.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(entries)
}

/// 获取 Bing 每日壁纸列表
#[tauri::command]
pub async fn fetch_bing_wallpapers(count: Option<u8>) -> Result<Vec<BingImage>, String> {
    let n = count.unwrap_or(8).min(8);
    let url = format!(
        "https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n={}&mkt=zh-CN",
        n
    );

    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Parse failed: {}", e))?;

    let images = json["images"]
        .as_array()
        .ok_or("Invalid Bing API response")?;

    let result: Vec<BingImage> = images
        .iter()
        .map(|img| BingImage {
            url: format!("https://www.bing.com{}", img["url"].as_str().unwrap_or("")),
            title: img["title"].as_str().unwrap_or("").to_string(),
            copyright: img["copyright"].as_str().unwrap_or("").to_string(),
            date: img["enddate"].as_str().unwrap_or("").to_string(),
        })
        .collect();

    Ok(result)
}

/// 下载在线壁纸到本地并设为桌面壁纸
#[tauri::command]
pub async fn download_and_set_wallpaper(url: String, save_dir: String) -> Result<String, String> {
    let save_path = Path::new(&save_dir);
    if !save_path.exists() {
        std::fs::create_dir_all(save_path).map_err(|e| e.to_string())?;
    }

    // 从 URL 提取文件名
    let file_name = url
        .split('?')
        .next()
        .and_then(|u| u.rsplit('/').next())
        .unwrap_or("bing_wallpaper.jpg")
        .to_string();

    let dest = save_path.join(&file_name);

    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Read failed: {}", e))?;

    std::fs::write(&dest, &bytes).map_err(|e| format!("Save failed: {}", e))?;

    let dest_str = dest.to_string_lossy().to_string();

    // 设为壁纸
    let applied_path = set_wallpaper(dest_str)?;

    Ok(applied_path)
}

fn prepare_wallpaper_file(path: &Path) -> Result<PathBuf, String> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    if ["bmp", "jpg", "jpeg", "png"].contains(&ext.as_str()) {
        return Ok(path.to_path_buf());
    }

    let img = image::open(path).map_err(|e| format!("Failed to decode image: {}", e))?;
    let temp_dir = std::env::temp_dir().join("toolhub_wallpaper_cache");
    std::fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp dir: {}", e))?;

    let file_stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("wallpaper");
    let target = temp_dir.join(format!("{}_converted.bmp", file_stem));

    img.save_with_format(&target, image::ImageFormat::Bmp)
        .map_err(|e| format!("Failed to convert wallpaper image: {}", e))?;

    Ok(target)
}

/// 生成缩略图 base64
fn generate_thumbnail(path: &Path) -> Result<String, String> {
    let img = image::open(path).map_err(|e| e.to_string())?;
    let (w, h) = img.dimensions();

    let thumb = if w > THUMB_SIZE || h > THUMB_SIZE {
        img.resize(THUMB_SIZE, THUMB_SIZE, FilterType::Triangle)
    } else {
        img
    };

    let mut buf = std::io::Cursor::new(Vec::new());
    thumb
        .write_to(&mut buf, image::ImageFormat::Jpeg)
        .map_err(|e| e.to_string())?;

    Ok(format!(
        "data:image/jpeg;base64,{}",
        STANDARD.encode(buf.into_inner())
    ))
}
