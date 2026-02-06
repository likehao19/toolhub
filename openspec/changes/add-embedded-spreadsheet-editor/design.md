## Context
需求目标是：在应用内离线提供与 WPS 高兼容的 `.xlsx` 预览与编辑，并保证与 WPS 的双向互操作（打开/编辑/保存/再打开）。

## Goals / Non-Goals
- Goals:
  - 离线内嵌的电子表格编辑体验（接近 Office/WPS）
  - `.xlsx` 作为唯一存储格式，WPS 可直接打开/继续编辑
  - 常见样式与布局尽可能保真（合并、行列尺寸、字体/颜色/边框/填充、对齐、数字格式）
- Non-Goals:
  - 在“开源 + 离线 + 内嵌”约束下承诺 100% 与 WPS 完全一致
  - 覆盖所有 WPS/Excel 专有功能与边界行为

## Decisions
- Decision: 使用开源离线电子表格引擎（候选：Univer）替代 Handsontable 作为 `.xlsx` 的预览/编辑内核
- Why:
  - Handsontable 更偏“数据表格”，并非 Office 级电子表格引擎，难以覆盖 xlsx 的样式/公式/布局需求
  - 需要离线内嵌且开源可用的方案

## Alternatives considered
- 继续使用 SheetJS + Handsontable: 开发快，但无法达到 WPS 级保真
- OnlyOffice/Collabora: 兼容度高，但通常需要服务端，不满足离线纯内嵌约束
- 商业控件（SpreadJS 等）: 兼容度最高，但不满足“只能开源免费”

## Risks / Trade-offs
- 兼容性风险：开源引擎对复杂 xlsx 的覆盖程度不一，需要样例库驱动逐步修正
- 体积与性能：电子表格引擎包体更大，需要懒加载与性能保护

## Migration Plan
1) 引入新引擎并实现 `SpreadsheetEditor` 适配层
2) Notes `.xlsx` 路由切换到新编辑器（保留降级开关）
3) 基于样例库回归，逐步提升保真度

## Open Questions
- Univer 的 xlsx 导入导出能力是否满足核心样式/公式需求；不足部分的补丁/插件策略是什么
