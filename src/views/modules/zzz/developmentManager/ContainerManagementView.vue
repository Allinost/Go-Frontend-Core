<template>
  <div class="dm-page">
    <div class="dm-header">
      <div>
        <h2 class="dm-title">容器管理</h2>
        <div class="dm-subtitle">管理 docker-compose 容器项目及其容器、网络接入点</div>
      </div>
      <div class="dm-actions">
        <NkButton size="sm" variant="ghost" :loading="loading" @click="loadAll">刷新</NkButton>
        <NkButton size="sm" @click="openCreate">新建容器项目</NkButton>
      </div>
    </div>

    <div class="dm-stats">
      <div class="dm-stat-card">
        <div class="dm-stat-label">容器项目</div>
        <div class="dm-stat-value">{{ projects.length }}</div>
      </div>
      <div class="dm-stat-card">
        <div class="dm-stat-label">容器</div>
        <div class="dm-stat-value">{{ totalContainers }}</div>
      </div>
      <div class="dm-stat-card">
        <div class="dm-stat-label">网络接入点</div>
        <div class="dm-stat-value">{{ totalAccessPoints }}</div>
      </div>
      <div class="dm-stat-card">
        <div class="dm-stat-label">公网暴露</div>
        <div class="dm-stat-value">{{ totalExtranet }}</div>
      </div>
    </div>

    <div class="dm-filters">
      <NkInput v-model="filters.keyword" placeholder="项目名 / 唯一键 / compose 文件" size="sm" style="width: 240px" @keyup.enter="loadProjects" />
      <NkSelect v-model="filters.status" placeholder="状态" :options="statusOptions" clearable size="sm" style="width: 120px" />
      <NkButton size="sm" @click="loadProjects">搜索</NkButton>
      <NkButton size="sm" variant="ghost" @click="resetFilters">重置</NkButton>
    </div>

    <div class="dm-card">
      <NkLoading v-if="loading" />
      <table v-else class="dm-table">
        <thead>
          <tr>
            <th>容器项目</th>
            <th>compose / 仓库</th>
            <th>容器</th>
            <th>接入点</th>
            <th>公网暴露</th>
            <th>状态</th>
            <th style="width: 220px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in projects" :key="p.id">
            <td>
              <div>
                <span class="dm-link" @click="openDeployment(p)">{{ p.name }}</span>
              </div>
              <div class="dm-code">{{ p.project_key }}</div>
            </td>
            <td>
              <div class="dm-code">{{ p.repo_path || '-' }}</div>
              <div v-if="p.repo_url" class="dm-muted">{{ p.repo_url }}</div>
            </td>
            <td>{{ counts[p.id]?.containers ?? 0 }}</td>
            <td>{{ counts[p.id]?.accessPoints ?? 0 }}</td>
            <td>
              <NkTag v-if="counts[p.id]?.extranet" size="sm" type="danger">{{ counts[p.id].extranet }}</NkTag>
              <span v-else class="dm-muted">0</span>
            </td>
            <td><NkTag size="sm" :type="p.status === 'active' ? 'success' : 'default'">{{ p.status === 'active' ? '启用' : '归档' }}</NkTag></td>
            <td>
              <NkButton size="sm" @click="openDeployment(p)">部署管理</NkButton>
              <NkButton size="sm" variant="ghost" @click="openEdit(p)">编辑</NkButton>
              <NkButton size="sm" variant="ghost" type="danger" @click="openDelete(p)">删除</NkButton>
            </td>
          </tr>
          <tr v-if="!projects.length && !loading">
            <td colspan="7" class="dm-table__empty">暂无容器项目，点击右上角新建（类型固定为 container_project）</td>
          </tr>
        </tbody>
      </table>
    </div>

    <NkDialog v-model:visible="formVisible" :title="editing ? '编辑容器项目' : '新建容器项目'" width="640">
      <div class="dm-form-grid">
        <div class="dm-form-item">
          <span class="dm-form-label">唯一键 *</span>
          <NkInput v-model="form.project_key" size="sm" placeholder="如 local-compose" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">项目名称 *</span>
          <NkInput v-model="form.name" size="sm" placeholder="如 本地容器栈" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">compose 文件</span>
          <NkInput v-model="form.repo_path" size="sm" placeholder="docker-compose.yml" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">仓库地址</span>
          <NkInput v-model="form.repo_url" size="sm" placeholder="https://..." />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">默认分支</span>
          <NkInput v-model="form.default_branch" size="sm" placeholder="main" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">状态</span>
          <NkSelect v-model="form.status" :options="statusOptions" size="sm" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">说明</span>
          <NkTextarea v-model="form.description" :rows="2" placeholder="compose 栈包含的服务与用途" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="formVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="saveProject">保存</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="deleteVisible" title="删除容器项目" width="440">
      <p>确定删除容器项目 <strong>{{ deleting?.name }}</strong> 吗？</p>
      <p class="dm-muted">软删除项目并级联标记其容器、接入点、卷、白名单、备份与关联。</p>
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
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listContainers,
  listAccessPoints,
} from '@/api/developmentManager'
import type { Project } from '@/types/developmentManager'

const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const projects = ref<Project[]>([])
const counts = ref<Record<number, { containers: number; accessPoints: number; extranet: number }>>({})
const filters = reactive({ keyword: '', status: '' })

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '归档', value: 'archived' },
]

const totalContainers = computed(() =>
  Object.values(counts.value).reduce((sum, c) => sum + c.containers, 0),
)
const totalAccessPoints = computed(() =>
  Object.values(counts.value).reduce((sum, c) => sum + c.accessPoints, 0),
)
const totalExtranet = computed(() =>
  Object.values(counts.value).reduce((sum, c) => sum + c.extranet, 0),
)

async function loadProjects() {
  loading.value = true
  try {
    const params: Record<string, any> = { type: 'container_project', page: 1, page_size: 100 }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.status) params.status = filters.status
    const res = await listProjects(params)
    projects.value = res.data.items || []
    const next: Record<number, { containers: number; accessPoints: number; extranet: number }> = {}
    await Promise.all(
      projects.value.map(async (p) => {
        try {
          const [cs, aps] = await Promise.all([
            listContainers(p.id),
            listAccessPoints(p.id),
          ])
          next[p.id] = {
            containers: (cs.data || []).length,
            accessPoints: (aps.data || []).length,
            extranet: (aps.data || []).filter((a) => a.exposure === 'extranet').length,
          }
        } catch {
          next[p.id] = { containers: 0, accessPoints: 0, extranet: 0 }
        }
      }),
    )
    counts.value = next
  } catch (err: any) {
    NKMessage.error(err.message || '加载容器项目失败')
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  await loadProjects()
}

function resetFilters() {
  filters.keyword = ''
  filters.status = ''
  loadProjects()
}

function openDeployment(p: Project) {
  router.push({ path: `/modules/zzz/developmentmanager/${p.id}`, query: { tab: 'deployment' } })
}

// ---------- 新建 / 编辑 ----------
const formVisible = ref(false)
const editing = ref<Project | null>(null)
const form = reactive({
  project_key: '',
  name: '',
  repo_path: '',
  repo_url: '',
  default_branch: 'main',
  status: 'active',
  description: '',
})

function openCreate() {
  editing.value = null
  form.project_key = ''
  form.name = ''
  form.repo_path = 'docker-compose.yml'
  form.repo_url = ''
  form.default_branch = 'main'
  form.status = 'active'
  form.description = ''
  formVisible.value = true
}

function openEdit(p: Project) {
  editing.value = p
  form.project_key = p.project_key
  form.name = p.name
  form.repo_path = p.repo_path
  form.repo_url = p.repo_url
  form.default_branch = p.default_branch || 'main'
  form.status = p.status
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
      type: 'container_project',
      status: form.status,
      repo_path: form.repo_path.trim(),
      repo_url: form.repo_url.trim(),
      default_branch: form.default_branch.trim() || 'main',
      tech_stack: ['Docker Compose'],
      description: form.description.trim(),
    }
    if (editing.value) {
      await updateProject(editing.value.id, payload)
      NKMessage.success('容器项目已更新')
    } else {
      await createProject(payload)
      NKMessage.success('容器项目已创建')
    }
    formVisible.value = false
    await loadProjects()
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
    NKMessage.success('容器项目已删除')
    deleteVisible.value = false
    await loadProjects()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    deletingLoading.value = false
  }
}

onMounted(loadProjects)
</script>
