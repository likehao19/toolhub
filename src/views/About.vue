<template>
  <div class="about-page">
    <div class="about-view">
      <el-page-header @back="goBack">
      <template #content>
        <span class="page-title">{{ t('about.pageTitle') }}</span>
      </template>
    </el-page-header>

    <div class="content-section">
      <el-card class="info-card">
        <template #header>
          <div class="card-header">
            <span>{{ t('about.projectInfo') }}</span>
          </div>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item :label="t('about.projectName')">
            {{ t('about.projectNameValue') }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('about.version')">0.1.0</el-descriptions-item>
          <el-descriptions-item :label="t('about.techStack')">
            {{ t('about.techStackValue') }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('about.features')">
            {{ t('about.featuresValue') }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="features-card">
        <template #header>
          <div class="card-header">
            <span>{{ t('about.coreFeatures') }}</span>
          </div>
        </template>
        <el-timeline>
          <el-timeline-item
            v-for="item in features"
            :key="item.title"
            :timestamp="item.category"
            placement="top"
          >
            <el-card>
              <h4>{{ item.title }}</h4>
              <p>{{ item.description }}</p>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </el-card>

      <div class="actions">
        <el-button type="primary" @click="goBack">{{ t('about.backToHome') }}</el-button>
        <el-button @click="showInfo">{{ t('about.showAppInfo') }}</el-button>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { t } from '@/i18n'

const router = useRouter()

const features = [
  {
    category: t('about.catFrontend'),
    title: t('about.featRouter'),
    description: t('about.featRouterDesc')
  },
  {
    category: t('about.catState'),
    title: t('about.featPinia'),
    description: t('about.featPiniaDesc')
  },
  {
    category: t('about.catUI'),
    title: t('about.featElement'),
    description: t('about.featElementDesc')
  },
  {
    category: t('about.catDev'),
    title: t('about.featAutoImport'),
    description: t('about.featAutoImportDesc')
  },
  {
    category: t('about.catNative'),
    title: t('about.featTauriApi'),
    description: t('about.featTauriApiDesc')
  },
  {
    category: t('about.catDesktop'),
    title: t('about.featWindow'),
    description: t('about.featWindowDesc')
  }
]

const goBack = () => {
  router.push('/')
}

const showInfo = () => {
  ElMessageBox.alert(
    t('about.appInfoContent'),
    t('about.appInfoTitle'),
    {
      confirmButtonText: t('about.confirm'),
      type: 'info'
    }
  )
}
</script>

<style scoped>
.about-page {
  width: 100%;
  height: 100vh;
  overflow: auto;
}

.about-view {
  padding: 24px;
  padding-top: 56px; /* ignore */
  max-width: 1000px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
}

.content-section {
  margin-top: 32px;
}

.info-card {
  margin-bottom: 24px;
}

.features-card {
  margin-bottom: 24px;
}

.card-header {
  font-weight: 600;
  font-size: 1.1rem;
}

.el-timeline-item h4 {
  margin: 0 0 8px 0;
  color: var(--accent-blue);
}

.el-timeline-item p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.actions {
  text-align: center;
  margin-top: 32px;
}

.actions .el-button {
  margin: 0 12px;
}
</style>
