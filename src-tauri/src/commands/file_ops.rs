//! 文件操作模块
//!
//! 提供文件读取和写入功能

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

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
    let extension = file_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase());

    // 克隆路径用于异步任务
    let path_clone = path.clone();
    let file_path_buf = file_path.to_path_buf();

    // 读取文件内容
    let content = tokio::task::spawn_blocking(move || fs::read_to_string(&file_path_buf))
        .await
        .map_err(|e| format!("读取失败: {}", e))?
        .map_err(|e| format!("无法读取文件内容: {}", e))?;

    // 检测是否为二进制文件（简单检测：查看是否包含空字符）
    let is_binary = content.contains('\0');

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
///
/// # Returns
///
/// 成功返回 Ok(())
#[tauri::command]
pub async fn copy_file(source: String, destination: String) -> Result<(), String> {
    let source_path = Path::new(&source);
    let dest_path = Path::new(&destination);

    if !source_path.exists() {
        return Err(format!("源路径不存在: {}", source));
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
///
/// # Returns
///
/// 成功返回 Ok(())
#[tauri::command]
pub async fn move_file(source: String, destination: String) -> Result<(), String> {
    let source_path = Path::new(&source);
    let dest_path = Path::new(&destination);

    if !source_path.exists() {
        return Err(format!("源路径不存在: {}", source));
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
/// * `new_name` - 新名称
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

    let parent = file_path.parent()
        .ok_or_else(|| format!("无法获取父目录: {}", path))?;

    let new_path = parent.join(&new_name);

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