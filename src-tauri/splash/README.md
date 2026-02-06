# 启动动画 (Splash Screen) 说明

本项目实现了专业的启动动画效果，在应用启动时显示一个精美的加载页面。

## 功能特性

✨ **已实现的功能**：
- 渐变背景动画
- 浮动粒子效果
- 旋转加载器 (Spinner)
- 进度条动画
- 动态加载状态提示
- Logo 脉冲动画
- 透明窗口效果
- 平滑过渡动画

## 文件结构

```
src-tauri/
├── splash/
│   └── index.html          # 启动动画页面
├── src/
│   └── lib.rs              # 启动逻辑（Rust 后端）
└── tauri.conf.json         # Tauri 配置（包含启动窗口配置）

src/
└── App.vue                 # 主应用入口（关闭启动窗口）
```

## 工作流程

1. **应用启动** → 显示启动窗口 (splashscreen)
2. **后台加载** → 主窗口在后台加载
3. **加载完成** → 主窗口调用 `close_splashscreen` 命令
4. **关闭启动窗口** → 启动窗口关闭
5. **显示主窗口** → 主窗口显示并获得焦点

## 自定义启动窗口

### 1. 修改外观

编辑 `src-tauri/splash/index.html`：

```html
<!-- 修改 Logo 图标 -->
<div class="logo-icon">🚀</div>  <!-- 改为你的图标或 emoji -->

<!-- 修改应用名称 -->
<h1 class="app-name">你的应用名称</h1>

<!-- 修改版本号 -->
<div class="version">v1.0.0</div>

<!-- 修改加载文本 -->
<div class="loading-text">正在启动应用...</div>
```

### 2. 修改颜色主题

在 `index.html` 的 `<style>` 标签中修改：

```css
/* 修改背景渐变 */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* 或使用其他渐变色 */
background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);  /* 粉红色 */
background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);  /* 蓝色 */
background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);  /* 绿色 */
```

### 3. 修改窗口尺寸

编辑 `src-tauri/tauri.conf.json`：

```json
{
  "label": "splashscreen",
  "width": 600,    // 修改宽度
  "height": 400,   // 修改高度
  ...
}
```

### 4. 修改加载时间

在 `src/App.vue` 中调整延迟时间：

```javascript
// 调整主窗口加载完成后的延迟
await new Promise(resolve => setTimeout(resolve, 500))  // 500ms
```

在 `src-tauri/src/lib.rs` 中调整最小显示时间：

```rust
// 调整启动窗口最小显示时间
std::thread::sleep(std::time::Duration::from_millis(2000)); // 2000ms
```

### 5. 添加自定义 Logo 图片

将 Logo 替换为图片：

```html
<!-- 在 index.html 中替换 logo-icon -->
<div class="logo">
  <img src="your-logo.png" alt="Logo" style="width: 80px; height: 80px;">
</div>
```

### 6. 修改加载状态文本

在 `index.html` 的 JavaScript 部分修改：

```javascript
const statuses = [
  '初始化中',
  '加载配置',
  '准备资源',
  '启动服务',
  '即将完成'
];
```

## 调试和测试

### 运行开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 配置说明

### 启动窗口配置 (tauri.conf.json)

```json
{
  "label": "splashscreen",
  "title": "Loading...",
  "url": "splash/index.html",     // 启动页面路径
  "width": 600,                    // 窗口宽度
  "height": 400,                   // 窗口高度
  "decorations": false,            // 无边框
  "transparent": true,             // 透明窗口
  "center": true,                  // 居中显示
  "resizable": false,              // 不可调整大小
  "alwaysOnTop": true,             // 始终置顶
  "skipTaskbar": true,             // 不显示在任务栏
  "visible": false                 // 初始不可见（由代码控制显示）
}
```

## 高级自定义

### 1. 添加实际的加载进度

可以通过事件系统从后端向启动窗口发送实际的加载进度：

**Rust 后端** (`lib.rs`):
```rust
// 发送加载进度事件
app.emit("loading-progress", 50)?; // 50%
```

**启动窗口** (index.html):
```javascript
import { listen } from '@tauri-apps/api/event'

listen('loading-progress', (event) => {
  const progress = event.payload;
  document.querySelector('.progress-fill').style.width = progress + '%';
});
```

### 2. 使用 Lottie 动画

引入 Lottie 库实现更复杂的动画效果：

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
<script>
  lottie.loadAnimation({
    container: document.getElementById('lottie'),
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: 'animation.json'
  });
</script>
```

## 常见问题

### Q: 启动窗口闪烁或立即关闭？
A: 检查 `lib.rs` 中的延迟时间是否足够，或者 `App.vue` 中的延迟是否太短。

### Q: 启动窗口不显示？
A: 确保 `splash/index.html` 路径正确，并且在 `lib.rs` 中调用了 `show()` 方法。

### Q: 背景不透明？
A: 确保 `tauri.conf.json` 中设置了 `"transparent": true`。

### Q: 如何禁用启动窗口？
A: 在 `tauri.conf.json` 中删除 splashscreen 窗口配置，并修改主窗口的 `visible` 为 `true`。

## 参考资源

- [Tauri 窗口配置文档](https://tauri.app/v1/api/config/#windowconfig)
- [CSS 渐变生成器](https://cssgradient.io/)
- [Lottie 动画库](https://airbnb.io/lottie/)
- [免费 Loading 动画](https://loading.io/)

## 性能优化建议

1. **最小化启动窗口大小** - 使用合适的窗口尺寸
2. **优化动画** - 避免过多的 DOM 元素和复杂动画
3. **减少延迟** - 主窗口加载完成后尽快关闭启动窗口
4. **使用 Web Workers** - 对于复杂的初始化任务
5. **预加载资源** - 在启动窗口显示时预加载主应用资源

---

💡 **提示**: 启动动画是用户对应用的第一印象，确保它简洁、流畅且符合品牌形象！
