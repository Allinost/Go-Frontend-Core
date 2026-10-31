<template>
  <div class="l3-page">
    <div class="l3-page__header">
      <h2 class="l3-page__title">第三方登录管理</h2>
    </div>

    <NkTabs v-model="activeTab" :items="tabs" @change="onTabChange" />

    <!-- Tab: 账号管理 -->
    <div v-show="activeTab === 'accounts'" class="l3-page__tab-content">
      <div class="l3-page__toolbar">
        <NkSelect v-model="filterPlatform" placeholder="全部平台" :options="platformOptions" clearable style="width: 180px" @change="loadAccounts" />
        <NkButton size="sm" variant="ghost" @click="loadAccounts">刷新</NkButton>
        <div class="l3-page__spacer" />
        <NkButton size="sm" @click="showCreateDialog">新增账号</NkButton>
      </div>

      <NkLoading v-if="loading" />
      <NkEmpty v-else-if="!accounts.length" description="暂无账号，点击右上角添加" />

      <table v-else class="l3-table">
        <thead>
          <tr>
            <th>标签</th>
            <th>平台</th>
            <th>用户名</th>
            <th>登录状态</th>
            <th>过期时间</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="acc in accounts" :key="acc.id">
            <td><span class="l3-table__label">{{ acc.label }}</span></td>
            <td><NkTag size="xs">{{ acc.platform_name || acc.platform_id }}</NkTag></td>
            <td>{{ acc.username }}</td>
            <td>
              <NkTag v-if="statusMap[acc.id] === 'valid'" type="success" size="xs">有效</NkTag>
              <NkTag v-else-if="statusMap[acc.id] === 'expired'" type="warning" size="xs">已过期</NkTag>
              <NkTag v-else-if="statusMap[acc.id] === 'error'" type="danger" size="xs">异常</NkTag>
              <NkTag v-else size="xs" variant="outline">未登录</NkTag>
            </td>
            <td class="l3-table__time">{{ expiresMap[acc.id] || '-' }}</td>
            <td class="l3-table__time">{{ formatDate(acc.created_at) }}</td>
            <td>
              <div class="l3-table__actions">
                <NkButton size="xs" variant="ghost" @click="viewStatus(acc)">状态</NkButton>
                <NkButton size="xs" variant="ghost" @click="startRemoteLogin(acc)">远程登录</NkButton>
                <NkButton v-if="autoPlatforms.has(acc.platform_id)" size="xs" variant="ghost" :loading="autoLoginingId === acc.id" @click="handleAutoLogin(acc)">自动登录</NkButton>
                <NkButton size="xs" variant="ghost" @click="handleRefresh(acc)">刷新</NkButton>
                <NkButton size="xs" variant="ghost" :loading="verifyingId === acc.id" @click="handleVerify(acc)">验证</NkButton>
                <NkButton size="xs" variant="ghost" @click="openEditDialog(acc)">编辑</NkButton>
                <NkButton size="xs" variant="ghost" type="danger" @click="confirmDelete(acc)">删除</NkButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="total > pageSize" class="l3-page__pagination">
        <span class="l3-page__pagination-info">共 {{ total }} 条</span>
        <NkPagination v-model="currentPage" :total="total" :page-size="pageSize" @change="loadAccounts" />
      </div>
    </div>

    <!-- Tab: 定时任务 -->
    <div v-show="activeTab === 'tasks'" class="l3-page__tab-content">
      <div class="l3-page__toolbar">
        <NkButton size="sm" variant="ghost" :loading="tasksLoading" @click="loadTasks">刷新</NkButton>
        <NkButton size="sm" variant="ghost" @click="goToScheduler">全部任务 →</NkButton>
      </div>

      <NkLoading v-if="tasksLoading" />
      <NkEmpty v-else-if="!tasks.length" description="暂无定时任务" />

      <table v-else class="l3-table">
        <thead>
          <tr>
            <th>任务名称</th>
            <th>处理器</th>
            <th>间隔</th>
            <th>状态</th>
            <th>上次执行</th>
            <th>下次执行</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in tasks" :key="task.id">
            <td>{{ task.name }}</td>
            <td><NkTag size="xs">{{ task.handler }}</NkTag></td>
            <td>{{ task.interval || task.expression || task.type }}</td>
            <td>
              <NkTag v-if="task.status === 'active'" type="success" size="xs">运行中</NkTag>
              <NkTag v-else-if="task.status === 'paused'" type="warning" size="xs">已暂停</NkTag>
              <NkTag v-else size="xs" variant="outline">已停用</NkTag>
            </td>
            <td class="l3-table__time">{{ formatDate(task.last_run_at) }}</td>
            <td class="l3-table__time">{{ formatDate(task.next_run_at) }}</td>
            <td>
              <div class="l3-table__actions">
                <NkButton size="xs" variant="ghost" :loading="runningTaskId === task.id" @click="handleRunTask(task)">立即执行</NkButton>
                <NkButton v-if="task.status === 'active'" size="xs" variant="ghost" :loading="pausingTaskId === task.id" @click="handlePauseTask(task)">暂停</NkButton>
                <NkButton v-else size="xs" variant="ghost" :loading="resumingTaskId === task.id" @click="handleResumeTask(task)">恢复</NkButton>
                <NkButton size="xs" variant="ghost" @click="showTaskLogs(task)">日志</NkButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Dialogs -->
    <NkDialog v-model:visible="showFormDialog" :title="editingAccount ? '编辑账号' : '新增账号'" :width="520">
      <div class="l3-form">
        <div class="l3-form__field">
          <label class="l3-form__label">平台 *</label>
          <NkSelect v-model="form.platform_id" :options="platformOptions" :disabled="!!editingAccount" placeholder="选择平台" @change="onPlatformChange" />
        </div>
        <div class="l3-form__field">
          <label class="l3-form__label">标签 *</label>
          <NkInput v-model="form.label" placeholder="如：我的京东主号" />
        </div>
        <div class="l3-form__field">
          <label class="l3-form__label">用户名 *</label>
          <NkInput v-model="form.username" placeholder="手机号 / 邮箱" />
        </div>
        <div class="l3-form__field">
          <label class="l3-form__label">密码 <span v-if="editingAccount" class="l3-form__hint">（留空不修改）</span></label>
          <NkInput v-model="form.password" type="password" :placeholder="editingAccount ? '留空不修改' : '请输入密码'" />
        </div>
        <div class="l3-form__field">
          <label class="l3-form__label">Webhook</label>
          <NkSelect v-model="form.webhook_ids" multiple :options="webhookOptions" placeholder="选择 webhook" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showFormDialog = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!form.platform_id || !form.label" @click="handleSave">保存</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="showStatusDialog" title="账号状态" :width="480">
      <div v-if="currentStatus" class="l3-status">
        <div class="l3-status__row">
          <span class="l3-status__label">账号</span>
          <span>{{ currentStatus.account.label }} ({{ currentStatus.account.username }})</span>
        </div>
        <div class="l3-status__row">
          <span class="l3-status__label">平台</span>
          <span>{{ currentStatus.platform.name }}</span>
        </div>
        <div class="l3-status__row">
          <span class="l3-status__label">Session</span>
          <NkTag v-if="currentStatus.session_valid" type="success" size="xs">有效</NkTag>
          <NkTag v-else type="warning" size="xs">无效</NkTag>
        </div>
        <div class="l3-status__row">
          <span class="l3-status__label">过期时间</span>
          <span>{{ currentStatus.session_expires_in || '-' }}</span>
        </div>
        <div class="l3-status__row">
          <span class="l3-status__label">自动登录</span>
          <span>{{ currentStatus.can_auto_login ? '支持' : '不支持' }}</span>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showStatusDialog = false">关闭</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="showDeleteDialog" title="确认删除" :width="400">
      <p>确定要删除账号 <strong>{{ deletingAccount?.label }}</strong> 吗？</p>
      <template #footer>
        <NkButton variant="ghost" @click="showDeleteDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="deleting" @click="handleDelete">确认删除</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="showTaskLogDialog" :title="'任务日志 - ' + (viewingTask?.name || '')" :width="640">
      <NkLoading v-if="logsLoading" />
      <div v-else-if="!taskLogs.length" class="l3-page__empty-logs">暂无执行日志</div>
      <table v-else class="l3-table">
        <thead>
          <tr>
            <th>状态</th>
            <th>消息</th>
            <th>开始时间</th>
            <th>耗时</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in taskLogs" :key="log.id">
            <td>
              <NkTag v-if="log.status === 'success'" type="success" size="xs">成功</NkTag>
              <NkTag v-else-if="log.status === 'failed'" type="danger" size="xs">失败</NkTag>
              <NkTag v-else size="xs" variant="outline">运行中</NkTag>
            </td>
            <td>{{ log.message || log.error || '-' }}</td>
            <td class="l3-table__time">{{ formatDate(log.started_at) }}</td>
            <td>{{ logDuration(log) }}</td>
          </tr>
        </tbody>
      </table>
      <template #footer>
        <NkButton variant="ghost" @click="showTaskLogDialog = false">关闭</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  listPlatforms,
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountStatus,
  autoLogin,
  refreshSession,
  verifySession,
  listSchedulerTasks,
  runSchedulerTask,
  pauseSchedulerTask,
  resumeSchedulerTask,
  getSchedulerTaskLogs,
} from '@/api/login3rd'
import type {
  Login3rdPlatform,
  Login3rdAccount,
  AccountStatus,
  SchedulerTask,
  SchedulerTaskLog,
} from '@/types/login3rd'
import type { WebhookConfig } from '@/types/webhook'
import { listConfigs as listWebhooks } from '@/api/webhook'
import { NKMessage } from '@nkui/vue/src/utils/message'

const router = useRouter()
const activeTab = ref('accounts')
const tabs = [
  { label: '账号管理', value: 'accounts' },
  { label: '定时任务', value: 'tasks' },
]

function onTabChange(value: string | number) {
  activeTab.value = value as string
  if (activeTab.value === 'tasks') loadTasks()
}

// ---- Account List ----
const loading = ref(false)
const accounts = ref<Login3rdAccount[]>([])
const platforms = ref<Login3rdPlatform[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const filterPlatform = ref('')
const statusMap = ref<Record<string, string>>({})
const expiresMap = ref<Record<string, string>>({})

const autoPlatforms = computed(() => new Set(platforms.value.filter(p => p.has_auto).map(p => p.id)))
const platformOptions = computed(() => platforms.value.map(p => ({ label: p.name, value: p.id })))
const webhookOptions = ref<{ label: string; value: string }[]>([])

// ---- Form Dialog ----
const showFormDialog = ref(false)
const editingAccount = ref<Login3rdAccount | null>(null)
const saving = ref(false)
const form = reactive({
  platform_id: '',
  label: '',
  username: '',
  password: '',
  webhook_ids: [] as string[],
})

// ---- Status Dialog ----
const showStatusDialog = ref(false)
const currentStatus = ref<AccountStatus | null>(null)

// ---- Delete Dialog ----
const showDeleteDialog = ref(false)
const deletingAccount = ref<Login3rdAccount | null>(null)
const deleting = ref(false)

// ---- Auto Login ----
const autoLoginingId = ref('')
const verifyingId = ref('')

// ---- Scheduler Tasks ----
const tasksLoading = ref(false)
const tasks = ref<SchedulerTask[]>([])
const runningTaskId = ref('')
const pausingTaskId = ref('')
const resumingTaskId = ref('')

// ---- Task Log Dialog ----
const showTaskLogDialog = ref(false)
const viewingTask = ref<SchedulerTask | null>(null)
const taskLogs = ref<SchedulerTaskLog[]>([])
const logsLoading = ref(false)

async function loadPlatforms() {
  try {
    const res = await listPlatforms()
    platforms.value = res.data
  } catch {
    // silent
  }
}

async function loadWebhooks() {
  try {
    const res = await listWebhooks({ page_size: 200 })
    const items = res.data.items || []
    webhookOptions.value = items.map((w: WebhookConfig) => ({ label: w.name, value: w._id }))
  } catch {
    // silent
  }
}

async function loadAccounts() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: currentPage.value, page_size: pageSize.value }
    if (filterPlatform.value) params.platform_id = filterPlatform.value
    const res = await listAccounts(params)
    accounts.value = res.data.items
    total.value = res.data.total

    for (const acc of accounts.value) {
      getAccountStatus(acc.id).then(s => {
        statusMap.value[acc.id] = s.data.session_valid ? 'valid' : 'expired'
        expiresMap.value[acc.id] = s.data.session_expires_in
      }).catch(() => {
        statusMap.value[acc.id] = 'error'
      })
    }
  } catch (err: any) {
    NKMessage.error(err.message || '加载账号列表失败')
  } finally {
    loading.value = false
  }
}

async function loadTasks() {
  tasksLoading.value = true
  try {
    const res = await listSchedulerTasks()
    const list = Array.isArray(res.data) ? res.data : ((res.data as any)?.items || [])
    tasks.value = list.filter((t: SchedulerTask) =>
      t.handler?.startsWith('login3rd'),
    )
  } catch (err: any) {
    NKMessage.error(err.message || '加载任务列表失败')
  } finally {
    tasksLoading.value = false
  }
}

function goToScheduler() {
  router.push('/modules/schedule')
}

function showCreateDialog() {
  editingAccount.value = null
  form.platform_id = ''
  form.label = ''
  form.username = ''
  form.password = ''
  form.webhook_ids = []
  showFormDialog.value = true
}

function openEditDialog(acc: Login3rdAccount) {
  editingAccount.value = acc
  form.platform_id = acc.platform_id
  form.label = acc.label
  form.username = acc.username
  form.password = ''
  form.webhook_ids = [...(acc.webhook_ids || [])]
  showFormDialog.value = true
}

function onPlatformChange(pid: string) {
  const p = platforms.value.find(x => x.id === pid)
  if (p?.form_config?.auto_fields?.length) {
    const auto = p.form_config.auto_fields[0]
    if (auto.value && !form.username) {
      form.username = auto.value
    }
  }
}

async function handleSave() {
  saving.value = true
  try {
    if (editingAccount.value) {
      const payload: Record<string, any> = {
        label: form.label,
        username: form.username,
        webhook_ids: form.webhook_ids,
      }
      if (form.password) payload.password = form.password
      await updateAccount(editingAccount.value.id, payload)
      NKMessage.success('更新成功')
    } else {
      await createAccount({
        platform_id: form.platform_id,
        label: form.label,
        username: form.username,
        password: form.password,
        webhook_ids: form.webhook_ids,
      })
      NKMessage.success('创建成功')
    }
    showFormDialog.value = false
    loadAccounts()
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function viewStatus(acc: Login3rdAccount) {
  try {
    const res = await getAccountStatus(acc.id)
    currentStatus.value = res.data
    showStatusDialog.value = true
  } catch (err: any) {
    NKMessage.error(err.message || '获取状态失败')
  }
}

function startRemoteLogin(acc: Login3rdAccount) {
  router.push({ name: 'Login3rdRemote', params: { id: acc.id } })
}

async function handleAutoLogin(acc: Login3rdAccount) {
  autoLoginingId.value = acc.id
  try {
    await autoLogin(acc.id)
    NKMessage.success('自动登录成功')
    loadAccounts()
  } catch (err: any) {
    NKMessage.error(err.message || '自动登录失败')
  } finally {
    autoLoginingId.value = ''
  }
}

async function handleRefresh(acc: Login3rdAccount) {
  try {
    await refreshSession(acc.id)
    NKMessage.success('Session 已刷新')
    loadAccounts()
  } catch (err: any) {
    NKMessage.error(err.message || '刷新失败')
  }
}

async function handleVerify(acc: Login3rdAccount) {
  verifyingId.value = acc.id
  try {
    const res = await verifySession(acc.id)
    if (res.data.valid) {
      NKMessage.success('Session 有效')
    } else {
      NKMessage.warning('Session 已失效，请重新登录')
    }
    loadAccounts()
  } catch (err: any) {
    NKMessage.error(err.message || '验证失败')
  } finally {
    verifyingId.value = ''
  }
}

function confirmDelete(acc: Login3rdAccount) {
  deletingAccount.value = acc
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingAccount.value) return
  deleting.value = true
  try {
    await deleteAccount(deletingAccount.value.id)
    NKMessage.success('删除成功')
    showDeleteDialog.value = false
    loadAccounts()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

async function handleRunTask(task: SchedulerTask) {
  runningTaskId.value = task.id
  try {
    await runSchedulerTask(task.id)
    NKMessage.success('任务已触发')
    loadTasks()
  } catch (err: any) {
    NKMessage.error(err.message || '执行失败')
  } finally {
    runningTaskId.value = ''
  }
}

async function handlePauseTask(task: SchedulerTask) {
  pausingTaskId.value = task.id
  try {
    await pauseSchedulerTask(task.id)
    NKMessage.success('任务已暂停')
    loadTasks()
  } catch (err: any) {
    NKMessage.error(err.message || '暂停失败')
  } finally {
    pausingTaskId.value = ''
  }
}

async function handleResumeTask(task: SchedulerTask) {
  resumingTaskId.value = task.id
  try {
    await resumeSchedulerTask(task.id)
    NKMessage.success('任务已恢复')
    loadTasks()
  } catch (err: any) {
    NKMessage.error(err.message || '恢复失败')
  } finally {
    resumingTaskId.value = ''
  }
}

async function showTaskLogs(task: SchedulerTask) {
  viewingTask.value = task
  showTaskLogDialog.value = true
  logsLoading.value = true
  try {
    const res = await getSchedulerTaskLogs(task.id)
    taskLogs.value = res.data || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载日志失败')
  } finally {
    logsLoading.value = false
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function logDuration(log: SchedulerTaskLog): string {
  if (log.duration_ms) return `${log.duration_ms}ms`
  const end = log.ended_at || log.finished_at
  if (!log.started_at || !end) return '-'
  const ms = new Date(end).getTime() - new Date(log.started_at).getTime()
  return ms >= 0 ? `${ms}ms` : '-'
}

onMounted(() => {
  loadPlatforms()
  loadWebhooks()
  loadAccounts()
})
</script>

<style lang="scss" scoped>
.l3-page {
  max-width: 1200px;

  &__header {
    margin-bottom: $nk-spacing-lg;
  }

  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }

  &__tab-content {
    margin-top: $nk-spacing-lg;
  }

  &__toolbar {
    display: flex;
    gap: $nk-spacing-sm;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
  }

  &__spacer {
    flex: 1;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: $nk-spacing-md;
    margin-top: $nk-spacing-lg;
    padding: $nk-spacing-sm $nk-spacing-md;
  }

  &__pagination-info {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
  }

  &__empty-logs {
    padding: $nk-spacing-2xl;
    text-align: center;
    color: $nk-color-neutral-400;
  }
}

.l3-table {
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
    background: $nk-color-neutral-50;
    font-size: $nk-font-size-xs;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  td {
    color: $nk-color-neutral-700;
  }

  tbody tr:hover {
    background: $nk-color-neutral-50;
  }

  &__label {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-900;
  }

  &__time {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: $nk-font-size-xs;
  }

  &__actions {
    display: flex;
    gap: 2px;
    flex-wrap: nowrap;
  }
}

.l3-form {
  display: flex;
  flex-direction: column;
  gap: $nk-spacing-md;
  padding: $nk-spacing-sm 0;

  &__field {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;
  }

  &__label {
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
  }

  &__hint {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-400;
  }
}

.l3-status {
  display: flex;
  flex-direction: column;
  gap: $nk-spacing-md;

  &__row {
    display: flex;
    gap: $nk-spacing-md;
    font-size: $nk-font-size-sm;
    align-items: center;
  }

  &__label {
    width: 80px;
    color: $nk-color-neutral-500;
    flex-shrink: 0;
  }
}
</style>