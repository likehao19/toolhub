//! 硬件信息查询模块
//!
//! 通过 PowerShell 的 Get-CimInstance 查询 WMI 获取系统硬件信息

use serde::{Deserialize, Serialize};

use super::shell::{decode_output, run_hidden_command_owned_ref};

// ── 数据结构 ──────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CpuInfo {
    pub name: String,
    pub manufacturer: String,
    pub cores: u32,
    pub logical_processors: u32,
    pub max_clock_speed_mhz: u32,
    pub current_clock_speed_mhz: u32,
    pub l2_cache_kb: u32,
    pub l3_cache_kb: u32,
    pub architecture: String,
    pub socket: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MotherboardInfo {
    pub manufacturer: String,
    pub product: String,
    pub version: String,
    pub serial_number: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MemoryStick {
    pub manufacturer: String,
    pub capacity_gb: f64,
    pub speed_mhz: u32,
    pub memory_type: String,
    pub form_factor: String,
    pub part_number: String,
    pub bank_label: String,
    pub device_locator: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GpuInfo {
    pub name: String,
    pub driver_version: String,
    pub adapter_ram_gb: f64,
    pub video_processor: String,
    pub current_resolution: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub name: String,
    pub manufacturer: String,
    pub screen_width: u32,
    pub screen_height: u32,
    pub pixels_per_x: u32,
    pub pixels_per_y: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DiskInfo {
    pub model: String,
    pub size_gb: f64,
    pub interface_type: String,
    pub media_type: String,
    pub serial_number: String,
    pub firmware_revision: String,
    pub partitions: u32,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SoundDeviceInfo {
    pub name: String,
    pub manufacturer: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NetworkAdapterInfo {
    pub name: String,
    pub manufacturer: String,
    pub mac_address: String,
    pub speed_mbps: f64,
    pub adapter_type: String,
    pub net_connection_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OsOverview {
    pub name: String,
    pub version: String,
    pub build_number: String,
    pub architecture: String,
    pub computer_name: String,
    pub total_memory_gb: f64,
    pub install_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct HardwareInfo {
    pub os: OsOverview,
    pub cpu: Vec<CpuInfo>,
    pub motherboard: Vec<MotherboardInfo>,
    pub memory: Vec<MemoryStick>,
    pub gpu: Vec<GpuInfo>,
    pub monitor: Vec<MonitorInfo>,
    pub disk: Vec<DiskInfo>,
    pub sound: Vec<SoundDeviceInfo>,
    pub network: Vec<NetworkAdapterInfo>,
}

// ── PowerShell 脚本 ──────────────────────────────────────

/// 构建一次性 PowerShell 脚本，查询所有 WMI 类并以 JSON 返回
fn build_ps_script() -> String {
    r#"
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Safe-Array($v) { if ($v -eq $null) { @() } elseif ($v -is [Array]) { $v } else { @($v) } }

$os = Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber,OSArchitecture,CSName,TotalVisibleMemorySize,InstallDate
$cpu = Safe-Array (Get-CimInstance Win32_Processor | Select-Object Name,Manufacturer,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed,CurrentClockSpeed,L2CacheSize,L3CacheSize,Architecture,SocketDesignation)
$mb = Safe-Array (Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer,Product,Version,SerialNumber)
$mem = Safe-Array (Get-CimInstance Win32_PhysicalMemory | Select-Object Manufacturer,Capacity,Speed,SMBIOSMemoryType,FormFactor,PartNumber,BankLabel,DeviceLocator)
$gpu = Safe-Array (Get-CimInstance Win32_VideoController | Select-Object Name,DriverVersion,AdapterRAM,VideoProcessor,CurrentHorizontalResolution,CurrentVerticalResolution,Status)
$mon = Safe-Array (Get-CimInstance Win32_DesktopMonitor | Select-Object Name,MonitorManufacturer,ScreenWidth,ScreenHeight,PixelsPerXLogicalInch,PixelsPerYLogicalInch)
$disk = Safe-Array (Get-CimInstance Win32_DiskDrive | Select-Object Model,Size,InterfaceType,MediaType,SerialNumber,FirmwareRevision,Partitions,Status)
$snd = Safe-Array (Get-CimInstance Win32_SoundDevice | Select-Object Name,Manufacturer,Status)
$net = Safe-Array (Get-CimInstance Win32_NetworkAdapter -Filter "NetEnabled=True" | Select-Object Name,Manufacturer,MACAddress,Speed,AdapterType,NetConnectionID)

$result = @{
    os = $os
    cpu = $cpu
    mb = $mb
    mem = $mem
    gpu = $gpu
    mon = $mon
    disk = $disk
    snd = $snd
    net = $net
}

$result | ConvertTo-Json -Depth 3 -Compress
"#.to_string()
}

// ── JSON 解析辅助 ────────────────────────────────────────

fn json_str(v: &serde_json::Value, key: &str) -> String {
    v.get(key)
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string()
}

fn json_u32(v: &serde_json::Value, key: &str) -> u32 {
    v.get(key).and_then(|v| v.as_u64()).unwrap_or(0) as u32
}

fn json_f64(v: &serde_json::Value, key: &str) -> f64 {
    v.get(key).and_then(|v| v.as_f64()).unwrap_or(0.0)
}

fn as_array(v: &serde_json::Value) -> Vec<&serde_json::Value> {
    match v {
        serde_json::Value::Array(arr) => arr.iter().collect(),
        serde_json::Value::Object(_) => vec![v],
        _ => vec![],
    }
}

// ── 解析逻辑 ─────────────────────────────────────────────

fn parse_os(v: &serde_json::Value) -> OsOverview {
    let total_kb = json_f64(v, "TotalVisibleMemorySize");
    let install_date = json_str(v, "InstallDate");
    // 截取日期部分
    let install_short = if install_date.len() >= 10 {
        install_date[..10].to_string()
    } else {
        install_date
    };
    OsOverview {
        name: json_str(v, "Caption"),
        version: json_str(v, "Version"),
        build_number: json_str(v, "BuildNumber"),
        architecture: json_str(v, "OSArchitecture"),
        computer_name: json_str(v, "CSName"),
        total_memory_gb: (total_kb / 1024.0 / 1024.0 * 100.0).round() / 100.0,
        install_date: install_short,
    }
}

fn parse_cpu(items: Vec<&serde_json::Value>) -> Vec<CpuInfo> {
    items.iter().map(|v| {
        let arch_code = json_u32(v, "Architecture");
        let arch = match arch_code {
            0 => "x86",
            5 => "ARM",
            9 => "x64",
            12 => "ARM64",
            _ => "Unknown",
        }.to_string();
        CpuInfo {
            name: json_str(v, "Name"),
            manufacturer: json_str(v, "Manufacturer"),
            cores: json_u32(v, "NumberOfCores"),
            logical_processors: json_u32(v, "NumberOfLogicalProcessors"),
            max_clock_speed_mhz: json_u32(v, "MaxClockSpeed"),
            current_clock_speed_mhz: json_u32(v, "CurrentClockSpeed"),
            l2_cache_kb: json_u32(v, "L2CacheSize"),
            l3_cache_kb: json_u32(v, "L3CacheSize"),
            architecture: arch,
            socket: json_str(v, "SocketDesignation"),
        }
    }).collect()
}

fn parse_motherboard(items: Vec<&serde_json::Value>) -> Vec<MotherboardInfo> {
    items.iter().map(|v| MotherboardInfo {
        manufacturer: json_str(v, "Manufacturer"),
        product: json_str(v, "Product"),
        version: json_str(v, "Version"),
        serial_number: json_str(v, "SerialNumber"),
    }).collect()
}

fn memory_type_name(code: u32) -> String {
    match code {
        20 => "DDR",
        21 => "DDR2",
        22 => "DDR2 FB-DIMM",
        24 => "DDR3",
        26 => "DDR4",
        34 => "DDR5",
        _ => "Unknown",
    }.to_string()
}

fn form_factor_name(code: u32) -> String {
    match code {
        8 => "DIMM",
        12 => "SO-DIMM",
        _ => "Other",
    }.to_string()
}

fn parse_memory(items: Vec<&serde_json::Value>) -> Vec<MemoryStick> {
    items.iter().map(|v| {
        let cap = json_f64(v, "Capacity");
        MemoryStick {
            manufacturer: json_str(v, "Manufacturer"),
            capacity_gb: (cap / 1024.0 / 1024.0 / 1024.0 * 100.0).round() / 100.0,
            speed_mhz: json_u32(v, "Speed"),
            memory_type: memory_type_name(json_u32(v, "SMBIOSMemoryType")),
            form_factor: form_factor_name(json_u32(v, "FormFactor")),
            part_number: json_str(v, "PartNumber"),
            bank_label: json_str(v, "BankLabel"),
            device_locator: json_str(v, "DeviceLocator"),
        }
    }).collect()
}

fn parse_gpu(items: Vec<&serde_json::Value>) -> Vec<GpuInfo> {
    items.iter().map(|v| {
        let ram = json_f64(v, "AdapterRAM");
        let w = json_u32(v, "CurrentHorizontalResolution");
        let h = json_u32(v, "CurrentVerticalResolution");
        let res = if w > 0 && h > 0 { format!("{}x{}", w, h) } else { String::new() };
        GpuInfo {
            name: json_str(v, "Name"),
            driver_version: json_str(v, "DriverVersion"),
            adapter_ram_gb: (ram / 1024.0 / 1024.0 / 1024.0 * 100.0).round() / 100.0,
            video_processor: json_str(v, "VideoProcessor"),
            current_resolution: res,
            status: json_str(v, "Status"),
        }
    }).collect()
}

fn parse_monitor(items: Vec<&serde_json::Value>) -> Vec<MonitorInfo> {
    items.iter().map(|v| MonitorInfo {
        name: json_str(v, "Name"),
        manufacturer: json_str(v, "MonitorManufacturer"),
        screen_width: json_u32(v, "ScreenWidth"),
        screen_height: json_u32(v, "ScreenHeight"),
        pixels_per_x: json_u32(v, "PixelsPerXLogicalInch"),
        pixels_per_y: json_u32(v, "PixelsPerYLogicalInch"),
    }).collect()
}

fn parse_disk(items: Vec<&serde_json::Value>) -> Vec<DiskInfo> {
    items.iter().map(|v| {
        let sz = json_f64(v, "Size");
        DiskInfo {
            model: json_str(v, "Model"),
            size_gb: (sz / 1024.0 / 1024.0 / 1024.0 * 100.0).round() / 100.0,
            interface_type: json_str(v, "InterfaceType"),
            media_type: json_str(v, "MediaType"),
            serial_number: json_str(v, "SerialNumber"),
            firmware_revision: json_str(v, "FirmwareRevision"),
            partitions: json_u32(v, "Partitions"),
            status: json_str(v, "Status"),
        }
    }).collect()
}

fn parse_sound(items: Vec<&serde_json::Value>) -> Vec<SoundDeviceInfo> {
    items.iter().map(|v| SoundDeviceInfo {
        name: json_str(v, "Name"),
        manufacturer: json_str(v, "Manufacturer"),
        status: json_str(v, "Status"),
    }).collect()
}

fn parse_network(items: Vec<&serde_json::Value>) -> Vec<NetworkAdapterInfo> {
    items.iter().map(|v| {
        let speed = json_f64(v, "Speed");
        NetworkAdapterInfo {
            name: json_str(v, "Name"),
            manufacturer: json_str(v, "Manufacturer"),
            mac_address: json_str(v, "MACAddress"),
            speed_mbps: (speed / 1_000_000.0 * 100.0).round() / 100.0,
            adapter_type: json_str(v, "AdapterType"),
            net_connection_id: json_str(v, "NetConnectionID"),
        }
    }).collect()
}

// ── Tauri 命令 ───────────────────────────────────────────

fn get_hardware_info_sync() -> Result<HardwareInfo, String> {
    let script = build_ps_script();
    let args = vec![
        "-NoProfile".to_string(),
        "-NonInteractive".to_string(),
        "-Command".to_string(),
        script,
    ];

    let output = run_hidden_command_owned_ref("powershell", &args)
        .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

    if !output.status.success() {
        let stderr = decode_output(&output.stderr);
        return Err(format!("PowerShell error: {}", stderr));
    }

    let stdout = decode_output(&output.stdout);

    let root: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse JSON: {} — raw output: {}", e, &stdout[..stdout.len().min(500)]))?;

    let os_val = root.get("os").cloned().unwrap_or_default();
    let os = parse_os(&os_val);

    let cpu = parse_cpu(as_array(root.get("cpu").unwrap_or(&serde_json::Value::Null)));
    let motherboard = parse_motherboard(as_array(root.get("mb").unwrap_or(&serde_json::Value::Null)));
    let memory = parse_memory(as_array(root.get("mem").unwrap_or(&serde_json::Value::Null)));
    let gpu = parse_gpu(as_array(root.get("gpu").unwrap_or(&serde_json::Value::Null)));
    let monitor = parse_monitor(as_array(root.get("mon").unwrap_or(&serde_json::Value::Null)));
    let disk = parse_disk(as_array(root.get("disk").unwrap_or(&serde_json::Value::Null)));
    let sound = parse_sound(as_array(root.get("snd").unwrap_or(&serde_json::Value::Null)));
    let network = parse_network(as_array(root.get("net").unwrap_or(&serde_json::Value::Null)));

    Ok(HardwareInfo { os, cpu, motherboard, memory, gpu, monitor, disk, sound, network })
}

#[tauri::command]
pub async fn get_hardware_info() -> Result<HardwareInfo, String> {
    tokio::task::spawn_blocking(get_hardware_info_sync)
        .await
        .map_err(|e| format!("Task failed: {}", e))?
}
