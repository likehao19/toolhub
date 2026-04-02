//! Maven 仓库管理命令
//!
//! 提供本地仓库浏览、POM 解析、依赖树构建、完整性检查等功能

use quick_xml::events::Event;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use sha1::{Sha1, Digest};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

// ============ 数据结构 ============

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MavenArtifact {
    pub group_id: String,
    pub artifact_id: String,
    pub version: String,
    pub has_jar: bool,
    pub has_pom: bool,
    pub has_sources: bool,
    pub has_sha1: bool,
    pub jar_size: Option<u64>,
    pub pom_size: Option<u64>,
    pub last_modified: u64,
    pub integrity: String, // "ok", "warning", "error"
    pub dir_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtifactFile {
    pub name: String,
    pub size: u64,
    pub last_modified: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtifactDetail {
    pub group_id: String,
    pub artifact_id: String,
    pub version: String,
    pub files: Vec<ArtifactFile>,
    pub pom_content: Option<String>,
    pub integrity_issues: Vec<IntegrityIssue>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntegrityIssue {
    pub severity: String,   // "error", "warning", "info"
    pub check_type: String, // "missing_jar", "missing_pom", "sha1_mismatch" ...
    pub message: String,
    pub file_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DepTreeNode {
    pub group_id: String,
    pub artifact_id: String,
    pub version: String,
    pub scope: String,
    pub optional: bool,
    pub exists_locally: bool,
    pub has_jar: bool,
    pub conflict_version: Option<String>,
    pub children: Vec<DepTreeNode>,
    pub depth: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PomInfo {
    pub group_id: String,
    pub artifact_id: String,
    pub version: String,
    pub packaging: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub parent: Option<ParentRef>,
    pub properties: HashMap<String, String>,
    pub dependencies: Vec<PomDependency>,
    pub dep_management: Vec<PomDependency>,
    pub modules: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParentRef {
    pub group_id: String,
    pub artifact_id: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PomDependency {
    pub group_id: String,
    pub artifact_id: String,
    pub version: Option<String>,
    pub scope: Option<String>,
    pub optional: bool,
    pub dep_type: Option<String>,
    pub exclusions: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MavenSettings {
    pub local_repo: Option<String>,
    pub mirrors: Vec<MirrorConfig>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MirrorConfig {
    pub id: String,
    pub name: Option<String>,
    pub url: String,
    pub mirror_of: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoStats {
    pub total_artifacts: u64,
    pub total_size: u64,
    pub group_count: u64,
    pub error_count: u64,
    pub warning_count: u64,
    pub top_groups: Vec<(String, u64)>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckResult {
    pub total: u64,
    pub errors: u64,
    pub warnings: u64,
    pub issues: Vec<IntegrityIssue>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DepTreeRequest {
    pub pom_path: String,
    pub repo_path: String,
}

// ============ 内部辅助 ============

/// 去除 XML namespace 前缀，如 "ns0:dependency" → "dependency"
fn strip_ns(name: &str) -> &str {
    match name.rfind(':') {
        Some(i) => &name[i + 1..],
        None => name,
    }
}

fn default_m2_repo() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".m2").join("repository")
}

fn normalize_repo_path(path: &str) -> PathBuf {
    if path.trim().is_empty() {
        default_m2_repo()
    } else {
        PathBuf::from(path)
    }
}

/// GAV → 本地仓库中的目录路径
fn gav_to_dir(repo_path: &Path, group_id: &str, artifact_id: &str, version: &str) -> PathBuf {
    let mut p = repo_path.to_path_buf();
    for part in group_id.split('.') {
        p.push(part);
    }
    p.push(artifact_id);
    p.push(version);
    p
}

fn load_parent_pom(repo_path: &Path, pom: &PomInfo) -> Option<PomInfo> {
    let parent = pom.parent.as_ref()?;
    let parent_dir = gav_to_dir(repo_path, &parent.group_id, &parent.artifact_id, &parent.version);
    let parent_pom = parent_dir.join(format!("{}-{}.pom", parent.artifact_id, parent.version));
    parse_pom(&parent_pom).ok()
}

fn build_management_map(
    pom: &PomInfo,
    merged_props: &HashMap<String, String>,
    parent_pom: Option<&PomInfo>,
) -> HashMap<String, String> {
    let mut mgmt_map: HashMap<String, String> = HashMap::new();

    if let Some(parent) = parent_pom {
        for d in &parent.dep_management {
            let ver = d.version.as_deref().unwrap_or("");
            let ver = resolve_property(ver, merged_props, parent);
            if !ver.is_empty() {
                mgmt_map.insert(format!("{}:{}", d.group_id, d.artifact_id), ver);
            }
        }
    }

    for d in &pom.dep_management {
        let ver = d.version.as_deref().unwrap_or("");
        let ver = resolve_property(ver, merged_props, pom);
        if !ver.is_empty() {
            mgmt_map.insert(format!("{}:{}", d.group_id, d.artifact_id), ver);
        }
    }

    mgmt_map
}

fn resolve_dependency_version(
    dep: &PomDependency,
    pom: &PomInfo,
    merged_props: &HashMap<String, String>,
    mgmt_map: &HashMap<String, String>,
) -> Option<String> {
    let mut version = dep.version.as_deref().unwrap_or("").to_string();
    version = resolve_property(&version, merged_props, pom);

    if version.is_empty() || version.contains("${") {
        if let Some(mgmt_ver) = mgmt_map.get(&format!("{}:{}", dep.group_id, dep.artifact_id)) {
            version = mgmt_ver.clone();
        }
    }

    if version.is_empty() || version.contains("${") {
        None
    } else {
        Some(version)
    }
}

/// 检查指定 artifact 目录的文件完整性
fn check_artifact_integrity(dir: &Path, artifact_id: &str, version: &str) -> Vec<IntegrityIssue> {
    let mut issues = Vec::new();
    let base = format!("{}-{}", artifact_id, version);

    let jar_path = dir.join(format!("{}.jar", base));
    let pom_path = dir.join(format!("{}.pom", base));
    let jar_sha1_path = dir.join(format!("{}.jar.sha1", base));
    let pom_sha1_path = dir.join(format!("{}.pom.sha1", base));

    // 检查 POM 是否存在
    if !pom_path.exists() {
        issues.push(IntegrityIssue {
            severity: "error".into(),
            check_type: "missing_pom".into(),
            message: format!("{}.pom 文件缺失", base),
            file_path: Some(pom_path.to_string_lossy().into()),
        });
    }

    // 检查 packaging 类型，判断是否需要 jar
    let packaging = if pom_path.exists() {
        read_pom_packaging(&pom_path).unwrap_or_else(|| "jar".into())
    } else {
        "jar".into()
    };

    if packaging == "jar" && !jar_path.exists() {
        issues.push(IntegrityIssue {
            severity: "error".into(),
            check_type: "missing_jar".into(),
            message: format!("{}.jar 文件缺失", base),
            file_path: Some(jar_path.to_string_lossy().into()),
        });
    }

    // 检查 SHA1
    if jar_path.exists() {
        if jar_sha1_path.exists() {
            if let Err(msg) = verify_sha1(&jar_path, &jar_sha1_path) {
                issues.push(IntegrityIssue {
                    severity: "error".into(),
                    check_type: "sha1_mismatch".into(),
                    message: msg,
                    file_path: Some(jar_sha1_path.to_string_lossy().into()),
                });
            }
        } else {
            issues.push(IntegrityIssue {
                severity: "warning".into(),
                check_type: "missing_sha1".into(),
                message: format!("{}.jar.sha1 缺失", base),
                file_path: None,
            });
        }
    }

    if pom_path.exists() && !pom_sha1_path.exists() {
        issues.push(IntegrityIssue {
            severity: "warning".into(),
            check_type: "missing_sha1".into(),
            message: format!("{}.pom.sha1 缺失", base),
            file_path: None,
        });
    }

    if pom_path.exists() && pom_sha1_path.exists() {
        if let Err(msg) = verify_sha1(&pom_path, &pom_sha1_path) {
            issues.push(IntegrityIssue {
                severity: "error".into(),
                check_type: "sha1_mismatch".into(),
                message: msg,
                file_path: Some(pom_sha1_path.to_string_lossy().into()),
            });
        }
    }

    issues
}

fn verify_sha1(file_path: &Path, sha1_path: &Path) -> Result<(), String> {
    let data = fs::read(file_path).map_err(|e| format!("读取文件失败: {}", e))?;
    let expected = fs::read_to_string(sha1_path)
        .map_err(|e| format!("读取 sha1 失败: {}", e))?;
    // sha1 文件可能包含文件名后缀，只取前 40 字符
    let expected = expected.trim().split_whitespace().next().unwrap_or("").trim();
    if expected.len() < 40 {
        return Err(format!("sha1 文件内容无效: {}", expected));
    }
    let expected = &expected[..40];

    let mut hasher = Sha1::new();
    hasher.update(&data);
    let actual = format!("{:x}", hasher.finalize());

    if actual != expected {
        Err(format!(
            "SHA1 校验失败: 期望 {} 实际 {}",
            expected, actual
        ))
    } else {
        Ok(())
    }
}

fn read_pom_packaging(pom_path: &Path) -> Option<String> {
    let content = fs::read_to_string(pom_path).ok()?;
    parse_pom_xml(&content).ok().map(|p| p.packaging)
}

// ============ POM 解析器 ============

pub fn parse_pom(pom_path: &Path) -> Result<PomInfo, String> {
    let content =
        fs::read_to_string(pom_path).map_err(|e| format!("读取 POM 失败: {}", e))?;
    parse_pom_xml(&content)
}

fn parse_pom_xml(xml: &str) -> Result<PomInfo, String> {
    let mut reader = Reader::from_str(xml);
    reader.trim_text(true);

    let mut pom = PomInfo {
        group_id: String::new(),
        artifact_id: String::new(),
        version: String::new(),
        packaging: "jar".into(),
        name: None,
        description: None,
        parent: None,
        properties: HashMap::new(),
        dependencies: Vec::new(),
        dep_management: Vec::new(),
        modules: Vec::new(),
    };

    let mut path_stack: Vec<String> = Vec::new();
    let mut buf = Vec::new();
    let mut current_text = String::new();

    // 临时结构
    let mut in_parent = false;
    let mut parent_gid = String::new();
    let mut parent_aid = String::new();
    let mut parent_ver = String::new();

    let mut in_dep_mgmt = false;
    let mut in_dependencies = false;
    let mut in_dependency = false;
    let mut dep_gid = String::new();
    let mut dep_aid = String::new();
    let mut dep_ver = String::new();
    let mut dep_scope = String::new();
    let mut dep_optional = String::new();
    let mut dep_type = String::new();
    let mut dep_exclusions: Vec<String> = Vec::new();
    let mut in_exclusion = false;
    let mut excl_gid = String::new();
    let mut excl_aid = String::new();

    let mut in_properties = false;
    let mut prop_key = String::new();

    let mut in_modules = false;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                let raw_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                let name = strip_ns(&raw_name).to_string();
                path_stack.push(name.clone());
                current_text.clear();

                let depth = path_stack.len();
                match name.as_str() {
                    "parent" if depth == 2 => in_parent = true,
                    "properties" if depth == 2 => in_properties = true,
                    "dependencyManagement" if depth == 2 => in_dep_mgmt = true,
                    "dependencies" if depth == 2 || (depth == 3 && in_dep_mgmt) => {
                        in_dependencies = true
                    }
                    "dependency" if in_dependencies => {
                        in_dependency = true;
                        dep_gid.clear(); dep_aid.clear(); dep_ver.clear();
                        dep_scope.clear(); dep_optional.clear(); dep_type.clear();
                        dep_exclusions.clear();
                    }
                    "exclusion" if in_dependency => {
                        in_exclusion = true;
                        excl_gid.clear(); excl_aid.clear();
                    }
                    "modules" if depth == 2 => in_modules = true,
                    _ if in_properties && depth == 3 => prop_key = name.clone(),
                    _ => {}
                }
            }
            Ok(Event::Text(e)) => {
                current_text = e.unescape().unwrap_or_default().to_string();
            }
            Ok(Event::End(e)) => {
                let raw_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                let name = strip_ns(&raw_name).to_string();
                let depth = path_stack.len();
                let text = current_text.trim().to_string();

                // 顶层字段
                if depth == 2 && !in_parent {
                    match name.as_str() {
                        "groupId" => pom.group_id = text.clone(),
                        "artifactId" => pom.artifact_id = text.clone(),
                        "version" => pom.version = text.clone(),
                        "packaging" => pom.packaging = text.clone(),
                        "name" => pom.name = Some(text.clone()),
                        "description" => pom.description = Some(text.clone()),
                        _ => {}
                    }
                }

                // Parent
                if in_parent && depth == 3 {
                    match name.as_str() {
                        "groupId" => parent_gid = text.clone(),
                        "artifactId" => parent_aid = text.clone(),
                        "version" => parent_ver = text.clone(),
                        _ => {}
                    }
                }
                if name == "parent" && depth == 2 {
                    in_parent = false;
                    pom.parent = Some(ParentRef {
                        group_id: parent_gid.clone(),
                        artifact_id: parent_aid.clone(),
                        version: parent_ver.clone(),
                    });
                    if pom.group_id.is_empty() { pom.group_id = parent_gid.clone(); }
                    if pom.version.is_empty() { pom.version = parent_ver.clone(); }
                }

                // Properties
                if in_properties && depth == 3 && !prop_key.is_empty() {
                    pom.properties.insert(prop_key.clone(), text.clone());
                    prop_key.clear();
                }
                if name == "properties" { in_properties = false; }

                // Dependencies
                if in_dependency && !in_exclusion {
                    match name.as_str() {
                        "groupId" => dep_gid = text.clone(),
                        "artifactId" => dep_aid = text.clone(),
                        "version" => dep_ver = text.clone(),
                        "scope" => dep_scope = text.clone(),
                        "optional" => dep_optional = text.clone(),
                        "type" => dep_type = text.clone(),
                        _ => {}
                    }
                }
                if in_exclusion {
                    match name.as_str() {
                        "groupId" => excl_gid = text.clone(),
                        "artifactId" => excl_aid = text.clone(),
                        _ => {}
                    }
                }
                if name == "exclusion" && in_exclusion {
                    in_exclusion = false;
                    if !excl_gid.is_empty() {
                        dep_exclusions.push(format!("{}:{}", excl_gid, excl_aid));
                    }
                }
                if name == "dependency" && in_dependency {
                    in_dependency = false;
                    let dep = PomDependency {
                        group_id: dep_gid.clone(),
                        artifact_id: dep_aid.clone(),
                        version: if dep_ver.is_empty() { None } else { Some(dep_ver.clone()) },
                        scope: if dep_scope.is_empty() { None } else { Some(dep_scope.clone()) },
                        optional: dep_optional == "true",
                        dep_type: if dep_type.is_empty() { None } else { Some(dep_type.clone()) },
                        exclusions: dep_exclusions.clone(),
                    };
                    if in_dep_mgmt {
                        pom.dep_management.push(dep);
                    } else {
                        pom.dependencies.push(dep);
                    }
                }
                if name == "dependencies" { in_dependencies = false; }
                if name == "dependencyManagement" { in_dep_mgmt = false; }

                // Modules
                if in_modules && name == "module" {
                    pom.modules.push(text.clone());
                }
                if name == "modules" { in_modules = false; }

                path_stack.pop();
                current_text.clear();
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("XML 解析错误: {}", e)),
            _ => {}
        }
        buf.clear();
    }

    Ok(pom)
}

/// 替换 POM 中的 ${property} 变量
fn resolve_property(val: &str, props: &HashMap<String, String>, pom: &PomInfo) -> String {
    let mut result = val.to_string();
    let mut max_iter = 10; // 防止循环引用
    while result.contains("${") && max_iter > 0 {
        max_iter -= 1;
        let mut new_result = result.clone();
        for (start, _) in result.match_indices("${") {
            if let Some(end) = result[start..].find('}') {
                let key = &result[start + 2..start + end];
                let replacement = match key {
                    "project.version" | "pom.version" => Some(pom.version.clone()),
                    "project.groupId" | "pom.groupId" => Some(pom.group_id.clone()),
                    "project.artifactId" => Some(pom.artifact_id.clone()),
                    _ => props.get(key).cloned(),
                };
                if let Some(val) = replacement {
                    new_result = new_result.replace(&format!("${{{}}}", key), &val);
                }
            }
        }
        if new_result == result { break; }
        result = new_result;
    }
    result
}

// ============ 依赖树构建 ============

struct TreeBuilder<'a> {
    repo_path: &'a Path,
    visited: HashSet<String>,
    version_map: HashMap<String, Vec<String>>, // groupId:artifactId → [versions seen]
    max_depth: u32,
}

impl<'a> TreeBuilder<'a> {
    fn new(repo_path: &'a Path) -> Self {
        Self {
            repo_path,
            visited: HashSet::new(),
            version_map: HashMap::new(),
            max_depth: 15,
        }
    }

    fn build(&mut self, pom: &PomInfo, depth: u32) -> Vec<DepTreeNode> {
        if depth > self.max_depth { return vec![]; }

        let mut merged_props = pom.properties.clone();
        let parent_pom = load_parent_pom(self.repo_path, pom);
        if let Some(parent) = parent_pom.as_ref() {
            for (k, v) in &parent.properties {
                merged_props.entry(k.clone()).or_insert_with(|| v.clone());
            }
        }
        let mgmt_map = build_management_map(pom, &merged_props, parent_pom.as_ref());

        let mut nodes = Vec::new();
        for dep in &pom.dependencies {
            let scope = dep.scope.as_deref().unwrap_or("compile");
            if scope == "test" || scope == "provided" || scope == "system" {
                continue;
            }
            if dep.optional { continue; }

            let gid = resolve_property(&dep.group_id, &merged_props, pom);
            let aid = resolve_property(&dep.artifact_id, &merged_props, pom);
            let normalized_dep = PomDependency {
                group_id: gid.clone(),
                artifact_id: aid.clone(),
                version: dep.version.clone(),
                scope: dep.scope.clone(),
                optional: dep.optional,
                dep_type: dep.dep_type.clone(),
                exclusions: dep.exclusions.clone(),
            };
            let Some(ver) = resolve_dependency_version(&normalized_dep, pom, &merged_props, &mgmt_map) else {
                continue;
            };

            let key = format!("{}:{}:{}", gid, aid, ver);
            let dep_dir = gav_to_dir(self.repo_path, &gid, &aid, &ver);
            let exists = dep_dir.exists();
            let base = format!("{}-{}", aid, ver);
            let has_jar = dep_dir.join(format!("{}.jar", base)).exists();

            let conflict_key = format!("{}:{}", gid, aid);
            let conflict = {
                let versions = self.version_map.entry(conflict_key).or_default();
                let conflict_ver = versions.iter().find(|v| **v != ver).cloned();
                if !versions.contains(&ver) { versions.push(ver.clone()); }
                conflict_ver
            };

            let children = if exists && !self.visited.contains(&key) {
                self.visited.insert(key.clone());
                let child_pom_path = dep_dir.join(format!("{}.pom", base));
                if let Ok(child_pom) = parse_pom(&child_pom_path) {
                    self.build(&child_pom, depth + 1)
                } else {
                    vec![]
                }
            } else {
                vec![]
            };

            nodes.push(DepTreeNode {
                group_id: gid,
                artifact_id: aid,
                version: ver,
                scope: scope.to_string(),
                optional: dep.optional,
                exists_locally: exists,
                has_jar,
                conflict_version: conflict,
                children,
                depth,
            });
        }
        nodes
    }
}

// ============ settings.xml 解析 ============

fn parse_settings_xml(path: &Path) -> Result<MavenSettings, String> {
    let content = fs::read_to_string(path).map_err(|e| format!("读取 settings.xml 失败: {}", e))?;
    let mut reader = Reader::from_str(&content);
    reader.trim_text(true);
    let mut buf = Vec::new();

    let mut settings = MavenSettings {
        local_repo: None,
        mirrors: Vec::new(),
    };

    let mut path_stack: Vec<String> = Vec::new();
    let mut current_text = String::new();
    let mut in_mirror = false;
    let mut m_id = String::new();
    let mut m_name = String::new();
    let mut m_url = String::new();
    let mut m_of = String::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                path_stack.push(name.clone());
                current_text.clear();
                if name == "mirror" { in_mirror = true; m_id.clear(); m_name.clear(); m_url.clear(); m_of.clear(); }
            }
            Ok(Event::Text(e)) => {
                current_text = e.unescape().unwrap_or_default().to_string();
            }
            Ok(Event::End(e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                let text = current_text.trim().to_string();

                if name == "localRepository" { settings.local_repo = Some(text.clone()); }
                if in_mirror {
                    match name.as_str() {
                        "id" => m_id = text.clone(),
                        "name" => m_name = text.clone(),
                        "url" => m_url = text.clone(),
                        "mirrorOf" => m_of = text.clone(),
                        _ => {}
                    }
                }
                if name == "mirror" && in_mirror {
                    in_mirror = false;
                    settings.mirrors.push(MirrorConfig {
                        id: m_id.clone(),
                        name: if m_name.is_empty() { None } else { Some(m_name.clone()) },
                        url: m_url.clone(),
                        mirror_of: m_of.clone(),
                    });
                }

                path_stack.pop();
                current_text.clear();
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
        buf.clear();
    }
    Ok(settings)
}

// ============ Tauri 命令 ============

/// 解析 Maven settings.xml，获取本地仓库路径和镜像配置
#[tauri::command]
pub async fn maven_parse_settings() -> Result<MavenSettings, String> {
    tokio::task::spawn_blocking(|| {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let settings_path = home.join(".m2").join("settings.xml");
        if settings_path.exists() {
            let mut settings = parse_settings_xml(&settings_path)?;
            if settings.local_repo.as_deref().unwrap_or("").trim().is_empty() {
                settings.local_repo = Some(default_m2_repo().to_string_lossy().into());
            }
            Ok(settings)
        } else {
            Ok(MavenSettings {
                local_repo: Some(default_m2_repo().to_string_lossy().into()),
                mirrors: vec![],
            })
        }
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

/// 扫描本地仓库，返回所有 artifact 列表
#[tauri::command]
pub async fn maven_scan_repo(path: String) -> Result<Vec<MavenArtifact>, String> {
    tokio::task::spawn_blocking(move || {
        let repo = normalize_repo_path(&path);
        if !repo.exists() {
            return Err(format!("仓库路径不存在: {}", repo.display()));
        }

        let mut artifacts = Vec::new();

        // 遍历寻找包含 .pom 文件的目录
        for entry in WalkDir::new(&repo).min_depth(3).into_iter().filter_map(|e| e.ok()) {
            let p = entry.path();
            if !p.is_file() { continue; }
            let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("");
            if ext != "pom" { continue; }

            let dir = match p.parent() {
                Some(d) => d,
                None => continue,
            };

            let file_name = p.file_stem().and_then(|s| s.to_str()).unwrap_or("");
            // 从目录结构解析 GAV
            let version = dir.file_name().and_then(|s| s.to_str()).unwrap_or("");
            let aid_dir = dir.parent().and_then(|d| d.file_name()).and_then(|s| s.to_str()).unwrap_or("");

            // 确认文件名匹配 artifactId-version.pom
            let expected_base = format!("{}-{}", aid_dir, version);
            if file_name != expected_base { continue; }

            // 从路径推算 groupId
            let rel = dir.parent()
                .and_then(|d| d.parent())
                .and_then(|d| d.strip_prefix(&repo).ok());
            let group_id = match rel {
                Some(r) => r.to_string_lossy().replace(['/', '\\'], "."),
                None => continue,
            };

            let base = format!("{}-{}", aid_dir, version);
            let jar_path = dir.join(format!("{}.jar", base));
            let sources_path = dir.join(format!("{}-sources.jar", base));
            let sha1_path = dir.join(format!("{}.jar.sha1", base));

            let has_jar = jar_path.exists();
            let has_pom = true; // 我们就是从 .pom 文件找到的
            let has_sources = sources_path.exists();
            let has_sha1 = sha1_path.exists();

            let jar_size = if has_jar { fs::metadata(&jar_path).ok().map(|m| m.len()) } else { None };
            let pom_size = fs::metadata(p).ok().map(|m| m.len());
            let last_modified = fs::metadata(p)
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);

            let packaging = read_pom_packaging(p).unwrap_or_else(|| "jar".into());
            let integrity = if packaging == "jar" && !has_jar {
                "error"
            } else if packaging == "jar" && !has_sha1 {
                "warning"
            } else {
                "ok"
            };

            artifacts.push(MavenArtifact {
                group_id,
                artifact_id: aid_dir.to_string(),
                version: version.to_string(),
                has_jar,
                has_pom,
                has_sources,
                has_sha1,
                jar_size,
                pom_size,
                last_modified,
                integrity: integrity.into(),
                dir_path: dir.to_string_lossy().into(),
            });
        }

        artifacts.sort_by(|a, b| {
            a.group_id.cmp(&b.group_id)
                .then(a.artifact_id.cmp(&b.artifact_id))
                .then(a.version.cmp(&b.version))
        });

        Ok(artifacts)
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

/// 获取单个 artifact 的详细信息
#[tauri::command]
pub async fn maven_get_artifact(dir_path: String) -> Result<ArtifactDetail, String> {
    tokio::task::spawn_blocking(move || {
        let dir = Path::new(&dir_path);
        if !dir.exists() {
            return Err("目录不存在".into());
        }

        let version = dir.file_name().and_then(|s| s.to_str()).unwrap_or("");
        let artifact_id = dir.parent().and_then(|d| d.file_name()).and_then(|s| s.to_str()).unwrap_or("");

        let base = format!("{}-{}", artifact_id, version);
        let pom_path = dir.join(format!("{}.pom", base));
        let pom_content = fs::read_to_string(&pom_path).ok();

        let group_from_path = dir
            .parent()
            .and_then(|d| d.parent())
            .map(|p| p.to_string_lossy().replace(['/', '\\'], "."))
            .unwrap_or_default();

        let group_id = pom_content.as_ref()
            .and_then(|c| parse_pom_xml(c).ok())
            .map(|p| p.group_id)
            .filter(|gid| !gid.trim().is_empty())
            .unwrap_or(group_from_path);

        // 列出目录中所有文件
        let mut files = Vec::new();
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let meta = entry.metadata().ok();
                if let Some(m) = &meta {
                    if !m.is_file() { continue; }
                }
                files.push(ArtifactFile {
                    name: entry.file_name().to_string_lossy().into(),
                    size: meta.as_ref().map(|m| m.len()).unwrap_or(0),
                    last_modified: meta
                        .and_then(|m| m.modified().ok())
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0),
                });
            }
        }
        files.sort_by(|a, b| a.name.cmp(&b.name));

        // 读取 POM 内容（已在上方读取）

        // 完整性检查
        let integrity_issues = check_artifact_integrity(dir, artifact_id, version);

        Ok(ArtifactDetail {
            group_id,
            artifact_id: artifact_id.into(),
            version: version.into(),
            files,
            pom_content,
            integrity_issues,
        })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

/// 全量完整性检查
#[tauri::command]
pub async fn maven_check_integrity(repo_path: String) -> Result<CheckResult, String> {
    let artifacts = maven_scan_repo(repo_path.clone()).await?;
    let total = artifacts.len() as u64;
    let mut all_issues = Vec::new();
    let repo_root = normalize_repo_path(&repo_path);

    for a in &artifacts {
        let dir = Path::new(&a.dir_path);
        let issues = check_artifact_integrity(dir, &a.artifact_id, &a.version);
        let base = format!("{}-{}", a.artifact_id, a.version);
        let pom_path = dir.join(format!("{}.pom", base));
        if pom_path.exists() {
            if let Ok(pom) = parse_pom(&pom_path) {
                let mut merged_props = pom.properties.clone();
                let parent_pom = load_parent_pom(&repo_root, &pom);
                if let Some(parent) = parent_pom.as_ref() {
                    for (k, v) in &parent.properties {
                        merged_props.entry(k.clone()).or_insert_with(|| v.clone());
                    }
                }
                let mgmt_map = build_management_map(&pom, &merged_props, parent_pom.as_ref());

                for dep in &pom.dependencies {
                    let scope = dep.scope.as_deref().unwrap_or("compile");
                    if scope == "test" || scope == "provided" || scope == "system" || dep.optional {
                        continue;
                    }

                    let gid = resolve_property(&dep.group_id, &merged_props, &pom);
                    let aid = resolve_property(&dep.artifact_id, &merged_props, &pom);
                    let normalized_dep = PomDependency {
                        group_id: gid.clone(),
                        artifact_id: aid.clone(),
                        version: dep.version.clone(),
                        scope: dep.scope.clone(),
                        optional: dep.optional,
                        dep_type: dep.dep_type.clone(),
                        exclusions: dep.exclusions.clone(),
                    };
                    let Some(ver) = resolve_dependency_version(&normalized_dep, &pom, &merged_props, &mgmt_map) else {
                        continue;
                    };

                    let dep_dir = gav_to_dir(&repo_root, &gid, &aid, &ver);
                    if !dep_dir.exists() {
                        all_issues.push(IntegrityIssue {
                            severity: "error".into(),
                            check_type: "missing_dependency".into(),
                            message: format!(
                                "{}:{}:{} 依赖的 {}:{}:{} 在本地仓库不存在",
                                a.group_id, a.artifact_id, a.version,
                                gid, aid, ver
                            ),
                            file_path: Some(dep_dir.to_string_lossy().into()),
                        });
                    }
                }
            }
        }
        for issue in issues {
            all_issues.push(IntegrityIssue {
                message: format!("{}:{}:{} - {}", a.group_id, a.artifact_id, a.version, issue.message),
                ..issue
            });
        }
    }

    let errors = all_issues.iter().filter(|i| i.severity == "error").count() as u64;
    let warnings = all_issues.iter().filter(|i| i.severity == "warning").count() as u64;

    Ok(CheckResult {
        total,
        errors,
        warnings,
        issues: all_issues,
    })
}

/// 解析 POM 文件
#[tauri::command]
pub async fn maven_parse_pom(pom_path: String) -> Result<PomInfo, String> {
    tokio::task::spawn_blocking(move || {
        parse_pom(Path::new(&pom_path))
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

/// 构建依赖树
#[tauri::command]
pub async fn maven_dep_tree(request: DepTreeRequest) -> Result<DepTreeNode, String> {
    tokio::task::spawn_blocking(move || {
        let pom_path = Path::new(&request.pom_path);
        let repo_path = normalize_repo_path(&request.repo_path);

        let pom = parse_pom(pom_path)?;
        let mut builder = TreeBuilder::new(&repo_path);
        let children = builder.build(&pom, 1);

        Ok(DepTreeNode {
            group_id: pom.group_id.clone(),
            artifact_id: pom.artifact_id.clone(),
            version: pom.version.clone(),
            scope: "compile".into(),
            optional: false,
            exists_locally: true,
            has_jar: true,
            conflict_version: None,
            children,
            depth: 0,
        })
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

/// 仓库统计
#[tauri::command]
pub async fn maven_repo_stats(repo_path: String) -> Result<RepoStats, String> {
    let artifacts = maven_scan_repo(repo_path).await?;
    let total_artifacts = artifacts.len() as u64;
    let mut total_size: u64 = 0;
    let mut groups: HashMap<String, u64> = HashMap::new();
    let mut error_count: u64 = 0;
    let mut warning_count: u64 = 0;

    for a in &artifacts {
        total_size += a.jar_size.unwrap_or(0) + a.pom_size.unwrap_or(0);
        *groups.entry(a.group_id.clone()).or_default() += 1;
        if a.integrity == "error" { error_count += 1; }
        if a.integrity == "warning" { warning_count += 1; }
    }

    let group_count = groups.len() as u64;
    let mut top_groups: Vec<(String, u64)> = groups.into_iter().collect();
    top_groups.sort_by(|a, b| b.1.cmp(&a.1));
    top_groups.truncate(10);

    Ok(RepoStats {
        total_artifacts,
        total_size,
        group_count,
        error_count,
        warning_count,
        top_groups,
    })
}
