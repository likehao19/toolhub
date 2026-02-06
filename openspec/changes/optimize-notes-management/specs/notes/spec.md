## MODIFIED Requirements

### Requirement: 笔记管理界面布局
系统应提供一个优化的笔记管理界面，编辑器操作栏位于顶部，编辑区域宽阔，编辑时可隐藏文件夹列表以扩大编辑空间。

#### Scenario: 编辑器布局优化
- **WHEN** 用户打开笔记编辑器
- **THEN** 编辑器操作栏位于顶部一行
- **AND** 编辑区域占据主要空间，宽度宽阔
- **AND** 所有编辑器操作按钮统一排列在顶部操作栏

#### Scenario: 编辑时隐藏文件夹列表
- **WHEN** 用户进入编辑模式
- **THEN** 系统提供选项隐藏文件夹列表
- **AND** 隐藏后编辑区域进一步扩大
- **AND** 用户可以随时恢复显示文件夹列表

#### Scenario: 白色主题应用
- **WHEN** 用户查看笔记管理界面
- **THEN** 界面采用白色主题
- **AND** 设计简约而不失功能全面
- **AND** 保持良好的视觉层次和可读性

## MODIFIED Requirements

### Requirement: 文件列表展示
系统应提供一个信息全面的文件列表，显示文件类型图标、文件大小、标签、修改时间等信息，并支持排序和筛选。

#### Scenario: 文件列表信息展示
- **WHEN** 用户查看文件列表
- **THEN** 系统显示文件类型图标（根据文件扩展名）
- **AND** 显示文件大小
- **AND** 显示文件标签
- **AND** 显示修改时间
- **AND** 显示文件名

#### Scenario: 文件列表排序
- **WHEN** 用户在文件列表中
- **THEN** 系统支持按名称排序
- **AND** 支持按文件大小排序
- **AND** 支持按修改时间排序
- **AND** 支持升序/降序切换

#### Scenario: 文件列表筛选
- **WHEN** 用户在文件列表中
- **THEN** 系统支持按标签筛选
- **AND** 支持按文件类型筛选
- **AND** 支持组合筛选条件

## MODIFIED Requirements

### Requirement: 文件夹管理
系统应使用展开/折叠图标表示文件夹状态，支持文件夹拖拽排序。

#### Scenario: 文件夹图标显示
- **WHEN** 用户查看文件夹树
- **THEN** 系统使用展开图标表示展开的文件夹
- **AND** 使用折叠图标表示折叠的文件夹
- **AND** 不使用传统文件夹图标

#### Scenario: 文件夹拖拽排序
- **WHEN** 用户拖拽文件夹
- **THEN** 系统显示拖拽图标指示
- **AND** 支持文件夹位置调整
- **AND** 拖拽完成后更新文件夹顺序

## MODIFIED Requirements

### Requirement: 新建文件流程
系统应提供内联输入框方式新建文件，无需弹窗，失焦自动保存，并支持模板选择。

#### Scenario: 内联新建文件
- **WHEN** 用户点击新建文件
- **THEN** 系统显示内联输入框（不弹窗）
- **AND** 用户输入文件名
- **AND** 输入框失焦时自动保存文件
- **AND** 新建文件出现在文件列表中

#### Scenario: 新建文件时选择模板
- **WHEN** 用户新建文件
- **THEN** 系统展示模板选择界面
- **AND** 根据文件类型显示对应模板
- **AND** 用户可以选择模板或创建空白文件
- **AND** 选择模板后使用模板内容初始化文件

## MODIFIED Requirements

### Requirement: 编辑器工具栏
系统应将所有编辑器操作统一到顶部一行，同类型操作使用下拉菜单，并提供Markdown常用格式化功能。

#### Scenario: 工具栏统一布局
- **WHEN** 用户在编辑器中
- **THEN** 所有编辑器操作按钮位于顶部一行
- **AND** 同类型操作使用下拉菜单组织
- **AND** 工具栏布局紧凑美观

#### Scenario: Markdown格式化功能
- **WHEN** 用户编辑Markdown文件
- **THEN** 系统提供加粗按钮
- **AND** 提供斜体按钮
- **AND** 提供代码块按钮
- **AND** 提供标题按钮（H1-H6）
- **AND** 提供列表按钮（有序/无序）
- **AND** 提供链接按钮
- **AND** 提供图片按钮
- **AND** 提供表格按钮
- **AND** 所有按钮在工具栏中可见

## MODIFIED Requirements

### Requirement: 标签功能利用
系统应充分利用标签功能，在文件列表中显示标签，并支持按标签筛选。

#### Scenario: 文件列表标签展示
- **WHEN** 用户查看文件列表
- **THEN** 系统在文件列表中显示文件标签
- **AND** 标签清晰可见
- **AND** 支持标签点击筛选

#### Scenario: 按标签筛选
- **WHEN** 用户点击标签或使用筛选功能
- **THEN** 系统按标签筛选文件
- **AND** 显示筛选结果
- **AND** 支持多标签组合筛选

## MODIFIED Requirements

### Requirement: 导出和批量导入功能位置
系统应将导出和批量导入功能放置在文件列表操作栏，而非编辑器内。

#### Scenario: 导出功能位置
- **WHEN** 用户在文件列表中
- **THEN** 导出功能位于文件列表操作栏
- **AND** 支持单个文件导出
- **AND** 支持批量文件导出

#### Scenario: 批量导入功能位置
- **WHEN** 用户在文件列表中
- **THEN** 批量导入功能位于文件列表操作栏
- **AND** 支持批量导入文件
- **AND** 导入后文件出现在列表中

## MODIFIED Requirements

### Requirement: 文章标题编辑
系统SHALL提供流畅的文章标题编辑体验。

#### Scenario: 标题编辑
- **WHEN** 用户编辑文章标题
- **THEN** 标题编辑流畅无卡顿
- **AND** 支持实时保存
- **AND** 编辑体验良好

## ADDED Requirements

### Requirement: 多文件类型支持
系统应支持编辑多种文件类型，包括Excel、Word、TXT等，使用开源组件实现。

#### Scenario: Excel文件编辑
- **WHEN** 用户打开Excel文件（.xlsx, .xls）
- **THEN** 系统使用Excel编辑组件打开文件
- **AND** 支持基本的Excel编辑功能
- **AND** 支持保存修改

#### Scenario: Word文件编辑
- **WHEN** 用户打开Word文件（.docx, .doc）
- **THEN** 系统使用Word编辑组件打开文件
- **AND** 支持基本的Word编辑功能
- **AND** 支持保存修改

#### Scenario: TXT文件编辑
- **WHEN** 用户打开TXT文件
- **THEN** 系统使用文本编辑器打开文件
- **AND** 支持文本编辑
- **AND** 支持保存修改

#### Scenario: 文件类型检测
- **WHEN** 用户打开文件
- **THEN** 系统自动检测文件类型
- **AND** 根据文件类型选择对应的编辑器
- **AND** 显示对应的文件类型图标

## ADDED Requirements

### Requirement: 目录展示功能
系统应为Markdown和Word文件提供目录展示功能，支持点击跳转。

#### Scenario: Markdown目录展示
- **WHEN** 用户打开Markdown文件
- **THEN** 系统解析Markdown标题结构
- **AND** 在侧边栏显示目录
- **AND** 支持点击目录项跳转到对应位置

#### Scenario: Word目录展示
- **WHEN** 用户打开Word文件
- **THEN** 系统解析Word标题结构
- **AND** 在侧边栏显示目录
- **AND** 支持点击目录项跳转到对应位置

## ADDED Requirements

### Requirement: 文件拖拽排序
系统应支持文件和文件夹的拖拽排序功能，使用拖拽图标指示。

#### Scenario: 文件拖拽排序
- **WHEN** 用户拖拽文件
- **THEN** 系统显示拖拽图标指示
- **AND** 支持文件位置调整
- **AND** 拖拽完成后更新文件顺序
- **AND** 保存新的文件顺序

#### Scenario: 文件夹拖拽排序
- **WHEN** 用户拖拽文件夹
- **THEN** 系统显示拖拽图标指示
- **AND** 支持文件夹位置调整
- **AND** 拖拽完成后更新文件夹顺序
- **AND** 保存新的文件夹顺序

## ADDED Requirements

### Requirement: 模板系统增强
系统应扩展模板系统支持多文件类型，提供模板CRUD功能，并在新建文件时展示模板选择。

#### Scenario: 多文件类型模板
- **WHEN** 用户创建模板
- **THEN** 系统支持为不同文件类型创建模板
- **AND** Markdown文件有Markdown模板
- **AND** Word文件有Word模板
- **AND** Excel文件有Excel模板

#### Scenario: 模板CRUD
- **WHEN** 用户管理模板
- **THEN** 系统支持创建模板
- **AND** 支持读取模板
- **AND** 支持更新模板
- **AND** 支持删除模板

#### Scenario: 新建文件时选择模板
- **WHEN** 用户新建文件
- **THEN** 系统展示模板选择界面
- **AND** 根据文件类型显示对应模板列表
- **AND** 用户可以选择模板或创建空白文件

## ADDED Requirements

### Requirement: 资源文件管理
系统应将Markdown中的图片和视频按随机ID保存到对应的资源文件夹中。

#### Scenario: 图片资源保存
- **WHEN** 用户在Markdown中插入图片
- **THEN** 系统生成随机ID
- **AND** 将图片保存到笔记对应的资源文件夹
- **AND** 使用随机ID作为文件名
- **AND** 在Markdown中使用相对路径引用

#### Scenario: 视频资源保存
- **WHEN** 用户在Markdown中插入视频
- **THEN** 系统生成随机ID
- **AND** 将视频保存到笔记对应的资源文件夹
- **AND** 使用随机ID作为文件名
- **AND** 在Markdown中使用相对路径引用

## ADDED Requirements

### Requirement: Markdown实时预览
系统SHALL参考开源MD编辑器实现方式，支持Markdown语法实时渲染，图片在编辑器中实时显示，无需切换预览模式。

#### Scenario: Markdown实时渲染
- **WHEN** 用户编辑Markdown内容
- **THEN** 系统实时渲染Markdown语法
- **AND** 格式化文本（加粗、斜体等）实时显示效果
- **AND** 代码块实时高亮显示
- **AND** 表格实时渲染

#### Scenario: 图片实时显示
- **WHEN** 用户在Markdown中插入图片
- **THEN** 图片在编辑器中实时显示
- **AND** 无需切换到预览模式
- **AND** 图片与文本混合显示
- **AND** 保持编辑体验流畅

