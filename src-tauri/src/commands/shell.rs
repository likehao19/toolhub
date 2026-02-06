//! Shell 命令模块
//!
//! 提供执行系统命令的功能，处理 Windows 编码问题

use serde::{Deserialize, Serialize};
use std::process::Command as StdCommand;

/// 命令执行结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    /// 退出代码
    pub code: i32,
    /// 标准输出
    pub stdout: String,
    /// 标准错误
    pub stderr: String,
}

/// 执行系统命令（处理 Windows 编码）
///
/// # Arguments
///
/// * `program` - 程序名称
/// * `args` - 参数数组
///
/// # Returns
///
/// * `Ok(CommandResult)` - 成功时返回执行结果
/// * `Err(String)` - 失败时返回错误信息
#[tauri::command]
pub async fn execute_shell_command(
    program: String,
    args: Vec<String>,
) -> Result<CommandResult, String> {
    // 在异步任务中执行命令
    let result = tokio::task::spawn_blocking(move || {
        let mut cmd = StdCommand::new(&program);
        cmd.args(&args);

        // 在 Windows 上设置代码页为 UTF-8（如果可能）
        #[cfg(target_os = "windows")]
        {
            // 设置环境变量，尝试让命令输出 UTF-8
            // 但 Windows 的 cmd.exe 默认使用系统代码页（通常是 GBK），所以我们需要在解码时处理
            cmd.env("PYTHONIOENCODING", "utf-8");
            // 注意：chcp 65001 可以设置代码页为 UTF-8，但对于 dir 等内置命令可能无效
        }

        let output = cmd.output().map_err(|e| format!("执行命令失败: {}", e))?;

        // 处理 Windows 编码问题
        #[cfg(target_os = "windows")]
        {
            use encoding_rs::GBK;
            
            // 辅助函数：尝试解码 Windows 命令输出
            fn decode_windows_output(bytes: &[u8]) -> String {
                // 首先尝试 UTF-8
                if let Ok(utf8) = String::from_utf8(bytes.to_vec()) {
                    return utf8;
                }
                
                // 如果不是有效的 UTF-8，尝试作为 GBK 解码
                let (decoded, _, had_errors) = GBK.decode(bytes);
                if had_errors {
                    // 如果 GBK 解码也有错误，使用 lossy UTF-8 解码作为最后手段
                    String::from_utf8_lossy(bytes).to_string()
                } else {
                    decoded.to_string()
                }
            }
            
            let stdout = decode_windows_output(&output.stdout);
            let stderr = decode_windows_output(&output.stderr);

            Ok(CommandResult {
                code: output.status.code().unwrap_or(-1),
                stdout,
                stderr,
            })
        }

        #[cfg(not(target_os = "windows"))]
        {
            Ok(CommandResult {
                code: output.status.code().unwrap_or(-1),
                stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            })
        }
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?;

    result
}

