# 图片 Base64 转换工具方案

## 一、功能概述

提供图片与 Base64 编码之间的相互转换工具，支持**本地文件**和**远程 URL**两种输入方式，覆盖所有常见图片格式，内嵌于工具箱图片工具分类中。

### 核心能力

| 能力 | 说明 |
|------|------|
| 本地文件转换 | 拖拽或点击选择本地图片，转为 Base64 |
| URL 远程转换 | 输入图片 URL，fetch 获取后转为 Base64 |
| 格式切换 | Data URI（含 MIME 前缀） ↔ 纯 Base64 |
| 图片预览 | 实时预览转换后的图片 |
| 一键复制 | 复制 Base64 结果到剪贴板 |
| 文件信息 | 显示文件名、大小、MIME 类型、图片尺寸 |
| 全格式支持 | PNG, JPG, JPEG, GIF, BMP, WebP, SVG, ICO, TIFF, AVIF |

---

## 二、技术选型

### 2.1 图片读取方案

| 方案 | 说明 | 选择 |
|------|------|------|
| FileReader API | 浏览器原生，`readAsDataURL()` 直接输出 Base64 | ✅ 本地文件 |
| fetch + blob | 通过 HTTP 获取远程图片，转为 Blob 再用 FileReader | ✅ URL 输入 |
| Canvas 方案 | 绘制到 Canvas 后 `toDataURL()`，有跨域和质量损失问题 | ❌ 不采用 |

**选择 FileReader + fetch**：零依赖，原生 API 无损转换，不引入额外 npm 包。

### 2.2 支持的图片 MIME 类型

```
image/png, image/jpeg, image/gif, image/bmp, image/webp,
image/svg+xml, image/x-icon, image/tiff, image/avif
```

对应文件扩展名：`.png .jpg .jpeg .gif .bmp .webp .svg .ico .tiff .tif .avif`

---

## 三、UI 设计

### 3.1 页面布局

```
┌──────────────────────────────────────────────────────┐
│  🔤 图片Base64  (breadcrumb)                         │
├──────────────────────────────────────────────────────┤
│  [Data URI ▾]  [复制]  [清空]                         │
├─────────────────────┬────────────────────────────────┤
│                     │                                │
│   ┌─────────────┐   │   Base64 输出文本区             │
│   │  拖拽图片    │   │   (textarea / 只读)            │
│   │  或点击选择  │   │                                │
│   └─────────────┘   │                                │
│                     │                                │
│   URL: [________]   │                                │
│   [转换]            │                                │
│                     │                                │
│   ┌─ 图片预览 ──┐   │                                │
│   │             │   │                                │
│   └─────────────┘   │                                │
│                     │                                │
│   文件名: xxx.png   │                                │
│   大小: 12.3 KB     │                                │
│   类型: image/png   │                                │
│   尺寸: 800×600     │                                │
│                     │                                │
├─────────────────────┴────────────────────────────────┤
│  状态栏：就绪 / 转换成功 / Base64 长度: 12345         │
└──────────────────────────────────────────────────────┘
```

### 3.2 工具栏说明

| 控件 | 功能 |
|------|------|
| 格式下拉 | Data URI / 纯 Base64 切换 |
| 复制按钮 | 复制当前输出到剪贴板 |
| 清空按钮 | 重置所有输入输出 |

---

## 四、核心实现

### 4.1 本地文件转 Base64

```javascript
const handleFile = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    dataUri.value = e.target.result          // data:image/png;base64,xxx
    rawBase64.value = dataUri.value.split(',')[1]  // 纯 base64
  }
  reader.readAsDataURL(file)
}
```

### 4.2 URL 转 Base64

```javascript
const handleUrl = async (url) => {
  const resp = await fetch(url)
  const blob = await resp.blob()
  const reader = new FileReader()
  reader.onload = (e) => {
    dataUri.value = e.target.result
    rawBase64.value = dataUri.value.split(',')[1]
  }
  reader.readAsDataURL(blob)
}
```

### 4.3 获取图片尺寸

```javascript
const getImageDimensions = (dataUri) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.src = dataUri
  })
}
```

### 4.4 文件大小格式化

```javascript
const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}
```

---

## 五、文件结构

```
src/
  views/
    ImageToBase64.vue        ← 新增：工具页面组件
  router/
    index.js                 ← 修改：添加路由
  components/
    ProductivitySidebar.vue  ← 修改：添加 toolPathMap
  views/
    Toolbox.vue              ← 修改：启用工具条目
  i18n/
    locales/
      zh-CN.js               ← 修改：添加页面 i18n 键
      en-US.js               ← 修改：添加页面 i18n 键
```

### 新增 npm 依赖

**无** — 全部使用浏览器原生 API（FileReader、fetch、Image、Clipboard）。

---

## 六、依赖估算

| 项目 | 体积 |
|------|------|
| 新增 npm 包 | 0 KB |
| Vue 组件代码 | ~8 KB |
| **总增量** | **~8 KB** |

---

## 七、实现优先级

| 优先级 | 功能 |
|--------|------|
| P0 | 本地文件拖拽/选择 → Base64 转换 |
| P0 | 图片预览 + 文件信息展示 |
| P0 | 一键复制、格式切换（Data URI / 纯 Base64） |
| P1 | URL 远程图片转换 |
| P2 | 批量文件转换 |
| P3 | Base64 → 图片（反向转换） |

---

## 八、路由与注册

```javascript
// router/index.js
{
  path: '/toolbox/image-to-base64',
  name: 'imageToBase64',
  component: () => import('@/views/ImageToBase64.vue'),
  meta: { title: '图片Base64' }
}

// Toolbox.vue — imageTools 中修改
{ id: 'image-to-base64', ..., type: 'page', enabled: true }

// ProductivitySidebar.vue — toolPathMap
'image-to-base64': '/toolbox/image-to-base64'
```

## 九、i18n 键

```javascript
// zh-CN
imageToBase64: {
  title: '图片 Base64 转换',
  dropHint: '拖拽图片到此处，或点击选择文件',
  urlPlaceholder: '输入图片 URL',
  convert: '转换',
  copy: '复制',
  clear: '清空',
  dataUri: 'Data URI',
  rawBase64: '纯 Base64',
  fileName: '文件名',
  fileSize: '大小',
  mimeType: '类型',
  dimensions: '尺寸',
  copied: '已复制到剪贴板',
  convertSuccess: '转换成功',
  convertFail: '转换失败',
  ready: '就绪',
  base64Length: 'Base64 长度',
  supportedFormats: '支持格式：PNG, JPG, GIF, BMP, WebP, SVG, ICO, TIFF, AVIF',
  urlFetchError: 'URL 获取失败，请检查地址是否正确',
  invalidFile: '不支持的文件类型'
}
```
