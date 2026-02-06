## MODIFIED Requirements

### Requirement: 书签存储
系统应在 SQLite 数据库中存储书签及其元数据，支持标签、分类和快照功能。

#### Scenario: 添加书签
- **WHEN** 用户点击"添加书签"
- **THEN** 系统打开表单，包含字段：标题、URL、描述、标签、分类
- **AND** 保存时，将书签存储到 SQLite 数据库
- **AND** 自动获取网站图标
- **AND** 可选保存网页快照
- **AND** 在列表中显示书签

#### Scenario: 查看书签列表
- **WHEN** 用户导航到书签
- **THEN** 系统显示所有存储的书签
- **AND** 显示标题、URL 预览和图标
- **AND** 支持网格或列表视图
- **AND** 显示标签和分类
- **AND** 显示访问次数

#### Scenario: 在浏览器中打开书签
- **WHEN** 用户点击书签
- **THEN** 系统在默认浏览器中打开 URL
- **AND** 使用 Tauri opener 插件
- **AND** 更新访问次数和最后访问时间

#### Scenario: 编辑书签
- **WHEN** 用户在书签上点击"编辑"
- **THEN** 系统打开包含当前值的编辑表单
- **AND** 用户可以修改任何字段
- **AND** 更改保存到数据库

#### Scenario: 删除书签
- **WHEN** 用户在书签上点击"删除"
- **THEN** 系统提示确认
- **AND** 确认后从数据库移除书签
- **AND** 支持批量删除

#### Scenario: 搜索书签
- **WHEN** 用户在搜索框中输入
- **THEN** 系统按标题、URL、标签或描述过滤书签
- **AND** 实时更新结果
- **AND** 支持多标签筛选

## MODIFIED Requirements

### Requirement: 书签组织
系统应支持使用分类、标签和分组组织书签。

#### Scenario: 书签分类
- **WHEN** 用户添加或编辑书签
- **THEN** 用户可以将其分配到分类
- **AND** 书签可以按分类过滤
- **AND** 支持多级分类

#### Scenario: 书签标签
- **WHEN** 用户添加或编辑书签
- **THEN** 用户可以添加多个标签
- **AND** 标签自动建议（基于已有标签）
- **AND** 书签可以按标签过滤
- **AND** 显示标签统计

#### Scenario: 按分类查看
- **WHEN** 用户从侧边栏选择分类
- **THEN** 系统仅显示该分类中的书签

#### Scenario: 收藏夹分组
- **WHEN** 用户组织书签
- **THEN** 系统支持创建分组
- **AND** 支持多级分组
- **AND** 支持拖拽排序

## ADDED Requirements

### Requirement: 批量操作
系统应支持书签的批量操作功能。

#### Scenario: 批量编辑标签
- **WHEN** 用户选择多个书签
- **THEN** 系统允许批量添加或删除标签
- **AND** 批量修改分类

#### Scenario: 批量删除
- **WHEN** 用户选择多个书签
- **THEN** 系统允许批量删除
- **AND** 提示确认

### Requirement: 网页快照
系统应支持保存网页快照功能。

#### Scenario: 保存网页快照
- **WHEN** 用户添加或编辑书签
- **THEN** 系统可选保存网页截图
- **AND** 保存网页简化内容
- **AND** 在书签详情中显示快照

### Requirement: 阅读列表
系统应支持阅读列表功能。

#### Scenario: 标记为稍后阅读
- **WHEN** 用户标记书签为稍后阅读
- **THEN** 系统添加到阅读列表
- **AND** 跟踪阅读进度

#### Scenario: 查看阅读列表
- **WHEN** 用户查看阅读列表
- **THEN** 系统显示未读和已读书签
- **AND** 显示阅读进度

### Requirement: 书签导入导出
系统应支持书签的导入和导出功能。

#### Scenario: 导入书签
- **WHEN** 用户选择导入书签
- **THEN** 系统支持浏览器书签格式（Chrome/Firefox/Edge）
- **AND** 支持 HTML 书签文件
- **AND** 支持 CSV 格式
- **AND** 验证导入数据

#### Scenario: 导出书签
- **WHEN** 用户选择导出书签
- **THEN** 系统支持导出为 HTML 书签文件
- **AND** 支持导出为 CSV 格式
- **AND** 支持选择性导出（按分类、标签）

