<template>
  <div class="schedule">
    <div class="schedule__header">
      <h2 class="schedule__title">任务调度管理</h2>
      <NkButton @click="openCreateDialog">新建任务</NkButton>
    </div>

    <NkCard>
      <div class="schedule__toolbar">
        <NkInput
          v-model="search"
          placeholder="搜索任务名称..."
          clearable
          @clear="search = ''"
          @input="onSearch"
        />
        <NkSelect v-model="filterType" placeholder="任务类型" clearable @change="fetchTasks">
          <option value="cron">Cron</option>
          <option value="once">一次性</option>
          <option value="interval">间隔</option>
        </NkSelect>
        <NkSelect v-model="filterStatus" placeholder="状态" clearable @change="fetchTasks">
          <option value="active">运行中</option>
          <option value="paused">已暂停</option>
          <option value="finished">已完成</option>
        </NkSelect>
      </div>

      <NkLoading v-if="loading" />
      <div v-else>
        <table class="schedule__table" v-if="filteredTasks.length > 0">
          <thead>
            <tr>
              <th>任务名称</th>
              <th>类型</th>
              <th>表达式</th>
              <th>处理器</th>
              <th>状态</th>
              <th>上次执行</th>
              <th>下次执行</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in filteredTasks" :key="task.id">
              <td class="schedule__cell-name">{{ task.name }}</td>
              <td>
                <NkTag :color="typeColor(task.type)" size="sm">{{ typeLabel(task.type) }}</NkTag>
              </td>
              <td><code class="schedule__code">{{ task.expression }}</code></td>
              <td>{{ task.handler }}</td>
              <td>
                <NkTag :color="statusColor(task.status)" size="sm">{{ statusLabel(task.status) }}</NkTag>
              </td>
              <td class="schedule__cell-time">{{ task.last_run_at ? formatTime(task.last_run_at) : '--' }}</td>
              <td class="schedule__cell-time">{{ task.next_run_at ? formatTime(task.next_run_at) : '--' }}</td>
              <td>
                <div class="schedule__actions">
                  <NkButton v-if="task.status === 'active'" size="sm" @click="handlePause(task)">暂停</NkButton>
                  <NkButton v-if="task.status === 'paused'" size="sm" @click="handleResume(task)">恢复</NkButton>
                  <NkButton size="sm" @click="handleRun(task)">执行</NkButton>
                  <NkButton size="sm" @click="openEditDialog(task)">编辑</NkButton>
                  <NkButton size="sm" @click="handleDelete(task)">删除</NkButton>
                  <NkButton size="sm" @click="openLogDialog(task)">日志</NkButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <NkEmpty v-else description="暂无任务" />
      </div>
    </NkCard>

    <NkDialog v-model:visible="formDialog.visible" :title="formDialog.isEdit ? '编辑任务' : '新建任务'" width="560px">
      <div class="schedule__form">
        <div class="schedule__form-row">
          <label class="schedule__form-label">任务名称</label>
          <NkInput v-model="form.name" placeholder="输入任务名称" />
        </div>
        <div class="schedule__form-row">
          <label class="schedule__form-label">任务类型</label>
          <NkSelect v-model="form.type" @change="onTypeChange">
            <option value="cron">Cron 表达式</option>
            <option value="once">一次性</option>
            <option value="interval">间隔执行</option>
          </NkSelect>
        </div>
        <div class="schedule__form-row">
          <label class="schedule__form-label">
            {{ form.type === 'cron' ? 'Cron 表达式' : form.type === 'once' ? '执行时间' : '间隔(秒)' }}
          </label>
          <NkInput v-model="form.expression" :placeholder="expressionPlaceholder" />
        </div>
        <div class="schedule__form-row">
          <label class="schedule__form-label">处理器</label>
          <NkSelect v-model="form.handler">
            <option v-for="h in handlers" :key="h" :value="h">{{ h }}</option>
          </NkSelect>
        </div>
        <div class="schedule__form-row">
          <label class="schedule__form-label">Payload (JSON)</label>
          <textarea v-model="form.payloadStr" class="schedule__textarea" rows="4" placeholder='{"key": "value"}'></textarea>
        </div>
        <div class="schedule__form-row schedule__form-row--inline">
          <div class="schedule__form-field">
            <label class="schedule__form-label">最大重试</label>
            <NkInput v-model.number="form.max_retries" type="number" min="0" />
          </div>
          <div class="schedule__form-field">
            <label class="schedule__form-label">超时(秒)</label>
            <NkInput v-model.number="form.timeout" type="number" min="0" />
          </div>
        </div>
      </div>
      <template #footer>
        <NkButton @click="formDialog.visible = false">取消</NkButton>
        <NkButton type="primary" @click="submitForm" :loading="submitting">{{ formDialog.isEdit ? '保存' : '创建' }}</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="logDialog.visible" title="执行日志" width="800px">
      <NkLoading v-if="logDialog.loading" />
      <div v-else>
        <table class="schedule__table" v-if="logDialog.logs.length > 0">
          <thead>
            <tr>
              <th>状态</th>
              <th>开始时间</th>
              <th>结束时间</th>
              <th>耗时</th>
              <th>结果/错误</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logDialog.logs" :key="log.id">
              <td>
                <NkTag :color="logStatusColor(log.status)" size="sm">{{ logStatusLabel(log.status) }}</NkTag>
              </td>
              <td>{{ formatTime(log.started_at) }}</td>
              <td>{{ log.ended_at ? formatTime(log.ended_at) : '--' }}</td>
              <td>{{ log.ended_at ? calcDuration(log.started_at, log.ended_at) : '--' }}</td>
              <td class="schedule__cell-log">
                <span v-if="log.result" class="schedule__log-success">{{ log.result }}</span>
                <span v-else-if="log.error" class="schedule__log-error">{{ log.error }}</span>
                <span v-else>--</span>
              </td>
            </tr>
          </tbody>
        </table>
        <NkEmpty v-else description="暂无执行日志" />
      </div>
    </NkDialog>

    <NkPagination
      v-if="totalPages > 1"
      v-model="page"
      :total="tasks.length"
      :page-size="pageSize"
      @change="fetchTasks"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  pauseTask,
  resumeTask,
  runTask,
  getTaskLogs,
  listHandlers,
} from '@/api/schedule'
import type { Task, CreateTaskRequest, UpdateTaskRequest, TaskLog } from '@/api/schedule'

const loading = ref(false)
const submitting = ref(false)
const tasks = ref<Task[]>([])
const handlers = ref<string[]>([])
const search = ref('')
const filterType = ref('')
const filterStatus = ref('')
const page = ref(1)
const pageSize = 10

const filteredTasks = computed(() => {
  let list = tasks.value
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter((t) => t.name.toLowerCase().includes(q))
  }
  if (filterType.value) {
    list = list.filter((t) => t.type === filterType.value)
  }
  if (filterStatus.value) {
    list = list.filter((t) => t.status === filterStatus.value)
  }
  return list
})

const totalPages = computed(() => Math.ceil(tasks.value.length / pageSize))

const formDialog = reactive({
  visible: false,
  isEdit: false,
  editId: 0,
})

const defaultForm = () => ({
  name: '',
  type: 'cron' as 'cron' | 'once' | 'interval',
  expression: '',
  handler: '',
  payloadStr: '',
  max_retries: 0,
  timeout: 30,
})

const form = reactive({ ...defaultForm() })

const expressionPlaceholder = computed(() => {
  if (form.type === 'cron') return '* * * * *'
  if (form.type === 'once') return '2024-12-31 23:59:59'
  return '60'
})

const logDialog = reactive({
  visible: false,
  loading: false,
  logs: [] as TaskLog[],
})

onMounted(() => {
  fetchTasks()
  fetchHandlers()
})

async function fetchTasks() {
  loading.value = true
  try {
    const res = await listTasks()
    tasks.value = res.data ?? []
  } catch (e: any) {
    NKMessage.error(e.message || '获取任务列表失败')
  } finally {
    loading.value = false
  }
}

async function fetchHandlers() {
  try {
    const res = await listHandlers()
    handlers.value = res.data ?? []
  } catch {
    // ignore
  }
}

function onSearch() {
  page.value = 1
}

function typeColor(type: string): string {
  if (type === 'cron') return 'blue'
  if (type === 'once') return 'green'
  return 'orange'
}

function typeLabel(type: string): string {
  if (type === 'cron') return 'Cron'
  if (type === 'once') return '一次性'
  return '间隔'
}

function statusColor(status: string): string {
  if (status === 'active') return 'green'
  if (status === 'paused') return 'orange'
  return 'default'
}

function statusLabel(status: string): string {
  if (status === 'active') return '运行中'
  if (status === 'paused') return '已暂停'
  return '已完成'
}

function logStatusColor(status: string): string {
  if (status === 'success') return 'green'
  if (status === 'running') return 'blue'
  if (status === 'failed') return 'red'
  return 'orange'
}

function logStatusLabel(status: string): string {
  if (status === 'success') return '成功'
  if (status === 'running') return '运行中'
  if (status === 'failed') return '失败'
  return '超时'
}

function formatTime(t: string): string {
  const d = new Date(t)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function calcDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function onTypeChange() {
  if (form.type === 'cron') form.expression = ''
  else if (form.type === 'once') form.expression = ''
  else form.expression = '60'
}

function openCreateDialog() {
  formDialog.isEdit = false
  formDialog.editId = 0
  Object.assign(form, defaultForm())
  formDialog.visible = true
}

function openEditDialog(task: Task) {
  formDialog.isEdit = true
  formDialog.editId = task.id
  form.name = task.name
  form.type = task.type
  form.expression = task.expression
  form.handler = task.handler
  form.payloadStr = task.payload ? JSON.stringify(task.payload, null, 2) : ''
  form.max_retries = task.max_retries
  form.timeout = task.timeout
  formDialog.visible = true
}

async function submitForm() {
  if (!form.name || !form.expression || !form.handler) {
    NKMessage.warning('请填写必要字段')
    return
  }

  let payload: Record<string, any> | undefined
  if (form.payloadStr.trim()) {
    try {
      payload = JSON.parse(form.payloadStr)
    } catch {
      NKMessage.warning('Payload 不是合法的 JSON 格式')
      return
    }
  }

  const data: CreateTaskRequest & UpdateTaskRequest = {
    name: form.name,
    type: form.type,
    expression: form.expression,
    handler: form.handler,
    payload,
    max_retries: form.max_retries,
    timeout: form.timeout,
  }

  submitting.value = true
  try {
    if (formDialog.isEdit) {
      await updateTask(formDialog.editId, data)
      NKMessage.success('任务已更新')
    } else {
      await createTask(data)
      NKMessage.success('任务已创建')
    }
    formDialog.visible = false
    fetchTasks()
  } catch (e: any) {
    NKMessage.error(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function handlePause(task: Task) {
  try {
    await pauseTask(task.id)
    NKMessage.success('任务已暂停')
    fetchTasks()
  } catch (e: any) {
    NKMessage.error(e.message || '暂停失败')
  }
}

async function handleResume(task: Task) {
  try {
    await resumeTask(task.id)
    NKMessage.success('任务已恢复')
    fetchTasks()
  } catch (e: any) {
    NKMessage.error(e.message || '恢复失败')
  }
}

async function handleRun(task: Task) {
  try {
    const res = await runTask(task.id)
    NKMessage.success(res.data?.message || '任务已触发')
  } catch (e: any) {
    NKMessage.error(e.message || '执行失败')
  }
}

async function handleDelete(task: Task) {
  try {
    await deleteTask(task.id)
    NKMessage.success('任务已删除')
    fetchTasks()
  } catch (e: any) {
    NKMessage.error(e.message || '删除失败')
  }
}

async function openLogDialog(task: Task) {
  logDialog.visible = true
  logDialog.loading = true
  logDialog.logs = []
  try {
    const res = await getTaskLogs(task.id)
    logDialog.logs = res.data ?? []
  } catch (e: any) {
    NKMessage.error(e.message || '获取日志失败')
  } finally {
    logDialog.loading = false
  }
}
</script>

<style lang="scss" scoped>
.schedule {
  max-width: 1400px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-xl;
  }

  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }

  &__toolbar {
    display: flex;
    gap: $nk-spacing-md;
    margin-bottom: $nk-spacing-lg;
    flex-wrap: wrap;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: $nk-font-size-sm;

    th, td {
      text-align: left;
      padding: $nk-spacing-sm $nk-spacing-md;
      border-bottom: 1px solid $nk-color-neutral-200;
    }

    th {
      font-weight: $nk-font-weight-medium;
      color: $nk-color-neutral-500;
      white-space: nowrap;
    }

    td {
      color: $nk-color-neutral-800;
    }

    tbody tr:hover {
      background: $nk-color-neutral-50;
    }
  }

  &__cell-name {
    font-weight: $nk-font-weight-medium;
  }

  &__cell-time {
    white-space: nowrap;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__cell-log {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__code {
    background: $nk-color-neutral-100;
    padding: 2px 6px;
    border-radius: $nk-radius-sm;
    font-family: monospace;
    font-size: $nk-font-size-xs;
  }

  &__actions {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  &__log-success {
    color: $nk-color-success;
  }

  &__log-error {
    color: $nk-color-error;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }

  &__form-row {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;

    &--inline {
      flex-direction: row;
      gap: $nk-spacing-md;

      .schedule__form-field {
        flex: 1;
      }
    }
  }

  &__form-label {
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
  }

  &__textarea {
    width: 100%;
    padding: $nk-spacing-sm;
    border: 1px solid $nk-color-neutral-300;
    border-radius: $nk-radius-md;
    font-family: monospace;
    font-size: $nk-font-size-sm;
    resize: vertical;
    background: $nk-color-neutral-0;
    color: $nk-color-neutral-800;
    outline: none;
    transition: border-color $nk-duration-fast;

    &:focus {
      border-color: $nk-color-primary-500;
    }
  }
}
</style>
