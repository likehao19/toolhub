## ADDED Requirements

### Requirement: 电子表格笔记（XLSX）
系统 MUST 在 Notes 模块中提供离线内嵌的 `.xlsx` 电子表格预览与编辑能力，并与 WPS 实现双向互操作。

#### Scenario: 打开 WPS 创建的 XLSX
- **WHEN** 用户在 Notes 中打开一个由 WPS 创建或编辑过的 `.xlsx` 文件
- **THEN** 系统 MUST 在应用内展示电子表格（预览或编辑模式）
- **AND** 合并单元格、行高列宽、基础样式（字体/颜色/边框/填充/对齐/数字格式）MUST 尽可能保持

#### Scenario: 在应用内编辑并保存
- **WHEN** 用户在应用内编辑 `.xlsx`（单元格内容/合并/样式/行列尺寸等）
- **THEN** 系统 MUST 将更改保存回同一个 `.xlsx` 文件
- **AND** 保存后的文件 MUST 可被 WPS 直接打开并继续编辑

#### Scenario: 新建 XLSX
- **WHEN** 用户在 Notes 中新建一个 `.xlsx` 文件
- **THEN** 系统 MUST 创建一个空白工作簿并进入编辑模式
- **AND** 文件 MUST 保存为标准 `.xlsx`，可被 WPS 打开

#### Scenario: 预览模式与编辑模式一致性
- **WHEN** 用户在预览模式查看 `.xlsx`
- **THEN** 预览效果 MUST 与编辑模式的显示保持一致（在同一渲染引擎下）
