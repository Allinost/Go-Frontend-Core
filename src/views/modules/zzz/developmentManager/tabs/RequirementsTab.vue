<template>
  <div class="dm-page">
    <div class="dm-card">
      <div class="dm-card__header">
        <span class="dm-card__title">需求（{{ total }}）</span>
        <NkButton size="sm" @click="openRequirement()">新建需求</NkButton>
      </div>

      <div class="dm-filters" style="margin-bottom: 12px">
        <NkSelect v-model="filters.status" placeholder="状态" :options="statusOptions" clearable size="sm" style="width: 130px" />
        <NkSelect v-model="filters.type" placeholder="类型" :options="typeOptions" clearable size="sm" style="width: 120px" />
        <NkSelect v-model="filters.priority" placeholder="优先级" :options="priorityOptions" clearable size="sm" style="width: 110px" />
        <NkInput v-model="filters.keyword" placeholder="编号 / 标题 / 正文" size="sm" style="width: 220px" @keyup.enter="search" />
        <NkButton size="sm" @click="search">搜索</NkButton>
        <NkButton size="sm" variant="ghost" @click="resetFilters">重置</NkButton>
      </div>

      <NkLoading v-if="loading" />
      <table v-else class="dm-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>标题</th>
            <th>类型</th>
            <th>优先级</th>
            <th>状态</th>
            <th>负责人</th>
            <th>版本</th>
            <th>更新时间</th>
            <th style="width: 240px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in requirements" :key="r.id">
            <td><span class="dm-code">{{ r.code }}</span></td>
            <td>
              <span class="dm-link" @click="openRequirement(r)">{{ r.title }}</span>
            </td>
            <td><NkTag size="sm">{{ typeLabel(r.type) }}</NkTag></td>
            <td>
              <NkTag size="sm" :type="r.priority === 'P0' ? 'danger' : r.priority === 'P1' ? 'warning' : 'default'">{{ r.priority }}</NkTag>
            </td>
            <td><NkTag size="sm" :type="statusTagType(r.status)">{{ statusLabel(r.status) }}</NkTag></td>
            <td class="dm-muted">{{ r.owner || '-' }}</td>
            <td>v{{ r.latest_version }}</td>
            <td class="dm-muted">{{ formatTime(r.updated_at) }}</td>
            <td>
              <NkButton size="sm" variant="ghost" @click="openStatus(r)">流转</NkButton>
              <NkButton size="sm" variant="ghost" @click="openVersions(r)">版本</NkButton>
              <NkButton size="sm" variant="ghost" type="danger" @click="askConfirm(`确定删除需求 ${r.code} 吗？将生成已删除版本快照。`, () => doDelete(r))">删除</NkButton>
            </td>
          </tr>
          <tr v-if="!requirements.length && !loading">
            <td colspan="9" class="dm-table__empty">暂无需求</td>
          </tr>
        </tbody>
      </table>
      <div class="dm-pagination">
        <NkPagination v-model="page" :total="total" :page-size="pageSize" @change="loadRequirements" />
      </div>
    </div>

    <!-- 需求表单 -->
    <NkDialog v-model:visible="formVisible" :title="editing ? '编辑需求' : '新建需求'" width="720">
      <div class="dm-form-grid">
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">标题 *</span>
          <NkInput v-model="form.title" size="sm" placeholder="需求标题（2-200 字符）" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">类型</span>
          <NkSelect v-model="form.type" :options="typeOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">优先级</span>
          <NkSelect v-model="form.priority" :options="priorityOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">来源</span>
          <NkSelect v-model="form.source" :options="sourceOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">负责人</span>
          <NkInput v-model="form.owner" size="sm" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">需求正文（Markdown）</span>
          <NkTextarea v-model="form.content" :rows="8" placeholder="背景、目标、范围、验收标准…" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">本次变更说明</span>
          <NkInput v-model="form.change_note" size="sm" placeholder="留空自动生成" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="formVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="saveRequirement">保存</NkButton>
      </template>
    </NkDialog>

    <!-- 状态流转 -->
    <NkDialog v-model:visible="statusVisible" :title="`状态流转 · ${current?.code || ''}`" width="480">
      <p class="dm-muted">当前状态：{{ statusLabel(current?.status || '') }}</p>
      <div class="dm-form-grid" style="margin-top: 12px">
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">目标状态</span>
          <NkSelect v-model="statusForm.status" :options="nextStatusOptions" size="sm" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">变更说明</span>
          <NkInput v-model="statusForm.change_note" size="sm" placeholder="留空自动生成" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="statusVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="saveStatus">确认流转</NkButton>
      </template>
    </NkDialog>

    <!-- 版本历史 -->
    <NkDialog v-model:visible="versionsVisible" :title="`版本历史 · ${current?.code || ''}`" width="760">
      <NkLoading v-if="loadingVersions" />
      <div v-else class="dm-section">
        <div v-for="v in versions" :key="v.id" class="dm-card">
          <div class="dm-card__header" style="margin-bottom: 6px">
            <span class="dm-card__title">v{{ v.version_no }} · {{ statusLabel(v.status) }}</span>
            <span class="dm-muted">{{ v.operator || '-' }} · {{ formatTime(v.created_at) }}</span>
          </div>
          <div class="dm-muted">{{ v.change_note || '无变更说明' }}</div>
          <div style="margin-top: 6px; font-weight: 500">{{ v.title }}</div>
          <pre class="dm-pre">{{ v.content || '（空）' }}</pre>
        </div>
        <NkEmpty v-if="!versions.length" description="暂无版本记录" />
      </div>
    </NkDialog>

    <NkDialog v-model:visible="confirmVisible" title="确认操作" width="420">
      <p>{{ confirmText }}</p>
      <template #footer>
        <NkButton variant="ghost" @click="confirmVisible = false">取消</NkButton>
        <NkButton type="danger" :loading="confirmLoading" @click="runConfirm">确认</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  listRequirements,
  createRequirement,
  updateRequirement,
  changeRequirementStatus,
  deleteRequirement,
  listRequirementVersions,
} from '@/api/developmentManager'
import type { Project, Requirement, RequirementVersion } from '@/types/developmentManager'

const props = defineProps<{ project: Project }>()

const loading = ref(false)
const saving = ref(false)
const requirements = ref<Requirement[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filters = reactive({ status: '', type: '', priority: '', keyword: '' })

const typeOptions = [
  { label: '新功能', value: 'feature' },
  { label: '变更', value: 'change' },
  { label: '修复', value: 'fix' },
  { label: '运维', value: 'ops' },
]
const priorityOptions = [
  { label: 'P0', value: 'P0' },
  { label: 'P1', value: 'P1' },
  { label: 'P2', value: 'P2' },
  { label: 'P3', value: 'P3' },
]
const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '评审中', value: 'reviewing' },
  { label: '已通过', value: 'approved' },
  { label: '已排期', value: 'planned' },
  { label: '开发中', value: 'developing' },
  { label: '已完成', value: 'done' },
  { label: '已关闭', value: 'closed' },
]
const sourceOptions = [
  { label: '人工', value: 'manual' },
  { label: 'AI', value: 'ai' },
  { label: '客户', value: 'customer' },
]

const transitionMap: Record<string, string[]> = {
  draft: ['reviewing', 'closed'],
  reviewing: ['approved', 'draft', 'closed'],
  approved: ['planned', 'closed'],
  planned: ['developing', 'closed'],
  developing: ['done', 'closed'],
  done: ['developing', 'closed'],
  closed: [],
}

function statusLabel(s: string): string {
  if (s === 'deleted') return '已删除'
  return statusOptions.find((o) => o.value === s)?.label || s
}
function typeLabel(t: string): string {
  return typeOptions.find((o) => o.value === t)?.label || t
}
function statusTagType(s: string): 'success' | 'danger' | 'warning' | 'default' {
  if (s === 'done') return 'success'
  if (s === 'closed' || s === 'deleted') return 'danger'
  if (s === 'reviewing' || s === 'developing') return 'warning'
  return 'default'
}
function formatTime(value?: string): string {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

async function loadRequirements() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, page_size: pageSize.value }
    if (filters.status) params.status = filters.status
    if (filters.type) params.type = filters.type
    if (filters.priority) params.priority = filters.priority
    if (filters.keyword) params.keyword = filters.keyword
    const res = await listRequirements(props.project.id, params)
    requirements.value = res.data.items || []
    total.value = res.data.total
  } catch (err: any) {
    NKMessage.error(err.message || '加载需求失败')
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  loadRequirements()
}

function resetFilters() {
  filters.status = ''
  filters.type = ''
  filters.priority = ''
  filters.keyword = ''
  page.value = 1
  loadRequirements()
}

// ---------- 表单 ----------
const formVisible = ref(false)
const editing = ref<Requirement | null>(null)
const form = reactive({
  title: '',
  type: 'feature',
  priority: 'P2',
  source: 'manual',
  owner: '',
  content: '',
  change_note: '',
})

function openRequirement(r?: Requirement) {
  editing.value = r || null
  form.title = r?.title || ''
  form.type = r?.type || 'feature'
  form.priority = r?.priority || 'P2'
  form.source = r?.source || 'manual'
  form.owner = r?.owner || ''
  form.content = r?.content || ''
  form.change_note = ''
  formVisible.value = true
}

async function saveRequirement() {
  if (!form.title.trim()) {
    NKMessage.warning('标题不能为空')
    return
  }
  saving.value = true
  try {
    const payload = { ...form, title: form.title.trim() }
    if (editing.value) {
      await updateRequirement(editing.value.id, payload)
      NKMessage.success('需求已更新（已生成新版本）')
    } else {
      await createRequirement(props.project.id, payload)
      NKMessage.success('需求已创建')
    }
    formVisible.value = false
    await loadRequirements()
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// ---------- 状态流转 ----------
const statusVisible = ref(false)
const current = ref<Requirement | null>(null)
const statusForm = reactive({ status: '', change_note: '' })

const nextStatusOptions = computed(() => {
  const from = current.value?.status || ''
  return (transitionMap[from] || []).map((s) => ({ label: statusLabel(s), value: s }))
})

function openStatus(r: Requirement) {
  current.value = r
  statusForm.status = (transitionMap[r.status] || [])[0] || ''
  statusForm.change_note = ''
  statusVisible.value = true
}

async function saveStatus() {
  if (!current.value || !statusForm.status) {
    NKMessage.warning('请选择目标状态')
    return
  }
  saving.value = true
  try {
    await changeRequirementStatus(current.value.id, { ...statusForm })
    NKMessage.success('状态已流转（已生成新版本）')
    statusVisible.value = false
    await loadRequirements()
  } catch (err: any) {
    NKMessage.error(err.message || '流转失败')
  } finally {
    saving.value = false
  }
}

// ---------- 版本 ----------
const versionsVisible = ref(false)
const loadingVersions = ref(false)
const versions = ref<RequirementVersion[]>([])

async function openVersions(r: Requirement) {
  current.value = r
  versionsVisible.value = true
  loadingVersions.value = true
  try {
    const res = await listRequirementVersions(r.id)
    versions.value = res.data || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载版本失败')
  } finally {
    loadingVersions.value = false
  }
}

// ---------- 删除 ----------
async function doDelete(r: Requirement) {
  await deleteRequirement(r.id)
  NKMessage.success('需求已删除（已生成快照）')
  await loadRequirements()
}

// ---------- 通用确认 ----------
const confirmVisible = ref(false)
const confirmText = ref('')
const confirmLoading = ref(false)
let confirmAction: (() => Promise<void>) | null = null

function askConfirm(text: string, action: () => Promise<void>) {
  confirmText.value = text
  confirmAction = action
  confirmVisible.value = true
}

async function runConfirm() {
  if (!confirmAction) return
  confirmLoading.value = true
  try {
    await confirmAction()
    confirmVisible.value = false
  } catch (err: any) {
    NKMessage.error(err.message || '操作失败')
  } finally {
    confirmLoading.value = false
  }
}

onMounted(loadRequirements)
</script>
