//! 主密钥获取命令。
//!
//! 用途:为前端"密码管理"模块提供一份每台设备唯一的 32 字节随机密钥,
//! 让前端可以用 crypto-js 同步做 AES-256-CBC 加密(替换之前那个名为
//! encryptPassword 实际只是 base64 的伪加密)。
//!
//! 安全模型:
//! - 密钥写在 appdata 下的 `master_enc.key`,文件本身没额外加密。
//! - 假定威胁是"应用数据库被 dump",而不是"OS 用户被攻陷";
//!   当前用户能读 appdata,自然也能读这个密钥文件,更高的保护需要
//!   接 Windows DPAPI / macOS Keychain / Linux secret-service,
//!   后续如果要做 master password 流程再升级。
//! - 但比起原先的 base64,任何拿到 SQLite 文件却没拿到密钥文件的人
//!   (例如把 .db 单独发到外部、备份只备份 db、误传到云盘)就拿不到明文。
//!
//! 与 commands/ssh.rs 中 `get_or_create_key` 的关系:那把密钥用于
//! SSH 凭据加密(后端持有,前端不可见);这个密钥要给前端拿,所以
//! 单独存一份文件,不复用 SSH 的 key 文件,避免一处泄漏波及两处。

use base64::{engine::general_purpose::STANDARD as B64, Engine};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const KEY_FILE: &str = "master_enc.key";
const KEY_LEN: usize = 32;

fn key_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取数据目录失败: {}", e))?;
    Ok(dir.join(KEY_FILE))
}

#[tauri::command]
pub async fn crypto_get_master_key(app_handle: AppHandle) -> Result<String, String> {
    let path = key_path(&app_handle)?;
    if path.exists() {
        let data = std::fs::read(&path).map_err(|e| format!("读取密钥失败: {}", e))?;
        if data.len() == KEY_LEN {
            return Ok(B64.encode(&data));
        }
        // 长度不对说明文件损坏,直接重建。旧应用从未在这里写过别的内容,
        // 所以覆盖是安全的;新版升级也走同一路径,首次启动就生成 32 字节。
    }

    let mut key = [0u8; KEY_LEN];
    rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut key);

    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&path, &key).map_err(|e| format!("保存密钥失败: {}", e))?;
    Ok(B64.encode(&key))
}
