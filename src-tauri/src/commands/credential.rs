//! 系统凭据管理模块
//!
//! 通过 Windows Credential Manager API 管理系统凭据

use serde::{Deserialize, Serialize};
use base64::Engine;

/// 凭据摘要信息（不含密码）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialInfo {
    pub target_name: String,
    pub username: String,
    pub credential_type: String,
    pub persist: String,
    pub last_written: String,
    pub comment: String,
}

/// 凭据详情（含密码）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialDetail {
    pub target_name: String,
    pub username: String,
    pub credential_type: String,
    pub persist: String,
    pub last_written: String,
    pub comment: String,
    pub password: String,
}

/// 通行密钥信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasskeyInfo {
    pub rp_id: String,
    pub rp_name: String,
    pub user_name: String,
    pub user_display_name: String,
    pub credential_id: String,
    pub removable: bool,
}

// ─── Windows 实现 ───────────────────────────────────────────────

#[cfg(target_os = "windows")]
mod win {
    use super::*;
    use windows::Win32::Foundation::FILETIME;
    use windows::Win32::Security::Credentials::*;
    use windows::core::PWSTR;

    /// FILETIME → ISO 8601 字符串
    fn filetime_to_iso(ft: &FILETIME) -> String {
        let ticks = ((ft.dwHighDateTime as u64) << 32) | ft.dwLowDateTime as u64;
        // 100-ns intervals since 1601-01-01 → Unix epoch
        let unix_secs = (ticks / 10_000_000).wrapping_sub(11_644_473_600);
        let secs = unix_secs as i64;
        let days = secs / 86400;
        let time_of_day = secs % 86400;
        let hours = time_of_day / 3600;
        let minutes = (time_of_day % 3600) / 60;
        let seconds = time_of_day % 60;

        // 简易日期计算
        let (year, month, day) = days_to_ymd(days + 719_468); // shift to 0000-03-01 epoch
        format!(
            "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
            year, month, day, hours, minutes, seconds
        )
    }

    /// 天数 → (年, 月, 日) — civil from days algorithm
    fn days_to_ymd(z: i64) -> (i64, i64, i64) {
        let era = if z >= 0 { z } else { z - 146096 } / 146097;
        let doe = z - era * 146097;
        let yoe =
            (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        let y = yoe + era * 400;
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        let mp = (5 * doy + 2) / 153;
        let d = doy - (153 * mp + 2) / 5 + 1;
        let m = if mp < 10 { mp + 3 } else { mp - 9 };
        let y = if m <= 2 { y + 1 } else { y };
        (y, m, d)
    }

    /// 凭据类型常量 → 可读字符串
    fn cred_type_str(t: CRED_TYPE) -> &'static str {
        match t {
            CRED_TYPE_GENERIC => "Generic",
            CRED_TYPE_DOMAIN_PASSWORD => "DomainPassword",
            CRED_TYPE_DOMAIN_CERTIFICATE => "DomainCertificate",
            CRED_TYPE_DOMAIN_VISIBLE_PASSWORD => "DomainVisiblePassword",
            CRED_TYPE_GENERIC_CERTIFICATE => "GenericCertificate",
            CRED_TYPE_DOMAIN_EXTENDED => "DomainExtended",
            _ => "Unknown",
        }
    }

    /// 持久化类型 → 可读字符串
    fn persist_str(p: CRED_PERSIST) -> &'static str {
        match p {
            CRED_PERSIST_SESSION => "Session",
            CRED_PERSIST_LOCAL_MACHINE => "LocalMachine",
            CRED_PERSIST_ENTERPRISE => "Enterprise",
            _ => "Unknown",
        }
    }

    /// 安全读取 PWSTR
    unsafe fn read_pwstr(p: PWSTR) -> String {
        if p.0.is_null() {
            return String::new();
        }
        unsafe { p.to_string().unwrap_or_default() }
    }

    /// 从 CREDENTIALW 提取 CredentialInfo（不含密码）
    unsafe fn cred_to_info(cred: &CREDENTIALW) -> CredentialInfo {
        unsafe {
            CredentialInfo {
                target_name: read_pwstr(cred.TargetName),
                username: read_pwstr(cred.UserName),
                credential_type: cred_type_str(cred.Type).to_string(),
                persist: persist_str(cred.Persist).to_string(),
                last_written: filetime_to_iso(&cred.LastWritten),
                comment: read_pwstr(cred.Comment),
            }
        }
    }

    /// 从 CredentialBlob 解码密码
    /// 优先级: UTF-8 → UTF-16LE（可读性校验）→ Base64（二进制数据）
    unsafe fn decode_password(cred: &CREDENTIALW) -> String {
        if cred.CredentialBlob.is_null() || cred.CredentialBlobSize == 0 {
            return String::new();
        }
        unsafe {
            let size = cred.CredentialBlobSize as usize;
            let slice = std::slice::from_raw_parts(cred.CredentialBlob, size);

            // 1. 去掉尾部 \0 终止符后尝试 UTF-8
            let trimmed = slice.strip_suffix(&[0u8]).unwrap_or(slice);
            if !trimmed.is_empty() {
                if let Ok(s) = std::str::from_utf8(trimmed) {
                    if !s.contains('\0') {
                        return s.to_string();
                    }
                }
            }

            // 2. 尝试 UTF-16LE（仅当解码后是可读文本时）
            if size >= 2 && size % 2 == 0 {
                let u16s: Vec<u16> = slice
                    .chunks_exact(2)
                    .map(|c| u16::from_le_bytes([c[0], c[1]]))
                    .collect();
                let decoded = String::from_utf16_lossy(&u16s);
                if !decoded.contains('\u{FFFD}') && is_readable(&decoded) {
                    return decoded;
                }
            }

            // 3. 二进制数据，用 base64 展示
            use base64::Engine;
            format!(
                "[base64] {}",
                base64::engine::general_purpose::STANDARD.encode(slice)
            )
        }
    }

    /// 检查字符串是否为可读文本（>80% 可打印字符）
    fn is_readable(s: &str) -> bool {
        if s.is_empty() {
            return false;
        }
        let total = s.chars().count();
        let printable = s
            .chars()
            .filter(|c| !c.is_control() || *c == '\n' || *c == '\r' || *c == '\t')
            .count();
        printable * 100 / total > 80
    }

    pub fn list_credentials_impl() -> Result<Vec<CredentialInfo>, String> {
        unsafe {
            let mut count: u32 = 0;
            let mut pcreds: *mut *mut CREDENTIALW = std::ptr::null_mut();

            let filter = windows::core::w!("*");

            CredEnumerateW(filter, Some(CRED_ENUMERATE_FLAGS(0)), &mut count, &mut pcreds)
                .map_err(|e| format!("CredEnumerateW 失败: {}", e))?;

            let mut result = Vec::with_capacity(count as usize);
            let creds_slice = std::slice::from_raw_parts(pcreds, count as usize);

            for &pcred in creds_slice {
                if !pcred.is_null() {
                    result.push(cred_to_info(&*pcred));
                }
            }

            CredFree(pcreds as *const std::ffi::c_void);
            Ok(result)
        }
    }

    pub fn read_credential_impl(target_name: &str) -> Result<CredentialDetail, String> {
        unsafe {
            let target: Vec<u16> = target_name.encode_utf16().chain(std::iter::once(0)).collect();
            let target_pwstr = PWSTR(target.as_ptr() as *mut u16);
            let mut pcred: *mut CREDENTIALW = std::ptr::null_mut();

            CredReadW(target_pwstr, CRED_TYPE_GENERIC, Some(0), &mut pcred)
                .or_else(|_| CredReadW(target_pwstr, CRED_TYPE_DOMAIN_PASSWORD, Some(0), &mut pcred))
                .map_err(|e| format!("CredReadW 失败: {}", e))?;

            let cred = &*pcred;
            let info = cred_to_info(cred);
            let password = decode_password(cred);

            let detail = CredentialDetail {
                target_name: info.target_name,
                username: info.username,
                credential_type: info.credential_type,
                persist: info.persist,
                last_written: info.last_written,
                comment: info.comment,
                password,
            };

            CredFree(pcred as *const std::ffi::c_void);
            Ok(detail)
        }
    }

    pub fn add_credential_impl(
        target_name: &str,
        username: &str,
        password: &str,
        comment: &str,
    ) -> Result<(), String> {
        unsafe {
            let target: Vec<u16> = target_name.encode_utf16().chain(std::iter::once(0)).collect();
            let user: Vec<u16> = username.encode_utf16().chain(std::iter::once(0)).collect();
            let comment_w: Vec<u16> = comment.encode_utf16().chain(std::iter::once(0)).collect();
            let pass_bytes: Vec<u8> = password
                .encode_utf16()
                .flat_map(|c| c.to_le_bytes())
                .collect();

            let mut cred = CREDENTIALW {
                Flags: CRED_FLAGS(0),
                Type: CRED_TYPE_GENERIC,
                TargetName: PWSTR(target.as_ptr() as *mut u16),
                Comment: PWSTR(comment_w.as_ptr() as *mut u16),
                LastWritten: FILETIME::default(),
                CredentialBlobSize: pass_bytes.len() as u32,
                CredentialBlob: pass_bytes.as_ptr() as *mut u8,
                Persist: CRED_PERSIST_LOCAL_MACHINE,
                AttributeCount: 0,
                Attributes: std::ptr::null_mut(),
                TargetAlias: PWSTR::null(),
                UserName: PWSTR(user.as_ptr() as *mut u16),
            };

            CredWriteW(&mut cred, 0)
                .map_err(|e| format!("CredWriteW 失败: {}", e))?;

            Ok(())
        }
    }

    pub fn delete_credential_impl(target_name: &str, cred_type: &str) -> Result<(), String> {
        unsafe {
            let target: Vec<u16> = target_name.encode_utf16().chain(std::iter::once(0)).collect();
            let target_pwstr = PWSTR(target.as_ptr() as *mut u16);

            let ct = match cred_type {
                "Generic" => CRED_TYPE_GENERIC,
                "DomainPassword" => CRED_TYPE_DOMAIN_PASSWORD,
                "DomainCertificate" => CRED_TYPE_DOMAIN_CERTIFICATE,
                "DomainVisiblePassword" => CRED_TYPE_DOMAIN_VISIBLE_PASSWORD,
                "GenericCertificate" => CRED_TYPE_GENERIC_CERTIFICATE,
                "DomainExtended" => CRED_TYPE_DOMAIN_EXTENDED,
                _ => CRED_TYPE_GENERIC,
            };

            CredDeleteW(target_pwstr, ct, Some(0))
                .map_err(|e| format!("CredDeleteW 失败: {}", e))?;

            Ok(())
        }
    }

    pub fn open_passkey_settings_impl() -> Result<(), String> {
        std::process::Command::new("cmd")
            .args(["/C", "start", "ms-settings:savedpasskeys"])
            .spawn()
            .map_err(|e| format!("打开 Passkey 设置失败: {}", e))?;
        Ok(())
    }

    // ─── WebAuthn FFI (Passkey 枚举 / 删除) ─────────────────────

    use std::sync::OnceLock;
    use windows::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryW};
    use windows::core::HSTRING;

    /// WebAuthn RP 实体
    #[repr(C)]
    struct WebAuthnRpEntityInformation {
        dw_version: u32,
        pwsz_id: *const u16,
        pwsz_name: *const u16,
        pwsz_icon: *const u16,
    }

    /// WebAuthn 用户实体
    #[repr(C)]
    struct WebAuthnUserEntityInformation {
        dw_version: u32,
        cb_id: u32,
        pb_id: *const u8,
        pwsz_name: *const u16,
        pwsz_icon: *const u16,
        pwsz_display_name: *const u16,
    }

    /// 单个凭据详情
    #[repr(C)]
    struct WebAuthnCredentialDetails {
        dw_version: u32,
        cb_credential_id: u32,
        pb_credential_id: *const u8,
        p_rp_information: *const WebAuthnRpEntityInformation,
        p_user_information: *const WebAuthnUserEntityInformation,
        dw_removable: u32,
        // 后续字段我们不需要，不继续声明
    }

    /// 凭据详情列表
    #[repr(C)]
    struct WebAuthnCredentialDetailsList {
        c_credential_details: u32,
        pp_credential_details: *const *const WebAuthnCredentialDetails,
    }

    /// 枚举选项
    #[repr(C)]
    struct WebAuthnGetCredentialsOptions {
        dw_version: u32,
        pwsz_rp_id: *const u16,
        b_browser_in_private_mode: i32,
    }

    type FnGetApiVersionNumber = unsafe extern "system" fn() -> u32;
    type FnGetPlatformCredentialList =
        unsafe extern "system" fn(
            *const WebAuthnGetCredentialsOptions,
            *mut *mut WebAuthnCredentialDetailsList,
        ) -> i32;
    type FnFreePlatformCredentialList =
        unsafe extern "system" fn(*mut WebAuthnCredentialDetailsList);
    type FnDeletePlatformCredential =
        unsafe extern "system" fn(u32, *const u8, *const u16) -> i32;

    struct WebAuthnApi {
        get_api_version: FnGetApiVersionNumber,
        get_list: FnGetPlatformCredentialList,
        free_list: FnFreePlatformCredentialList,
        delete_cred: FnDeletePlatformCredential,
    }

    // SAFETY: 函数指针是进程级别的，线程安全
    unsafe impl Send for WebAuthnApi {}
    unsafe impl Sync for WebAuthnApi {}

    fn load_webauthn_api() -> &'static Result<WebAuthnApi, String> {
        static API: OnceLock<Result<WebAuthnApi, String>> = OnceLock::new();
        API.get_or_init(|| unsafe {
            let lib = LoadLibraryW(&HSTRING::from("webauthn.dll"))
                .map_err(|e| format!("LoadLibrary webauthn.dll 失败: {}", e))?;

            let get_ver = GetProcAddress(lib, windows::core::s!("WebAuthNGetApiVersionNumber"))
                .ok_or("找不到 WebAuthNGetApiVersionNumber")?;
            let get_list = GetProcAddress(lib, windows::core::s!("WebAuthNGetPlatformCredentialList"))
                .ok_or("找不到 WebAuthNGetPlatformCredentialList")?;
            let free_list = GetProcAddress(lib, windows::core::s!("WebAuthNFreePlatformCredentialList"))
                .ok_or("找不到 WebAuthNFreePlatformCredentialList")?;
            let del = GetProcAddress(lib, windows::core::s!("WebAuthNDeletePlatformCredential"))
                .ok_or("找不到 WebAuthNDeletePlatformCredential")?;

            Ok(WebAuthnApi {
                get_api_version: std::mem::transmute(get_ver),
                get_list: std::mem::transmute(get_list),
                free_list: std::mem::transmute(free_list),
                delete_cred: std::mem::transmute(del),
            })
        })
    }

    /// 安全读取以 null 结尾的宽字符串指针
    unsafe fn read_wide_ptr(p: *const u16) -> String {
        if p.is_null() {
            return String::new();
        }
        let mut len = 0;
        while unsafe { *p.add(len) } != 0 {
            len += 1;
        }
        let slice = unsafe { std::slice::from_raw_parts(p, len) };
        String::from_utf16_lossy(slice)
    }

    pub fn list_passkeys_impl() -> Result<Vec<super::PasskeyInfo>, String> {
        let api = load_webauthn_api().as_ref().map_err(|e| e.clone())?;

        let version = unsafe { (api.get_api_version)() };
        if version < 4 {
            return Err(format!(
                "WebAuthn API 版本 {} 不支持枚举通行密钥（需要 ≥ 4）",
                version
            ));
        }

        unsafe {
            let opts = WebAuthnGetCredentialsOptions {
                dw_version: 1,
                pwsz_rp_id: std::ptr::null(),
                b_browser_in_private_mode: 0,
            };
            let mut list_ptr: *mut WebAuthnCredentialDetailsList = std::ptr::null_mut();
            let hr = (api.get_list)(&opts, &mut list_ptr);
            if hr != 0 {
                return Err(format!(
                    "WebAuthNGetPlatformCredentialList 失败, HRESULT=0x{:08X}",
                    hr as u32
                ));
            }
            if list_ptr.is_null() {
                return Ok(Vec::new());
            }

            let list = &*list_ptr;
            let count = list.c_credential_details as usize;
            let items = std::slice::from_raw_parts(list.pp_credential_details, count);

            let engine = base64::engine::general_purpose::STANDARD;
            let mut result = Vec::with_capacity(count);
            for &item_ptr in items {
                if item_ptr.is_null() {
                    continue;
                }
                let item = &*item_ptr;

                let cred_id_slice =
                    std::slice::from_raw_parts(item.pb_credential_id, item.cb_credential_id as usize);
                let credential_id = engine.encode(cred_id_slice);

                let (rp_id, rp_name) = if !item.p_rp_information.is_null() {
                    let rp = &*item.p_rp_information;
                    (read_wide_ptr(rp.pwsz_id), read_wide_ptr(rp.pwsz_name))
                } else {
                    (String::new(), String::new())
                };

                let (user_name, user_display_name) = if !item.p_user_information.is_null() {
                    let user = &*item.p_user_information;
                    (read_wide_ptr(user.pwsz_name), read_wide_ptr(user.pwsz_display_name))
                } else {
                    (String::new(), String::new())
                };

                result.push(super::PasskeyInfo {
                    rp_id,
                    rp_name,
                    user_name,
                    user_display_name,
                    credential_id,
                    removable: item.dw_removable != 0,
                });
            }

            (api.free_list)(list_ptr);
            Ok(result)
        }
    }

    pub fn delete_passkey_impl(rp_id: &str, credential_id: &str) -> Result<(), String> {
        let api = load_webauthn_api().as_ref().map_err(|e| e.clone())?;

        let engine = base64::engine::general_purpose::STANDARD;
        let cred_bytes = engine
            .decode(credential_id)
            .map_err(|e| format!("base64 解码 credential_id 失败: {}", e))?;

        let rp_wide: Vec<u16> = rp_id.encode_utf16().chain(std::iter::once(0)).collect();

        unsafe {
            let hr = (api.delete_cred)(
                cred_bytes.len() as u32,
                cred_bytes.as_ptr(),
                rp_wide.as_ptr(),
            );
            if hr != 0 {
                return Err(format!(
                    "WebAuthNDeletePlatformCredential 失败, HRESULT=0x{:08X}",
                    hr as u32
                ));
            }
        }
        Ok(())
    }
}

// ─── macOS 实现（Keychain via `security` CLI）──────────────────

#[cfg(target_os = "macos")]
mod mac {
    use super::*;

    /// list 在 macOS 上返回空：Keychain 含大量系统凭据，
    /// 全量枚举 UX 差且会触发授权弹窗；让前端显示"暂无"，由用户按名添加/读取。
    pub fn list_credentials_impl() -> Result<Vec<CredentialInfo>, String> {
        Ok(Vec::new())
    }

    /// 从 `security find-generic-password` 输出中按 `"<key>"<blob>=` 模式提取 attribute
    fn extract_attr(stdout: &str, key: &str) -> String {
        let needle = format!("\"{}\"<blob>=", key);
        for line in stdout.lines() {
            let t = line.trim();
            if let Some(rest) = t.strip_prefix(&needle) {
                let val = rest.trim();
                if val == "<NULL>" { return String::new(); }
                return val.trim_matches('"').to_string();
            }
        }
        String::new()
    }

    pub fn read_credential_impl(target_name: &str) -> Result<CredentialDetail, String> {
        // 元信息（不需要授权）
        let info_out = std::process::Command::new("security")
            .args(["find-generic-password", "-s", target_name])
            .output()
            .map_err(|e| format!("security 命令失败: {}", e))?;

        if !info_out.status.success() {
            let stderr = String::from_utf8_lossy(&info_out.stderr);
            return Err(format!("找不到凭据 '{}': {}", target_name, stderr.trim()));
        }
        let stdout = String::from_utf8_lossy(&info_out.stdout);
        let username = extract_attr(&stdout, "acct");
        let comment = extract_attr(&stdout, "icmt");

        // 密码（-w 直接打到 stdout；首次访问会弹"始终允许/允许"授权框）
        let pwd_out = std::process::Command::new("security")
            .args(["find-generic-password", "-s", target_name, "-w"])
            .output()
            .map_err(|e| format!("security 命令失败: {}", e))?;
        let password = if pwd_out.status.success() {
            String::from_utf8_lossy(&pwd_out.stdout).trim().to_string()
        } else {
            // 用户拒绝授权或密码为空都走这里 — 给空字符串而不是 Err，前端能正常展示元信息
            String::new()
        };

        Ok(CredentialDetail {
            target_name: target_name.to_string(),
            username,
            credential_type: "Generic".to_string(),
            persist: "LocalMachine".to_string(),
            last_written: String::new(),
            comment,
            password,
        })
    }

    pub fn add_credential_impl(
        target_name: &str,
        username: &str,
        password: &str,
        comment: &str,
    ) -> Result<(), String> {
        let mut args: Vec<&str> = vec![
            "add-generic-password",
            "-U", // 已存在则更新（避免 errSecDuplicateItem 47）
            "-a", username,
            "-s", target_name,
            "-w", password,
        ];
        if !comment.is_empty() {
            args.push("-j");
            args.push(comment);
        }
        let output = std::process::Command::new("security")
            .args(&args)
            .output()
            .map_err(|e| format!("security 命令失败: {}", e))?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }

    pub fn delete_credential_impl(target_name: &str, _cred_type: &str) -> Result<(), String> {
        // mac 的 Keychain 不区分 Windows 那些 cred_type，统一按 -s 删
        let output = std::process::Command::new("security")
            .args(["delete-generic-password", "-s", target_name])
            .output()
            .map_err(|e| format!("security 命令失败: {}", e))?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }

    pub fn open_passkey_settings_impl() -> Result<(), String> {
        // 打开"密码"设置（macOS 13+ 的通行密钥也在这里）
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.Passwords-Settings.extension")
            .spawn()
            .map_err(|e| format!("打开 Passkey 设置失败: {}", e))?;
        Ok(())
    }
}

// ─── Tauri 命令 ─────────────────────────────────────────────────

/// 列出所有系统凭据（不含密码）
#[tauri::command]
pub async fn list_credentials() -> Result<Vec<CredentialInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        tokio::task::spawn_blocking(win::list_credentials_impl)
            .await
            .map_err(|e| format!("任务执行失败: {}", e))?
    }
    #[cfg(target_os = "macos")]
    {
        tokio::task::spawn_blocking(mac::list_credentials_impl)
            .await
            .map_err(|e| format!("任务执行失败: {}", e))?
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Err("当前系统不支持凭据管理".to_string())
    }
}

/// 读取指定凭据（含密码）
#[tauri::command]
pub async fn read_credential(target_name: String) -> Result<CredentialDetail, String> {
    #[cfg(target_os = "windows")]
    {
        tokio::task::spawn_blocking(move || win::read_credential_impl(&target_name))
            .await
            .map_err(|e| format!("任务执行失败: {}", e))?
    }
    #[cfg(target_os = "macos")]
    {
        tokio::task::spawn_blocking(move || mac::read_credential_impl(&target_name))
            .await
            .map_err(|e| format!("任务执行失败: {}", e))?
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = target_name;
        Err("当前系统不支持凭据管理".to_string())
    }
}

/// 添加或更新凭据
#[tauri::command]
pub async fn add_credential(
    target_name: String,
    username: String,
    password: String,
    comment: String,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        tokio::task::spawn_blocking(move || {
            win::add_credential_impl(&target_name, &username, &password, &comment)
        })
        .await
        .map_err(|e| format!("任务执行失败: {}", e))?
    }
    #[cfg(target_os = "macos")]
    {
        tokio::task::spawn_blocking(move || {
            mac::add_credential_impl(&target_name, &username, &password, &comment)
        })
        .await
        .map_err(|e| format!("任务执行失败: {}", e))?
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = (target_name, username, password, comment);
        Err("当前系统不支持凭据管理".to_string())
    }
}

/// 删除凭据
#[tauri::command]
pub async fn delete_credential(target_name: String, cred_type: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        tokio::task::spawn_blocking(move || {
            win::delete_credential_impl(&target_name, &cred_type)
        })
        .await
        .map_err(|e| format!("任务执行失败: {}", e))?
    }
    #[cfg(target_os = "macos")]
    {
        tokio::task::spawn_blocking(move || {
            mac::delete_credential_impl(&target_name, &cred_type)
        })
        .await
        .map_err(|e| format!("任务执行失败: {}", e))?
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = (target_name, cred_type);
        Err("当前系统不支持凭据管理".to_string())
    }
}

/// 打开系统 Passkey 设置
#[tauri::command]
pub async fn open_passkey_settings() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        win::open_passkey_settings_impl()
    }
    #[cfg(target_os = "macos")]
    {
        mac::open_passkey_settings_impl()
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Err("当前系统不支持".to_string())
    }
}

/// 列出所有通行密钥
#[tauri::command]
pub async fn list_passkeys() -> Result<Vec<PasskeyInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        tokio::task::spawn_blocking(win::list_passkeys_impl)
            .await
            .map_err(|e| format!("任务执行失败: {}", e))?
    }
    #[cfg(target_os = "macos")]
    {
        // macOS 的通行密钥存在 iCloud Keychain，没有公开 CLI/SPI 枚举接口；
        // 引导用户去系统设置查看
        Err("macOS 请在「系统设置 → 密码」中查看和管理通行密钥".to_string())
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        Err("当前系统不支持通行密钥管理".to_string())
    }
}

/// 删除通行密钥
#[tauri::command]
pub async fn delete_passkey(rp_id: String, credential_id: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        tokio::task::spawn_blocking(move || win::delete_passkey_impl(&rp_id, &credential_id))
            .await
            .map_err(|e| format!("任务执行失败: {}", e))?
    }
    #[cfg(target_os = "macos")]
    {
        let _ = (rp_id, credential_id);
        Err("macOS 请在「系统设置 → 密码」中删除通行密钥".to_string())
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = (rp_id, credential_id);
        Err("当前系统不支持通行密钥管理".to_string())
    }
}
