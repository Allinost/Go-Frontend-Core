<template>
  <div class="dm-page">
    <div class="dm-card">
      <div class="dm-card__header">
        <span class="dm-card__title">风险（{{ total }}）</span>
        <div class="dm-actions">
          <NkButton size="sm" variant="ghost" :loading="loading" @click="loadRisks">刷新</NkButton>
          <NkButton size="sm" @click="openForm()">新建风险</NkButton>
        </div>
      </div>

      <div class="dm-filters" style="margin-bottom: 12px">
        <NkSelect v-model="filters.status" :options="statusOptions" placeholder="状态" clearable size="sm" style="width: 130px" />
        <NkSelect v-model="filters.level" :options="levelOptions" placeholder="等级" clearable size="sm" style="width: 120px" />
        <NkInput v-model="filters.keyword" placeholder="标题 / 描述 / 负责人" size="sm" style="width: 220px" @keyup.enter="search" />
        <NkButton size="sm" @click="search">搜索</NkButton>
        <NkButton size="sm" variant="ghost" @click="resetFilters">重置</NkButton>
      </div>

      <NkLoading v-if="loading" />
      <table v-else class="dm-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>等级</th>
            <th>概率</th>
            <th>影响</th>
            <th>状态</th>
            <th>负责人</th>
            <th>截止</th>
            <th style="width: 210px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in visibleRisks" :key="r.id">
            <td>
              <span class="dm-link" @click="openForm(r)">{{ r.title }}</span>
              <div class="dm-muted">{{ r.description }}</div>
            </td>
            <td><NkTag size="sm" :type="levelType(r.level)">{{ levelLabel(r.level) }}</NkTag></td>
            <td>{{ probabilityLabel(r.probability) }}</td>
            <td>{{ probabilityLabel(r.impact) }}</td>
            <td>
              <NkSelect
                :model-value="r.status"
                :options="statusOptions"
                size="sm"
                style="width: 110px"
                @update:model-value="changeStatus(r, $event)"
              />
            </td>
            <td class="dm-muted">{{ r.owner || '-' }}</td>
            <td class="dm-muted">{{ r.due_date ? formatDate(r.due_date) : '-' }}</td>
            <td>
              <NkButton size="sm" variant="ghost" @click="openForm(r)">编辑</NkButton>
              <NkButton size="sm" variant="ghost" type="danger" @click="remove(r)">删除</NkButton>
            </td>
          </tr>
          <tr v-if="!visibleRisks.length">
            <td colspan="8" class="dm-table__empty">暂无风险</td>
          </tr>
        </tbody>
      </table>
      <div class="dm-pagination">
        <NkPagination v-model="page" :total="total" :page-size="pageSize" @change="loadRisks" />
      </div>
    </div>

    <NkDialog v-model:visible="formVisible" :title="editingId ? '编辑风险' : '新建风险'" width="720">
      <div class="dm-form-grid">
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">标题 *</span>
          <NkInput v-model="form.title" size="sm" placeholder="风险标题" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">关联里程碑</span>
          <NkSelect v-model="form.milestone_id" :options="milestoneOptions" placeholder="可选" clearable size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">关联任务</span>
          <NkSelect v-model="form.task_id" :options="taskOptions" placeholder="可选" clearable filterable size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">概率</span>
          <NkSelect v-model="form.probability" :options="probabilityOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">影响</span>
          <NkSelect v-model="form.impact" :options="probabilityOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">等级</span>
          <NkSelect v-model="form.level" :options="levelOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">状态</span>
          <NkSelect v-model="form.status" :options="statusOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">负责人</span>
          <NkInput v-model="form.owner" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">截止日期</span>
          <NkInput v-model="form.due_date" size="sm" placeholder="YYYY-MM-DD" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">描述</span>
          <NkTextarea v-model="form.description" :rows="3" placeholder="风险描述、触发条件" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">应对措施</span>
          <NkTextarea v-model="form.mitigation" :rows="3" placeholder="缓解/规避/转移措施" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="formVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="save">保存</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import type { Milestone, Project, Risk, Task } from '@/types/developmentManager'
import {
  createRisk,
  deleteRisk,
  listMilestones,
  listRisks,
  listTasks,
  updateRisk,
} from '@/api/developmentManager'

const props = defineProps<{ project: Project }>()

const loading = ref(false)
const saving = ref(false)
const risks = ref<Risk[]>([])
const milestones = ref<Milestone[]>([])
const tasks = ref<Task[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const filters = reactive({ status: '', level: '', keyword: '' })

const statusOptions = [
  { label: '打开', value: 'open' },
  { label: '缓解中', value: 'mitigating' },
  { label: '已关闭', value: 'closed' },
  { label: '已接受', value: 'accepted' },
]
const levelOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
  { label: '严重', value: 'critical' },
]
const probabilityOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
]

const milestoneOptions = computed(() =>
  milestones.value.map((m) => ({ label: `${m.version} ${m.name}`, value: m.id })),
)
const taskOptions = computed(() =>
  tasks.value.map((t) => ({ label: `${t.code} ${t.title}`, value: t.id })),
)

const visibleRisks = computed(() =>
  filters.level ? risks.value.filter((r) => r.level === filters.level) : risks.value,
)

const formVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  title: '',
  description: '',
  probability: 'medium',
  impact: 'medium',
  level: 'medium',
  mitigation: '',
  owner: '',
  status: 'open',
  due_date: '',
  milestone_id: '' as number | '',
  task_id: '' as number | '',
})

function levelLabel(level: string) {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高', critical: '严重' }
  return map[level] || level
}

function probabilityLabel(value: string) {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高' }
  return map[value] || value
}

function levelType(level: string) {
  if (level === 'critical') return 'danger'
  if (level === 'high') return 'warning'
  if (level === 'medium') return 'primary'
  return 'neutral'
}

function formatDate(value: string) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString()
}

async function loadRisks() {
  loading.value = true
  try {
    const res = await listRisks(props.project.id, {
      page: page.value,
      page_size: pageSize,
      status: filters.status || undefined,
      keyword: filters.keyword || undefined,
    })
    risks.value = res.data.items || []
    total.value = res.data.total || 0
  } catch (err: any) {
    NKMessage.error(err.message || '加载风险失败')
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  try {
    const [ms, ts] = await Promise.all([
      listMilestones(props.project.id, { page: 1, page_size: 100 }),
      listTasks(props.project.id, { page: 1, page_size: 100 }),
    ])
    milestones.value = ms.data.items || []
    tasks.value = ts.data.items || []
  } catch {
    // 选项加载失败不影响风险列表
  }
}

function search() {
  page.value = 1
  loadRisks()
}

function resetFilters() {
  filters.status = ''
  filters.level = ''
  filters.keyword = ''
  search()
}

function openForm(risk?: Risk) {
  editingId.value = risk?.id || null
  Object.assign(form, {
    title: risk?.title || '',
    description: risk?.description || '',
    probability: risk?.probability || 'medium',
    impact: risk?.impact || 'medium',
    level: risk?.level || 'medium',
    mitigation: risk?.mitigation || '',
    owner: risk?.owner || '',
    status: risk?.status || 'open',
    due_date: risk?.due_date ? String(risk.due_date).slice(0, 10) : '',
    milestone_id: risk?.milestone_id || '',
    task_id: risk?.task_id || '',
  })
  formVisible.value = true
}

async function save() {
  if (!form.title.trim()) {
    NKMessage.warning('标题不能为空')
    return
  }
  saving.value = true
  const payload = {
    title: form.title.trim(),
    description: form.description,
    probability: form.probability,
    impact: form.impact,
    level: form.level,
    mitigation: form.mitigation,
    owner: form.owner,
    status: form.status,
    due_date: form.due_date || undefined,
    milestone_id: form.milestone_id || undefined,
    task_id: form.task_id || undefined,
  }
  try {
    if (editingId.value) {
      await updateRisk(editingId.value, payload)
      NKMessage.success('风险已更新')
    } else {
      await createRisk(props.project.id, payload)
      NKMessage.success('风险已创建')
    }
    formVisible.value = false
    await loadRisks()
  } catch (err: any) {
    NKMessage.error(err.message || '保存风险失败')
  } finally {
    saving.value = false
  }
}

async function changeStatus(risk: Risk, status: string) {
  try {
    await updateRisk(risk.id, { status })
    risk.status = status
  } catch (err: any) {
    NKMessage.error(err.message || '更新状态失败')
  }
}

async function remove(risk: Risk) {
  if (!window.confirm(`确认删除风险「${risk.title}」？`)) return
  try {
    await deleteRisk(risk.id)
    NKMessage.success('已删除')
    await loadRisks()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  }
}

onMounted(() => {
  loadOptions()
  loadRisks()
})
</script>
