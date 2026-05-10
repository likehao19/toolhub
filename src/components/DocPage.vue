<template>
  <div class="doc-page">
    <!-- 页面标题 -->
    <div class="doc-page-header">
      <h1 class="page-title">
        <span class="title-icon">{{ icon }}</span>
        {{ title }}
      </h1>
      <p v-if="description" class="page-description">{{ description }}</p>
    </div>

    <!-- 页面内容 -->
    <div class="doc-page-content">
      <!-- 基础用法 -->
      <section v-if="$slots.basic" class="doc-section">
        <h2 class="section-title">基础用法</h2>
        <div class="section-content">
          <slot name="basic"></slot>
        </div>
      </section>

      <!-- 更多示例 -->
      <section v-if="$slots.examples" class="doc-section">
        <h2 class="section-title">更多示例</h2>
        <div class="section-content">
          <slot name="examples"></slot>
        </div>
      </section>

      <!-- API 文档 -->
      <section v-if="api && api.length > 0" class="doc-section">
        <h2 class="section-title">API</h2>
        <div class="section-content">
          <el-table :data="api" border style="width: 100%">
            <el-table-column prop="name" label="参数" width="150" />
            <el-table-column prop="type" label="类型" width="120" />
            <el-table-column prop="default" label="默认值" width="120" />
            <el-table-column prop="description" label="说明" />
          </el-table>
        </div>
      </section>

      <!-- 方法说明 -->
      <section v-if="methods && methods.length > 0" class="doc-section">
        <h2 class="section-title">方法</h2>
        <div class="section-content">
          <div v-for="method in methods" :key="method.name" class="method-item">
            <h3 class="method-name">{{ method.name }}</h3>
            <p class="method-desc">{{ method.description }}</p>
            <div v-if="method.params && method.params.length > 0" class="method-params">
              <div v-for="param in method.params" :key="param.name" class="param-item">
                <span class="param-name">{{ param.name }}</span>
                <span class="param-type">{{ param.type }}</span>
                <span class="param-desc">{{ param.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 自定义内容 -->
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  api: {
    type: Array,
    default: () => []
  },
  methods: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.doc-page {
  min-height: 100%;
  background: var(--surface-page);
  padding: 0;
}

.doc-page-header {
  padding: 40px 40px 32px;
  border-bottom: 1px solid #e4e7ed;
  background: var(--surface-page);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #303133;
}

.title-icon {
  font-size: 36px;
}

.page-description {
  font-size: 16px;
  color: #606266;
  margin: 0;
  line-height: 1.8;
}

.doc-page-content {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
  background: var(--surface-page);
}

.doc-section {
  margin-bottom: 56px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 28px 0;
  padding-bottom: 16px;
  border-bottom: 2px solid #e4e7ed;
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 60px;
  height: 2px;
  background: #409eff;
}

.section-content {
  margin-top: 28px;
}

/* ignore */
:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-table th) {
  background: #f5f7fa;
  color: #303133;
  font-weight: 600;
}

:deep(.el-table td) {
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-table--border) {
  border: 1px solid #ebeef5;
}

/* ignore */
.method-item {
  margin-bottom: 32px;
  padding: 24px;
  background: #fafbfc;
  border-radius: 8px;
  border-left: 4px solid #409eff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.method-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.method-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  font-family: "PingFang SC";
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.method-desc {
  font-size: 15px;
  color: #606266;
  margin: 0 0 20px 0;
  line-height: 1.8;
}

.method-params {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.param-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 0;
  font-size: 14px;
  border-bottom: 1px solid #f0f2f5;
}

.param-item:last-child {
  border-bottom: none;
}

.param-name {
  font-weight: 600;
  color: #409eff;
  font-family: "PingFang SC";
  min-width: 140px;
  padding: 4px 8px;
  background: #ecf5ff;
  border-radius: 4px;
}

.param-type {
  color: #909399;
  font-family: "PingFang SC";
  min-width: 120px;
  padding: 4px 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.param-desc {
  color: #606266;
  flex: 1;
  line-height: 1.6;
}
</style>

