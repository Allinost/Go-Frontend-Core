<template>
  <div class="dm-page">
    <div class="dm-header">
      <div>
        <h2 class="dm-title">项目开发管理</h2>
        <div class="dm-subtitle">项目台账 · 部署资产 · 数据字典 · 需求与生成</div>
      </div>
      <div class="dm-actions">
        <NkButton size="sm" variant="ghost" :loading="loading" @click="loadAll">刷新</NkButton>
        <NkButton size="sm" @click="openCreate">新建项目</NkButton>
      </div>
    </div>

    <div class="dm-stats">
      <div class="dm-stat-card">
        <div class="dm-stat-label">项目总数</div>
        <div class="dm-stat-value">{{ stats.projects_total }}</div>
      </div>
      <div class="dm-stat-card">
        <div class="dm-stat-label">启用 / 归档</div>
        <div class="dm-stat-value">{{ stats.projects_by_status.active || 0 }} / {{ stats.projects_by_status.archived || 0 }}</div>
      </div>
      <div class="dm-stat-card">
        <div class="dm-stat-label">启用关联</div>
        <div class="dm-stat-value">{{ stats.relations_active }}</div>
      </div>
      <div class="dm-stat-card">
        <div class="dm-stat-label">资产索引</div>
        <div class="dm-stat-value">{{ stats.assets_total }}</div>
      </div>
      <div class="dm-stat-card">
        <div class="dm-stat-label">已删除项目</div>
        <div class="dm-stat-value">{{ stats.projects_deleted }}</div>
      </div>
    </div>

    <div class="dm-filters">
      <NkSelect v-model="filters.type" placeholder="项目类型" :options="typeOptions" clearable size="sm" style="width: 150px" />
      <NkSelect v-model="filters.status" placeholder="状态" :options="statusOptions" clearable size="sm" style="width: 120px" />
      <NkInput v-model="filters.keyword" placeholder="名称 / 唯一键 / 简介" size="sm" style="width: 220px" @keyup.enter="search" />
      <NkButton size="sm" @click="search">搜索</NkButton>
      <NkButton size="sm" variant="ghost" @click="resetFilters">重置</NkButton>
      <label class="dm-muted" style="display: flex; align-items: center; gap: 6px">
        <NkSwitch v-model="filters.deleted" size="sm" />
        仅看已删除
      </label>
    </div>

    <div class="dm-card">
      <NkLoading v-if="loading" />
      <table v-else class="dm-table">
        <thead>
          <tr>
            <th>项目</th>
            <th>类型</th>
            <th>状态</th>
            <th>仓库位置</th>
            <th>默认分支</th>
            <th>技术栈</th>
            <th style="width: 210px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in projects" :key="p.id">
            <td>
              <div>
                <router-link :to="`/modules/zzz/developmentmanager/${p.id}`" class="dm-link">{{ p.name }}</router-link>
              </div>
              <div class="dm-code">{{ p.project_key }}</div>
            </td>
            <td><NkTag size="sm">{{ typeLabel(p.type) }}</NkTag></td>
            <td>
              <NkTag size="sm" :type="p.deleted ? 'danger' : p.status === 'active' ? 'success' : 'default'">
                {{ p.deleted ? '已删除' : p.status === 'active' ? '启用' : '归档' }}
              </NkTag>
            </td>
            <td class="dm-muted">{{ p.repo_path || p.repo_url || '-' }}</td>
            <td class="dm-muted">{{ p.default_branch }}</td>
            <td>
              <div v-if="p.tech_stack?.length" class="dm-tag-row">
                <NkTag v-for="t in p.tech_stack" :key="t" size="sm">{{ t }}</NkTag>
              </div>
              <span v-else class="dm-muted">-</span>
            </td>
            <td>
              <NkButton size="sm" variant="ghost" @click="$router.push(`/modules/zzz/developmentmanager/${p.id}`)">详情</NkButton>
              <template v-if="!p.deleted">
                <NkButton size="sm" variant="ghost" @click="openEdit(p)">编辑</NkButton>
                <NkButton size="sm" variant="ghost" type="danger" @click="openDelete(p)">删除</NkButton>
              </template>
            </td>
          </tr>
          <tr v-if="!projects.length && !loading">
            <td colspan="7" class="dm-table__empty">暂无项目</td>
          </tr>
        </tbody>
      </table>
      <div class="dm-pagination">
        <NkPagination v-model="page" :total="total" :page-size="pageSize" @change="loadProjects" />
      </div>
    </div>

    <NkDialog v-model:visible="formVisible" :title="editing ? '编辑项目' : '新建项目'" width="640">
      <div class="dm-form-grid">
        <div class="dm-form-item">
          <span class="dm-form-label">唯一键 *</span>
          <NkInput v-model="form.project_key" placeholder="如 go-backend-core" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">项目名称 *</span>
          <NkInput v-model="form.name" placeholder="如 Go-Backend-Core" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">类型 *</span>
          <NkSelect v-model="form.type" :options="typeOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">状态</span>
          <NkSelect v-model="form.status" :options="statusOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">仓库地址</span>
          <NkInput v-model="form.repo_url" placeholder="https://..." size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">本地路径</span>
          <NkInput v-model="form.repo_path" placeholder="../Go-Frontend-Core" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">默认分支</span>
          <NkInput v-model="form.default_branch" placeholder="main" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">技术栈（逗号分隔）</span>
          <NkInput v-model="form.tech_stack" placeholder="Go, Gin, MySQL" size="sm" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">项目简介</span>
          <NkTextarea v-model="form.description" :rows="3" placeholder="项目用途与边界" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="formVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="saveProject">保存</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="deleteVisible" title="删除项目" width="460">
      <p>确定要删除项目 <strong>{{ deleting?.name }}</strong> 吗？</p>
      <p class="dm-muted">删除为软删除，会同时标记该项目的关联与资产；若存在其他项目依赖，需要强制删除。</p>
      <label class="dm-muted" style="display: flex; align-items: center; gap: 6px; margin-top: 8px">
        <NkSwitch v-model="forceDelete" size="sm" />
        强制删除（忽略被依赖保护）
      </label>
      <template #footer>
        <NkButton variant="ghost" @click="deleteVisible = false">取消</NkButton>
        <NkButton type="danger" :loading="deletingLoading" @click="confirmDelete">确认删除</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  getStats,
} from '@/api/developmentManager'
import type { Project, ProjectStats } from '@/types/developmentManager'

const router = useRouter()

const loading = ref(false)
const stats = ref<ProjectStats>({
  projects_total: 0,
  projects_deleted: 0,
  projects_by_type: {},
  projects_by_status: {},
  relations_active: 0,
  assets_total: 0,
})
const projects = ref<Project[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const filters = reactive({
  type: '',
  status: '',
  keyword: '',
  deleted: false,
})

const typeOptions = [
  { label: '后端基座', value: 'base' },
  { label: '前端模板', value: 'template' },
  { label: '后端模块', value: 'backend_module' },
  { label: '前端模块', value: 'frontend_module' },
  { label: '前端基座', value: 'frontend_base' },
  { label: '容器项目', value: 'container_project' },
]
const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '归档', value: 'archived' },
]

function typeLabel(type: string): string {
  return typeOptions.find((o) => o.value === type)?.label || type
}

async function loadStats() {
  try {
    const res = await getStats()
    stats.value = res.data
  } catch (err: any) {
    NKMessage.error(err.message || '加载统计失败')
  }
}

async function loadProjects() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, page_size: pageSize.value }
    if (filters.type) params.type = filters.type
    if (filters.status) params.status = filters.status
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.deleted) params.deleted = true
    const res = await listProjects(params)
    projects.value = res.data.items || []
    total.value = res.data.total
  } catch (err: any) {
    NKMessage.error(err.message || '加载项目失败')
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  await Promise.all([loadStats(), loadProjects()])
}

function search() {
  page.value = 1
  loadProjects()
}

function resetFilters() {
  filters.type = ''
  filters.status = ''
  filters.keyword = ''
  filters.deleted = false
  page.value = 1
  loadProjects()
}

// ---------- 新建 / 编辑 ----------
const formVisible = ref(false)
const saving = ref(false)
const editing = ref<Project | null>(null)
const form = reactive({
  project_key: '',
  name: '',
  type: 'base',
  status: 'active',
  repo_url: '',
  repo_path: '',
  default_branch: 'main',
  tech_stack: '',
  description: '',
})

function resetForm() {
  form.project_key = ''
  form.name = ''
  form.type = 'base'
  form.status = 'active'
  form.repo_url = ''
  form.repo_path = ''
  form.default_branch = 'main'
  form.tech_stack = ''
  form.description = ''
}

function openCreate() {
  editing.value = null
  resetForm()
  formVisible.value = true
}

function openEdit(p: Project) {
  editing.value = p
  form.project_key = p.project_key
  form.name = p.name
  form.type = p.type
  form.status = p.status
  form.repo_url = p.repo_url
  form.repo_path = p.repo_path
  form.default_branch = p.default_branch || 'main'
  form.tech_stack = (p.tech_stack || []).join(', ')
  form.description = p.description
  formVisible.value = true
}

async function saveProject() {
  if (!form.project_key.trim() || !form.name.trim()) {
    NKMessage.warning('唯一键与项目名称不能为空')
    return
  }
  saving.value = true
  try {
    const payload = {
      project_key: form.project_key.trim(),
      name: form.name.trim(),
      type: form.type,
      status: form.status,
      repo_url: form.repo_url.trim(),
      repo_path: form.repo_path.trim(),
      default_branch: form.default_branch.trim() || 'main',
      tech_stack: form.tech_stack
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      description: form.description.trim(),
    }
    if (editing.value) {
      await updateProject(editing.value.id, payload)
      NKMessage.success('项目已更新')
    } else {
      await createProject(payload)
      NKMessage.success('项目已创建')
    }
    formVisible.value = false
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// ---------- 删除 ----------
const deleteVisible = ref(false)
const deleting = ref<Project | null>(null)
const deletingLoading = ref(false)
const forceDelete = ref(false)

function openDelete(p: Project) {
  deleting.value = p
  forceDelete.value = false
  deleteVisible.value = true
}

async function confirmDelete() {
  if (!deleting.value) return
  deletingLoading.value = true
  try {
    await deleteProject(deleting.value.id, forceDelete.value)
    NKMessage.success('项目已删除')
    deleteVisible.value = false
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    deletingLoading.value = false
  }
}

onMounted(loadAll)
</script>
