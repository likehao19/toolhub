use serde::Serialize;
use std::net::IpAddr;
use std::time::Instant;

#[cfg(target_os = "windows")]
use std::process::Command as StdCommand;

#[cfg(target_os = "windows")]
use super::shell::decode_output;

const IP_LOOKUP_TIMEOUT_SECS: u64 = 10;
const NETWORK_USER_AGENT: &str = "ToolHub/1.0";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DnsAnswer {
    pub name: String,
    pub record_type: String,
    pub ttl: Option<u32>,
    pub value: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DnsLookupResult {
    pub domain: String,
    pub record_type: String,
    pub elapsed_ms: u128,
    pub answers: Vec<DnsAnswer>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IpLookupResult {
    pub query: String,
    pub domain: String,
    pub ip: String,
    #[serde(rename = "type")]
    pub ip_type: String,
    pub continent: String,
    pub country: String,
    pub region: String,
    pub city: String,
    pub isp: String,
    pub asn: String,
    pub timezone: String,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

#[cfg(target_os = "windows")]
fn escape_ps_single_quotes(input: &str) -> String {
    input.replace('\'', "''")
}

#[cfg(target_os = "windows")]
fn normalize_record_type(record_type: &str) -> Result<&'static str, String> {
    match record_type.trim().to_uppercase().as_str() {
        "A" => Ok("A"),
        "AAAA" => Ok("AAAA"),
        "CNAME" => Ok("CNAME"),
        "MX" => Ok("MX"),
        "NS" => Ok("NS"),
        "TXT" => Ok("TXT"),
        _ => Err(format!("Unsupported record type: {}", record_type)),
    }
}

fn looks_like_ip(input: &str) -> bool {
    input.trim().parse::<IpAddr>().is_ok()
}

fn normalize_target(input: &str) -> String {
    input
        .trim()
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .trim_end_matches('/')
        .to_string()
}

fn build_http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(IP_LOOKUP_TIMEOUT_SECS))
        .redirect(reqwest::redirect::Policy::limited(5))
        .user_agent(NETWORK_USER_AGENT)
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))
}

fn value_as_string(value: Option<&serde_json::Value>) -> String {
    match value {
        Some(serde_json::Value::String(v)) => v.clone(),
        Some(serde_json::Value::Number(v)) => v.to_string(),
        Some(serde_json::Value::Bool(v)) => v.to_string(),
        _ => String::new(),
    }
}

fn value_as_f64(value: Option<&serde_json::Value>) -> Option<f64> {
    match value {
        Some(serde_json::Value::Number(v)) => v.as_f64(),
        Some(serde_json::Value::String(v)) => v.parse().ok(),
        _ => None,
    }
}

fn first_non_empty(values: &[String]) -> String {
    values.iter().find(|value| !value.is_empty()).cloned().unwrap_or_default()
}

fn build_ip_lookup_result(
    query: String,
    domain: String,
    ip: String,
    ip_type: String,
    continent: String,
    country: String,
    region: String,
    city: String,
    isp: String,
    asn: String,
    timezone: String,
    latitude: Option<f64>,
    longitude: Option<f64>,
) -> IpLookupResult {
    IpLookupResult {
        query,
        domain,
        ip,
        ip_type,
        continent,
        country,
        region,
        city,
        isp,
        asn,
        timezone,
        latitude,
        longitude,
    }
}

async fn lookup_ip_from_ipwhois(
    client: &reqwest::Client,
    ip: &str,
    query: &str,
    domain: &str,
) -> Result<IpLookupResult, String> {
    let url = if ip.is_empty() {
        "https://ipwho.is/".to_string()
    } else {
        format!("https://ipwho.is/{}", urlencoding::encode(ip))
    };

    let data = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("请求 ipwho.is 失败: {}", e))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("解析 ipwho.is 响应失败: {}", e))?;

    if data.get("success").and_then(|v| v.as_bool()) == Some(false) {
        return Err(data
            .get("message")
            .and_then(|v| v.as_str())
            .unwrap_or("IP 查询失败")
            .to_string());
    }

    Ok(build_ip_lookup_result(
        if query.is_empty() {
            value_as_string(data.get("ip"))
        } else {
            query.to_string()
        },
        domain.to_string(),
        value_as_string(data.get("ip")),
        value_as_string(data.get("type")),
        value_as_string(data.get("continent")),
        value_as_string(data.get("country")),
        value_as_string(data.get("region")),
        value_as_string(data.get("city")),
        value_as_string(data.get("connection").and_then(|v| v.get("isp"))),
        value_as_string(data.get("connection").and_then(|v| v.get("asn"))),
        value_as_string(data.get("timezone").and_then(|v| v.get("id"))),
        value_as_f64(data.get("latitude")),
        value_as_f64(data.get("longitude")),
    ))
}

async fn lookup_ip_from_ipapi(
    client: &reqwest::Client,
    ip: &str,
    query: &str,
    domain: &str,
) -> Result<IpLookupResult, String> {
    let url = if ip.is_empty() {
        "https://ipapi.co/json/".to_string()
    } else {
        format!("https://ipapi.co/{}/json/", urlencoding::encode(ip))
    };

    let data = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("请求 ipapi.co 失败: {}", e))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("解析 ipapi.co 响应失败: {}", e))?;

    if data.get("error").and_then(|v| v.as_bool()) == Some(true) {
        return Err(data
            .get("reason")
            .and_then(|v| v.as_str())
            .or_else(|| data.get("message").and_then(|v| v.as_str()))
            .unwrap_or("IP 查询失败")
            .to_string());
    }

    Ok(build_ip_lookup_result(
        if query.is_empty() {
            value_as_string(data.get("ip"))
        } else {
            query.to_string()
        },
        domain.to_string(),
        value_as_string(data.get("ip")),
        first_non_empty(&[
            value_as_string(data.get("version")),
            value_as_string(data.get("type")),
        ]),
        value_as_string(data.get("continent_code")),
        first_non_empty(&[
            value_as_string(data.get("country_name")),
            value_as_string(data.get("country")),
        ]),
        value_as_string(data.get("region")),
        value_as_string(data.get("city")),
        value_as_string(data.get("org")),
        value_as_string(data.get("asn")),
        value_as_string(data.get("timezone")),
        value_as_f64(data.get("latitude")),
        value_as_f64(data.get("longitude")),
    ))
}

async fn lookup_ip_with_fallback(ip: &str, query: &str, domain: &str) -> Result<IpLookupResult, String> {
    let client = build_http_client()?;

    match lookup_ip_from_ipwhois(&client, ip, query, domain).await {
        Ok(result) => Ok(result),
        Err(primary_error) => match lookup_ip_from_ipapi(&client, ip, query, domain).await {
            Ok(result) => Ok(result),
            Err(secondary_error) => Err(format!("{}；备用服务也失败：{}", primary_error, secondary_error)),
        },
    }
}

#[cfg(target_os = "windows")]
fn parse_dns_value(record: &serde_json::Value) -> String {
    for key in ["IPAddress", "NameHost", "Exchange", "Strings", "Name"] {
        if let Some(value) = record.get(key) {
            if let Some(text) = value.as_str() {
                if !text.trim().is_empty() {
                    return text.to_string();
                }
            }
            if let Some(items) = value.as_array() {
                let parts: Vec<String> = items
                    .iter()
                    .filter_map(|item| item.as_str().map(|s| s.to_string()))
                    .collect();
                if !parts.is_empty() {
                    return parts.join(" ");
                }
            }
        }
    }
    String::new()
}

#[cfg(target_os = "windows")]
fn dns_lookup_sync(domain: String, record_type: String) -> Result<DnsLookupResult, String> {
    let query_type = normalize_record_type(&record_type)?;
    let started = Instant::now();
    let script = format!(
        "$records = Resolve-DnsName -Name '{}' -Type {} -ErrorAction Stop | Select-Object Name,Type,TTL,IPAddress,NameHost,Exchange,Preference,Strings; $records | ConvertTo-Json -Depth 4",
        escape_ps_single_quotes(&domain),
        query_type,
    );

    let output = StdCommand::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .output()
        .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

    if !output.status.success() {
        return Err(decode_output(&output.stderr).trim().to_string());
    }

    let stdout = decode_output(&output.stdout);
    let trimmed = stdout.trim();
    if trimmed.is_empty() {
        return Ok(DnsLookupResult {
            domain,
            record_type: query_type.to_string(),
            elapsed_ms: started.elapsed().as_millis(),
            answers: vec![],
        });
    }

    let json: serde_json::Value = serde_json::from_str(trimmed)
        .map_err(|e| format!("Failed to parse DNS result: {}", e))?;

    let rows = match json {
        serde_json::Value::Array(items) => items,
        value => vec![value],
    };

    let answers = rows
        .into_iter()
        .map(|item| DnsAnswer {
            name: item.get("Name").and_then(|v| v.as_str()).unwrap_or(&domain).to_string(),
            record_type: item.get("Type").and_then(|v| v.as_str()).unwrap_or(query_type).to_string(),
            ttl: item.get("TTL").and_then(|v| v.as_u64()).map(|n| n as u32),
            value: parse_dns_value(&item),
        })
        .filter(|item| !item.value.is_empty())
        .collect();

    Ok(DnsLookupResult {
        domain,
        record_type: query_type.to_string(),
        elapsed_ms: started.elapsed().as_millis(),
        answers,
    })
}

#[cfg(not(target_os = "windows"))]
fn dns_lookup_sync(domain: String, record_type: String) -> Result<DnsLookupResult, String> {
    let started = Instant::now();
    let output = std::process::Command::new("nslookup")
        .args(["-type", &record_type, &domain])
        .output()
        .map_err(|e| format!("Failed to run nslookup: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut answers = Vec::new();
    for line in stdout.lines() {
        let trimmed = line.trim();
        if let Some(value) = trimmed.strip_prefix("Address: ") {
            answers.push(DnsAnswer {
                name: domain.clone(),
                record_type: record_type.to_uppercase(),
                ttl: None,
                value: value.to_string(),
            });
        }
    }

    Ok(DnsLookupResult {
        domain,
        record_type: record_type.to_uppercase(),
        elapsed_ms: started.elapsed().as_millis(),
        answers,
    })
}

#[tauri::command]
pub async fn network_dns_lookup(domain: String, record_type: String) -> Result<DnsLookupResult, String> {
    tokio::task::spawn_blocking(move || dns_lookup_sync(domain, record_type))
        .await
        .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn network_ip_lookup(input: String) -> Result<IpLookupResult, String> {
    let target = normalize_target(&input);

    if target.is_empty() {
        return lookup_ip_with_fallback("", "", "").await;
    }

    if looks_like_ip(&target) {
        return lookup_ip_with_fallback(&target, &target, "").await;
    }

    let dns = tokio::task::spawn_blocking({
        let target = target.clone();
        move || dns_lookup_sync(target, "A".to_string())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))??;

    let ip = dns
        .answers
        .iter()
        .find(|item| looks_like_ip(&item.value))
        .map(|item| item.value.clone())
        .ok_or_else(|| "未查询到域名对应的 IPv4 地址".to_string())?;

    lookup_ip_with_fallback(&ip, &target, &target).await
}
