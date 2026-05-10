//! SDK 版本管理命令模块
//!
//! 通过 Windows 注册表读写环境变量（用户级 + 系统级），
//! 支持 Java JDK、Maven、Node.js 的版本切换。

use serde::{Deserialize, Serialize};

use super::shell::{decode_output, run_hidden_command_owned_ref};


#[cfg(target_os = "windows")]
fn run_hidden_args(program: &str, args: &[&str]) -> std::io::Result<std::process::Output> {
    let owned_args: Vec<String> = args.iter().map(|arg| (*arg).to_string()).collect();
    run_hidden_command_owned_ref(program, &owned_args)
}

#[cfg(not(target_os = "windows"))]
fn run_hidden_args(program: &str, args: &[&str]) -> std::io::Result<std::process::Output> {
    let owned_args: Vec<String> = args.iter().map(|arg| (*arg).to_string()).collect();
    run_hidden_command_owned_ref(program, &owned_args)
}

#[cfg(target_os = "windows")]
fn run_hidden_owned(program: &str, args: &[String]) -> std::io::Result<std::process::Output> {
    run_hidden_command_owned_ref(program, args)
}

#[cfg(not(target_os = "windows"))]
fn run_hidden_owned(program: &str, args: &[String]) -> std::io::Result<std::process::Output> {
    run_hidden_command_owned_ref(program, args)
}

#[cfg(target_os = "windows")]
fn decode_process_output(bytes: &[u8]) -> String {
    decode_output(bytes)
}

#[cfg(not(target_os = "windows"))]
fn decode_process_output(bytes: &[u8]) -> String {
    decode_output(bytes)
}

#[cfg(target_os = "windows")]
fn taskkill_hidden(pid: u32) -> Result<std::process::Output, String> {
    let args = vec!["/PID".to_string(), pid.to_string(), "/F".to_string()];
    run_hidden_owned("taskkill", &args).map_err(|e| format!("Failed to run taskkill: {}", e))
}

#[cfg(not(target_os = "windows"))]
fn taskkill_hidden(_pid: u32) -> Result<std::process::Output, String> {
    Err("Unsupported platform".to_string())
}

#[cfg(target_os = "windows")]
fn process_exit_error(output: &std::process::Output) -> String {
    let stderr = decode_process_output(&output.stderr);
    if stderr.trim().is_empty() {
        decode_process_output(&output.stdout)
    } else {
        stderr
    }
}

#[cfg(not(target_os = "windows"))]
fn process_exit_error(output: &std::process::Output) -> String {
    let stderr = decode_process_output(&output.stderr);
    if stderr.trim().is_empty() {
        decode_process_output(&output.stdout)
    } else {
        stderr
    }
}

#[tauri::command]
pub async fn kill_process_with_privilege(pid: u32) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        if !check_system_privilege_sync()? {
            return Err("NEED_AUTH".to_string());
        }

        let output = taskkill_hidden(pid)?;
        if output.status.success() {
            Ok(())
        } else {
            Err(process_exit_error(&output))
        }
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn run_privileged_action(action: String, payload: Option<String>) -> Result<(), String> {
    match action.as_str() {
        "kill_process" => {
            let pid = payload
                .ok_or_else(|| "Missing payload".to_string())?
                .parse::<u32>()
                .map_err(|_| "Invalid pid".to_string())?;
            kill_process_with_privilege(pid).await
        }
        _ => Err(format!("Unknown privileged action: {}", action)),
    }
}

#[cfg(target_os = "windows")]
fn command_output_owned(program: &str, args: &[String]) -> Result<std::process::Output, String> {
    run_hidden_owned(program, args).map_err(|e| format!("Failed to run {}: {}", program, e))
}

#[cfg(not(target_os = "windows"))]
fn command_output_owned(program: &str, args: &[String]) -> Result<std::process::Output, String> {
    run_hidden_owned(program, args).map_err(|e| format!("Failed to run {}: {}", program, e))
}

#[cfg(target_os = "windows")]
fn command_output(program: &str, args: &[&str]) -> Result<std::process::Output, String> {
    run_hidden_args(program, args).map_err(|e| format!("Failed to run {}: {}", program, e))
}

#[cfg(not(target_os = "windows"))]
fn command_output(program: &str, args: &[&str]) -> Result<std::process::Output, String> {
    run_hidden_args(program, args).map_err(|e| format!("Failed to run {}: {}", program, e))
}


/// 环境变量信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvVarInfo {
    /// 变量名
    pub name: String,
    /// 变量值（展开后）
    pub value: String,
    /// 是否存在
    pub exists: bool,
    /// 来源: "user" / "system" / "none"
    pub scope: String,
}

/// 读取环境变量（先查用户级，再查系统级，返回第一个找到的）
#[tauri::command]
pub async fn get_user_env_var(name: String) -> Result<EnvVarInfo, String> {
    let var_name = name.clone();
    tokio::task::spawn_blocking(move || {
        read_env_var_sync(&var_name)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// 从指定 scope 读取环境变量
#[tauri::command]
pub async fn get_env_var_scoped(name: String, scope: String) -> Result<EnvVarInfo, String> {
    let var_name = name.clone();
    let var_scope = scope.clone();
    tokio::task::spawn_blocking(move || {
        read_env_var_scoped_sync(&var_name, &var_scope)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// 获取合并后的完整 PATH（用户 PATH + 系统 PATH）
#[tauri::command]
pub async fn get_merged_path() -> Result<String, String> {
    tokio::task::spawn_blocking(|| {
        get_merged_path_sync()
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// 设置环境变量（根据 scope 写入 HKLM 或 HKCU）
#[tauri::command]
pub async fn set_user_env_var(name: String, value: String, scope: Option<String>) -> Result<(), String> {
    let var_name = name.clone();
    let var_value = value.clone();
    let var_scope = scope.unwrap_or_else(|| "user".to_string());
    tokio::task::spawn_blocking(move || {
        set_env_var_sync(&var_name, &var_value, &var_scope)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// 批量环境变量条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvVarEntry {
    pub name: String,
    pub value: String,
}

/// 批量设置环境变量（系统级时只弹一次 UAC）
#[tauri::command]
pub async fn set_env_vars_batch(entries: Vec<EnvVarEntry>, scope: Option<String>) -> Result<(), String> {
    let var_scope = scope.unwrap_or_else(|| "user".to_string());
    tokio::task::spawn_blocking(move || {
        set_env_vars_batch_sync(&entries, &var_scope)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// 检查系统权限是否已授权
#[tauri::command]
pub async fn check_system_privilege() -> Result<bool, String> {
    tokio::task::spawn_blocking(|| {
        check_system_privilege_sync()
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// 执行系统权限授权（设置页面调用，会弹一次 UAC）
#[tauri::command]
pub async fn setup_system_privilege() -> Result<(), String> {
    tokio::task::spawn_blocking(|| {
        setup_system_privilege_sync()
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// 广播环境变量更改（通知其他应用程序）
#[tauri::command]
pub async fn broadcast_env_change() -> Result<(), String> {
    tokio::task::spawn_blocking(|| {
        broadcast_env_change_sync()
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// 检测指定路径下的 SDK 版本
#[tauri::command]
pub async fn detect_sdk_version(
    sdk_type: String,
    sdk_path: String,
) -> Result<String, String> {
    let t = sdk_type.clone();
    let p = sdk_path.clone();
    tokio::task::spawn_blocking(move || {
        detect_version_sync(&t, &p)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// 列出指定目录下的子目录
#[tauri::command]
pub async fn list_subdirs(path: String) -> Result<Vec<String>, String> {
    let p = path.clone();
    tokio::task::spawn_blocking(move || {
        let mut dirs = Vec::new();
        let read_dir = std::fs::read_dir(&p)
            .map_err(|e| format!("Cannot read directory {}: {}", p, e))?;
        for entry in read_dir.flatten() {
            if let Ok(ft) = entry.file_type() {
                if ft.is_dir() {
                    dirs.push(entry.path().to_string_lossy().to_string());
                }
            }
        }
        Ok(dirs)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

/// PATH 中的 SDK 信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SdkInPathInfo {
    /// 可执行文件完整路径
    pub exe_path: String,
    /// 推断的 SDK 根目录
    pub sdk_path: String,
    /// 版本号
    pub version: String,
    /// 是否找到
    pub found: bool,
}

/// 从 PATH 中查找 SDK（当 HOME 变量未设置时使用）
/// 用 `where` 命令定位可执行文件，然后检测版本
#[tauri::command]
pub async fn find_sdk_in_path(sdk_type: String) -> Result<SdkInPathInfo, String> {
    let t = sdk_type.clone();
    tokio::task::spawn_blocking(move || {
        find_sdk_in_path_sync(&t)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

fn find_sdk_in_path_sync(sdk_type: &str) -> Result<SdkInPathInfo, String> {

    #[cfg(target_os = "windows")]
    let exe_name = match sdk_type {
        "java" => "java.exe",
        "maven" => "mvn.cmd",
        "nodejs" => "node.exe",
        "python" => "python.exe",
        "go" => "go.exe",
        _ => return Err(format!("Unknown SDK type: {}", sdk_type)),
    };

    #[cfg(not(target_os = "windows"))]
    let exe_name = match sdk_type {
        "java" => "java",
        "maven" => "mvn",
        "nodejs" => "node",
        "python" => "python3",
        "go" => "go",
        _ => return Err(format!("Unknown SDK type: {}", sdk_type)),
    };

    #[cfg(target_os = "windows")]
    let find_cmd = "where";
    #[cfg(not(target_os = "windows"))]
    let find_cmd = "which";

    let output = command_output(find_cmd, &[exe_name])?;

    // Windows 中文系统 where 的输出编码通常是 GBK,from_utf8_lossy 会让中文路径出乱码,
    // 接下来的 process_found_exe 用乱码路径去拼 sdk_path / 跑 version 命令必然失败。
    // decode_process_output 在 Windows 下走 GBK→UTF-8 兜底,行为和 shell.rs / port.rs 一致。
    let stdout = decode_process_output(&output.stdout);
    let first_line = stdout.lines().next().unwrap_or("").trim();

    if first_line.is_empty() || !output.status.success() {
        // Windows: where 找不到 mvn.cmd 时尝试 mvn.bat
        #[cfg(target_os = "windows")]
        if sdk_type == "maven" {
            let output2 = command_output("where", &["mvn.bat"])?;
            let stdout2 = decode_process_output(&output2.stdout);
            let line2 = stdout2.lines().next().unwrap_or("").trim();
            if !line2.is_empty() && output2.status.success() {
                return process_found_exe(sdk_type, line2);
            }
        }
        return Ok(SdkInPathInfo {
            exe_path: String::new(),
            sdk_path: String::new(),
            version: String::new(),
            found: false,
        });
    }

    process_found_exe(sdk_type, first_line)
}

fn process_found_exe(sdk_type: &str, exe_path: &str) -> Result<SdkInPathInfo, String> {
    let path = std::path::Path::new(exe_path);

    // 推断 SDK 根目录：
    // java: C:\jdk\bin\java.exe → C:\jdk
    // maven: C:\maven\bin\mvn.cmd → C:\maven
    // nodejs: C:\nodejs\node.exe → C:\nodejs
    let sdk_path = match sdk_type {
        "java" | "maven" | "go" => {
            // exe 在 bin/ 下，取 parent 两次
            path.parent()  // bin/
                .and_then(|p| p.parent())  // sdk root
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default()
        }
        "nodejs" | "python" => {
            // exe 直接在根目录
            path.parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default()
        }
        _ => String::new(),
    };

    // 直接用找到的 exe 检测版本
    let version_args: Vec<&str> = match sdk_type {
        "java" => vec!["-version"],
        "maven" => vec!["--version"],
        "nodejs" => vec!["--version"],
        "python" => vec!["--version"],
        "go" => vec!["version"],
        _ => vec![],
    };

    let version = run_version_command(exe_path, &version_args, sdk_type)
        .unwrap_or_default();

    Ok(SdkInPathInfo {
        exe_path: exe_path.to_string(),
        sdk_path,
        version,
        found: true,
    })
}

// ============ Platform-specific implementations ============

#[cfg(target_os = "windows")]
fn read_env_var_sync(name: &str) -> Result<EnvVarInfo, String> {
    // 1. 先查用户级 HKCU\Environment
    if let Some(val) = read_registry_value(
        windows::Win32::System::Registry::HKEY_CURRENT_USER,
        "Environment",
        name,
    ) {
        return Ok(EnvVarInfo {
            name: name.to_string(),
            value: val,
            exists: true,
            scope: "user".to_string(),
        });
    }

    // 2. 再查系统级 HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment
    if let Some(val) = read_registry_value(
        windows::Win32::System::Registry::HKEY_LOCAL_MACHINE,
        r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment",
        name,
    ) {
        return Ok(EnvVarInfo {
            name: name.to_string(),
            value: val,
            exists: true,
            scope: "system".to_string(),
        });
    }

    Ok(EnvVarInfo {
        name: name.to_string(),
        value: String::new(),
        exists: false,
        scope: "none".to_string(),
    })
}

#[cfg(target_os = "windows")]
fn read_env_var_scoped_sync(name: &str, scope: &str) -> Result<EnvVarInfo, String> {
    let (root_key, sub_key_path) = match scope {
        "system" => (
            windows::Win32::System::Registry::HKEY_LOCAL_MACHINE,
            r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment",
        ),
        _ => (
            windows::Win32::System::Registry::HKEY_CURRENT_USER,
            "Environment",
        ),
    };

    if let Some(val) = read_registry_value(root_key, sub_key_path, name) {
        Ok(EnvVarInfo {
            name: name.to_string(),
            value: val,
            exists: true,
            scope: scope.to_string(),
        })
    } else {
        Ok(EnvVarInfo {
            name: name.to_string(),
            value: String::new(),
            exists: false,
            scope: "none".to_string(),
        })
    }
}

#[cfg(target_os = "windows")]
fn get_merged_path_sync() -> Result<String, String> {
    let user_path = read_registry_value(
        windows::Win32::System::Registry::HKEY_CURRENT_USER,
        "Environment",
        "Path",
    ).unwrap_or_default();

    let system_path = read_registry_value(
        windows::Win32::System::Registry::HKEY_LOCAL_MACHINE,
        r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment",
        "Path",
    ).unwrap_or_default();

    // Windows 合并顺序: 系统 PATH + 用户 PATH
    let merged = if system_path.is_empty() {
        user_path
    } else if user_path.is_empty() {
        system_path
    } else {
        format!("{};{}", system_path, user_path)
    };

    Ok(merged)
}

/// 从注册表读取一个值，返回 Some(展开后的值) 或 None
#[cfg(target_os = "windows")]
fn read_registry_value(
    root_key: windows::Win32::System::Registry::HKEY,
    sub_key_path: &str,
    value_name: &str,
) -> Option<String> {
    use windows::Win32::System::Registry::*;
    use windows::core::HSTRING;

    unsafe {
        let sub_key = HSTRING::from(sub_key_path);
        let mut hkey = HKEY::default();

        let status = RegOpenKeyExW(
            root_key,
            &sub_key,
            Some(0),
            KEY_READ,
            &mut hkey,
        );

        if status.is_err() {
            return None;
        }

        let vname = HSTRING::from(value_name);
        let mut data_type = REG_VALUE_TYPE::default();
        let mut data_size: u32 = 0;

        // First call to get size
        let status = RegQueryValueExW(
            hkey,
            &vname,
            None,
            Some(&mut data_type),
            None,
            Some(&mut data_size),
        );

        if status.is_err() || data_size == 0 {
            let _ = RegCloseKey(hkey);
            return None;
        }

        let mut buffer = vec![0u8; data_size as usize];
        let status = RegQueryValueExW(
            hkey,
            &vname,
            None,
            Some(&mut data_type),
            Some(buffer.as_mut_ptr()),
            Some(&mut data_size),
        );

        let _ = RegCloseKey(hkey);

        if status.is_err() {
            return None;
        }

        // Decode as UTF-16LE
        let value = decode_reg_sz(&buffer, data_size as usize);

        // If it's REG_EXPAND_SZ, expand environment variables
        let value = if data_type == REG_EXPAND_SZ {
            expand_env_strings(&value)
        } else {
            value
        };

        Some(value)
    }
}

#[cfg(target_os = "windows")]
fn set_env_var_sync(name: &str, value: &str, scope: &str) -> Result<(), String> {
    use windows::Win32::System::Registry::*;
    use windows::core::HSTRING;

    let (root_key, sub_key_path) = match scope {
        "system" => (
            HKEY_LOCAL_MACHINE,
            r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment",
        ),
        _ => (HKEY_CURRENT_USER, "Environment"),
    };

    // 系统级只需要 KEY_SET_VALUE（和 ACL 授予的权限匹配）
    let access = if scope == "system" { KEY_SET_VALUE } else { KEY_WRITE };

    unsafe {
        let sub_key = HSTRING::from(sub_key_path);
        let mut hkey = HKEY::default();

        let status = RegOpenKeyExW(
            root_key,
            &sub_key,
            Some(0),
            access,
            &mut hkey,
        );

        if status.is_err() {
            if scope == "system" {
                return Err("NEED_AUTH".to_string());
            }
            return Err(format!("Failed to open registry key: {:?}", status));
        }

        let value_name = HSTRING::from(name);
        let wide: Vec<u16> = value.encode_utf16().chain(std::iter::once(0)).collect();
        let bytes: &[u8] = std::slice::from_raw_parts(
            wide.as_ptr() as *const u8,
            wide.len() * 2,
        );

        let reg_type = if name.eq_ignore_ascii_case("Path") {
            REG_EXPAND_SZ
        } else {
            REG_SZ
        };

        let status = RegSetValueExW(
            hkey,
            &value_name,
            None,
            reg_type,
            Some(bytes),
        );

        let _ = RegCloseKey(hkey);

        if status.is_err() {
            return Err(format!("Failed to set registry value: {:?}", status));
        }

        Ok(())
    }
}

/// 检查当前用户是否有 HKLM Environment 的写入权限
#[cfg(target_os = "windows")]
fn check_system_privilege_sync() -> Result<bool, String> {
    use windows::Win32::System::Registry::*;
    use windows::core::HSTRING;

    let sub_key_path = r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment";
    let sub_key = HSTRING::from(sub_key_path);
    let mut hkey = HKEY::default();

    let status = unsafe {
        RegOpenKeyExW(HKEY_LOCAL_MACHINE, &sub_key, Some(0), KEY_SET_VALUE, &mut hkey)
    };

    if status.is_ok() {
        unsafe { let _ = RegCloseKey(hkey); }
        Ok(true)
    } else {
        Ok(false)
    }
}

/// 通过 UAC 提权给当前用户授予 HKLM Environment 的写入权限（一次性操作）
/// 原理：用 PowerShell Start-Process -Verb RunAs 触发 UAC，运行 .ps1 脚本修改注册表 ACL
#[cfg(target_os = "windows")]
fn setup_system_privilege_sync() -> Result<(), String> {
    use std::io::Write;

    // 如果已经有权限，直接返回
    if let Ok(true) = check_system_privilege_sync() {
        return Ok(());
    }

    // 获取当前用户名
    let username = std::env::var("USERNAME")
        .map_err(|_| "Cannot get USERNAME".to_string())?;
    let userdomain = std::env::var("USERDOMAIN").unwrap_or_default();
    let raw_user = if userdomain.is_empty() {
        username
    } else {
        format!(r"{}\{}", userdomain, username)
    };
    // PowerShell 单引号字符串里只有 `'` 需要转义为 `''`,其他字符(包括反斜杠、$、")都按字面量处理。
    // 旧实现直接把 raw_user 拼进 ps_content 的单引号字符串,理论上 USERNAME 受 OS 控制,
    // 但若进程继承自被污染的环境(启动器构造的环境变量含 `'`),会以管理员权限注入 PS 命令。
    // 这里转义后嵌入,即使 raw_user 含 `'` 也只能作为字符串常量。
    let full_user = raw_user.replace('\'', "''");

    let temp_dir = std::env::temp_dir();

    // 1. 写 .ps1 脚本（ACL 授权 + 写结果文件）
    let ps_file = temp_dir.join("toolhub_grant_acl.ps1");
    let ok_file = temp_dir.join("toolhub_auth_ok.txt");
    let err_file = temp_dir.join("toolhub_auth_err.txt");

    // 清理旧的结果文件
    let _ = std::fs::remove_file(&ok_file);
    let _ = std::fs::remove_file(&err_file);

    let ps_content = format!(
        r#"$ErrorActionPreference = 'Stop'
try {{
    $key = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey(
        'SYSTEM\CurrentControlSet\Control\Session Manager\Environment',
        'ReadWriteSubTree', 'ChangePermissions')
    $acl = $key.GetAccessControl()
    $rule = New-Object System.Security.AccessControl.RegistryAccessRule(
        '{user}', 'SetValue', 'Allow')
    $acl.AddAccessRule($rule)
    $key.SetAccessControl($acl)
    $key.Close()
    'OK' | Out-File -FilePath '{ok}' -Encoding utf8
}} catch {{
    $_.Exception.Message | Out-File -FilePath '{err}' -Encoding utf8
}}
"#,
        user = full_user,
        // PowerShell 单引号字符串里 ' 必须 → '' 转义。
        // TEMP 目录路径理论上不会含 ',但若用户 USERPROFILE 被改成奇怪路径,
        // 不转义会让 Out-File 的目标路径提前闭合,有可能注入 PS 命令。
        ok = ok_file.to_string_lossy().replace('\'', "''"),
        err = err_file.to_string_lossy().replace('\'', "''"),
    );

    let mut f = std::fs::File::create(&ps_file)
        .map_err(|e| format!("Failed to create ps1: {}", e))?;
    f.write_all(ps_content.as_bytes())
        .map_err(|e| format!("Failed to write ps1: {}", e))?;
    drop(f);

    // 2. 用非提权 PowerShell 启动提权 PowerShell（Start-Process -Verb RunAs -Wait）
    //    -Wait 确保同步等到脚本执行完毕
    let inner_args = format!(
        "'-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File','{}'",
        ps_file.to_string_lossy().replace('\'', "''")
    );
    let cmd = format!(
        "Start-Process -FilePath powershell.exe -ArgumentList @({}) -Verb RunAs -Wait",
        inner_args
    );

    let output = command_output_owned(
        "powershell.exe",
        &[
            "-NoProfile".to_string(),
            "-ExecutionPolicy".to_string(),
            "Bypass".to_string(),
            "-WindowStyle".to_string(),
            "Hidden".to_string(),
            "-Command".to_string(),
            cmd.clone(),
        ],
    )?;

    // 清理脚本
    let _ = std::fs::remove_file(&ps_file);

    // 3. 检查结果
    if ok_file.exists() {
        let _ = std::fs::remove_file(&ok_file);
        let _ = std::fs::remove_file(&err_file);
        return Ok(());
    }

    if err_file.exists() {
        let msg = std::fs::read_to_string(&err_file).unwrap_or_default();
        let _ = std::fs::remove_file(&err_file);
        return Err(format!("授权脚本执行失败: {}", msg.trim()));
    }

    // 4. 结果文件都没有 → 用户取消了 UAC 或 PowerShell 启动失败
    let stderr = decode_process_output(&output.stderr);
    if !output.status.success() || !stderr.is_empty() {
        return Err(format!("授权失败: {}", stderr.trim()));
    }

    // 5. 最终验证：实际尝试打开注册表写权限
    if let Ok(true) = check_system_privilege_sync() {
        return Ok(());
    }

    Err("授权未生效，请重试 / Authorization did not take effect".to_string())
}

/// 批量写入环境变量：直接写注册表
#[cfg(target_os = "windows")]
fn set_env_vars_batch_sync(entries: &[EnvVarEntry], scope: &str) -> Result<(), String> {
    for e in entries {
        set_env_var_sync(&e.name, &e.value, scope)?;
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn broadcast_env_change_sync() -> Result<(), String> {
    // setx 会自动广播 WM_SETTINGCHANGE
    let _ = command_output("cmd.exe", &["/c", "setx", "TOOLHUB_ENV_REFRESH", "1"]);
    let _ = command_output("cmd.exe", &["/c", "reg", "delete", r"HKCU\Environment", "/v", "TOOLHUB_ENV_REFRESH", "/f"]);
    Ok(())
}

#[cfg(target_os = "windows")]
fn decode_reg_sz(buffer: &[u8], size: usize) -> String {
    let len = size / 2;
    let wide: Vec<u16> = (0..len)
        .map(|i| u16::from_le_bytes([buffer[i * 2], buffer[i * 2 + 1]]))
        .collect();
    let trimmed: &[u16] = match wide.iter().position(|&c| c == 0) {
        Some(pos) => &wide[..pos],
        None => &wide,
    };
    String::from_utf16_lossy(trimmed)
}

#[cfg(target_os = "windows")]
fn expand_env_strings(input: &str) -> String {
    let wide_input: Vec<u16> = input.encode_utf16().chain(std::iter::once(0)).collect();
    let mut buffer = vec![0u16; 32768];

    unsafe {
        use windows::Win32::System::Environment::ExpandEnvironmentStringsW;
        use windows::core::PCWSTR;

        let len = ExpandEnvironmentStringsW(
            PCWSTR(wide_input.as_ptr()),
            Some(&mut buffer),
        );
        if len > 0 && (len as usize) <= buffer.len() {
            let result = &buffer[..(len as usize - 1)];
            String::from_utf16_lossy(result)
        } else {
            input.to_string()
        }
    }
}

// ============ SDK version detection ============

fn detect_version_sync(sdk_type: &str, sdk_path: &str) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let (exe_relative, args) = match sdk_type {
        "java" => ("bin/java.exe", vec!["-version"]),
        "maven" => ("bin/mvn.cmd", vec!["--version"]),
        "nodejs" => ("node.exe", vec!["--version"]),
        "python" => ("python.exe", vec!["--version"]),
        "go" => ("bin/go.exe", vec!["version"]),
        _ => return Err(format!("Unknown SDK type: {}", sdk_type)),
    };

    #[cfg(not(target_os = "windows"))]
    let (exe_relative, args) = match sdk_type {
        "java" => ("bin/java", vec!["-version"]),
        "maven" => ("bin/mvn", vec!["--version"]),
        "nodejs" => ("bin/node", vec!["--version"]),
        "python" => ("bin/python3", vec!["--version"]),
        "go" => ("bin/go", vec!["version"]),
        _ => return Err(format!("Unknown SDK type: {}", sdk_type)),
    };

    let exe_path = std::path::Path::new(sdk_path).join(exe_relative);
    if !exe_path.exists() {
        // Try alternative executable names
        #[cfg(target_os = "windows")]
        let alt = match sdk_type {
            "maven" => Some(std::path::Path::new(sdk_path).join("bin/mvn.bat")),
            _ => None,
        };
        #[cfg(not(target_os = "windows"))]
        let alt: Option<std::path::PathBuf> = match sdk_type {
            // macOS: python3 not found, try python; node might be at root level
            "python" => Some(std::path::Path::new(sdk_path).join("bin/python")),
            "nodejs" => Some(std::path::Path::new(sdk_path).join("node")),
            _ => None,
        };
        if let Some(alt_path) = alt {
            if !alt_path.exists() {
                return Err(format!("Executable not found: {}", exe_path.display()));
            }
            return run_version_command(&alt_path.to_string_lossy(), &args, sdk_type);
        }
        return Err(format!("Executable not found: {}", exe_path.display()));
    }

    run_version_command(&exe_path.to_string_lossy(), &args, sdk_type)
}

fn run_version_command(exe: &str, args: &[&str], sdk_type: &str) -> Result<String, String> {

    let owned_args: Vec<String> = args.iter().map(|arg| (*arg).to_string()).collect();
    let output = command_output_owned(exe, &owned_args)?;

    let stdout = decode_process_output(&output.stdout);
    let stderr = decode_process_output(&output.stderr);
    let combined = format!("{}{}", stdout, stderr);

    let version = match sdk_type {
        "java" => extract_java_version(&combined),
        "maven" => extract_maven_version(&combined),
        "nodejs" => extract_node_version(&combined),
        "python" => extract_python_version(&combined),
        "go" => extract_go_version(&combined),
        _ => None,
    };

    version.ok_or_else(|| {
        format!(
            "Could not parse version from output: {}",
            combined.chars().take(200).collect::<String>()
        )
    })
}

fn extract_java_version(text: &str) -> Option<String> {
    // java version "1.8.0_441" or openjdk version "21.0.1"
    if let Some(pos) = text.find("version \"") {
        let start = pos + 9;
        if let Some(end) = text[start..].find('"') {
            return Some(text[start..start + end].to_string());
        }
    }
    None
}

fn extract_maven_version(text: &str) -> Option<String> {
    // Apache Maven 3.9.9
    if let Some(pos) = text.find("Apache Maven ") {
        let start = pos + 13;
        let version: String = text[start..]
            .chars()
            .take_while(|c| c.is_ascii_digit() || *c == '.')
            .collect();
        if !version.is_empty() {
            return Some(version);
        }
    }
    None
}

fn extract_node_version(text: &str) -> Option<String> {
    // v22.20.0
    for line in text.lines() {
        let trimmed = line.trim().trim_start_matches('v');
        if !trimmed.is_empty() && trimmed.chars().next().map_or(false, |c| c.is_ascii_digit()) {
            let version: String = trimmed
                .chars()
                .take_while(|c| c.is_ascii_digit() || *c == '.')
                .collect();
            if version.contains('.') {
                return Some(version);
            }
        }
    }
    None
}

fn extract_python_version(text: &str) -> Option<String> {
    // Python 3.12.0
    if let Some(pos) = text.find("Python ") {
        let start = pos + 7;
        let version: String = text[start..]
            .chars()
            .take_while(|c| c.is_ascii_digit() || *c == '.')
            .collect();
        if !version.is_empty() {
            return Some(version);
        }
    }
    None
}

fn extract_go_version(text: &str) -> Option<String> {
    // go version go1.22.0 windows/amd64
    if let Some(pos) = text.find("go version go") {
        let start = pos + 13; // skip "go version go"
        let version: String = text[start..]
            .chars()
            .take_while(|c| c.is_ascii_digit() || *c == '.')
            .collect();
        if !version.is_empty() {
            return Some(version);
        }
    }
    None
}

// ============ macOS / Linux: shell profile based env management ============

#[cfg(not(target_os = "windows"))]
fn toolhub_env_path() -> std::path::PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    std::path::PathBuf::from(home).join(".toolhub_env")
}

/// Parse ~/.toolhub_env for `export NAME=VALUE` lines
#[cfg(not(target_os = "windows"))]
fn parse_toolhub_env() -> std::collections::HashMap<String, String> {
    use std::collections::HashMap;
    let mut map = HashMap::new();
    let path = toolhub_env_path();
    if let Ok(content) = std::fs::read_to_string(&path) {
        for line in content.lines() {
            let trimmed = line.trim();
            if let Some(rest) = trimmed.strip_prefix("export ") {
                if let Some(eq) = rest.find('=') {
                    let key = rest[..eq].trim().to_string();
                    let val = rest[eq + 1..].trim().trim_matches('"').trim_matches('\'').to_string();
                    if !key.is_empty() {
                        map.insert(key, val);
                    }
                }
            }
        }
    }
    map
}

/// Write all vars back to ~/.toolhub_env
#[cfg(not(target_os = "windows"))]
fn write_toolhub_env(vars: &std::collections::HashMap<String, String>) -> Result<(), String> {
    let path = toolhub_env_path();
    let mut lines: Vec<String> = Vec::new();
    lines.push("# Managed by ToolHub — do not edit manually".to_string());
    // Sort keys for stable output
    let mut keys: Vec<&String> = vars.keys().collect();
    keys.sort();
    for key in keys {
        let val = &vars[key];
        // Quote values containing spaces or special chars
        if val.contains(' ') || val.contains('$') {
            lines.push(format!("export {}=\"{}\"", key, val));
        } else {
            lines.push(format!("export {}={}", key, val));
        }
    }
    lines.push(String::new()); // trailing newline
    std::fs::write(&path, lines.join("\n"))
        .map_err(|e| format!("Failed to write {}: {}", path.display(), e))
}

/// Ensure `source ~/.toolhub_env` is present in the user's shell rc file
#[cfg(not(target_os = "windows"))]
fn ensure_source_in_shell_rc() -> Result<(), String> {
    let home = std::env::var("HOME").map_err(|_| "Cannot determine home directory")?;
    let home = std::path::PathBuf::from(home);
    let env_path = toolhub_env_path();

    // Create the env file if it doesn't exist
    if !env_path.exists() {
        std::fs::write(&env_path, "# Managed by ToolHub — do not edit manually\n")
            .map_err(|e| format!("Failed to create {}: {}", env_path.display(), e))?;
    }

    let source_line = format!(
        "\n# ToolHub SDK Manager\n[ -f \"{}\" ] && source \"{}\"\n",
        env_path.display(),
        env_path.display()
    );

    let marker = ".toolhub_env";

    // Determine which rc files to patch
    let shell = std::env::var("SHELL").unwrap_or_default();
    let mut rc_files: Vec<std::path::PathBuf> = Vec::new();
    if shell.contains("zsh") {
        rc_files.push(home.join(".zshrc"));
    } else if shell.contains("bash") {
        rc_files.push(home.join(".bash_profile"));
        rc_files.push(home.join(".bashrc"));
    } else {
        // Default: try both
        rc_files.push(home.join(".zshrc"));
        rc_files.push(home.join(".bash_profile"));
    }

    for rc in &rc_files {
        let content = std::fs::read_to_string(rc).unwrap_or_default();
        if !content.contains(marker) {
            std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(rc)
                .and_then(|mut f| {
                    use std::io::Write;
                    f.write_all(source_line.as_bytes())
                })
                .map_err(|e| format!("Failed to patch {}: {}", rc.display(), e))?;
        }
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn read_env_var_sync(name: &str) -> Result<EnvVarInfo, String> {
    // 1. Check ~/.toolhub_env first
    let env_map = parse_toolhub_env();
    if let Some(val) = env_map.get(name) {
        return Ok(EnvVarInfo {
            name: name.to_string(),
            value: val.clone(),
            exists: true,
            scope: "user".to_string(),
        });
    }

    // 2. Fallback to process environment
    let value = std::env::var(name).unwrap_or_default();
    Ok(EnvVarInfo {
        name: name.to_string(),
        exists: !value.is_empty(),
        value,
        scope: if value.is_empty() { "none" } else { "process" }.to_string(),
    })
}

#[cfg(not(target_os = "windows"))]
fn read_env_var_scoped_sync(name: &str, _scope: &str) -> Result<EnvVarInfo, String> {
    read_env_var_sync(name)
}

#[cfg(not(target_os = "windows"))]
fn get_merged_path_sync() -> Result<String, String> {
    Ok(std::env::var("PATH").unwrap_or_default())
}

#[cfg(not(target_os = "windows"))]
fn set_env_var_sync(name: &str, value: &str, _scope: &str) -> Result<(), String> {
    ensure_source_in_shell_rc()?;
    let mut vars = parse_toolhub_env();
    vars.insert(name.to_string(), value.to_string());
    write_toolhub_env(&vars)
}

#[cfg(not(target_os = "windows"))]
fn set_env_vars_batch_sync(entries: &[EnvVarEntry], _scope: &str) -> Result<(), String> {
    ensure_source_in_shell_rc()?;
    let mut vars = parse_toolhub_env();
    for entry in entries {
        vars.insert(entry.name.clone(), entry.value.clone());
    }
    write_toolhub_env(&vars)
}

#[cfg(not(target_os = "windows"))]
fn check_system_privilege_sync() -> Result<bool, String> {
    // macOS: no elevation needed, shell profile is user-writable
    Ok(true)
}

#[cfg(not(target_os = "windows"))]
fn setup_system_privilege_sync() -> Result<(), String> {
    // macOS: no-op
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn broadcast_env_change_sync() -> Result<(), String> {
    // macOS: no equivalent of WM_SETTINGCHANGE
    Ok(())
}
