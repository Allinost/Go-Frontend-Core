<template>
  <div class="dm-page">
    <div class="dm-header">
      <div>
        <div class="dm-muted">
          <span class="dm-link" @click="$router.push('/modules/zzz/developmentmanager')">项目开发管理</span>
          <span> / 项目详情</span>
        </div>
        <h2 class="dm-title">{{ project?.name || '加载中…' }}</h2>
        <div v-if="project" class="dm-tag-row" style="margin-top: 6px">
          <span class="dm-code">{{ project.project_key }}</span>
          <NkTag size="sm">{{ typeLabel(project.type) }}</NkTag>
          <NkTag size="sm" :type="project.deleted ? 'danger' : project.status === 'active' ? 'success' : 'default'">
            {{ project.deleted ? '已删除' : project.status === 'active' ? '启用' : '归档' }}
          </NkTag>
        </div>
      </div>
      <div class="dm-actions">
        <NkButton size="sm" variant="ghost" :loading="loading" @click="loadProject">刷新</NkButton>
      </div>
    </div>

    <div v-if="project?.deleted" class="dm-card dm-error">该项目已软删除，仅可查看历史信息。</div>

    <NkTabs v-if="project" v-model="activeTab" :items="tabs" />

    <div v-if="project && activeTab === 'overview'">
      <OverviewTab :project="project" />
    </div>
    <div v-else-if="project && activeTab === 'deployment'">
      <DeploymentTab :project="project" />
    </div>
    <div v-else-if="project && activeTab === 'dictionary'">
      <DictionaryTab :project="project" />
    </div>
    <div v-else-if="project && activeTab === 'requirements'">
      <RequirementsTab :project="project" />
    </div>
    <div v-else-if="project && activeTab === 'generation'">
      <GenerationTab :project="project" />
    </div>
    <div v-else-if="project && activeTab === 'assets'">
      <AssetsTab :project="project" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { NKMessage } from '@nkui/vue/src/utils/message'
import { getProject } from '@/api/developmentManager'
import type { Project } from '@/types/developmentManager'
import OverviewTab from './tabs/OverviewTab.vue'
import DeploymentTab from './tabs/DeploymentTab.vue'
import DictionaryTab from './tabs/DictionaryTab.vue'
import RequirementsTab from './tabs/RequirementsTab.vue'
import GenerationTab from './tabs/GenerationTab.vue'
import AssetsTab from './tabs/AssetsTab.vue'

const route = useRoute()
const project = ref<Project | null>(null)
const loading = ref(false)
const activeTab = ref('overview')

const tabs = [
  { label: '概览', value: 'overview' },
  { label: '部署', value: 'deployment' },
  { label: '数据字典', value: 'dictionary' },
  { label: '需求', value: 'requirements' },
  { label: '生成', value: 'generation' },
  { label: '资产', value: 'assets' },
]

const tabParam = String(route.query.tab || '')
if (tabParam && tabs.some((t) => t.value === tabParam)) {
  activeTab.value = tabParam
}

const typeLabels: Record<string, string> = {
  base: '后端基座',
  template: '前端模板',
  backend_module: '后端模块',
  frontend_module: '前端模块',
  frontend_base: '前端基座',
  container_project: '容器项目',
}

function typeLabel(type: string): string {
  return typeLabels[type] || type
}

async function loadProject() {
  loading.value = true
  try {
    const res = await getProject(route.params.id as string)
    project.value = res.data
  } catch (err: any) {
    NKMessage.error(err.message || '加载项目失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadProject)
</script>
