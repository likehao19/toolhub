//! 硬件信息查询模块
//!
//! Windows: PowerShell + Get-CimInstance 查询 WMI
//! macOS:   system_profiler -json
//! 其他平台: 返回不支持

use serde::{Deserialize, Serialize};

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

// ── Windows 实现 ────────────────────────────────────────

#[cfg(target_os = "windows")]
mod windows_impl {
    use super::*;
    use crate::commands::shell::{decode_output, run_hidden_command_owned_ref};

    /// 一次性 PowerShell 脚本，查询所有 WMI 类并以 JSON 返回
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

    fn json_str(v: &serde_json::Value, key: &str) -> String {
        v.get(key).and_then(|v| v.as_str()).unwrap_or("").trim().to_string()
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

    fn parse_os(v: &serde_json::Value) -> OsOverview {
        let total_kb = json_f64(v, "TotalVisibleMemorySize");
        let install_date = json_str(v, "InstallDate");
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
                0 => "x86", 5 => "ARM", 9 => "x64", 12 => "ARM64", _ => "Unknown",
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
            20 => "DDR", 21 => "DDR2", 22 => "DDR2 FB-DIMM", 24 => "DDR3", 26 => "DDR4", 34 => "DDR5",
            _ => "Unknown",
        }.to_string()
    }

    fn form_factor_name(code: u32) -> String {
        match code { 8 => "DIMM", 12 => "SO-DIMM", _ => "Other" }.to_string()
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

    pub fn get_hardware_info_sync() -> Result<HardwareInfo, String> {
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
}

// ── macOS 实现 ──────────────────────────────────────────

#[cfg(target_os = "macos")]
mod macos_impl {
    use super::*;

    fn jstr(v: &serde_json::Value, key: &str) -> String {
        v.get(key).and_then(|x| x.as_str()).unwrap_or("").trim().to_string()
    }

    fn first_obj<'a>(root: &'a serde_json::Value, key: &str) -> Option<&'a serde_json::Value> {
        root.get(key)?.as_array()?.first()
    }

    fn array_items<'a>(root: &'a serde_json::Value, key: &str) -> Vec<&'a serde_json::Value> {
        root.get(key)
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().collect())
            .unwrap_or_default()
    }

    /// "16 GB" → 16.0；"512 MB" → 0.5；"1 TB" → 1024.0；裸数字按 GB
    fn parse_size_gb(s: &str) -> f64 {
        let s_lower = s.trim().to_lowercase();
        let num: f64 = s_lower
            .split_whitespace()
            .next()
            .and_then(|n| n.parse::<f64>().ok())
            .unwrap_or(0.0);
        if s_lower.contains("tb") { num * 1024.0 }
        else if s_lower.contains("mb") { num / 1024.0 }
        else if s_lower.contains("kb") { num / 1024.0 / 1024.0 }
        else { num } // gb / 无单位
    }

    fn parse_speed_mhz(s: &str) -> u32 {
        s.trim().split_whitespace().next()
            .and_then(|n| n.parse::<u32>().ok())
            .unwrap_or(0)
    }

    /// "proc 10:8:2" → 10；"4" → 4
    fn parse_proc_count(s: &str) -> u32 {
        let trimmed = s.trim().trim_start_matches("proc").trim();
        trimmed.split([':', ' '])
            .next()
            .and_then(|n| n.parse::<u32>().ok())
            .unwrap_or(0)
    }

    fn parse_software(root: &serde_json::Value) -> OsOverview {
        let sw_owned = first_obj(root, "SPSoftwareDataType").cloned().unwrap_or_default();
        let hw_owned = first_obj(root, "SPHardwareDataType").cloned().unwrap_or_default();

        let os_version = jstr(&sw_owned, "os_version"); // "macOS 14.0 (23A344)"
        let kernel = jstr(&sw_owned, "kernel_version");
        let computer_name = {
            let name = jstr(&sw_owned, "local_host_name");
            if name.is_empty() { jstr(&sw_owned, "system_version") } else { name }
        };
        let physical_memory = jstr(&hw_owned, "physical_memory");
        let chip = jstr(&hw_owned, "chip_type");
        let cpu_type = jstr(&hw_owned, "cpu_type");

        let arch = if !chip.is_empty() {
            "arm64".to_string()
        } else if cpu_type.to_lowercase().contains("intel") {
            "x86_64".to_string()
        } else {
            std::env::consts::ARCH.to_string()
        };

        // "macOS 14.0 (23A344)" → version="14.0", build="23A344"
        let build = os_version
            .split('(').nth(1)
            .map(|s| s.trim_end_matches(')').trim().to_string())
            .unwrap_or_else(|| kernel.clone());
        let version = os_version
            .strip_prefix("macOS ")
            .map(|s| s.split('(').next().unwrap_or("").trim().to_string())
            .unwrap_or_else(|| os_version.clone());

        OsOverview {
            name: "macOS".to_string(),
            version,
            build_number: build,
            architecture: arch,
            computer_name,
            total_memory_gb: parse_size_gb(&physical_memory),
            install_date: String::new(),
        }
    }

    fn parse_cpu(root: &serde_json::Value) -> Vec<CpuInfo> {
        let hw = match first_obj(root, "SPHardwareDataType") {
            Some(v) => v,
            None => return vec![],
        };

        let chip = jstr(hw, "chip_type");
        let cpu_type = jstr(hw, "cpu_type");
        let name = if !chip.is_empty() { chip.clone() } else { cpu_type.clone() };
        let cores = parse_proc_count(&jstr(hw, "number_processors"));
        let manufacturer = if !chip.is_empty() { "Apple".to_string() } else { "Intel".to_string() };
        let arch = if !chip.is_empty() { "ARM64".to_string() } else { "x64".to_string() };

        if name.is_empty() {
            return vec![];
        }
        vec![CpuInfo {
            name,
            manufacturer,
            cores,
            logical_processors: cores,
            max_clock_speed_mhz: 0,
            current_clock_speed_mhz: 0,
            l2_cache_kb: 0,
            l3_cache_kb: 0,
            architecture: arch,
            socket: String::new(),
        }]
    }

    fn parse_motherboard(root: &serde_json::Value) -> Vec<MotherboardInfo> {
        let hw = match first_obj(root, "SPHardwareDataType") {
            Some(v) => v,
            None => return vec![],
        };
        vec![MotherboardInfo {
            manufacturer: "Apple".to_string(),
            product: jstr(hw, "machine_name"),
            version: jstr(hw, "machine_model"),
            serial_number: jstr(hw, "serial_number"),
        }]
    }

    fn parse_memory(root: &serde_json::Value) -> Vec<MemoryStick> {
        let mem_outer = match first_obj(root, "SPMemoryDataType") {
            Some(v) => v,
            None => return vec![],
        };

        // Intel/旧机型：嵌套 SPMemoryDataType 数组（每条 DIMM 一项）
        if let Some(items) = mem_outer.get("SPMemoryDataType").and_then(|v| v.as_array()) {
            return items.iter().map(|v| MemoryStick {
                manufacturer: jstr(v, "dimm_manufacturer"),
                capacity_gb: parse_size_gb(&jstr(v, "dimm_size")),
                speed_mhz: parse_speed_mhz(&jstr(v, "dimm_speed")),
                memory_type: jstr(v, "dimm_type"),
                form_factor: "DIMM".to_string(),
                part_number: jstr(v, "dimm_part_number"),
                bank_label: jstr(v, "_name"),
                device_locator: String::new(),
            }).collect();
        }

        // Apple Silicon：统一内存，一条虚拟"内存"项
        let physical_memory = first_obj(root, "SPHardwareDataType")
            .map(|hw| jstr(hw, "physical_memory"))
            .unwrap_or_default();
        if !physical_memory.is_empty() {
            vec![MemoryStick {
                manufacturer: "Apple".to_string(),
                capacity_gb: parse_size_gb(&physical_memory),
                speed_mhz: 0,
                memory_type: "Unified Memory".to_string(),
                form_factor: "Integrated".to_string(),
                part_number: String::new(),
                bank_label: String::new(),
                device_locator: String::new(),
            }]
        } else {
            vec![]
        }
    }

    fn parse_gpu(root: &serde_json::Value) -> Vec<GpuInfo> {
        array_items(root, "SPDisplaysDataType").iter().map(|v| {
            let vram = jstr(v, "spdisplays_vram_shared");
            let vram_dedicated = jstr(v, "spdisplays_vram");
            let vram_str = if !vram.is_empty() { vram } else { vram_dedicated };
            let vendor_raw = jstr(v, "spdisplays_vendor");
            let vendor = vendor_raw
                .strip_prefix("sppci_vendor_")
                .map(|s| s.to_string())
                .unwrap_or(vendor_raw);

            // 从 ndrvs[0] 取分辨率
            let res = v.get("spdisplays_ndrvs")
                .and_then(|x| x.as_array())
                .and_then(|arr| arr.first())
                .map(|d| jstr(d, "_spdisplays_resolution"))
                .unwrap_or_default();

            GpuInfo {
                name: jstr(v, "_name"),
                driver_version: jstr(v, "spdisplays_metalfamily"),
                adapter_ram_gb: parse_size_gb(&vram_str),
                video_processor: vendor,
                current_resolution: res,
                status: String::new(),
            }
        }).collect()
    }

    fn parse_monitor(root: &serde_json::Value) -> Vec<MonitorInfo> {
        let mut monitors = Vec::new();
        for gpu in array_items(root, "SPDisplaysDataType") {
            let ndrvs = match gpu.get("spdisplays_ndrvs").and_then(|v| v.as_array()) {
                Some(a) => a,
                None => continue,
            };
            for d in ndrvs {
                // pixels: "3024 x 1964"
                let pixels = jstr(d, "_spdisplays_pixels");
                let (w, h) = parse_resolution(&pixels);
                monitors.push(MonitorInfo {
                    name: jstr(d, "_name"),
                    manufacturer: jstr(d, "_spdisplays_display-vendor-id"),
                    screen_width: w,
                    screen_height: h,
                    pixels_per_x: 0,
                    pixels_per_y: 0,
                });
            }
        }
        monitors
    }

    fn parse_resolution(s: &str) -> (u32, u32) {
        let parts: Vec<&str> = s.split(['x', 'X', '×']).map(str::trim).collect();
        if parts.len() >= 2 {
            let w = parts[0].parse::<u32>().unwrap_or(0);
            let h = parts[1].split_whitespace().next()
                .and_then(|n| n.parse::<u32>().ok()).unwrap_or(0);
            (w, h)
        } else { (0, 0) }
    }

    fn parse_disk(root: &serde_json::Value) -> Vec<DiskInfo> {
        array_items(root, "SPStorageDataType").iter().map(|v| {
            let size_bytes = v.get("size_in_bytes").and_then(|x| x.as_u64()).unwrap_or(0) as f64;
            let physical = v.get("physical_drive").cloned().unwrap_or_default();
            DiskInfo {
                model: jstr(&physical, "device_name"),
                size_gb: (size_bytes / 1024.0 / 1024.0 / 1024.0 * 100.0).round() / 100.0,
                interface_type: jstr(&physical, "protocol"),
                media_type: jstr(&physical, "medium_type"),
                serial_number: String::new(),
                firmware_revision: String::new(),
                partitions: 0,
                status: jstr(&physical, "smart_status"),
            }
        }).collect()
    }

    fn parse_sound(root: &serde_json::Value) -> Vec<SoundDeviceInfo> {
        let mut sounds = Vec::new();
        for group in array_items(root, "SPAudioDataType") {
            // 顶层每个 group 有 _items 子数组，里面才是真实设备
            if let Some(items) = group.get("_items").and_then(|v| v.as_array()) {
                for d in items {
                    let name = jstr(d, "_name");
                    if name.is_empty() { continue; }
                    sounds.push(SoundDeviceInfo {
                        name,
                        manufacturer: jstr(d, "coreaudio_device_manufacturer"),
                        status: "OK".to_string(),
                    });
                }
            } else {
                let name = jstr(group, "_name");
                if !name.is_empty() {
                    sounds.push(SoundDeviceInfo {
                        name,
                        manufacturer: jstr(group, "coreaudio_device_manufacturer"),
                        status: "OK".to_string(),
                    });
                }
            }
        }
        sounds
    }

    fn parse_network(root: &serde_json::Value) -> Vec<NetworkAdapterInfo> {
        array_items(root, "SPNetworkDataType").iter().map(|v| {
            let mac = v.get("Ethernet")
                .and_then(|e| e.get("MAC Address"))
                .and_then(|m| m.as_str())
                .unwrap_or("")
                .to_string();
            NetworkAdapterInfo {
                name: jstr(v, "_name"),
                manufacturer: "Apple".to_string(),
                mac_address: mac,
                speed_mbps: 0.0,
                adapter_type: jstr(v, "type"),
                net_connection_id: jstr(v, "interface"),
            }
        }).collect()
    }

    pub fn get_hardware_info_sync() -> Result<HardwareInfo, String> {
        let output = std::process::Command::new("system_profiler")
            .args([
                "-json",
                "SPHardwareDataType",
                "SPMemoryDataType",
                "SPDisplaysDataType",
                "SPStorageDataType",
                "SPAudioDataType",
                "SPNetworkDataType",
                "SPSoftwareDataType",
            ])
            .output()
            .map_err(|e| format!("Failed to run system_profiler: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("system_profiler error: {}", stderr));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let root: serde_json::Value = serde_json::from_str(&stdout)
            .map_err(|e| format!("Failed to parse system_profiler JSON: {}", e))?;

        Ok(HardwareInfo {
            os: parse_software(&root),
            cpu: parse_cpu(&root),
            motherboard: parse_motherboard(&root),
            memory: parse_memory(&root),
            gpu: parse_gpu(&root),
            monitor: parse_monitor(&root),
            disk: parse_disk(&root),
            sound: parse_sound(&root),
            network: parse_network(&root),
        })
    }
}

// ── Tauri 命令 ───────────────────────────────────────────

fn get_hardware_info_sync() -> Result<HardwareInfo, String> {
    #[cfg(target_os = "windows")]
    { return windows_impl::get_hardware_info_sync(); }

    #[cfg(target_os = "macos")]
    { return macos_impl::get_hardware_info_sync(); }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    { Err("Hardware info is not supported on this platform".to_string()) }
}

#[tauri::command]
pub async fn get_hardware_info() -> Result<HardwareInfo, String> {
    tokio::task::spawn_blocking(get_hardware_info_sync)
        .await
        .map_err(|e| format!("Task failed: {}", e))?
}
