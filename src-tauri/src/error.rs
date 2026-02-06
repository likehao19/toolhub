//! 应用错误类型定义

use std::fmt;

/// 应用错误类型
#[derive(Debug)]
pub enum AppError {
    /// URL 解析错误
    InvalidUrl(String),
    /// 窗口操作错误
    WindowError(String),
    /// 状态锁定错误
    LockError,
    /// 通用错误
    Generic(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::InvalidUrl(msg) => write!(f, "无效的URL: {}", msg),
            AppError::WindowError(msg) => write!(f, "窗口操作失败: {}", msg),
            AppError::LockError => write!(f, "状态锁定失败"),
            AppError::Generic(msg) => write!(f, "{}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl From<url::ParseError> for AppError {
    fn from(err: url::ParseError) -> Self {
        AppError::InvalidUrl(err.to_string())
    }
}

impl From<tauri::Error> for AppError {
    fn from(err: tauri::Error) -> Self {
        AppError::WindowError(err.to_string())
    }
}

/// 应用结果类型
pub type AppResult<T> = Result<T, AppError>;

/// 将 AppError 转换为可序列化的字符串（用于 Tauri 命令返回值
impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_string()
    }
}
