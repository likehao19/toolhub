//! 书签相关命令

use base64::Engine;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct WebsiteInfo {
    pub title: String,
    pub description: String,
    pub favicon_base64: String,
}

/// 获取网站信息：标题、描述、favicon（base64）
#[tauri::command]
pub async fn fetch_website_info(url: String) -> Result<WebsiteInfo, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    // 请求网页 HTML
    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let html = response.text().await.map_err(|e| format!("读取响应失败: {}", e))?;

    // 解析标题
    let title = extract_title(&html).unwrap_or_default();

    // 解析描述
    let description = extract_meta_description(&html).unwrap_or_default();

    // 解析并下载 favicon
    let parsed_url = url::Url::parse(&url).map_err(|e| format!("URL 解析失败: {}", e))?;
    let origin = format!("{}://{}", parsed_url.scheme(), parsed_url.host_str().unwrap_or(""));

    let favicon_base64 = match extract_favicon_url(&html, &origin) {
        Some(favicon_url) => fetch_favicon_as_base64(&client, &favicon_url).await.unwrap_or_default(),
        None => {
            // 尝试默认 /favicon.ico
            let default_favicon = format!("{}/favicon.ico", origin);
            fetch_favicon_as_base64(&client, &default_favicon).await.unwrap_or_default()
        }
    };

    Ok(WebsiteInfo {
        title,
        description,
        favicon_base64,
    })
}

/// 从 HTML 中提取 <title> 标签内容
fn extract_title(html: &str) -> Option<String> {
    let lower = html.to_lowercase();
    let start = lower.find("<title")?;
    let content_start = html[start..].find('>')? + start + 1;
    let end = lower[content_start..].find("</title>")? + content_start;
    let title = html[content_start..end].trim();
    if title.is_empty() {
        None
    } else {
        Some(decode_html_entities(title))
    }
}

/// 从 HTML 中提取 <meta name="description"> 内容
fn extract_meta_description(html: &str) -> Option<String> {
    let lower = html.to_lowercase();
    // 查找 meta description 标签
    let mut search_pos = 0;
    while let Some(meta_pos) = lower[search_pos..].find("<meta") {
        let abs_pos = search_pos + meta_pos;
        let tag_end = match lower[abs_pos..].find('>') {
            Some(pos) => abs_pos + pos,
            None => break,
        };
        let tag = &lower[abs_pos..=tag_end];

        if tag.contains("name=\"description\"") || tag.contains("name='description'") {
            // 提取 content 属性
            let original_tag = &html[abs_pos..=tag_end];
            if let Some(content) = extract_attribute(original_tag, "content") {
                let desc = content.trim();
                if !desc.is_empty() {
                    return Some(decode_html_entities(desc));
                }
            }
        }
        search_pos = tag_end + 1;
    }
    None
}

/// 从 HTML 中提取 favicon URL
fn extract_favicon_url(html: &str, origin: &str) -> Option<String> {
    let lower = html.to_lowercase();
    let mut search_pos = 0;

    while let Some(link_pos) = lower[search_pos..].find("<link") {
        let abs_pos = search_pos + link_pos;
        let tag_end = match lower[abs_pos..].find('>') {
            Some(pos) => abs_pos + pos,
            None => break,
        };
        let tag = &lower[abs_pos..=tag_end];
        let original_tag = &html[abs_pos..=tag_end];

        // 检查 rel 属性是否包含 icon
        if tag.contains("rel=\"icon\"")
            || tag.contains("rel='icon'")
            || tag.contains("rel=\"shortcut icon\"")
            || tag.contains("rel='shortcut icon'")
        {
            if let Some(href) = extract_attribute(original_tag, "href") {
                let href = href.trim();
                if !href.is_empty() {
                    return Some(resolve_url(href, origin));
                }
            }
        }
        search_pos = tag_end + 1;
    }
    None
}

/// 提取 HTML 标签中的属性值
fn extract_attribute(tag: &str, attr: &str) -> Option<String> {
    let lower = tag.to_lowercase();
    let patterns = [
        format!("{}=\"", attr),
        format!("{}='", attr),
    ];

    for pattern in &patterns {
        if let Some(start) = lower.find(pattern.as_str()) {
            let value_start = start + pattern.len();
            let quote = pattern.chars().last().unwrap();
            if let Some(end) = tag[value_start..].find(quote) {
                return Some(tag[value_start..value_start + end].to_string());
            }
        }
    }
    None
}

/// 解析相对 URL 为绝对 URL
fn resolve_url(href: &str, origin: &str) -> String {
    if href.starts_with("http://") || href.starts_with("https://") {
        href.to_string()
    } else if href.starts_with("//") {
        format!("https:{}", href)
    } else if href.starts_with('/') {
        format!("{}{}", origin, href)
    } else {
        format!("{}/{}", origin, href)
    }
}

/// 下载 favicon 并转为 base64 data URI
async fn fetch_favicon_as_base64(client: &reqwest::Client, favicon_url: &str) -> Option<String> {
    let response = client
        .get(favicon_url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await
        .ok()?;

    if !response.status().is_success() {
        return None;
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/x-icon")
        .split(';')
        .next()
        .unwrap_or("image/x-icon")
        .trim()
        .to_string();

    let bytes = response.bytes().await.ok()?;
    if bytes.is_empty() || bytes.len() > 512 * 1024 {
        return None;
    }

    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Some(format!("data:{};base64,{}", content_type, b64))
}

/// 解码基本 HTML 实体
fn decode_html_entities(text: &str) -> String {
    text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&#x27;", "'")
        .replace("&apos;", "'")
        .replace("&#x2F;", "/")
        .replace("&nbsp;", " ")
}
