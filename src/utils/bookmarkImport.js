/**
 * 书签导入工具
 * 支持多种浏览器书签格式
 */

/**
 * 解析 HTML 书签文件（Chrome/Firefox/Edge 通用格式）
 * 保留文件夹结构，提取 ICON 属性中的 base64 favicon 数据
 */
export function parseHTMLBookmarks(htmlContent) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  const bookmarks = []

  // 查找所有 <A> 标签（书签链接）
  const links = doc.querySelectorAll('a')

  for (const link of links) {
    const href = link.getAttribute('href')
    const title = link.textContent || link.getAttribute('title') || ''
    const addDate = link.getAttribute('add_date')
    const icon = link.getAttribute('icon')

    if (href) {
      // 提取 favicon_data：ICON 属性如果是 data URI 则作为 favicon_data
      let faviconData = null
      let faviconUrl = null
      if (icon) {
        if (icon.startsWith('data:')) {
          faviconData = icon
        } else {
          faviconUrl = icon
        }
      }

      bookmarks.push({
        title: title.trim() || href,
        url: href,
        description: '',
        category: extractCategory(link),
        tags: [],
        favicon_url: faviconUrl,
        favicon_data: faviconData,
        created_at: addDate ? new Date(parseInt(addDate) * 1000).toISOString() : new Date().toISOString()
      })
    }
  }

  return bookmarks
}

/**
 * 从书签元素提取分类（最近的父文件夹名称）
 * 返回直接父文件夹名称而非完整路径，便于映射为 bookmark_categories
 */
function extractCategory(linkElement) {
  let parent = linkElement.parentElement

  while (parent && parent.tagName !== 'BODY') {
    // DL 的前一个兄弟元素如果是 H3，则为文件夹名
    if (parent.tagName === 'DL' && parent.previousElementSibling?.tagName === 'DT') {
      const dt = parent.previousElementSibling
      const h3 = dt.querySelector('h3') || dt
      const folderName = h3.textContent?.trim()
      // 跳过顶层 "书签栏" / "Bookmarks bar" 等
      if (folderName && !isRootFolder(folderName)) {
        return folderName
      }
    }
    parent = parent.parentElement
  }

  return null
}

/**
 * 判断是否为浏览器根文件夹（不作为分类导入）
 */
function isRootFolder(name) {
  const rootNames = [
    'Bookmarks bar', 'Bookmarks Bar', '书签栏',
    'Other bookmarks', 'Other Bookmarks', '其他书签',
    'Mobile bookmarks', 'Mobile Bookmarks', '移动设备书签',
    'Bookmarks', '书签'
  ]
  return rootNames.includes(name)
}

/**
 * 解析 Netscape 书签格式（Firefox 旧格式）
 */
export function parseNetscapeBookmarks(htmlContent) {
  return parseHTMLBookmarks(htmlContent)
}

/**
 * 导入书签文件
 * @param {File|Object} file - 文件对象或包含 {name, content} 的对象
 */
export async function importBookmarkFile(file) {
  return new Promise((resolve, reject) => {
    // 如果已经是内容对象（Tauri 环境），直接解析
    if (file.content && typeof file.content === 'string') {
      try {
        let bookmarks = []
        const fileName = file.name || ''
        const content = file.content

        // 检测文件格式
        if (fileName.endsWith('.html') || content.includes('<DL>') || content.includes('<A HREF')) {
          bookmarks = parseHTMLBookmarks(content)
        } else if (fileName.endsWith('.csv')) {
          bookmarks = parseCSVBookmarks(content)
        } else {
          reject(new Error('不支持的文件格式，请使用 HTML 或 CSV 文件'))
          return
        }

        resolve({
          success: true,
          bookmarks,
          total: bookmarks.length
        })
      } catch (error) {
        reject(error)
      }
      return
    }

    // 浏览器环境：使用 FileReader 读取文件
    if (!(file instanceof File) && !(file instanceof Blob)) {
      reject(new Error('无效的文件对象'))
      return
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target.result
        let bookmarks = []

        if (file.name.endsWith('.html') || content.includes('<DL>') || content.includes('<A HREF')) {
          bookmarks = parseHTMLBookmarks(content)
        } else if (file.name.endsWith('.csv')) {
          bookmarks = parseCSVBookmarks(content)
        } else {
          reject(new Error('不支持的文件格式，请使用 HTML 或 CSV 文件'))
          return
        }

        resolve({
          success: true,
          bookmarks,
          total: bookmarks.length
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('读取文件失败'))
    }

    reader.readAsText(file)
  })
}

/**
 * 解析 CSV 书签文件
 */
function parseCSVBookmarks(content) {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

  const bookmarks = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    const title = row.title || row.name || row.标题 || ''
    const url = row.url || row.link || row.链接 || ''
    const description = row.description || row.desc || row.描述 || ''
    const category = row.category || row.folder || row.分类 || ''

    if (url) {
      bookmarks.push({
        title: title || url,
        url,
        description,
        category: category || null,
        tags: [],
        favicon_url: null,
        favicon_data: null,
        created_at: new Date().toISOString()
      })
    }
  }

  return bookmarks
}

/**
 * 导出书签为 HTML 格式（Chrome 标准 Netscape 格式）
 * @param {Array} bookmarks - 书签数组（需包含 category_name 和 favicon_data 字段）
 */
export function exportBookmarksToHTML(bookmarks) {
  const now = new Date()
  const timestamp = Math.floor(now.getTime() / 1000)

  let html = `<!DOCTYPE NETSCAPE-BOOKMARK-FILE-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`

  // 按分类分组，优先使用 category_name
  const categories = {}
  const uncategorized = []

  for (const bookmark of bookmarks) {
    const catName = bookmark.category_name || bookmark.category
    if (catName) {
      if (!categories[catName]) {
        categories[catName] = []
      }
      categories[catName].push(bookmark)
    } else {
      uncategorized.push(bookmark)
    }
  }

  // 输出分类书签
  for (const [category, items] of Object.entries(categories)) {
    html += `    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${escapeHtml(category)}</H3>
    <DL><p>
`
    for (const bookmark of items) {
      html += formatBookmarkEntry(bookmark, timestamp, '        ')
    }
    html += `    </DL><p>
`
  }

  // 输出未分类书签
  for (const bookmark of uncategorized) {
    html += formatBookmarkEntry(bookmark, timestamp, '    ')
  }

  html += `</DL><p>
`

  return html
}

/**
 * 格式化单个书签条目为 HTML
 * 优先使用 favicon_data (base64 data URI)，其次使用 favicon_url
 */
function formatBookmarkEntry(bookmark, defaultTimestamp, indent) {
  const addDate = bookmark.created_at ? Math.floor(new Date(bookmark.created_at).getTime() / 1000) : defaultTimestamp
  // 优先使用 base64 data 作为 ICON 属性（Chrome 标准格式）
  const iconAttr = bookmark.favicon_data
    ? ` ICON="${escapeHtml(bookmark.favicon_data)}"`
    : bookmark.favicon_url
      ? ` ICON="${escapeHtml(bookmark.favicon_url)}"`
      : ''
  return `${indent}<DT><A HREF="${escapeHtml(bookmark.url)}" ADD_DATE="${addDate}"${iconAttr}>${escapeHtml(bookmark.title)}</A>
`
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text) {
  if (!text) return ''
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}
