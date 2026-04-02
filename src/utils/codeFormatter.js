/**
 * 代码格式化工具函数
 * 支持 20+ 语言语法高亮 + 格式化
 */

import * as prettier from 'prettier/standalone'
import prettierBabel from 'prettier/plugins/babel'
import prettierEstree from 'prettier/plugins/estree'
import prettierHtml from 'prettier/plugins/html'
import prettierCss from 'prettier/plugins/postcss'
import prettierMarkdown from 'prettier/plugins/markdown'
import prettierYaml from 'prettier/plugins/yaml'
import prettierGraphql from 'prettier/plugins/graphql'
import { format as formatSQL } from 'sql-formatter'
import xmlFormatter from 'xml-formatter'

const PRETTIER_PLUGINS = [
  prettierBabel, prettierEstree, prettierHtml,
  prettierCss, prettierMarkdown, prettierYaml, prettierGraphql,
]

// ============ 语言配置 ============

export const LANGUAGES = {
  json:       { label: 'JSON',       formatter: 'json',    minify: true  },
  javascript: { label: 'JavaScript', formatter: 'prettier', minify: true,  parser: 'babel' },
  typescript: { label: 'TypeScript', formatter: 'prettier', minify: false, parser: 'typescript' },
  html:       { label: 'HTML',       formatter: 'prettier', minify: true,  parser: 'html' },
  css:        { label: 'CSS',        formatter: 'prettier', minify: true,  parser: 'css' },
  scss:       { label: 'SCSS',       formatter: 'prettier', minify: false, parser: 'scss' },
  less:       { label: 'Less',       formatter: 'prettier', minify: false, parser: 'less' },
  vue:        { label: 'Vue',        formatter: 'prettier', minify: false, parser: 'vue' },
  markdown:   { label: 'Markdown',   formatter: 'prettier', minify: false, parser: 'markdown' },
  yaml:       { label: 'YAML',       formatter: 'prettier', minify: false, parser: 'yaml' },
  graphql:    { label: 'GraphQL',    formatter: 'prettier', minify: false, parser: 'graphql' },
  sql:        { label: 'SQL',        formatter: 'sql',     minify: false },
  xml:        { label: 'XML',        formatter: 'xml',     minify: true  },
  java:       { label: 'Java',       formatter: null,       minify: false },
  python:     { label: 'Python',     formatter: null,       minify: false },
  go:         { label: 'Go',         formatter: null,       minify: false },
  rust:       { label: 'Rust',       formatter: null,       minify: false },
  cpp:        { label: 'C / C++',    formatter: null,       minify: false },
  php:        { label: 'PHP',        formatter: null,       minify: false },
  shell:      { label: 'Shell',      formatter: null,       minify: false },
}

// ============ 语言检测 ============

export function detectLanguage(code) {
  const t = code.trim()
  if (!t) return 'javascript'
  // JSON
  if (/^[\[{]/.test(t)) {
    try { JSON.parse(t); return 'json' } catch { /* not json */ }
  }
  // PHP（<?php 开头）
  if (/^<\?php\b/.test(t)) return 'php'
  // XML declaration
  if (t.startsWith('<?xml')) return 'xml'
  // HTML doctype / <html>
  if (/^<!DOCTYPE\s+html/i.test(t) || /^<html[\s>]/i.test(t)) return 'html'
  // SQL
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\b/i.test(t)) return 'sql'
  // GraphQL
  if (/^(query|mutation|subscription|fragment|type|schema|input|enum|interface|union)\s+\w/.test(t) && t.includes('{')) return 'graphql'
  // Shell (shebang)
  if (/^#!\/(bin\/(ba)?sh|usr\/bin\/env)/.test(t)) return 'shell'
  // Go（package main 或含 func/import( 组合）
  if (/^package\s+main\b/.test(t)) return 'go'
  if (/^(func\s+\w|import\s+\()/.test(t) && /\bfunc\b/.test(t)) return 'go'
  // Java（package xxx.yyy; 或 import java. 或 public class）
  if (/^(package\s+[\w.]+;|import\s+java\.|public\s+class\s)/.test(t)) return 'java'
  // Rust
  if (/^(fn\s|use\s+(std|crate)|mod\s|pub\s+(fn|struct|enum|mod)\s|impl\s)/.test(t)) return 'rust'
  // C/C++（#include 开头）
  if (/^#include\s+[<"]/.test(t)) return 'cpp'
  // Python（区分 class Foo: 和 import xxx 与 JS 的差异）
  if (/^(def\s+\w+\s*\(|if\s+__name__\s*==)/.test(t)) return 'python'
  if (/^class\s+\w+.*:$/.test(t.split('\n')[0])) return 'python'
  if (/^(from\s+\w+\s+import\s|import\s+\w+)/.test(t) && !/\bfrom\s+['"]/.test(t)) return 'python'
  // TypeScript（含类型注解特征）
  if (/^(interface\s+\w|type\s+\w.*=|enum\s+\w)/.test(t)) return 'typescript'
  if (/^(import|export|const|let)\s/.test(t) && /:\s*(string|number|boolean|any|void|Record|Array|Promise)\b/.test(t)) return 'typescript'
  // YAML（排除 Markdown frontmatter: --- 后面跟 key: value 才算 YAML）
  if (/^\w[\w-]*:\s/.test(t) && !t.includes('{')) return 'yaml'
  if (t.startsWith('---') && /\n\w[\w-]*:\s/.test(t)) return 'yaml'
  // SCSS（含 $ 变量或 @mixin/@include）
  if (/^\$[\w-]+\s*:/.test(t) || /^@(mixin|include)\s/.test(t)) return 'scss'
  // CSS（.class{ 或 #id{ 但不是 # heading）
  if (/^(\.[a-zA-Z]|#[a-zA-Z]|@media|@import|:root)\s*\{?/.test(t) && t.includes('{')) return 'css'
  // Markdown（# 后面有空格）
  if (/^#{1,6}\s/.test(t)) return 'markdown'
  // Vue SFC（含 <template>/<script>/<style> 组合）
  if (/^<(template|script|style)\b/.test(t) && /<\/(template|script|style)>/.test(t)) return 'vue'
  // HTML（含常见 HTML 标签）
  if (/^<\w/.test(t) && /<\/(div|span|p|a|ul|ol|li|section|header|footer|main|nav|article|h[1-6])\b/.test(t)) return 'html'
  // XML (generic tags)
  if (/^<\w/.test(t) && t.includes('</')) return 'xml'
  // JS/TS fallback
  if (/^(const |let |var |function |import |export |class )/.test(t)) return 'javascript'
  return 'javascript'
}

// ============ CodeMirror 语言加载器（按需） ============

const langLoaders = {
  javascript: () => import('@codemirror/lang-javascript').then(m => m.javascript({ jsx: true })),
  typescript: () => import('@codemirror/lang-javascript').then(m => m.javascript({ jsx: true, typescript: true })),
  json:       () => import('@codemirror/lang-json').then(m => m.json()),
  html:       () => import('@codemirror/lang-html').then(m => m.html()),
  vue:        () => import('@codemirror/lang-html').then(m => m.html()),
  css:        () => import('@codemirror/lang-css').then(m => m.css()),
  scss:       () => import('@codemirror/lang-css').then(m => m.css()),
  less:       () => import('@codemirror/lang-css').then(m => m.css()),
  xml:        () => import('@codemirror/lang-xml').then(m => m.xml()),
  sql:        () => import('@codemirror/lang-sql').then(m => m.sql()),
  java:       () => import('@codemirror/lang-java').then(m => m.java()),
  python:     () => import('@codemirror/lang-python').then(m => m.python()),
  go:         () => import('@codemirror/lang-go').then(m => m.go()),
  rust:       () => import('@codemirror/lang-rust').then(m => m.rust()),
  cpp:        () => import('@codemirror/lang-cpp').then(m => m.cpp()),
  php:        () => import('@codemirror/lang-php').then(m => m.php()),
  markdown:   () => import('@codemirror/lang-markdown').then(m => m.markdown()),
  yaml:       () => import('@codemirror/lang-yaml').then(m => m.yaml()),
  graphql:    () => import('@codemirror/lang-json').then(m => m.json()), // fallback
  shell:      () => import('@codemirror/lang-javascript').then(m => m.javascript()), // fallback
}

export async function getLanguageExtension(lang) {
  const loader = langLoaders[lang]
  if (!loader) return null
  try { return await loader() } catch { return null }
}

// ============ 格式化 ============

export async function formatCode(code, lang, options = {}) {
  const config = LANGUAGES[lang]
  if (!config?.formatter) return code

  const tabWidth = options.tabWidth || 2

  switch (config.formatter) {
    case 'json': {
      let parsed
      try { parsed = JSON.parse(code) } catch { throw new Error('Invalid JSON') }
      return JSON.stringify(parsed, null, tabWidth)
    }

    case 'prettier':
      return await prettier.format(code, {
        parser: config.parser,
        plugins: PRETTIER_PLUGINS,
        tabWidth,
        singleQuote: true,
        trailingComma: 'es5',
        printWidth: 100,
      })

    case 'sql':
      return formatSQL(code, { tabWidth, keywordCase: 'upper' })

    case 'xml':
      return xmlFormatter(code, {
        indentation: ' '.repeat(tabWidth),
        collapseContent: true,
        lineSeparator: '\n',
      })

    default:
      return code
  }
}

// ============ 压缩 ============

export function minifyCode(code, lang) {
  switch (lang) {
    case 'json': {
      let parsed
      try { parsed = JSON.parse(code) } catch { throw new Error('Invalid JSON') }
      return JSON.stringify(parsed)
    }
    case 'xml':
      return xmlFormatter(code, { indentation: '', lineSeparator: '' })
    case 'css':
      return minifyCSS(code)
    case 'html':
      return minifyHTML(code)
    case 'javascript':
      return minifyJS(code)
    default:
      return code
  }
}

// ============ 安全的压缩实现 ============

/**
 * CSS 压缩：保护字符串内容
 */
function minifyCSS(code) {
  // 提取并保护字符串
  const strings = []
  let safe = code.replace(/(["'])(?:(?!\1|\\).|\\.)*\1/g, (m) => {
    strings.push(m)
    return `__CSS_STR_${strings.length - 1}__`
  })
  // 删除注释
  safe = safe.replace(/\/\*[\s\S]*?\*\//g, '')
  // 压缩空白
  safe = safe.replace(/\s+/g, ' ')
  safe = safe.replace(/\s*([{}:;,>~+])\s*/g, '$1')
  safe = safe.trim()
  // 还原字符串
  safe = safe.replace(/__CSS_STR_(\d+)__/g, (_, i) => strings[i])
  return safe
}

/**
 * HTML 压缩：保护 <pre>、<textarea>、<script>、<style> 内容
 */
function minifyHTML(code) {
  const preserved = []
  // 保护 pre/textarea/script/style 标签内容
  let safe = code.replace(/<(pre|textarea|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => {
    preserved.push(m)
    return `__HTML_PRE_${preserved.length - 1}__`
  })
  // 压缩非保护区域
  safe = safe.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim()
  // 还原保护块
  safe = safe.replace(/__HTML_PRE_(\d+)__/g, (_, i) => preserved[i])
  return safe
}

/**
 * JS 压缩：保护字符串和正则字面量
 */
function minifyJS(code) {
  const tokens = []
  // 保护模板字符串、普通字符串、正则字面量
  let safe = code.replace(/`(?:[^`\\]|\\.|\$\{(?:[^{}]|\{[^}]*\})*\})*`/g, (m) => {
    tokens.push(m); return `__JS_TOK_${tokens.length - 1}__`
  })
  safe = safe.replace(/(["'])(?:(?!\1|\\).|\\.)*\1/g, (m) => {
    tokens.push(m); return `__JS_TOK_${tokens.length - 1}__`
  })
  safe = safe.replace(/\/(?![/*])(?:[^/\\]|\\.)+\/[gimsuy]*/g, (m) => {
    tokens.push(m); return `__JS_TOK_${tokens.length - 1}__`
  })
  // 删除注释
  safe = safe.replace(/\/\/.*$/gm, '')
  safe = safe.replace(/\/\*[\s\S]*?\*\//g, '')
  // 压缩空白
  safe = safe.replace(/\s+/g, ' ').trim()
  // 还原 token
  safe = safe.replace(/__JS_TOK_(\d+)__/g, (_, i) => tokens[i])
  return safe
}
