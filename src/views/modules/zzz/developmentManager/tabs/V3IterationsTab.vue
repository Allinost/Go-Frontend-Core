<template>
  <div class="dm-page">
    <div class="dm-card">
      <div class="dm-card__header">
        <span class="dm-card__title">迭代（{{ total }}）</span>
        <div class="dm-actions">
          <NkButton size="sm" variant="ghost" :loading="loading" @click="loadAll">刷新</NkButton>
          <NkButton size="sm" @click="openForm()">新建迭代</NkButton>
        </div>
      </div>

      <div class="dm-filters" style="margin-bottom: 12px">
        <NkSelect v-model="filters.status" :options="statusOptions" placeholder="状态" clearable size="sm" style="width: min(140px, 100%)" @change="loadIterations" />
        <NkInput v-model="filters.keyword" placeholder="名称 / 目标" size="sm" style="width: min(240px, 100%)" @keyup.enter="search" />
        <NkButton size="sm" @click="search">搜索</NkButton>
        <NkButton size="sm" variant="ghost" @click="resetFilters">重置</NkButton>
      </div>

      <NkLoading v-if="loading" />
      <div v-else-if="iterations.length === 0" class="dm-muted">暂无迭代</div>
      <div v-else class="iter-grid">
        <div v-for="it in iterations" :key="it.id" class="iter-card">
          <div class="iter-head">
            <div>
              <div class="iter-name">{{ it.name }}</div>
              <div class="dm-muted">{{ it.start_date ? formatDate(it.start_date) : '未定' }} ~ {{ it.end_date ? formatDate(it.end_date) : '未定' }}</div>
            </div>
            <NkTag size="sm" :type="statusType(it.status)">{{ statusLabel(it.status) }}</NkTag>
          </div>
          <div v-if="it.goal" class="iter-goal">{{ it.goal }}</div>
          <div class="iter-progress">
            <div class="iter-progress-bar"><span :style="{ width: progressOf(it.id) + '%' }" /></div>
            <div class="dm-muted">
              {{ statsOf(it.id).done }}/{{ statsOf(it.id).total }} 完成 · {{ progressOf(it.id).toFixed(0) }}%
            </div>
          </div>
          <div class="iter-meta">
            <span>容量 {{ it.capacity_hours || 0 }}h</span>
            <span v-if="it.milestone_id">里程碑 #{{ it.milestone_id }}</span>
          </div>
          <div class="iter-actions">
            <NkSelect
              :model-value="it.status"
              :options="statusOptions"
              size="sm"
              style="width: min(110px, 100%)"
              @update:model-value="changeStatus(it, $event)"
            />
            <NkButton size="sm" variant="ghost" @click="openForm(it)">编辑</NkButton>
            <NkButton size="sm" variant="ghost" type="danger" @click="remove(it)">删除</NkButton>
          </div>
        </div>
      </div>
      <div class="dm-pagination">
        <NkPagination v-model="page" :total="total" :page-size="pageSize" @change="loadIterations" />
      </div>
    </div>

    <NkDialog v-model:visible="formVisible" :title="editingId ? '编辑迭代' : '新建迭代'" width="680">
      <div class="dm-form-grid">
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">名称 *</span>
          <NkInput v-model="form.name" size="sm" placeholder="Sprint 1" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">开始日期</span>
          <NkInput v-model="form.start_date" size="sm" placeholder="YYYY-MM-DD" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">结束日期</span>
          <NkInput v-model="form.end_date" size="sm" placeholder="YYYY-MM-DD" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">状态</span>
          <NkSelect v-model="form.status" :options="statusOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">容量（小时）</span>
          <NkInput v-model.number="form.capacity_hours" type="number" min="0" size="sm" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">关联里程碑</span>
          <NkSelect v-model="form.milestone_id" :options="milestoneOptions" placeholder="可选" clearable size="sm" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">迭代目标</span>
          <NkTextarea v-model="form.goal" :rows="3" placeholder="本次迭代要达成的目标" />
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
import { confirmDialog } from '@/utils/confirm'
import { computed, onMounted, reactive, ref } from 'vue'
import { NKMessage } from '@nkui/vue'
import type { Iteration, Milestone, Project, Task } from '@/types/developmentManager'
import {
  createIteration,
  deleteIteration,
  listIterations,
  listMilestones,
  listTasks,
  updateIteration,
} from '@/api/developmentManager'

const props = defineProps<{ project: Project }>()

const loading = ref(false)
const saving = ref(false)
const iterations = ref<Iteration[]>([])
const tasks = ref<Task[]>([])
const milestones = ref<Milestone[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const filters = reactive({ status: '', keyword: '' })

const statusOptions = [
  { label: '计划中', value: 'planned' },
  { label: '进行中', value: 'active' },
  { label: '已关闭', value: 'closed' },
]
const milestoneOptions = computed(() =>
  milestones.value.map((m) => ({ label: `${m.version} ${m.name}`, value: m.id })),
)

const formVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  name: '',
  goal: '',
  start_date: '',
  end_date: '',
  status: 'planned',
  capacity_hours: 0,
  milestone_id: '' as number | '',
})

function statusLabel(status: string) {
  const map: Record<string, string> = { planned: '计划中', active: '进行中', closed: '已关闭' }
  return map[status] || status
}

function statusType(status: string) {
  if (status === 'active') return 'primary'
  if (status === 'closed') return 'success'
  return 'neutral'
}

function formatDate(value: string) {
  if (!value) return '-'
  return String(value).slice(0, 10)
}

function statsOf(iterationId: number) {
  const list = tasks.value.filter((t) => t.iteration_id === iterationId)
  const done = list.filter((t) => t.status === 'done').length
  return { total: list.length, done }
}

function progressOf(iterationId: number) {
  const stats = statsOf(iterationId)
  if (!stats.total) return 0
  return (stats.done / stats.total) * 100
}

async function loadIterations() {
  loading.value = true
  try {
    const [it, ts, ms] = await Promise.all([
      listIterations(props.project.id, {
        page: page.value,
        page_size: pageSize,
        status: filters.status || undefined,
        keyword: filters.keyword || undefined,
      }),
      listTasks(props.project.id, { page: 1, page_size: 100 }),
      listMilestones(props.project.id, { page: 1, page_size: 100 }),
    ])
    iterations.value = it.data.items || []
    total.value = it.data.total || 0
    tasks.value = ts.data.items || []
    milestones.value = ms.data.items || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载迭代失败')
  } finally {
    loading.value = false
  }
}

function loadAll() {
  page.value = 1
  loadIterations()
}

function search() {
  page.value = 1
  loadIterations()
}

function resetFilters() {
  filters.status = ''
  filters.keyword = ''
  search()
}

function openForm(iteration?: Iteration) {
  editingId.value = iteration?.id || null
  Object.assign(form, {
    name: iteration?.name || '',
    goal: iteration?.goal || '',
    start_date: iteration?.start_date ? String(iteration.start_date).slice(0, 10) : '',
    end_date: iteration?.end_date ? String(iteration.end_date).slice(0, 10) : '',
    status: iteration?.status || 'planned',
    capacity_hours: iteration?.capacity_hours || 0,
    milestone_id: iteration?.milestone_id || '',
  })
  formVisible.value = true
}

async function save() {
  if (!form.name.trim()) {
    NKMessage.warning('迭代名称不能为空')
    return
  }
  saving.value = true
  const payload = {
    name: form.name.trim(),
    goal: form.goal,
    start_date: form.start_date || undefined,
    end_date: form.end_date || undefined,
    status: form.status,
    capacity_hours: Number(form.capacity_hours) || 0,
    milestone_id: form.milestone_id || undefined,
  }
  try {
    if (editingId.value) {
      await updateIteration(editingId.value, payload)
      NKMessage.success('迭代已更新')
    } else {
      await createIteration(props.project.id, payload)
      NKMessage.success('迭代已创建')
    }
    formVisible.value = false
    await loadIterations()
  } catch (err: any) {
    NKMessage.error(err.message || '保存迭代失败')
  } finally {
    saving.value = false
  }
}

async function changeStatus(iteration: Iteration, status: string) {
  try {
    await updateIteration(iteration.id, { status })
    iteration.status = status
  } catch (err: any) {
    NKMessage.error(err.message || '更新状态失败')
  }
}

async function remove(iteration: Iteration) {
  if (!(await confirmDialog(`确认删除迭代「${iteration.name}」？`))) return
  try {
    await deleteIteration(iteration.id)
    NKMessage.success('已删除')
    await loadIterations()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  }
}

onMounted(loadIterations)
</script>

<style scoped lang="scss">
.iter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
.iter-card {
  border: 1px solid var(--nk-border-color, #eee);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.iter-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}
.iter-name {
  font-weight: 600;
}
.iter-goal {
  font-size: 13px;
  color: var(--nk-text-color-secondary, #666);
}
.iter-progress-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--nk-fill-color, #f0f0f0);
  overflow: hidden;
  margin-bottom: 4px;
}
.iter-progress-bar span {
  display: block;
  height: 100%;
  background: var(--nk-color-primary-500, #1677ff);
}
.iter-meta {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: var(--nk-text-color-secondary, #888);
}
.iter-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
</style>
