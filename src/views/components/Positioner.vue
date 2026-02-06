<template>
  <DocPage
    icon="📍"
    title="窗口定位"
    description="将窗口移动到屏幕的指定位置"
  >
    <template #basic>
      <CodeExample
        title="窗口位置控制"
        :code="basicCode"
      >
        <template #demo>
          <el-card shadow="hover">
            <el-row :gutter="20">
              <el-col :span="12">
                <div style="margin-bottom: 16px;">
                  <div style="font-weight: 600; margin-bottom: 8px;">顶部位置</div>
                  <el-space wrap>
                    <el-button @click="moveTo('topLeft')">左上</el-button>
                    <el-button @click="moveTo('topCenter')">上中</el-button>
                    <el-button @click="moveTo('topRight')">右上</el-button>
                  </el-space>
                </div>
                <div style="margin-bottom: 16px;">
                  <div style="font-weight: 600; margin-bottom: 8px;">中间位置</div>
                  <el-space wrap>
                    <el-button @click="moveTo('leftCenter')">左中</el-button>
                    <el-button @click="moveTo('rightCenter')">右中</el-button>
                  </el-space>
                </div>
                <div>
                  <div style="font-weight: 600; margin-bottom: 8px;">底部位置</div>
                  <el-space wrap>
                    <el-button @click="moveTo('bottomLeft')">左下</el-button>
                    <el-button @click="moveTo('bottomCenter')">下中</el-button>
                    <el-button @click="moveTo('bottomRight')">右下</el-button>
                  </el-space>
                </div>
              </el-col>
            </el-row>
          </el-card>
        </template>
      </CodeExample>
    </template>
  </DocPage>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import DocPage from '@/components/DocPage.vue'
import CodeExample from '@/components/CodeExample.vue'
import { TauriPositioner } from '@/utils/tauri'

const basicCode = `import { TauriPositioner } from '@/utils/tauri'

// 移动窗口到指定位置
await TauriPositioner.moveWindowTo('topRight')
await TauriPositioner.moveWindowTo('center')
await TauriPositioner.moveWindowTo('bottomLeft')`

const moveTo = async (position) => {
  try {
    await TauriPositioner.moveWindowTo(position)
    ElMessage.success('窗口已移动')
  } catch (error) {
    ElMessage.error('移动失败: ' + error.message)
  }
}
</script>

