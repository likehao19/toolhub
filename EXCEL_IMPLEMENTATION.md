# Excel 功能重新实现说明

## 技术栈
- **SheetJS (xlsx)**: 负责 Excel 文件的读写，确保与 WPS/Office 完全兼容
- **Handsontable**: 提供类似 Excel 的表格编辑界面

## 兼容性保证

### 1. 文件格式兼容
- 使用标准的 `.xlsx` 格式
- 支持读取 WPS/Office 创建的文件
- 保存的文件可以在 WPS/Office 中正常打开

### 2. 读取配置
```javascript
XLSX.read(fileData, { 
  type: 'array',
  cellFormula: true,  // 支持公式
  cellStyles: true,   // 支持样式
  cellDates: true,    // 支持日期
  sheetStubs: true    // 包括空单元格
})
```

### 3. 写入配置
```javascript
XLSX.write(workbook, { 
  type: 'array', 
  bookType: 'xlsx',
  bookSST: false,     // 不使用共享字符串表，提高兼容性
  compression: true   // 启用压缩
})
```

## 功能特性

### Handsontable 提供的功能
1. **基础编辑**: 单元格编辑、复制粘贴、撤销重做
2. **选择操作**: 多选、拖拽选择、键盘导航
3. **右键菜单**: 插入/删除行列、清除内容等
4. **列宽/行高**: 手动调整大小
5. **拖拽填充**: 类似 Excel 的自动填充
6. **筛选**: 数据筛选功能
7. **公式**: 基础公式支持

### 编辑器配置
- 默认 100 行 x 26 列（A-Z）
- 自适应容器高度
- 支持水平和垂直滚动

## 使用方式

### 新建 Excel 文件
1. 点击右侧区域的"新建笔记"或左侧树的"+"号
2. 选择"Excel 表格"
3. 自动创建并打开空白表格

### 编辑现有文件
1. 点击左侧树中的 `.xlsx` 文件
2. 自动加载并显示内容
3. 编辑后点击"保存"按钮

### 导入文件
1. 点击"导入笔记"
2. 选择 `.xlsx` 文件
3. 选择目标文件夹
4. 导入后可以正常编辑

## 测试步骤

### 测试 1: 创建文件并在 Office 中打开
1. 在应用中新建 Excel 文件
2. 输入一些数据并保存
3. 找到保存的文件（在 `AppData\Roaming\com.tauri-app.vue3-vite-tauri-template\notes` 目录）
4. 使用 WPS 或 Office 打开，验证数据正确

### 测试 2: 从 Office 导入
1. 在 WPS/Office 中创建一个 Excel 文件
2. 添加一些数据、公式、格式
3. 使用应用的"导入笔记"功能导入
4. 验证数据、格式是否正确显示

### 测试 3: 编辑并重新打开
1. 在应用中打开一个 Excel 文件
2. 修改数据并保存
3. 关闭应用
4. 重新打开应用并打开该文件
5. 验证修改已保存

## 注意事项

1. **许可证**: Handsontable 使用的是非商业许可证配置，如果用于商业项目需要购买许可证
2. **性能**: 大型表格（超过 10000 行）可能会影响性能
3. **公式**: 基础公式支持，复杂的 Excel 公式可能不完全兼容
4. **格式**: 基础格式支持，复杂的 Excel 格式（如条件格式、数据验证）可能丢失

## 依赖版本
```json
{
  "handsontable": "^14.6.3",
  "@handsontable/vue3": "^14.6.3",
  "xlsx": "已安装"
}
```
