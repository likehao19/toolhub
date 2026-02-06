//! 文件树读取模块
//!
//! 提供高性能的文件目录递归读取功能，支持文件类型过滤
//! 使用事件驱动模式，支持大文件夹（100GB+）不卡死页面

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;
use tauri::{AppHandle, Emitter};

/// 文件/文件夹节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    /// 节点名称
    pub name: String,
    /// 完整路径
    pub path: String,
    /// 是否为目录
    pub is_dir: bool,
    /// 文件大小（字节，仅文件有效）
    pub size: Option<u64>,
    /// 文件扩展名（仅文件有效）
    pub extension: Option<String>,
    /// 子节点（仅目录有效）
    pub children: Option<Vec<FileNode>>,
    /// 父路径（用于构建树）
    pub parent_path: Option<String>,
}

/// 读取文件树选项
#[derive(Debug, Clone, Deserialize)]
pub struct ReadFileTreeOptions {
    /// 目录路径
    pub path: String,
    /// 文件扩展名过滤（如：["js", "vue", "rs"]），为空则读取所有
    pub extensions: Option<Vec<String>>,
    /// 最大递归深度，0 表示不递归，None 表示无限制
    pub max_depth: Option<usize>,
    /// 是否包含隐藏文件
    pub include_hidden: Option<bool>,
    /// 任务ID（用于取消操作）
    pub task_id: Option<String>,
    /// 批次大小（多少个节点发送一次进度）
    pub batch_size: Option<usize>,
}

/// 读取进度事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    /// 任务ID
    pub task_id: String,
    /// 已扫描文件数
    pub scanned_files: u64,
    /// 已扫描文件夹数
    pub scanned_dirs: u64,
    /// 当前路径
    pub current_path: String,
    /// 是否完成
    pub completed: bool,
    /// 错误信息
    pub error: Option<String>,
    /// Rust 读取耗时（毫秒）
    pub rust_duration_ms: Option<u64>,
}

/// 文件树节点批次
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNodeBatch {
    /// 任务ID
    pub task_id: String,
    /// 节点列表
    pub nodes: Vec<FileNode>,
    /// 是否为最后一批
    pub is_last: bool,
}

/// 文件树读取结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTreeResult {
    /// 文件树根节点
    pub tree: FileNode,
    /// Rust 读取耗时（毫秒）
    pub rust_duration_ms: u64,
}

/// 流式读取文件树（推荐用于大文件夹）
///
/// 通过事件实时发送节点数据，不阻塞页面
///
/// 事件列表：
/// - `file-tree-progress-{task_id}`: 扫描进度更新
/// - `file-tree-batch-{task_id}`: 节点批次数据
/// - `file-tree-complete-{task_id}`: 扫描完成
#[tauri::command]
pub async fn read_file_tree_stream(
    app: AppHandle,
    options: ReadFileTreeOptions,
) -> Result<String, String> {
    let path = PathBuf::from(&options.path);

    if !path.exists() {
        return Err(format!("路径不存在: {}", options.path));
    }

    if !path.is_dir() {
        return Err(format!("路径不是目录: {}", options.path));
    }

    let task_id = options
        .task_id
        .clone()
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let include_hidden = options.include_hidden.unwrap_or(false);
    let max_depth = options.max_depth;
    let batch_size = options.batch_size.unwrap_or(100); // 默认100个节点一批
    let extensions = options.extensions.clone();
    let root_path = path.clone();
    let task_id_clone = task_id.clone();

    // 在后台线程中执行扫描
    tokio::task::spawn(async move {
        let start_time = Instant::now();

        let result = scan_directory_stream(
            &app,
            &root_path,
            &extensions,
            include_hidden,
            max_depth,
            &task_id_clone,
            batch_size,
        )
        .await;

        let duration_ms = start_time.elapsed().as_millis() as u64;

        // 发送完成事件
        let _ = app.emit(
            &format!("file-tree-complete-{}", task_id_clone),
            ScanProgress {
                task_id: task_id_clone.clone(),
                scanned_files: 0,
                scanned_dirs: 0,
                current_path: String::new(),
                completed: true,
                error: result.err(),
                rust_duration_ms: Some(duration_ms),
            },
        );
    });

    Ok(task_id)
}

/// 流式扫描目录
async fn scan_directory_stream(
    app: &AppHandle,
    root_path: &Path,
    extensions: &Option<Vec<String>>,
    include_hidden: bool,
    max_depth: Option<usize>,
    task_id: &str,
    batch_size: usize,
) -> Result<(), String> {
    let mut node_buffer = Vec::new();
    let mut scanned_files = 0u64;
    let mut scanned_dirs = 0u64;

    // 使用栈来模拟递归（避免栈溢出）
    let mut stack = vec![(root_path.to_path_buf(), 0usize, None::<String>)];

    while let Some((current_path, depth, parent_path)) = stack.pop() {
        // 检查深度限制
        if let Some(max) = max_depth {
            if depth > max {
                continue;
            }
        }

        // 发送进度
        let _ = app.emit(
            &format!("file-tree-progress-{}", task_id),
            ScanProgress {
                task_id: task_id.to_string(),
                scanned_files,
                scanned_dirs,
                current_path: current_path.to_string_lossy().to_string(),
                completed: false,
                error: None,
                rust_duration_ms: None,
            },
        );

        // 读取目录
        let entries = match fs::read_dir(&current_path) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue,
            };

            let entry_path = entry.path();
            let entry_name = entry.file_name().to_string_lossy().to_string();

            // 跳过隐藏文件
            if !include_hidden && entry_name.starts_with('.') {
                continue;
            }

            let metadata = match entry.metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };

            if metadata.is_dir() {
                scanned_dirs += 1;

                // 创建目录节点
                let node = FileNode {
                    name: entry_name.clone(),
                    path: entry_path.to_string_lossy().to_string(),
                    is_dir: true,
                    size: None,
                    extension: None,
                    children: Some(Vec::new()),
                    parent_path: parent_path.clone(),
                };
                node_buffer.push(node);

                // 将子目录加入栈
                stack.push((
                    entry_path.clone(),
                    depth + 1,
                    Some(entry_path.to_string_lossy().to_string()),
                ));
            } else if metadata.is_file() {
                // 检查扩展名过滤
                let extension = entry_path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|s| s.to_lowercase());

                let should_include = if let Some(ref exts) = extensions {
                    if exts.is_empty() {
                        true
                    } else {
                        extension
                            .as_ref()
                            .map(|ext| exts.iter().any(|e| e.to_lowercase() == *ext))
                            .unwrap_or(false)
                    }
                } else {
                    true
                };

                if should_include {
                    scanned_files += 1;

                    let node = FileNode {
                        name: entry_name,
                        path: entry_path.to_string_lossy().to_string(),
                        is_dir: false,
                        size: Some(metadata.len()),
                        extension,
                        children: None,
                        parent_path: parent_path.clone(),
                    };
                    node_buffer.push(node);
                }
            }

            // 批次发送
            if node_buffer.len() >= batch_size {
                let _ = app.emit(
                    &format!("file-tree-batch-{}", task_id),
                    FileNodeBatch {
                        task_id: task_id.to_string(),
                        nodes: node_buffer.clone(),
                        is_last: false,
                    },
                );
                node_buffer.clear();
            }
        }
    }

    // 发送剩余节点
    if !node_buffer.is_empty() {
        let _ = app.emit(
            &format!("file-tree-batch-{}", task_id),
            FileNodeBatch {
                task_id: task_id.to_string(),
                nodes: node_buffer,
                is_last: true,
            },
        );
    }

    Ok(())
}

/// 取消文件树扫描任务
#[tauri::command]
pub async fn cancel_file_tree_scan(_task_id: String) -> Result<(), String> {
    // 由于使用了非阻塞的流式处理，前端可以直接停止监听事件
    // 这里预留接口，未来可以实现真正的任务取消
    Ok(())
}

/// 递归读取文件树（传统方式，适合小文件夹）
///
/// # Arguments
///
/// * `options` - 读取选项
///
/// # Returns
///
/// 返回根节点和读取时间
#[tauri::command]
pub async fn read_file_tree(options: ReadFileTreeOptions) -> Result<FileTreeResult, String> {
    let path = PathBuf::from(&options.path);

    if !path.exists() {
        return Err(format!("路径不存在: {}", options.path));
    }

    if !path.is_dir() {
        return Err(format!("路径不是目录: {}", options.path));
    }

    let include_hidden = options.include_hidden.unwrap_or(false);
    let max_depth = options.max_depth;

    // 使用线程池进行异步读取，避免阻塞
    let extensions = options.extensions.clone();
    let root_path = path.clone();

    let start_time = Instant::now();

    let tree = tokio::task::spawn_blocking(move || {
        read_directory(&root_path, &extensions, include_hidden, max_depth, 0)
    })
    .await
    .map_err(|e| format!("读取失败: {}", e))??;

    let duration_ms = start_time.elapsed().as_millis() as u64;

    Ok(FileTreeResult {
        tree,
        rust_duration_ms: duration_ms,
    })
}

/// 递归读取目录
fn read_directory(
    path: &Path,
    extensions: &Option<Vec<String>>,
    include_hidden: bool,
    max_depth: Option<usize>,
    current_depth: usize,
) -> Result<FileNode, String> {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let path_str = path.to_string_lossy().to_string();

    // 检查是否超过最大深度
    if let Some(max) = max_depth {
        if current_depth > max {
            return Ok(FileNode {
                name,
                path: path_str.clone(),
                is_dir: true,
                size: None,
                extension: None,
                children: Some(Vec::new()), // 返回空子节点
                parent_path: None,
            });
        }
    }

    // 读取目录内容
    let entries = fs::read_dir(path).map_err(|e| format!("无法读取目录 {}: {}", path_str, e))?;

    let mut children = Vec::new();

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue, // 跳过无法读取的条目
        };

        let entry_path = entry.path();
        let entry_name = entry.file_name().to_string_lossy().to_string();

        // 跳过隐藏文件（以 . 开头）
        if !include_hidden && entry_name.starts_with('.') {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue, // 跳过无法获取元数据的条目
        };

        if metadata.is_dir() {
            // 递归读取子目录
            match read_directory(
                &entry_path,
                extensions,
                include_hidden,
                max_depth,
                current_depth + 1,
            ) {
                Ok(child_node) => children.push(child_node),
                Err(_) => continue, // 跳过无法读取的子目录（权限问题等）
            }
        } else if metadata.is_file() {
            // 检查文件扩展名过滤
            let extension = entry_path
                .extension()
                .and_then(|e| e.to_str())
                .map(|s| s.to_lowercase());

            let should_include = if let Some(ref exts) = extensions {
                if exts.is_empty() {
                    true
                } else {
                    extension
                        .as_ref()
                        .map(|ext| exts.iter().any(|e| e.to_lowercase() == *ext))
                        .unwrap_or(false)
                }
            } else {
                true
            };

            if should_include {
                children.push(FileNode {
                    name: entry_name,
                    path: entry_path.to_string_lossy().to_string(),
                    is_dir: false,
                    size: Some(metadata.len()),
                    extension,
                    children: None,
                    parent_path: Some(path_str.clone()),
                });
            }
        }
    }

    // 对子节点排序：目录在前，文件在后，同类型按名称排序
    children.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });

    Ok(FileNode {
        name,
        path: path_str,
        is_dir: true,
        size: None,
        extension: None,
        children: Some(children),
        parent_path: None,
    })
}

/// 快速扫描目录统计信息（仅统计，不返回树）
///
/// 用于快速获取目录下的文件和文件夹数量
#[tauri::command]
pub async fn scan_directory_stats(path: String) -> Result<DirectoryStats, String> {
    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err(format!("路径不存在: {}", path.to_string_lossy()));
    }

    if !path.is_dir() {
        return Err(format!("路径不是目录: {}", path.to_string_lossy()));
    }

    tokio::task::spawn_blocking(move || count_directory(&path))
        .await
        .map_err(|e| format!("扫描失败: {}", e))?
}

/// 目录统计信息
#[derive(Debug, Serialize, Deserialize)]
pub struct DirectoryStats {
    /// 文件总数
    pub file_count: u64,
    /// 文件夹总数
    pub dir_count: u64,
    /// 总大小（字节）
    pub total_size: u64,
}

/// 单层目录内容（不递归）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryContent {
    /// 当前目录路径
    pub path: String,
    /// 文件列表
    pub files: Vec<FileNode>,
    /// 文件夹列表
    pub directories: Vec<FileNode>,
    /// 总文件数
    pub file_count: usize,
    /// 总文件夹数
    pub dir_count: usize,
    /// Rust 读取耗时（毫秒）
    pub rust_duration_ms: u64,
}

/// 读取单层目录内容（不递归，高性能）
///
/// 适合资源管理器场景，只读取当前目录下的文件和文件夹
#[tauri::command]
pub async fn read_directory_content(
    path: String,
    extensions: Option<Vec<String>>,
    include_hidden: Option<bool>,
) -> Result<DirectoryContent, String> {
    let dir_path = PathBuf::from(&path);

    if !dir_path.exists() {
        return Err(format!("路径不存在: {}", path));
    }

    if !dir_path.is_dir() {
        return Err(format!("路径不是目录: {}", path));
    }

    let include_hidden = include_hidden.unwrap_or(false);
    let path_clone = path.clone();

    let start_time = Instant::now();

    let (mut files, mut directories) = tokio::task::spawn_blocking(move || {
        read_single_directory(&dir_path, &extensions, include_hidden)
    })
    .await
    .map_err(|e| format!("读取失败: {}", e))??;

    let duration_ms = start_time.elapsed().as_millis() as u64;

    // 排序：目录和文件分别按名称排序
    directories.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(DirectoryContent {
        path: path_clone,
        file_count: files.len(),
        dir_count: directories.len(),
        files,
        directories,
        rust_duration_ms: duration_ms,
    })
}

/// 读取单层目录（不递归）
fn read_single_directory(
    path: &Path,
    extensions: &Option<Vec<String>>,
    include_hidden: bool,
) -> Result<(Vec<FileNode>, Vec<FileNode>), String> {
    let entries = fs::read_dir(path).map_err(|e| format!("无法读取目录: {}", e))?;

    let mut files = Vec::new();
    let mut directories = Vec::new();

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let entry_path = entry.path();
        let entry_name = entry.file_name().to_string_lossy().to_string();

        // 跳过隐藏文件
        if !include_hidden && entry_name.starts_with('.') {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if metadata.is_dir() {
            directories.push(FileNode {
                name: entry_name,
                path: entry_path.to_string_lossy().to_string(),
                is_dir: true,
                size: None,
                extension: None,
                children: None,
                parent_path: Some(path.to_string_lossy().to_string()),
            });
        } else if metadata.is_file() {
            let extension = entry_path
                .extension()
                .and_then(|e| e.to_str())
                .map(|s| s.to_lowercase());

            let should_include = if let Some(ref exts) = extensions {
                if exts.is_empty() {
                    true
                } else {
                    extension
                        .as_ref()
                        .map(|ext| exts.iter().any(|e| e.to_lowercase() == *ext))
                        .unwrap_or(false)
                }
            } else {
                true
            };

            if should_include {
                files.push(FileNode {
                    name: entry_name,
                    path: entry_path.to_string_lossy().to_string(),
                    is_dir: false,
                    size: Some(metadata.len()),
                    extension,
                    children: None,
                    parent_path: Some(path.to_string_lossy().to_string()),
                });
            }
        }
    }

    Ok((files, directories))
}

/// 递归统计目录
fn count_directory(path: &Path) -> Result<DirectoryStats, String> {
    let mut stats = DirectoryStats {
        file_count: 0,
        dir_count: 0,
        total_size: 0,
    };

    let entries = match fs::read_dir(path) {
        Ok(e) => e,
        Err(e) => return Err(format!("无法读取目录: {}", e)),
    };

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if metadata.is_dir() {
            stats.dir_count += 1;
            // 递归统计子目录
            if let Ok(sub_stats) = count_directory(&entry.path()) {
                stats.file_count += sub_stats.file_count;
                stats.dir_count += sub_stats.dir_count;
                stats.total_size += sub_stats.total_size;
            }
        } else if metadata.is_file() {
            stats.file_count += 1;
            stats.total_size += metadata.len();
        }
    }

    Ok(stats)
}
