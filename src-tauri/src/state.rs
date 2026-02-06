//! 应用状态管理

use std::sync::Mutex;

/// 子窗口计数器状态
///
/// 用于生成唯一的子窗口标签
pub struct ChildWindowCounter(Mutex<usize>);

impl ChildWindowCounter {
    /// 创建新的计数器实例
    pub fn new() -> Self {
        Self(Mutex::new(0))
    }

    /// 获取下一个窗口编号
    ///
    /// # Errors
    ///
    /// 如果无法获取锁，返回错误
    pub fn next(&self) -> Result<usize, String> {
        let mut count = self.0.lock().map_err(|_| "无法获取窗口计数器锁".to_string())?;
        *count += 1;
        Ok(*count)
    }
}

impl Default for ChildWindowCounter {
    fn default() -> Self {
        Self::new()
    }
}
