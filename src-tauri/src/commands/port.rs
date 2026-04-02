use serde::{Deserialize, Serialize};

use super::shell::{decode_output, run_hidden_command_owned_ref};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortInfo {
    pub protocol: String,
    pub local_address: String,
    pub local_port: u16,
    pub remote_address: String,
    pub remote_port: Option<u16>,
    pub state: String,
    pub pid: u32,
    pub process_name: String,
    pub killable: bool,
}

fn run_command(program: &str, args: &[&str]) -> Result<std::process::Output, String> {
    let owned_args: Vec<String> = args.iter().map(|arg| (*arg).to_string()).collect();
    run_hidden_command_owned_ref(program, &owned_args)
        .map_err(|e| format!("Failed to run {}: {}", program, e))
}

fn decode_text(bytes: &[u8]) -> String {
    decode_output(bytes)
}

fn is_killable(pid: u32, process_name: &str) -> bool {
    if pid <= 4 {
        return false;
    }

    let lower = process_name.to_lowercase();
    !matches!(
        lower.as_str(),
        "system"
            | "idle"
            | "registry"
            | "smss.exe"
            | "csrss.exe"
            | "wininit.exe"
            | "winlogon.exe"
            | "services.exe"
            | "lsass.exe"
            | "lsaiso.exe"
            | "svchost.exe"
            | "fontdrvhost.exe"
            | "dwm.exe"
            | "memory compression"
            | "kernel_task"
            | "launchd"
            | "windowserver"
    )
}

#[cfg(target_os = "windows")]
fn parse_windows_endpoint(value: &str) -> Option<(String, Option<u16>)> {
    if let Some(rest) = value.strip_prefix('[') {
        let end = rest.find(']')?;
        let host = format!("[{}]", &rest[..end]);
        let tail = &rest[end + 1..];
        let port = tail.strip_prefix(':')?;
        let parsed_port = if port == "*" { None } else { port.parse::<u16>().ok() };
        return Some((host, parsed_port));
    }

    let idx = value.rfind(':')?;
    let host = value[..idx].to_string();
    let port = &value[idx + 1..];
    let parsed_port = if port == "*" { None } else { port.parse::<u16>().ok() };
    Some((host, parsed_port))
}

#[cfg(target_os = "windows")]
fn parse_windows_netstat(stdout: &str) -> Vec<PortInfo> {
    let mut results = Vec::new();

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || !(trimmed.starts_with("TCP") || trimmed.starts_with("UDP")) {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() < 4 {
            continue;
        }

        let protocol = parts[0].to_string();
        let (local_address, local_port) = match parse_windows_endpoint(parts[1]) {
            Some((address, Some(port))) => (address, port),
            _ => continue,
        };
        let (remote_address, remote_port) = match parse_windows_endpoint(parts[2]) {
            Some(parsed) => parsed,
            None => continue,
        };

        let (state, pid_str) = if protocol == "UDP" {
            (String::new(), *parts.get(3).unwrap_or(&"0"))
        } else {
            (
                parts.get(3).copied().unwrap_or_default().to_string(),
                *parts.get(4).unwrap_or(&"0"),
            )
        };

        let pid = match pid_str.parse::<u32>() {
            Ok(pid) => pid,
            Err(_) => continue,
        };

        results.push(PortInfo {
            protocol,
            local_address,
            local_port,
            remote_address,
            remote_port,
            state,
            pid,
            process_name: String::new(),
            killable: true,
        });
    }

    results
}

#[cfg(target_os = "windows")]
fn parse_tasklist(stdout: &str) -> std::collections::HashMap<u32, String> {
    let mut map = std::collections::HashMap::new();

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let columns: Vec<&str> = trimmed
            .split("\",\"")
            .map(|part| part.trim_matches('"'))
            .collect();

        if columns.len() < 2 {
            continue;
        }

        if let Ok(pid) = columns[1].parse::<u32>() {
            map.insert(pid, columns[0].to_string());
        }
    }

    map
}

#[cfg(target_os = "windows")]
fn list_ports_sync() -> Result<Vec<PortInfo>, String> {
    let netstat = run_command("netstat", &["-ano"])?;
    if !netstat.status.success() {
        return Err(decode_text(&netstat.stderr));
    }

    let tasklist = run_command("tasklist", &["/FO", "CSV", "/NH"])?;
    let name_map = if tasklist.status.success() {
        parse_tasklist(&decode_text(&tasklist.stdout))
    } else {
        std::collections::HashMap::new()
    };

    let mut ports = parse_windows_netstat(&decode_text(&netstat.stdout));
    for port in &mut ports {
        let process_name = name_map.get(&port.pid).cloned().unwrap_or_default();
        port.killable = is_killable(port.pid, &process_name);
        port.process_name = process_name;
    }

    Ok(ports)
}

#[cfg(not(target_os = "windows"))]
fn parse_mac_endpoint(value: &str) -> Option<(String, Option<u16>)> {
    let cleaned = value.split('(').next().unwrap_or(value).trim();
    let idx = cleaned.rfind(':')?;
    let host = cleaned[..idx].to_string();
    let port = cleaned[idx + 1..].parse::<u16>().ok()?;
    Some((if host.is_empty() { "*".to_string() } else { host }, Some(port)))
}

#[cfg(not(target_os = "windows"))]
fn list_ports_sync() -> Result<Vec<PortInfo>, String> {
    let output = run_command("lsof", &["-iTCP", "-iUDP", "-P", "-n"])?;
    if !output.status.success() {
        return Err(decode_text(&output.stderr));
    }

    let stdout = decode_text(&output.stdout);
    let mut results = Vec::new();

    for (index, line) in stdout.lines().enumerate() {
        if index == 0 || line.trim().is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 9 {
            continue;
        }

        let command = parts[0].to_string();
        let pid = match parts[1].parse::<u32>() {
            Ok(pid) => pid,
            Err(_) => continue,
        };
        let protocol = if parts[7].contains("UDP") { "UDP" } else if parts[4] == "IPv6" { "TCP6" } else { "TCP" }.to_string();
        let state = line
            .rsplit('(')
            .next()
            .and_then(|tail| tail.strip_suffix(')'))
            .unwrap_or_default()
            .to_string();
        let endpoint = parts.last().copied().unwrap_or_default();

        let (local_address, local_port, remote_address, remote_port) = if let Some((left, right)) = endpoint.split_once("->") {
            let (local_address, local_port) = match parse_mac_endpoint(left) {
                Some((address, Some(port))) => (address, port),
                _ => continue,
            };
            let (remote_address, remote_port) = match parse_mac_endpoint(right) {
                Some((address, port)) => (address, port),
                None => continue,
            };
            (local_address, local_port, remote_address, remote_port)
        } else {
            let (local_address, local_port) = match parse_mac_endpoint(endpoint) {
                Some((address, Some(port))) => (address, port),
                _ => continue,
            };
            (local_address, local_port, "*".to_string(), None)
        };

        results.push(PortInfo {
            protocol,
            local_address,
            local_port,
            remote_address,
            remote_port,
            state,
            pid,
            process_name: command.clone(),
            killable: is_killable(pid, &command),
        });
    }

    Ok(results)
}

#[tauri::command]
pub async fn list_ports() -> Result<Vec<PortInfo>, String> {
    tokio::task::spawn_blocking(list_ports_sync)
        .await
        .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "windows")]
        {
            if pid <= 4 {
                return Err("不能终止系统关键进程".to_string());
            }

            let output = run_command("taskkill", &["/PID", &pid.to_string(), "/F"])?;
            if output.status.success() {
                Ok(())
            } else {
                let stderr = decode_text(&output.stderr);
                if stderr.trim().is_empty() {
                    Err(decode_text(&output.stdout))
                } else {
                    Err(stderr)
                }
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            let output = run_command("kill", &["-9", &pid.to_string()])?;
            if output.status.success() {
                Ok(())
            } else {
                Err(decode_text(&output.stderr))
            }
        }
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}
