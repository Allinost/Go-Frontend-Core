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
        <span>任务</span>
        <div class="v3pm-inline">
          <NkSelect v-model="filterStatus" :options="statusOptions" placeholder="状态" clearable size="sm" style="width: 130px" @change="loadTasks" />
          <NkSelect v-model="filterMilestone" :options="milestoneOptions" placeholder="里程碑" clearable size="sm" style="width: 150px" @change="loadTasks" />
          <NkButton size="sm" @click="showTaskForm = !showTaskForm">新建任务</NkButton>
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
        <NkButton size="sm" type="primary" :loading="saving" @click="saveTask">保存任务</NkButton>
      </div>
      <NkLoading v-if="tasksLoading" />
      <div v-else-if="tasks.length === 0" class="v3pm-muted">暂无任务</div>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import type { Project } from '@/types/developmentManager'
import type { Milestone, Task, TaskDependency, TaskLog, ChecklistItem, Comment, MilestoneProgress, ProjectDashboard } from '@/types/developmentManager'
import {
  addDependency,
  addTaskComment,
  addTaskLog,
  changeTaskStatus,
  createChecklistItem,
  createMilestone,
  createTask,
  deleteChecklistItem,
  getDashboard,
  getMilestoneProgress,
  listChecklist,
  listDependencies,
  listMilestones,
  listTaskComments,
  listTaskLogs,
  listTasks,
  removeDependency,
  updateChecklistItem,
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
  estimate_hours: 0, owner: '',
})

const drawerVisible = ref(false)
const currentTask = ref<Task | null>(null)
const logs = ref<TaskLog[]>([])
const deps = ref<TaskDependency[]>([])
const checklist = ref<ChecklistItem[]>([])
const comments = ref<Comment[]>([])
const logForm = reactive({ hours: 1, note: '' })
const depForm = reactive({ depends_on_task_id: '' as number | '', dep_type: 'FS' })
const checkForm = ref('')
const commentText = ref('')

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
    const [dash, ms] = await Promise.all([
      getDashboard(props.project.id),
      listMilestones(props.project.id, { page: 1, page_size: 100 }),
    ])
    dashboard.value = dash.data
    milestones.value = ms.data.items || []
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
      status: 'todo',
    })
    NKMessage.success('任务已创建')
    showTaskForm.value = false
    taskForm.code = ''
    taskForm.title = ''
    taskForm.estimate_hours = 0
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
  drawerVisible.value = true
  await loadTaskDetail(task.id)
}

async function loadTaskDetail(id: number) {
  try {
    const [l, d, c, cm] = await Promise.all([
      listTaskLogs(id, 100),
      listDependencies(id),
      listChecklist(id),
      listTaskComments(id),
    ])
    logs.value = l.data.items || []
    deps.value = d.data.items || []
    checklist.value = c.data.items || []
    comments.value = cm.data.items || []
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
@media (max-width: 900px) {
  .v3pm-form-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
