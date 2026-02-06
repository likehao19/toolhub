# Vue 前端代码结构说明

## 目录结构

```
src/
├── api/                    # API 接口层
│   ├── window.js          # 窗口相关 API
│   └── index.js           # API 统一导出
├── assets/                # 静态资源
├── components/            # 可复用组件
│   ├── CloseConfirmDialog.vue    # 关闭确认对话框
│   ├── FeatureGrid.vue           # 功能特性展示
│   ├── Sidebar.vue               # 侧边栏
│   ├── ThemeSettingCard.vue      # 主题设置卡片
│   ├── TitleBar.vue              # 标题栏
│   ├── TraySettingCard.vue       # 托盘设置卡片
│   └── WindowManagementCard.vue  # 窗口管理卡片
├── composables/           # 组合式函数（可复用逻辑）
│   ├── useSettings.js     # 设置相关逻辑
│   ├── useWindow.js       # 窗口管理逻辑
│   └── index.js           # Composables 统一导出
├── constants/             # 常量配置
│   └── index.js           # 应用常量（窗口配置、主题、菜单等）
├── router/                # 路由配置
│   └── index.js
├── store/                 # 状态管理（Pinia）
│   └── index.js
├── types/                 # TypeScript 类型定义（预留）
├── utils/                 # 工具函数
│   └── tauri/             # Tauri API 封装
├── views/                 # 页面组件
│   ├── About.vue
│   └── Home.vue
├── App.vue                # 根组件
└── main.js                # 入口文件
```

## 架构设计原则

### 1. 分层架构

- **API 层** (`src/api/`): 封装所有与后端（Rust）的通信
- **Composables 层** (`src/composables/`): 可复用的业务逻辑
- **组件层** (`src/components/`): UI 组件，单一职责
- **视图层** (`src/views/`): 页面级组件，组合多个组件

### 2. 关注点分离

- **常量配置** (`src/constants/`): 所有魔法数字和字符串统一管理
- **状态管理** (`src/store/`): 全局状态使用 Pinia
- **路由管理** (`src/router/`): 页面路由配置

### 3. 代码规范

#### 文件命名
- 组件文件: PascalCase (如 `ThemeSettingCard.vue`)
- 工具文件: camelCase (如 `useWindow.js`)
- 常量文件: kebab-case 或 index (如 `constants/index.js`)

#### 函数命名
- 事件处理函数: `handle` 前缀 (如 `handleClick`)
- Composable 函数: `use` 前缀 (如 `useWindow`)
- API 函数: 动词开头 (如 `createWindow`, `fetchData`)

#### 注释规范
- 所有导出的函数都应有 JSDoc 注释
- 复杂逻辑应添加行内注释说明
- 组件 props 应添加类型和描述

## 使用示例

### 1. 使用 API 层

```javascript
import { windowApi } from '@/api'

// 创建子窗口
const windowLabel = await windowApi.createChildWindow('https://example.com')
```

### 2. 使用 Composables

```javascript
import { useWindow } from '@/composables'

const { childWindowUrl, creatingWindow, createChildWindow } = useWindow()
```

### 3. 使用常量

```javascript
import { CLOSE_ACTIONS, CLOSE_ACTION_LABELS } from '@/constants'

const actionText = CLOSE_ACTION_LABELS[CLOSE_ACTIONS.MINIMIZE]
```

## 优势

1. **可维护性**: 清晰的代码组织，易于定位和修改
2. **可复用性**: Composables 和组件可在多处使用
3. **可测试性**: 每个模块职责单一，易于单元测试
4. **可扩展性**: 新功能可以独立添加，不影响现有代码
5. **团队协作**: 规范的结构便于多人协作开发

## 注意事项

- 新增 API 接口应添加到 `src/api/` 目录
- 可复用逻辑优先考虑抽取为 Composable
- 组件应保持单一职责，复杂组件应拆分
- 常量和配置应统一管理，避免硬编码
- 所有函数应添加类型注解和文档注释
