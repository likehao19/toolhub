/**
 * 笔记导出工具
 */

import { readTextFile, readDir, exists } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'
import { appDataDir } from '@tauri-apps/api/path'
import { markdownToHtml } from '@/utils/markdown'
import { saveFile, openFile } from '@/utils/tauri/dialog'
import * as notesAPI from '@/utils/notes'
import JSZip from 'jszip'

/**
 * 导出笔记为 HTML
 */
export async function exportNoteToHTML(noteName) {
  try {
    const content = await notesAPI.readNote(noteName)
    const html = markdownToHtml(content)
    
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${noteName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      line-height: 1.8;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #303133;
      background: #ffffff;
    }
    h1 { font-size: 28px; font-weight: 700; margin: 24px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #ebeef5; }
    h2 { font-size: 24px; font-weight: 600; margin: 20px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #ebeef5; }
    h3 { font-size: 20px; font-weight: 600; margin: 16px 0 8px; }
    p { margin: 12px 0; }
    code { padding: 2px 6px; background: #f5f7fa; border-radius: 3px; font-family: 'Consolas', 'Monaco', monospace; }
    pre { margin: 16px 0; padding: 16px; background: #f5f7fa; border-radius: 6px; overflow-x: auto; }
    pre code { padding: 0; background: transparent; }
    blockquote { margin: 12px 0; padding: 12px 16px; border-left: 4px solid #409eff; background: #f5f7fa; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { padding: 8px 12px; border: 1px solid #ebeef5; text-align: left; }
    th { background: #f5f7fa; font-weight: 600; }
    img { max-width: 100%; height: auto; border-radius: 6px; margin: 16px 0; }
    a { color: #409eff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`
    
    const filePath = await saveFile({
      defaultPath: `${noteName}.html`,
      filters: [{
        name: 'HTML 文件',
        extensions: ['html']
      }]
    })
    
    if (filePath) {
      const { writeTextFile } = await import('@tauri-apps/plugin-fs')
      await writeTextFile(filePath, htmlContent)
      return { success: true, path: filePath }
    }
    
    return { success: false }
  } catch (error) {
    throw error
  }
}

/**
 * 导出笔记为 PDF（简化版，使用 HTML 转 PDF）
 */
export async function exportNoteToPDF(noteName) {
  try {
    // 由于 jspdf 在 Tauri 环境中可能有问题，我们使用 HTML 导出
    // 用户可以使用浏览器的打印功能将 HTML 转为 PDF
    const { ElMessage } = await import('element-plus')
    ElMessage.info('PDF 导出功能：请先导出为 HTML，然后使用浏览器打印功能保存为 PDF')
    return await exportNoteToHTML(noteName)
  } catch (error) {
    throw error
  }
}

/**
 * 批量导出笔记
 */
export async function exportNotesBatch(noteNames, format = 'html') {
  try {
    const appDir = await appDataDir()
    const exportDir = await join(appDir, 'exports', new Date().toISOString().split('T')[0])
    
    const { mkdir } = await import('@tauri-apps/plugin-fs')
    const { exists } = await import('@tauri-apps/plugin-fs')
    
    if (!(await exists(exportDir))) {
      await mkdir(exportDir, { recursive: true })
    }
    
    const results = []
    for (const noteName of noteNames) {
      try {
        if (format === 'html') {
          const content = await notesAPI.readNote(noteName)
          const html = markdownToHtml(content)
          const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${noteName}</title>
  <style>
    body { font-family: sans-serif; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 28px; margin: 24px 0 16px; border-bottom: 2px solid #ebeef5; }
    h2 { font-size: 24px; margin: 20px 0 12px; border-bottom: 1px solid #ebeef5; }
    code { background: #f5f7fa; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f5f7fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
    blockquote { border-left: 4px solid #409eff; padding: 12px 16px; background: #f5f7fa; margin: 12px 0; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`
          
          const filePath = await join(exportDir, `${noteName}.html`)
          const { writeTextFile } = await import('@tauri-apps/plugin-fs')
          await writeTextFile(filePath, htmlContent)
          results.push({ noteName, success: true, path: filePath })
        } else {
          // Markdown 格式
          const content = await notesAPI.readNote(noteName)
          const filePath = await join(exportDir, `${noteName}.md`)
          const { writeTextFile } = await import('@tauri-apps/plugin-fs')
          await writeTextFile(filePath, content)
          results.push({ noteName, success: true, path: filePath })
        }
      } catch (error) {
        results.push({ noteName, success: false, error: error.message })
      }
    }
    
    return {
      success: true,
      exportDir,
      results
    }
  } catch (error) {
    throw error
  }
}

/**
 * 导出笔记为 ZIP 压缩包
 */
export async function exportNotesToZIP(noteNames = null) {
  try {
    const zip = new JSZip()
    const notesDir = await notesAPI.getNotesDir()
    
    // 如果没有指定笔记，导出所有笔记
    if (!noteNames || noteNames.length === 0) {
      const tree = await notesAPI.getNotesTree()
      noteNames = tree.files.map(f => f.name)
    }
    
    // 添加所有笔记文件
    for (const noteName of noteNames) {
      try {
        const content = await notesAPI.readNote(noteName)
        zip.file(`${noteName}.md`, content)
        
        // 添加笔记的资源文件（图片、视频）
        const noteAssetsDir = await notesAPI.getNoteAssetsDir(noteName)
        if (await exists(noteAssetsDir)) {
          const assets = await readDir(noteAssetsDir)
          for (const asset of assets) {
            if (asset.isDirectory) {
              const subDir = await join(noteAssetsDir, asset.name)
              const subAssets = await readDir(subDir)
              for (const subAsset of subAssets) {
                if (!subAsset.isDirectory) {
                  const assetPath = await join(subDir, subAsset.name)
                  const assetContent = await readTextFile(assetPath)
                  zip.file(`${noteName}/${asset.name}/${subAsset.name}`, assetContent)
                }
              }
            }
          }
        }
      } catch (e) { /* ignore */ }
    }
    
    // 生成 ZIP 文件
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    
    // 保存文件
    const filePath = await saveFile({
      defaultPath: `notes_${new Date().toISOString().split('T')[0]}.zip`,
      filters: [{
        name: 'ZIP 文件',
        extensions: ['zip']
      }]
    })
    
    if (filePath) {
      const { writeBinaryFile } = await import('@tauri-apps/plugin-fs')
      const arrayBuffer = await zipBlob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      await writeBinaryFile(filePath, uint8Array)
      return { success: true, path: filePath }
    }
    
    return { success: false }
  } catch (error) {
    throw error
  }
}

/**
 * 从 ZIP 文件导入笔记
 */
export async function importNotesFromZIP() {
  try {
    const selected = await openFile({
      filters: [{
        name: 'ZIP 文件',
        extensions: ['zip']
      }]
    })
    
    if (!selected) {
      return { success: false, message: '未选择文件' }
    }
    
    const { readBinaryFile } = await import('@tauri-apps/plugin-fs')
    const zipData = await readBinaryFile(selected)
    const zip = await JSZip.loadAsync(zipData)
    
    const results = []
    let successCount = 0
    let failCount = 0
    
    // 遍历 ZIP 中的所有文件
    for (const [fileName, file] of Object.entries(zip.files)) {
      if (file.dir) continue // 跳过目录
      
      // 只处理 .md 文件
      if (fileName.endsWith('.md')) {
        try {
          const content = await file.async('string')
          const noteName = fileName.replace('.md', '').split('/').pop()
          
          // 保存笔记
          await notesAPI.saveNote(noteName, content)
          results.push({ noteName, success: true })
          successCount++
        } catch (error) {
          results.push({ noteName: fileName, success: false, error: error.message })
          failCount++
        }
      }
    }
    
    return {
      success: true,
      total: results.length,
      successCount,
      failCount,
      results
    }
  } catch (error) {
    throw error
  }
}

/**
 * 批量导入 Markdown 文件
 */
export async function importMarkdownFiles() {
  try {
    const selected = await openFile({
      multiple: true,
      filters: [{
        name: 'Markdown 文件',
        extensions: ['md', 'markdown']
      }]
    })
    
    if (!selected || (Array.isArray(selected) && selected.length === 0)) {
      return { success: false, message: '未选择文件' }
    }
    
    const files = Array.isArray(selected) ? selected : [selected]
    const results = []
    let successCount = 0
    let failCount = 0
    
    for (const filePath of files) {
      try {
        const { readTextFile } = await import('@tauri-apps/plugin-fs')
        const content = await readTextFile(filePath)
        
        // 从文件路径提取笔记名称
        const fileName = filePath.split(/[/\\]/).pop()
        const noteName = fileName.replace(/\.(md|markdown)$/i, '')
        
        // 保存笔记
        await notesAPI.saveNote(noteName, content)
        results.push({ noteName, success: true })
        successCount++
      } catch (error) {
        results.push({ noteName: filePath, success: false, error: error.message })
        failCount++
      }
    }
    
    return {
      success: true,
      total: files.length,
      successCount,
      failCount,
      results
    }
  } catch (error) {
    throw error
  }
}

