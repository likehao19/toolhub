//! Shell 命令模块
//!
//! 提供执行系统命令的功能，处理 Windows 编码问题

use serde::{Deserialize, Serialize};
use std::process::Command as StdCommand;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(target_os = "windows")]
fn configure_windows_command(cmd: &mut StdCommand) {
    cmd.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(target_os = "windows"))]
fn configure_windows_command(_cmd: &mut StdCommand) {}

#[cfg(target_os = "windows")]
fn decode_windows_output(bytes: &[u8]) -> String {
    use encoding_rs::GBK;

    if let Ok(utf8) = String::from_utf8(bytes.to_vec()) {
        return utf8;
    }

    let (decoded, _, had_errors) = GBK.decode(bytes);
    if had_errors {
        String::from_utf8_lossy(bytes).to_string()
    } else {
        decoded.to_string()
    }
}

#[cfg(not(target_os = "windows"))]
fn decode_windows_output(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).to_string()
}

pub(crate) fn hidden_command_owned(program: &str, args: &[String]) -> std::io::Result<std::process::Output> {
    let mut cmd = StdCommand::new(program);
    cmd.args(args);
    configure_windows_command(&mut cmd);
    cmd.output()
}

pub(crate) fn decode_command_output(bytes: &[u8]) -> String {
    decode_windows_output(bytes)
}

pub(crate) use decode_command_output as decode_output;
pub(crate) use hidden_command_owned as run_hidden_command_owned_ref;

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

/// 命令执行超时上限(秒)。
///
/// 旧实现 cmd.output() 没有超时,被调用的程序卡住会让整个 Tauri 任务永久挂起,
/// 占满 tokio blocking pool。30 秒覆盖绝大多数 CLI 工具,长任务请走流式接口。
const SHELL_TIMEOUT_SECS: u64 = 30;

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
    let task = tokio::task::spawn_blocking(move || {
        let mut cmd = StdCommand::new(&program);
        cmd.args(&args);

        // 在 Windows 上设置代码页为 UTF-8（如果可能）
        #[cfg(target_os = "windows")]
        {
            // 设置环境变量，尝试让命令输出 UTF-8
            // 但 Windows 的 cmd.exe 默认使用系统代码页（通常是 GBK），所以我们需要在解码时处理
            cmd.env("PYTHONIOENCODING", "utf-8");
        }

        configure_windows_command(&mut cmd);
        let output = cmd.output().map_err(|e| format!("执行命令失败: {}", e))?;

        Ok(CommandResult {
            code: output.status.code().unwrap_or(-1),
            stdout: decode_windows_output(&output.stdout),
            stderr: decode_windows_output(&output.stderr),
        })
    });

    // 关键:超时仅取消等待,不能强制杀已 spawn 的子进程(spawn_blocking 内部 std::process::Command
    // 没有 cancellation token)。但至少让前端尽快得到错误,避免 Tauri 任务永久挂起。
    let result = match tokio::time::timeout(
        std::time::Duration::from_secs(SHELL_TIMEOUT_SECS),
        task,
    )
    .await
    {
        Ok(joined) => joined.map_err(|e| format!("任务执行失败: {}", e))?,
        Err(_) => {
            return Err(format!(
                "命令执行超时({} 秒)。如需运行长任务,请使用流式/后台命令接口",
                SHELL_TIMEOUT_SECS
            ));
        }
    };

    result
}

