//! 文件操作模块
//!
//! 提供文件读取和写入功能

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// 单次读取的最大文件大小:50 MB。
/// 旧实现没有限制,用户选个 2 GB 日志会被整体读进 String,再被 serde_json 序列化经 IPC 传到前端,
/// 进程直接 OOM。50 MB 对文本预览/编辑场景足够,需要更大的请走流式接口。
const READ_TEXT_MAX_BYTES: u64 = 50 * 1024 * 1024;

/// base64 读取的最大文件大小:50 MB。
/// base64 编码后体积变 4/3,再经 IPC 传到前端会被 JSON 转义复制一遍,实际峰值占用 ~3-4 倍源文件大小。
/// 50 MB 源文件已经接近 200 MB 字符串峰值;再大就该用 convertFileSrc + 文件路径方案。
const READ_BASE64_MAX_BYTES: u64 = 50 * 1024 * 1024;

/// 文件读取结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileContent {
    /// 文件路径
    pub path: String,
    /// 文件内容（文本）
    pub content: String,
    /// 文件大小（字节）
    pub size: u64,
    /// 文件扩展名
    pub extension: Option<String>,
    /// 是否为二进制文件
    pub is_binary: bool,
}

/// 读取文本文件
///
/// # Arguments
///
/// * `path` - 文件路径
///
/// # Returns
///
/// 返回文件内容和元数据
#[tauri::command]
pub async fn read_text_file(path: String) -> Result<FileContent, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("文件不存在: {}", path));
    }

    if !file_path.is_file() {
        return Err(format!("路径不是文件: {}", path));
    }

    // 获取文件元数据
    let metadata = fs::metadata(&file_path).map_err(|e| format!("无法读取文件元数据: {}", e))?;

    let size = metadata.len();
    if size > READ_TEXT_MAX_BYTES {
        return Err(format!(
            "文件过大({} 字节),超过 {} MB 上限。请使用专用查看器或分段读取",
            size, READ_TEXT_MAX_BYTES / 1024 / 1024
        ));
    }
    let extension = file_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase());

    // 克隆路径用于异步任务
    let path_clone = path.clone();
    let file_path_buf = file_path.to_path_buf();

    // 读取原始字节后再做编码检测 —— 旧实现直接 read_to_string,
    // GBK/Shift-JIS 等非 UTF-8 文件会 hard-fail。这里先用 encoding_rs 嗅探。
    let bytes = tokio::task::spawn_blocking(move || fs::read(&file_path_buf))
        .await
        .map_err(|e| format!("读取失败: {}", e))?
        .map_err(|e| format!("无法读取文件内容: {}", e))?;

    // 二进制检测必须在解码之前 —— `\0` 在解码后可能被替换成 U+FFFD 漏检。
    let is_binary = bytes.contains(&0u8);

    // 解码:UTF-8(含/不含 BOM) 优先,失败则按 GBK 兜底,再失败用 lossy。
    // GBK 是 Windows 中文系统最常见的非 UTF-8 编码。
    let content = match std::str::from_utf8(&bytes) {
        Ok(s) => s.to_string(),
        Err(_) => {
            let (decoded, _, had_errors) = encoding_rs::GBK.decode(&bytes);
            if had_errors {
                String::from_utf8_lossy(&bytes).to_string()
            } else {
                decoded.to_string()
            }
        }
    };

    Ok(FileContent {
        path: path_clone,
        content,
        size,
        extension,
        is_binary,
    })
}

/// 写入文本文件
///
/// # Arguments
///
/// * `path` - 文件路径
/// * `content` - 文件内容
///
/// # Returns
///
/// 成功返回 Ok(())
#[tauri::command]
pub async fn write_text_file(path: String, content: String) -> Result<(), String> {
    let file_path = Path::new(&path);

    // 确保父目录存在
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("无法创建目录: {}", e))?;
        }
    }

    // 克隆路径用于异步任务
    let file_path_buf = file_path.to_path_buf();

    // 写入文件
    tokio::task::spawn_blocking(move || fs::write(&file_path_buf, content))
        .await
        .map_err(|e| format!("写入失败: {}", e))?
        .map_err(|e| format!("无法写入文件: {}", e))?;

    Ok(())
}

/// 读取文件为Base64（用于图片等二进制文件）
///
/// # Arguments
///
/// * `path` - 文件路径
///
/// # Returns
///
/// 返回Base64编码的文件内容
#[tauri::command]
pub async fn read_file_as_base64(path: String) -> Result<String, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("文件不存在: {}", path));
    }

    if !file_path.is_file() {
        return Err(format!("路径不是文件: {}", path));
    }

    // 大小校验放在 read 之前,防止巨型文件被整个塞进内存。
    let metadata = fs::metadata(&file_path).map_err(|e| format!("无法读取文件元数据: {}", e))?;
    let size = metadata.len();
    if size > READ_BASE64_MAX_BYTES {
        return Err(format!(
            "文件过大({} 字节),超过 {} MB 上限。请用 convertFileSrc 通过文件路径加载",
            size, READ_BASE64_MAX_BYTES / 1024 / 1024
        ));
    }

    // 克隆路径用于异步任务
    let file_path_buf = file_path.to_path_buf();

    // 读取文件为字节
    let bytes = tokio::task::spawn_blocking(move || fs::read(&file_path_buf))
        .await
        .map_err(|e| format!("读取失败: {}", e))?
        .map_err(|e| format!("无法读取文件: {}", e))?;

    // 转换为Base64
    use base64::{engine::general_purpose, Engine as _};
    let base64_str = general_purpose::STANDARD.encode(&bytes);

    Ok(base64_str)
}

/// 复制文件或目录
///
/// # Arguments
///
/// * `source` - 源路径
/// * `destination` - 目标路径
/// * `overwrite` - 目标已存在时是否覆盖,默认 false
///
/// # Returns
///
/// 成功返回 Ok(())
#[tauri::command]
pub async fn copy_file(source: String, destination: String, overwrite: Option<bool>) -> Result<(), String> {
    let source_path = Path::new(&source);
    let dest_path = Path::new(&destination);

    if !source_path.exists() {
        return Err(format!("源路径不存在: {}", source));
    }

    // 默认不覆盖 —— 旧实现静默 fs::copy 会直接覆盖目标,用户误操作会丢数据。
    if !overwrite.unwrap_or(false) && dest_path.exists() {
        return Err(format!("目标已存在: {}。如确认覆盖请显式传 overwrite=true", destination));
    }

    // 确保目标目录的父目录存在
    if let Some(parent) = dest_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("无法创建目录: {}", e))?;
        }
    }

    let source_buf = source_path.to_path_buf();
    let dest_buf = dest_path.to_path_buf();

    // 复制文件或目录
    tokio::task::spawn_blocking(move || {
        if source_buf.is_file() {
            fs::copy(&source_buf, &dest_buf)
                .map_err(|e| format!("复制文件失败: {}", e))?;
        } else if source_buf.is_dir() {
            copy_dir_all(&source_buf, &dest_buf)
                .map_err(|e| format!("复制目录失败: {}", e))?;
        } else {
            return Err(format!("源路径既不是文件也不是目录: {}", source_buf.display()));
        }
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| format!("复制失败: {}", e))?
}

/// 移动文件或目录（重命名）
///
/// # Arguments
///
/// * `source` - 源路径
/// * `destination` - 目标路径
/// * `overwrite` - 目标已存在时是否覆盖,默认 false
///
/// # Returns
///
/// 成功返回 Ok(())
#[tauri::command]
pub async fn move_file(source: String, destination: String, overwrite: Option<bool>) -> Result<(), String> {
    let source_path = Path::new(&source);
    let dest_path = Path::new(&destination);

    if !source_path.exists() {
        return Err(format!("源路径不存在: {}", source));
    }

    if !overwrite.unwrap_or(false) && dest_path.exists() {
        return Err(format!("目标已存在: {}。如确认覆盖请显式传 overwrite=true", destination));
    }

    // 确保目标目录的父目录存在
    if let Some(parent) = dest_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("无法创建目录: {}", e))?;
        }
    }

    let source_buf = source_path.to_path_buf();
    let dest_buf = dest_path.to_path_buf();

    // 移动文件或目录
    tokio::task::spawn_blocking(move || {
        fs::rename(&source_buf, &dest_buf)
            .map_err(|e| format!("移动文件失败: {}", e))
    })
    .await
    .map_err(|e| format!("移动失败: {}", e))?
}

/// 重命名文件或目录
///
/// # Arguments
///
/// * `path` - 文件或目录路径
/// * `new_name` - 新名称(必须是纯文件名,不能含路径分隔符或 ..)
///
/// # Returns
///
/// 成功返回 Ok(())
#[tauri::command]
pub async fn rename_file(path: String, new_name: String) -> Result<(), String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("路径不存在: {}", path));
    }

    // 安全校验:new_name 必须是纯文件名,否则会跨目录穿越。
    // PathBuf::join(absolute_path) 会丢弃 parent 直接用绝对路径 ——
    // 旧实现传 "C:\\Windows\\System32\\drivers\\etc\\hosts" 会让任意文件被改名到任意位置。
    let trimmed = new_name.trim();
    if trimmed.is_empty()
        || trimmed.contains('/')
        || trimmed.contains('\\')
        || trimmed == "."
        || trimmed == ".."
        || trimmed.contains('\0')
    {
        return Err(format!("非法的新文件名: {:?}", new_name));
    }
    // 进一步用 Path 解析:正常文件名应该只有一个 component 且就是 Normal(...)
    let new_name_path = Path::new(trimmed);
    if new_name_path.components().count() != 1
        || !matches!(
            new_name_path.components().next(),
            Some(std::path::Component::Normal(_))
        )
    {
        return Err(format!("非法的新文件名: {:?}", new_name));
    }

    let parent = file_path.parent()
        .ok_or_else(|| format!("无法获取父目录: {}", path))?;

    let new_path = parent.join(trimmed);

    let file_path_buf = file_path.to_path_buf();
    let new_path_buf = new_path;

    // 重命名
    tokio::task::spawn_blocking(move || {
        fs::rename(&file_path_buf, &new_path_buf)
            .map_err(|e| format!("重命名失败: {}", e))
    })
    .await
    .map_err(|e| format!("重命名失败: {}", e))?
}

/// 递归复制目录
fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), std::io::Error> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(&entry.path(), &dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}