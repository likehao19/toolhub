//! 图片格式转换命令

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use image::imageops::FilterType;
use image::{DynamicImage, GenericImageView, ImageFormat};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Cursor;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct ExifField {
    pub tag: String,
    pub value: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub file_size: u64,
    pub exif: Vec<ExifField>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImagePreview {
    pub base64: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertRequest {
    pub input_path: String,
    pub output_path: String,
    pub target_format: String,
    pub quality: Option<u8>,
    pub resize_width: Option<u32>,
    pub resize_height: Option<u32>,
    pub ico_sizes: Option<Vec<u32>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertResult {
    pub output_path: String,
    pub output_size: u64,
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchConvertRequest {
    pub input_paths: Vec<String>,
    pub output_dir: String,
    pub target_format: String,
    pub quality: Option<u8>,
    pub resize_width: Option<u32>,
    pub resize_height: Option<u32>,
    pub ico_sizes: Option<Vec<u32>>,
}

fn parse_format(fmt: &str) -> Result<ImageFormat, String> {
    match fmt.to_lowercase().as_str() {
        "png" => Ok(ImageFormat::Png),
        "jpeg" | "jpg" => Ok(ImageFormat::Jpeg),
        "webp" => Ok(ImageFormat::WebP),
        "bmp" => Ok(ImageFormat::Bmp),
        "gif" => Ok(ImageFormat::Gif),
        "ico" => Ok(ImageFormat::Ico),
        _ => Err(format!("Unsupported format: {}", fmt)),
    }
}

fn detect_format_name(fmt: ImageFormat) -> &'static str {
    match fmt {
        ImageFormat::Png => "png",
        ImageFormat::Jpeg => "jpeg",
        ImageFormat::WebP => "webp",
        ImageFormat::Bmp => "bmp",
        ImageFormat::Gif => "gif",
        ImageFormat::Ico => "ico",
        _ => "unknown",
    }
}

fn format_extension(fmt: &str) -> &str {
    match fmt.to_lowercase().as_str() {
        "jpeg" | "jpg" => "jpg",
        "png" => "png",
        "webp" => "webp",
        "bmp" => "bmp",
        "gif" => "gif",
        "ico" => "ico",
        _ => "png",
    }
}

fn read_exif(path: &str) -> Vec<ExifField> {
    let file = match std::fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return vec![],
    };
    let mut buf = std::io::BufReader::new(file);
    let reader = match exif::Reader::new().read_from_container(&mut buf) {
        Ok(r) => r,
        Err(_) => return vec![],
    };
    reader
        .fields()
        .filter_map(|f| {
            let tag = f.tag.to_string();
            let value = f.display_value().with_unit(&reader).to_string();
            if value.is_empty() || value == "\"\"" {
                None
            } else {
                Some(ExifField { tag, value })
            }
        })
        .collect()
}

fn resize_image(img: &DynamicImage, w: Option<u32>, h: Option<u32>) -> DynamicImage {
    let (orig_w, orig_h) = img.dimensions();
    match (w, h) {
        (Some(nw), Some(nh)) if nw > 0 && nh > 0 => {
            img.resize_exact(nw, nh, FilterType::Lanczos3)
        }
        (Some(nw), None) if nw > 0 => {
            let nh = (orig_h as f64 * nw as f64 / orig_w as f64).round() as u32;
            img.resize_exact(nw, nh.max(1), FilterType::Lanczos3)
        }
        (None, Some(nh)) if nh > 0 => {
            let nw = (orig_w as f64 * nh as f64 / orig_h as f64).round() as u32;
            img.resize_exact(nw.max(1), nh, FilterType::Lanczos3)
        }
        _ => img.clone(),
    }
}

fn encode_image(img: &DynamicImage, fmt: ImageFormat, quality: Option<u8>) -> Result<Vec<u8>, String> {
    let mut buf = Cursor::new(Vec::new());
    match fmt {
        ImageFormat::Jpeg => {
            let q = quality.unwrap_or(85);
            let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, q);
            img.write_with_encoder(encoder)
                .map_err(|e| format!("JPEG encode error: {}", e))?;
        }
        ImageFormat::WebP => {
            // image crate webp encoder — quality not configurable via standard API,
            // use lossless for quality >= 100, lossy otherwise
            img.write_to(&mut buf, ImageFormat::WebP)
                .map_err(|e| format!("WebP encode error: {}", e))?;
        }
        _ => {
            img.write_to(&mut buf, fmt)
                .map_err(|e| format!("Encode error: {}", e))?;
        }
    }
    Ok(buf.into_inner())
}

/// 构建多尺寸 ICO 文件（每个尺寸存为 PNG 格式条目）
fn build_multi_size_ico(img: &DynamicImage, sizes: &[u32]) -> Result<Vec<u8>, String> {
    let mut entries: Vec<Vec<u8>> = Vec::new();
    let mut entry_sizes: Vec<(u32, u32)> = Vec::new();

    for &size in sizes {
        let s = size.min(256);
        let resized = img.resize_exact(s, s, FilterType::Lanczos3);
        let mut png_buf = Cursor::new(Vec::new());
        resized
            .write_to(&mut png_buf, ImageFormat::Png)
            .map_err(|e| format!("ICO PNG encode: {}", e))?;
        entry_sizes.push((s, s));
        entries.push(png_buf.into_inner());
    }

    let count = entries.len() as u16;
    // ICONDIR: 6 bytes
    let mut ico = Vec::new();
    ico.extend_from_slice(&[0u8, 0]); // reserved
    ico.extend_from_slice(&1u16.to_le_bytes()); // type = ICO
    ico.extend_from_slice(&count.to_le_bytes()); // count

    // Calculate data offset: 6 + count * 16
    let mut data_offset = 6u32 + count as u32 * 16;

    // ICONDIRENTRY: 16 bytes each
    for (i, png_data) in entries.iter().enumerate() {
        let (w, h) = entry_sizes[i];
        ico.push(if w >= 256 { 0 } else { w as u8 }); // width (0 = 256)
        ico.push(if h >= 256 { 0 } else { h as u8 }); // height
        ico.push(0); // color palette
        ico.push(0); // reserved
        ico.extend_from_slice(&1u16.to_le_bytes()); // color planes
        ico.extend_from_slice(&32u16.to_le_bytes()); // bits per pixel
        ico.extend_from_slice(&(png_data.len() as u32).to_le_bytes()); // data size
        ico.extend_from_slice(&data_offset.to_le_bytes()); // data offset
        data_offset += png_data.len() as u32;
    }

    // Append all PNG data
    for png_data in &entries {
        ico.extend_from_slice(png_data);
    }

    Ok(ico)
}

fn do_convert(req: &ConvertRequest) -> Result<ConvertResult, String> {
    let img = image::open(&req.input_path).map_err(|e| format!("Failed to open image: {}", e))?;
    let target_fmt = parse_format(&req.target_format)?;

    // Resize if needed
    let img = resize_image(&img, req.resize_width, req.resize_height);
    let (w, h) = img.dimensions();

    // Encode
    let data = if target_fmt == ImageFormat::Ico {
        if let Some(ref sizes) = req.ico_sizes {
            if !sizes.is_empty() {
                build_multi_size_ico(&img, sizes)?
            } else {
                encode_image(&img, target_fmt, req.quality)?
            }
        } else {
            encode_image(&img, target_fmt, req.quality)?
        }
    } else {
        encode_image(&img, target_fmt, req.quality)?
    };

    fs::write(&req.output_path, &data).map_err(|e| format!("Failed to write: {}", e))?;
    let output_size = data.len() as u64;

    Ok(ConvertResult {
        output_path: req.output_path.clone(),
        output_size,
        width: w,
        height: h,
        format: req.target_format.clone(),
        success: true,
        error: None,
    })
}

#[tauri::command]
pub async fn image_get_info(path: String) -> Result<ImageInfo, String> {
    tokio::task::spawn_blocking(move || {
        let metadata = fs::metadata(&path).map_err(|e| format!("File not found: {}", e))?;
        let file_size = metadata.len();

        let reader = image::ImageReader::open(&path)
            .map_err(|e| format!("Cannot open: {}", e))?
            .with_guessed_format()
            .map_err(|e| format!("Format guess failed: {}", e))?;

        let format = reader
            .format()
            .map(detect_format_name)
            .unwrap_or("unknown")
            .to_string();

        let img = reader.decode().map_err(|e| format!("Decode error: {}", e))?;
        let (width, height) = img.dimensions();

        let exif = read_exif(&path);

        Ok(ImageInfo {
            width,
            height,
            format,
            file_size,
            exif,
        })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
pub async fn image_preview(path: String, max_size: Option<u32>) -> Result<ImagePreview, String> {
    tokio::task::spawn_blocking(move || {
        let img = image::open(&path).map_err(|e| format!("Cannot open: {}", e))?;
        let max = max_size.unwrap_or(400);
        let thumb = img.resize(max, max, FilterType::Lanczos3);
        let (w, h) = thumb.dimensions();

        let mut buf = Cursor::new(Vec::new());
        thumb
            .write_to(&mut buf, ImageFormat::Png)
            .map_err(|e| format!("PNG encode: {}", e))?;

        let base64 = STANDARD.encode(buf.into_inner());
        Ok(ImagePreview {
            base64,
            width: w,
            height: h,
        })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
pub async fn image_convert(request: ConvertRequest) -> Result<ConvertResult, String> {
    tokio::task::spawn_blocking(move || do_convert(&request))
        .await
        .map_err(|e| format!("Task error: {}", e))?
}

#[tauri::command]
pub async fn image_batch_convert(request: BatchConvertRequest) -> Result<Vec<ConvertResult>, String> {
    tokio::task::spawn_blocking(move || {
        let mut results = Vec::new();
        for input_path in &request.input_paths {
            let file_name = Path::new(input_path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("output");
            let ext = format_extension(&request.target_format);
            let output_path = Path::new(&request.output_dir)
                .join(format!("{}.{}", file_name, ext))
                .to_string_lossy()
                .to_string();

            let req = ConvertRequest {
                input_path: input_path.clone(),
                output_path,
                target_format: request.target_format.clone(),
                quality: request.quality,
                resize_width: request.resize_width,
                resize_height: request.resize_height,
                ico_sizes: request.ico_sizes.clone(),
            };

            match do_convert(&req) {
                Ok(r) => results.push(r),
                Err(e) => results.push(ConvertResult {
                    output_path: req.output_path,
                    output_size: 0,
                    width: 0,
                    height: 0,
                    format: request.target_format.clone(),
                    success: false,
                    error: Some(e),
                }),
            }
        }
        Ok(results)
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}
