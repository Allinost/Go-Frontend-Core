<template>
  <div class="v3pm">
    <div class="v3pm-toolbar">
      <div class="v3pm-summary">
        <span>任务 {{ dashboard?.tasks || 0 }}</span>
        <span>完成 {{ dashboard?.done || 0 }}</span>
        <span>完成率 {{ (dashboard?.percent || 0).toFixed(1) }}%</span>
        <span>风险 {{ dashboard?.risks_open || 0 }}</span>
      </div>
      <NkButton size="sm" variant="ghost" :loading="loading" @click="load">刷新</NkButton>
    </div>

    <NkCard class="v3pm-card">
      <div class="v3pm-card-title">
        <span>里程碑</span>
        <NkButton size="sm" @click="showMilestoneForm = !showMilestoneForm">新建里程碑</NkButton>
      </div>
      <div v-if="showMilestoneForm" class="v3pm-form-row">
        <NkInput v-model="milestoneForm.version" placeholder="V3.0" size="sm" />
        <NkInput v-model="milestoneForm.name" placeholder="里程碑名称" size="sm" />
        <NkInput v-model="milestoneForm.target_date" placeholder="2026-12-15" size="sm" />
        <NkButton size="sm" type="primary" :loading="saving" @click="saveMilestone">保存</NkButton>
      </div>
      <div v-if="milestones.length === 0" class="v3pm-muted">暂无里程碑</div>
      <div v-else class="v3pm-milestones">
        <div v-for="m in milestones" :key="m.id" class="v3pm-milestone" @click="filterMilestone = m.id; loadTasks()">
          <div class="v3pm-milestone-head">
            <strong>{{ m.version }}</strong>
            <NkTag size="sm" :type="milestoneType(m.status)">{{ m.status }}</NkTag>
          </div>
          <div class="v3pm-milestone-name">{{ m.name }}</div>
          <div class="v3pm-progress"><span :style="{ width: progressOf(m.id) + '%' }" /></div>
          <div class="v3pm-muted">{{ progressOf(m.id).toFixed(0) }}%</div>
        </div>
      </div>
    </NkCard>

    <NkCard class="v3pm-card">
      <div class="v3pm-card-title">
        <span>标签</span>
      </div>
      <div class="v3pm-form-row">
        <NkInput v-model="newLabelName" placeholder="标签名称" size="sm" style="width: 160px" />
        <NkInput v-model="newLabelColor" placeholder="#1677ff" size="sm" style="width: 110px" />
        <NkButton size="sm" @click="createProjectLabel">创建标签</NkButton>
      </div>
      <div v-if="projectLabels.length === 0" class="v3pm-muted">暂无标签</div>
      <div v-else class="v3pm-inline">
        <NkTag v-for="label in projectLabels" :key="label.id" size="sm" type="neutral" closable @close="deleteProjectLabel(label)">
          {{ label.name }}
        </NkTag>
      </div>
    </NkCard>

    <NkCard class="v3pm-card">
      <div class="v3pm-card-title">
        <span>任务</span>
        <div class="v3pm-inline">
          <NkButton size="sm" :variant="taskViewMode === 'list' ? 'solid' : 'ghost'" @click="taskViewMode = 'list'">列表</NkButton>
          <NkButton size="sm" :variant="taskViewMode === 'gantt' ? 'solid' : 'ghost'" @click="taskViewMode = 'gantt'">甘特</NkButton>
          <NkSelect v-model="filterStatus" :options="statusOptions" placeholder="状态" clearable size="sm" style="width: 130px" @change="loadTasks" />
          <NkSelect v-model="filterMilestone" :options="milestoneOptions" placeholder="里程碑" clearable size="sm" style="width: 150px" @change="loadTasks" />
          <NkButton size="sm" @click="showTaskForm = !showTaskForm">新建任务</NkButton>
          <NkButton size="sm" variant="ghost" @click="openImport">导入任务</NkButton>
        </div>
      </div>
      <div v-if="showTaskForm" class="v3pm-form-grid">
        <NkInput v-model="taskForm.code" placeholder="任务编号 V3-P0-01" />
        <NkInput v-model="taskForm.title" placeholder="任务标题" />
        <NkSelect v-model="taskForm.milestone_id" :options="milestoneOptions" placeholder="里程碑" />
        <NkSelect v-model="taskForm.type" :options="typeOptions" />
        <NkSelect v-model="taskForm.priority" :options="priorityOptions" />
        <NkInput v-model.number="taskForm.estimate_hours" type="number" placeholder="预估工时" />
        <NkInput v-model="taskForm.owner" placeholder="负责人" />
        <NkInput v-model="taskForm.start_date" placeholder="开始日期 YYYY-MM-DD" />
        <NkInput v-model="taskForm.due_date" placeholder="截止日期 YYYY-MM-DD" />
        <NkButton size="sm" type="primary" :loading="saving" @click="saveTask">保存任务</NkButton>
      </div>
      <NkLoading v-if="tasksLoading" />
      <div v-else-if="tasks.length === 0" class="v3pm-muted">暂无任务</div>
      <div v-else-if="taskViewMode === 'gantt'" class="v3pm-gantt">
        <div v-if="ganttTasks.length === 0" class="v3pm-muted">暂无带开始/截止日期的任务</div>
        <template v-else>
          <div class="v3pm-gantt__head">
            <span>{{ formatGanttDate(ganttRange.start) }}</span>
            <span>{{ formatGanttDate(ganttRange.end) }}</span>
          </div>
          <div v-for="t in ganttTasks" :key="t.id" class="v3pm-gantt__row">
            <div class="v3pm-gantt__label" @click="openTask(t)">
              <span class="v3pm-code">{{ t.code }}</span>
              <span class="v3pm-gantt__title">{{ t.title }}</span>
            </div>
            <div class="v3pm-gantt__track">
              <div
                class="v3pm-gantt__bar"
                :class="`v3pm-gantt__bar--${t.status}`"
                :style="ganttBarStyle(t)"
                :title="`${t.title} ${formatGanttDate(t.start_date)} ~ ${formatGanttDate(t.due_date)}`"
                @click="openTask(t)"
              >
                {{ t.owner || t.status }}
              </div>
            </div>
          </div>
          <div class="v3pm-muted v3pm-gantt__hint">
            共 {{ ganttTasks.length }} 个有日期任务，另有 {{ tasks.length - ganttTasks.length }} 个未排期。
          </div>
        </template>
      </div>
      <div v-else class="v3pm-table-wrap">
        <table class="v3pm-table">
          <thead>
            <tr>
              <th>编号</th>
              <th>标题</th>
              <th>状态</th>
              <th>优先级</th>
              <th>负责人</th>
              <th>预估</th>
              <th>实际</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tasks" :key="t.id">
              <td class="v3pm-code">{{ t.code }}</td>
              <td class="v3pm-title" @click="openTask(t)">{{ t.title }}</td>
              <td><NkTag size="sm" :type="taskType(t.status)">{{ t.status }}</NkTag></td>
              <td>{{ t.priority }}</td>
              <td>{{ t.owner || '-' }}</td>
              <td>{{ t.estimate_hours }}</td>
              <td>{{ t.actual_hours }}</td>
              <td>
                <div class="v3pm-inline">
                  <NkButton v-if="t.status === 'todo'" size="sm" variant="ghost" @click="changeStatus(t, 'doing')">开始</NkButton>
                  <NkButton v-if="t.status === 'doing' || t.status === 'review'" size="sm" variant="ghost" @click="changeStatus(t, 'done')">完成</NkButton>
                  <NkButton size="sm" variant="ghost" @click="openTask(t)">详情</NkButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </NkCard>

    <NkDrawer v-model:visible="drawerVisible" title="任务详情" size="lg">
      <div v-if="currentTask" class="v3pm-drawer">
        <div class="v3pm-drawer-head">
          <div>
            <div class="v3pm-code">{{ currentTask.code }}</div>
            <h3 class="v3pm-drawer-title">{{ currentTask.title }}</h3>
          </div>
          <NkTag size="sm" :type="taskType(currentTask.status)">{{ currentTask.status }}</NkTag>
        </div>
        <div class="v3pm-drawer-actions">
          <NkButton v-if="currentTask.status === 'todo'" size="sm" @click="changeStatus(currentTask, 'doing')">开始</NkButton>
          <NkButton v-if="currentTask.status === 'doing'" size="sm" @click="changeStatus(currentTask, 'review')">提测</NkButton>
          <NkButton v-if="currentTask.status === 'doing' || currentTask.status === 'review'" size="sm" type="primary" @click="changeStatus(currentTask, 'done')">完成</NkButton>
          <NkButton v-if="currentTask.status === 'done'" size="sm" @click="changeStatus(currentTask, 'doing')">重新打开</NkButton>
        </div>

        <div class="v3pm-section">
          <div class="v3pm-section-title">计划日期</div>
          <div class="v3pm-form-row">
            <NkInput v-model="taskPlan.start_date" placeholder="开始 YYYY-MM-DD" size="sm" style="width: 170px" />
            <NkInput v-model="taskPlan.due_date" placeholder="截止 YYYY-MM-DD" size="sm" style="width: 170px" />
            <NkButton size="sm" @click="saveTaskPlan">保存日期</NkButton>
          </div>
        </div>

        <div class="v3pm-section">
          <div class="v3pm-section-title">工时日志</div>
          <div class="v3pm-form-row">
            <NkInput v-model.number="logForm.hours" type="number" placeholder="小时" size="sm" />
            <NkInput v-model="logForm.note" placeholder="日志说明" size="sm" />
            <NkButton size="sm" @click="saveLog">添加</NkButton>
          </div>
          <div v-if="logs.length === 0" class="v3pm-muted">暂无日志</div>
          <div v-for="l in logs" :key="l.id" class="v3pm-list-item">
            <span>{{ l.created_at ? new Date(l.created_at).toLocaleString() : '' }}</span>
            <span>{{ l.from_status }} → {{ l.to_status }}</span>
            <span>{{ l.hours }}h</span>
            <span class="v3pm-muted">{{ l.note }}</span>
          </div>
        </div>

        <div class="v3pm-section">
          <div class="v3pm-section-title">依赖</div>
          <div class="v3pm-form-row">
            <NkSelect v-model="depForm.depends_on_task_id" :options="dependencyOptions" placeholder="依赖任务" size="sm" style="width: 220px" />
            <NkSelect v-model="depForm.dep_type" :options="depTypeOptions" size="sm" style="width: 100px" />
            <NkButton size="sm" @click="saveDependency">添加</NkButton>
          </div>
          <div v-if="deps.length === 0" class="v3pm-muted">暂无依赖</div>
          <div v-for="d in deps" :key="d.id" class="v3pm-list-item">
            <span>{{ taskCode(d.depends_on_task_id) }}</span>
            <span>{{ d.dep_type }}</span>
            <NkButton size="sm" variant="ghost" type="danger" @click="removeDep(d.id)">移除</NkButton>
          </div>
        </div>

        <div class="v3pm-section">
          <div class="v3pm-section-title">检查项</div>
          <div class="v3pm-form-row">
            <NkInput v-model="checkForm" placeholder="检查项" size="sm" />
            <NkButton size="sm" @click="saveCheck">添加</NkButton>
          </div>
          <div v-for="c in checklist" :key="c.id" class="v3pm-list-item">
            <NkSwitch :model-value="c.done" size="sm" @update:model-value="toggleCheck(c, $event)" />
            <span :class="{ 'v3pm-done': c.done }">{{ c.title }}</span>
            <NkButton size="sm" variant="ghost" type="danger" @click="removeCheck(c.id)">删除</NkButton>
          </div>
        </div>

        <div class="v3pm-section">
          <div class="v3pm-section-title">标签</div>
          <div class="v3pm-form-row">
            <NkSelect
              v-model="selectedLabelId"
              :options="availableLabelOptions"
              placeholder="选择标签"
              size="sm"
              style="width: 180px"
              @change="attachLabel"
            />
          </div>
          <div v-if="taskLabels.length === 0" class="v3pm-muted">暂无标签</div>
          <div v-else class="v3pm-inline">
            <NkTag
              v-for="label in taskLabels"
              :key="label.id"
              size="sm"
              :type="'neutral'"
              closable
              @close="detachLabel(label)"
            >
              {{ label.name }}
            </NkTag>
          </div>
        </div>

        <div class="v3pm-section">
          <div class="v3pm-section-title">关联资产</div>
          <div class="v3pm-form-row">
            <NkSelect
              v-model="assetForm.asset_id"
              :options="assetOptions"
              placeholder="选择项目资产"
              size="sm"
              style="width: 240px"
              filterable
            />
            <NkSelect v-model="assetForm.relation_type" :options="assetRelationOptions" size="sm" style="width: 120px" />
            <NkButton size="sm" @click="attachAsset">添加</NkButton>
          </div>
          <div v-if="taskAssets.length === 0" class="v3pm-muted">暂无关联资产</div>
          <div v-for="a in taskAssets" :key="a.id" class="v3pm-list-item">
            <span>{{ assetName(a.asset_id) }}</span>
            <NkTag size="sm" type="neutral">{{ a.relation_type }}</NkTag>
            <NkButton size="sm" variant="ghost" type="danger" @click="detachAsset(a)">移除</NkButton>
          </div>
        </div>

        <div class="v3pm-section">
          <div class="v3pm-section-title">评论</div>
          <div class="v3pm-form-row">
            <NkInput v-model="commentText" placeholder="写评论" size="sm" />
            <NkButton size="sm" @click="saveComment">发送</NkButton>
          </div>
          <div v-for="c in comments" :key="c.id" class="v3pm-comment">
            <div class="v3pm-muted">{{ c.operator }} · {{ new Date(c.created_at).toLocaleString() }}</div>
            <div>{{ c.content }}</div>
          </div>
        </div>
      </div>
    </NkDrawer>

    <NkDialog v-model:visible="importVisible" title="导入任务" width="720">
      <div class="v3pm-muted" style="margin-bottom: 8px">
        粘贴 JSON 数组，每项至少包含 title；可选 code / milestone_id / type / priority / owner / estimate_hours。
      </div>
      <NkTextarea v-model="importText" :rows="14" placeholder='[{"code":"V3-P0-01","title":"任务标题","priority":"P1"}]' />
      <template #footer>
        <NkButton variant="ghost" @click="importVisible = false">取消</NkButton>
        <NkButton :loading="importing" @click="doImport">导入</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import type { Project } from '@/types/developmentManager'
import type {
  Milestone,
  Task,
  TaskDependency,
  TaskLog,
  ChecklistItem,
  Comment,
  MilestoneProgress,
  ProjectDashboard,
  Label,
  TaskAsset,
  ProjectAsset,
} from '@/types/developmentManager'
import {
  addDependency,
  addTaskAsset,
  addTaskComment,
  addTaskLabel,
  addTaskLog,
  changeTaskStatus,
  createChecklistItem,
  createLabel,
  createMilestone,
  createTask,
  deleteChecklistItem,
  deleteLabel,
  getDashboard,
  getMilestoneProgress,
  importTasks,
  listAssets,
  listChecklist,
  listDependencies,
  listLabels,
  listMilestones,
  listTaskAssets,
  listTaskComments,
  listTaskLabels,
  listTaskLogs,
  listTasks,
  removeDependency,
  removeTaskAsset,
  removeTaskLabel,
  updateChecklistItem,
  updateTask,
} from '@/api/developmentManager'

const props = defineProps<{ project: Project }>()

const loading = ref(false)
const tasksLoading = ref(false)
const saving = ref(false)
const milestones = ref<Milestone[]>([])
const tasks = ref<Task[]>([])
const dashboard = ref<ProjectDashboard | null>(null)
const progressMap = ref<Record<number, MilestoneProgress>>({})
const filterStatus = ref('')
const filterMilestone = ref<number | ''>('')
const showMilestoneForm = ref(false)
const showTaskForm = ref(false)
const milestoneForm = reactive({ version: '', name: '', target_date: '' })
const taskForm = reactive({
  code: '', title: '', milestone_id: '' as number | '', type: 'feature', priority: 'P2',
  estimate_hours: 0, owner: '', start_date: '', due_date: '',
})

const drawerVisible = ref(false)
const currentTask = ref<Task | null>(null)
const taskPlan = reactive({ start_date: '', due_date: '' })
const logs = ref<TaskLog[]>([])
const deps = ref<TaskDependency[]>([])
const checklist = ref<ChecklistItem[]>([])
const comments = ref<Comment[]>([])
const logForm = reactive({ hours: 1, note: '' })
const depForm = reactive({ depends_on_task_id: '' as number | '', dep_type: 'FS' })
const checkForm = ref('')
const commentText = ref('')
const projectLabels = ref<Label[]>([])
const taskLabels = ref<Label[]>([])
const selectedLabelId = ref<number | ''>('')
const newLabelName = ref('')
const newLabelColor = ref('#1677ff')
const projectAssets = ref<ProjectAsset[]>([])
const taskAssets = ref<TaskAsset[]>([])
const assetForm = reactive({ asset_id: '' as number | '', relation_type: 'input' })
const assetRelationOptions = [
  { label: '输入', value: 'input' },
  { label: '输出', value: 'output' },
  { label: '参考', value: 'reference' },
]
const importVisible = ref(false)
const importText = ref('')
const importing = ref(false)
const taskViewMode = ref<'list' | 'gantt'>('list')

const ganttTasks = computed(() =>
  tasks.value
    .filter((t) => t.start_date && t.due_date)
    .slice()
    .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date))),
)

const ganttRange = computed(() => {
  if (ganttTasks.value.length === 0) {
    return { start: new Date(), end: new Date() }
  }
  const starts = ganttTasks.value.map((t) => parseGanttDate(t.start_date!).getTime())
  const ends = ganttTasks.value.map((t) => parseGanttDate(t.due_date!).getTime())
  const day = 86400000
  return {
    start: new Date(Math.min(...starts) - day),
    end: new Date(Math.max(...ends) + day),
  }
})

function parseGanttDate(value: string | Date) {
  if (value instanceof Date) return value
  const raw = String(value).slice(0, 10)
  return new Date(`${raw}T00:00:00`)
}

function formatGanttDate(value?: string | Date) {
  if (!value) return '-'
  return parseGanttDate(value).toLocaleDateString()
}

function ganttBarStyle(task: Task) {
  const day = 86400000
  const start = parseGanttDate(task.start_date!).getTime()
  const end = parseGanttDate(task.due_date!).getTime()
  const rangeStart = ganttRange.value.start.getTime()
  const rangeEnd = ganttRange.value.end.getTime()
  const total = Math.max(day, rangeEnd - rangeStart)
  const left = ((start - rangeStart) / total) * 100
  const width = Math.max(2, ((end - start + day) / total) * 100)
  return {
    left: `${Math.max(0, Math.min(98, left))}%`,
    width: `${Math.min(100 - Math.max(0, Math.min(98, left)), width)}%`,
  }
}

const statusOptions = [
  { label: 'todo', value: 'todo' },
  { label: 'doing', value: 'doing' },
  { label: 'blocked', value: 'blocked' },
  { label: 'review', value: 'review' },
  { label: 'done', value: 'done' },
]
const typeOptions = [
  { label: 'feature', value: 'feature' },
  { label: 'refactor', value: 'refactor' },
  { label: 'test', value: 'test' },
  { label: 'docs', value: 'docs' },
  { label: 'ops', value: 'ops' },
  { label: 'migration', value: 'migration' },
]
const priorityOptions = [
  { label: 'P0', value: 'P0' },
  { label: 'P1', value: 'P1' },
  { label: 'P2', value: 'P2' },
  { label: 'P3', value: 'P3' },
]
const depTypeOptions = [
  { label: 'FS', value: 'FS' },
  { label: 'SS', value: 'SS' },
  { label: 'FF', value: 'FF' },
  { label: 'SF', value: 'SF' },
]
const milestoneOptions = computed(() => milestones.value.map((m) => ({ label: `${m.version} ${m.name}`, value: m.id })))
const dependencyOptions = computed(() =>
  tasks.value.filter((t) => t.id !== currentTask.value?.id).map((t) => ({ label: `${t.code} ${t.title}`, value: t.id })),
)
const availableLabelOptions = computed(() => {
  const attached = new Set(taskLabels.value.map((l) => l.id))
  return projectLabels.value.filter((l) => !attached.has(l.id)).map((l) => ({ label: l.name, value: l.id }))
})
const assetOptions = computed(() =>
  projectAssets.value.map((a) => ({ label: `${a.title || a.uri || a.id} (${a.category})`, value: a.id })),
)

function assetName(id: number) {
  const asset = projectAssets.value.find((a) => a.id === id)
  return asset ? asset.title || asset.uri || `#${id}` : `#${id}`
}

function progressOf(id: number) {
  return progressMap.value[id]?.percent || 0
}

function milestoneType(status: string) {
  if (status === 'done') return 'success'
  if (status === 'active') return 'primary'
  if (status === 'blocked') return 'warning'
  return 'neutral'
}

function taskType(status: string) {
  if (status === 'done') return 'success'
  if (status === 'doing') return 'primary'
  if (status === 'blocked') return 'warning'
  if (status === 'review') return 'accent'
  return 'neutral'
}

function taskCode(id: number) {
  return tasks.value.find((t) => t.id === id)?.code || String(id)
}

async function load() {
  loading.value = true
  try {
    const [dash, ms, labels, assets] = await Promise.all([
      getDashboard(props.project.id),
      listMilestones(props.project.id, { page: 1, page_size: 100 }),
      listLabels(props.project.id),
      listAssets(props.project.id, { page: 1, page_size: 100 }),
    ])
    dashboard.value = dash.data
    milestones.value = ms.data.items || []
    projectLabels.value = labels.data.items || []
    projectAssets.value = assets.data.items || []
    progressMap.value = {}
    await Promise.all(milestones.value.map(async (m) => {
      const p = await getMilestoneProgress(m.id)
      progressMap.value[m.id] = p.data
    }))
    await loadTasks()
  } catch (err: any) {
    NKMessage.error(err.message || '加载项目任务失败')
  } finally {
    loading.value = false
  }
}

async function loadTasks() {
  tasksLoading.value = true
  try {
    const res = await listTasks(props.project.id, {
      page: 1,
      page_size: 100,
      status: filterStatus.value || undefined,
      milestone_id: filterMilestone.value || undefined,
    })
    tasks.value = res.data.items || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载任务失败')
  } finally {
    tasksLoading.value = false
  }
}

async function saveMilestone() {
  if (!milestoneForm.version.trim() || !milestoneForm.name.trim()) {
    NKMessage.warning('版本和名称不能为空')
    return
  }
  saving.value = true
  try {
    await createMilestone(props.project.id, {
      version: milestoneForm.version,
      name: milestoneForm.name,
      status: 'planned',
      target_date: milestoneForm.target_date || undefined,
    })
    NKMessage.success('里程碑已创建')
    showMilestoneForm.value = false
    milestoneForm.version = ''
    milestoneForm.name = ''
    await load()
  } catch (err: any) {
    NKMessage.error(err.message || '创建里程碑失败')
  } finally {
    saving.value = false
  }
}

async function saveTask() {
  if (!taskForm.title.trim()) {
    NKMessage.warning('任务标题不能为空')
    return
  }
  saving.value = true
  try {
    await createTask(props.project.id, {
      code: taskForm.code || undefined,
      title: taskForm.title,
      milestone_id: taskForm.milestone_id || undefined,
      type: taskForm.type,
      priority: taskForm.priority,
      estimate_hours: Number(taskForm.estimate_hours) || 0,
      owner: taskForm.owner,
      start_date: taskForm.start_date || undefined,
      due_date: taskForm.due_date || undefined,
      status: 'todo',
    })
    NKMessage.success('任务已创建')
    showTaskForm.value = false
    taskForm.code = ''
    taskForm.title = ''
    taskForm.estimate_hours = 0
    taskForm.start_date = ''
    taskForm.due_date = ''
    await load()
  } catch (err: any) {
    NKMessage.error(err.message || '创建任务失败')
  } finally {
    saving.value = false
  }
}

async function changeStatus(task: Task, status: string) {
  try {
    await changeTaskStatus(task.id, { status })
    NKMessage.success('状态已更新')
    await load()
    if (currentTask.value && currentTask.value.id === task.id) {
      currentTask.value = { ...currentTask.value, status }
      await loadTaskDetail(task.id)
    }
  } catch (err: any) {
    NKMessage.error(err.message || '状态更新失败')
  }
}

async function openTask(task: Task) {
  currentTask.value = task
  taskPlan.start_date = task.start_date ? String(task.start_date).slice(0, 10) : ''
  taskPlan.due_date = task.due_date ? String(task.due_date).slice(0, 10) : ''
  drawerVisible.value = true
  await loadTaskDetail(task.id)
}

async function saveTaskPlan() {
  if (!currentTask.value) return
  try {
    await updateTask(currentTask.value.id, {
      start_date: taskPlan.start_date || '',
      due_date: taskPlan.due_date || '',
    })
    currentTask.value = {
      ...currentTask.value,
      start_date: taskPlan.start_date || undefined,
      due_date: taskPlan.due_date || undefined,
    }
    NKMessage.success('计划日期已更新')
    await load()
  } catch (err: any) {
    NKMessage.error(err.message || '更新计划日期失败')
  }
}

async function loadTaskDetail(id: number) {
  try {
    const [l, d, c, cm, tl, ta] = await Promise.all([
      listTaskLogs(id, 100),
      listDependencies(id),
      listChecklist(id),
      listTaskComments(id),
      listTaskLabels(id),
      listTaskAssets(id),
    ])
    logs.value = l.data.items || []
    deps.value = d.data.items || []
    checklist.value = c.data.items || []
    comments.value = cm.data.items || []
    taskLabels.value = tl.data.items || []
    taskAssets.value = ta.data.items || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载任务详情失败')
  }
}

async function saveLog() {
  if (!currentTask.value) return
  try {
    await addTaskLog(currentTask.value.id, { hours: Number(logForm.hours) || 0, note: logForm.note })
    logForm.note = ''
    await loadTaskDetail(currentTask.value.id)
    await load()
  } catch (err: any) {
    NKMessage.error(err.message || '添加日志失败')
  }
}

async function saveDependency() {
  if (!currentTask.value || !depForm.depends_on_task_id) {
    NKMessage.warning('请选择依赖任务')
    return
  }
  try {
    await addDependency(currentTask.value.id, {
      depends_on_task_id: depForm.depends_on_task_id,
      dep_type: depForm.dep_type,
    })
    await loadTaskDetail(currentTask.value.id)
  } catch (err: any) {
    NKMessage.error(err.message || '添加依赖失败')
  }
}

async function removeDep(id: number) {
  if (!currentTask.value) return
  try {
    await removeDependency(currentTask.value.id, id)
    await loadTaskDetail(currentTask.value.id)
  } catch (err: any) {
    NKMessage.error(err.message || '移除依赖失败')
  }
}

async function saveCheck() {
  if (!currentTask.value || !checkForm.value.trim()) return
  try {
    await createChecklistItem(currentTask.value.id, { title: checkForm.value })
    checkForm.value = ''
    await loadTaskDetail(currentTask.value.id)
  } catch (err: any) {
    NKMessage.error(err.message || '添加检查项失败')
  }
}

async function toggleCheck(item: ChecklistItem, done: boolean) {
  try {
    await updateChecklistItem(item.id, { done })
    await loadTaskDetail(item.task_id)
  } catch (err: any) {
    NKMessage.error(err.message || '更新检查项失败')
  }
}

async function removeCheck(id: number) {
  if (!currentTask.value) return
  try {
    await deleteChecklistItem(id)
    await loadTaskDetail(currentTask.value.id)
  } catch (err: any) {
    NKMessage.error(err.message || '删除检查项失败')
  }
}

async function saveComment() {
  if (!currentTask.value || !commentText.value.trim()) return
  try {
    await addTaskComment(currentTask.value.id, commentText.value)
    commentText.value = ''
    await loadTaskDetail(currentTask.value.id)
  } catch (err: any) {
    NKMessage.error(err.message || '发送评论失败')
  }
}

async function createProjectLabel() {
  if (!newLabelName.value.trim()) {
    NKMessage.warning('标签名称不能为空')
    return
  }
  try {
    await createLabel(props.project.id, {
      name: newLabelName.value.trim(),
      color: newLabelColor.value || '#1677ff',
    })
    newLabelName.value = ''
    const labels = await listLabels(props.project.id)
    projectLabels.value = labels.data.items || []
    NKMessage.success('标签已创建')
  } catch (err: any) {
    NKMessage.error(err.message || '创建标签失败')
  }
}

async function deleteProjectLabel(label: Label) {
  if (!window.confirm(`确认删除标签「${label.name}」？`)) return
  try {
    await deleteLabel(label.id)
    projectLabels.value = projectLabels.value.filter((l) => l.id !== label.id)
    taskLabels.value = taskLabels.value.filter((l) => l.id !== label.id)
    NKMessage.success('标签已删除')
  } catch (err: any) {
    NKMessage.error(err.message || '删除标签失败')
  }
}

async function attachLabel(labelId: number | string) {
  if (!currentTask.value || !labelId) return
  try {
    await addTaskLabel(currentTask.value.id, Number(labelId))
    selectedLabelId.value = ''
    await loadTaskDetail(currentTask.value.id)
  } catch (err: any) {
    NKMessage.error(err.message || '添加标签失败')
  }
}

async function detachLabel(label: Label) {
  if (!currentTask.value) return
  try {
    await removeTaskLabel(currentTask.value.id, label.id)
    await loadTaskDetail(currentTask.value.id)
  } catch (err: any) {
    NKMessage.error(err.message || '移除标签失败')
  }
}

async function attachAsset() {
  if (!currentTask.value || !assetForm.asset_id) {
    NKMessage.warning('请选择项目资产')
    return
  }
  try {
    await addTaskAsset(currentTask.value.id, Number(assetForm.asset_id), assetForm.relation_type)
    assetForm.asset_id = ''
    await loadTaskDetail(currentTask.value.id)
  } catch (err: any) {
    NKMessage.error(err.message || '关联资产失败')
  }
}

async function detachAsset(asset: TaskAsset) {
  if (!currentTask.value) return
  try {
    await removeTaskAsset(currentTask.value.id, asset.asset_id)
    await loadTaskDetail(currentTask.value.id)
  } catch (err: any) {
    NKMessage.error(err.message || '移除资产失败')
  }
}

function openImport() {
  importText.value = ''
  importVisible.value = true
}

async function doImport() {
  let parsed: any
  try {
    parsed = JSON.parse(importText.value)
  } catch {
    NKMessage.error('JSON 格式不正确')
    return
  }
  const list = Array.isArray(parsed) ? parsed : parsed?.tasks
  if (!Array.isArray(list) || list.length === 0) {
    NKMessage.warning('请提供非空任务数组')
    return
  }
  importing.value = true
  try {
    const res = await importTasks(props.project.id, list)
    NKMessage.success(`导入完成：新增 ${res.data.created}，更新 ${res.data.updated}，跳过 ${res.data.skipped}`)
    importVisible.value = false
    await load()
  } catch (err: any) {
    NKMessage.error(err.message || '导入任务失败')
  } finally {
    importing.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.v3pm {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.v3pm-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.v3pm-summary {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--nk-text-color-secondary, #666);
}
.v3pm-card {
  padding: 16px;
}
.v3pm-card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  margin-bottom: 12px;
}
.v3pm-inline {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.v3pm-form-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.v3pm-form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}
.v3pm-milestones {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.v3pm-milestone {
  border: 1px solid var(--nk-border-color, #eee);
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
}
.v3pm-milestone-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.v3pm-milestone-name {
  font-size: 13px;
  margin: 6px 0;
}
.v3pm-progress {
  height: 6px;
  border-radius: 3px;
  background: var(--nk-fill-color, #f0f0f0);
  overflow: hidden;
}
.v3pm-progress span {
  display: block;
  height: 100%;
  background: var(--nk-color-primary-500, #1677ff);
}
.v3pm-table-wrap {
  overflow-x: auto;
}
.v3pm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.v3pm-table th,
.v3pm-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--nk-border-color, #eee);
  text-align: left;
  white-space: nowrap;
}
.v3pm-code {
  font-family: var(--nk-font-family-mono, monospace);
  font-size: 12px;
  color: var(--nk-text-color-secondary, #888);
}
.v3pm-title {
  cursor: pointer;
}
.v3pm-muted {
  color: var(--nk-text-color-secondary, #888);
  font-size: 13px;
}
.v3pm-drawer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.v3pm-drawer-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.v3pm-drawer-title {
  margin: 4px 0 0;
}
.v3pm-drawer-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.v3pm-section {
  border-top: 1px solid var(--nk-border-color, #eee);
  padding-top: 12px;
}
.v3pm-section-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.v3pm-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  font-size: 13px;
}
.v3pm-comment {
  padding: 6px 0;
  font-size: 13px;
}
.v3pm-done {
  text-decoration: line-through;
  color: var(--nk-text-color-secondary, #888);
}
.v3pm-gantt {
  border: 1px solid var(--nk-border-color, #eee);
  border-radius: 8px;
  overflow: hidden;
}
.v3pm-gantt__head {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--nk-text-color-secondary, #888);
  background: var(--nk-fill-color, #f7f8fa);
}
.v3pm-gantt__row {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  border-top: 1px solid var(--nk-border-color, #f0f0f0);
}
.v3pm-gantt__label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  cursor: pointer;
  border-right: 1px solid var(--nk-border-color, #f0f0f0);
  min-width: 0;
}
.v3pm-gantt__title {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.v3pm-gantt__track {
  position: relative;
  min-height: 40px;
  background-image: linear-gradient(to right, var(--nk-border-color, #f5f5f5) 1px, transparent 1px);
  background-size: 8.333% 100%;
}
.v3pm-gantt__bar {
  position: absolute;
  top: 10px;
  height: 20px;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 20px;
  color: #fff;
  background: #1677ff;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-sizing: border-box;
}
.v3pm-gantt__bar--done,
.v3pm-gantt__bar--blocked,
.v3pm-gantt__bar--todo {
  color: #14231a;
}
.v3pm-gantt__bar--done {
  background: #52c41a;
}
.v3pm-gantt__bar--doing {
  background: #1677ff;
}
.v3pm-gantt__bar--blocked {
  background: #faad14;
}
.v3pm-gantt__bar--review {
  background: #722ed1;
}
.v3pm-gantt__bar--todo {
  background: #8c8c8c;
}
.v3pm-gantt__hint {
  padding: 8px 12px;
  border-top: 1px solid var(--nk-border-color, #f0f0f0);
}
@media (max-width: 900px) {
  .v3pm-form-grid {
    grid-template-columns: 1fr 1fr;
  }
  .v3pm-gantt__row {
    grid-template-columns: 160px minmax(0, 1fr);
  }
}
</style>
