<template>
  <div class="host-page">
    <div class="host-header">
      <div>
        <h2 class="host-title">主机台账</h2>
        <div class="host-muted">云服务器 / 主机 / 备份机；凭据加密保存，接口只回提示。</div>
      </div>
      <div class="host-actions">
        <NkButton size="sm" variant="ghost" :loading="loading" @click="load">刷新</NkButton>
        <NkButton size="sm" type="primary" @click="openCreate">新建主机</NkButton>
      </div>
    </div>

    <NkCard class="host-card">
      <div class="host-toolbar">
        <NkInput v-model="filters.keyword" placeholder="搜索名称/地址/备注" clearable size="sm" @clear="load" />
        <NkSelect v-model="filters.role" :options="roleOptions" placeholder="角色" clearable size="sm" style="width: 140px" @change="load" />
        <NkSelect v-model="filters.environment" :options="envOptions" placeholder="环境" clearable size="sm" style="width: 130px" @change="load" />
        <NkButton size="sm" @click="load">搜索</NkButton>
      </div>

      <NkLoading v-if="loading" />
      <div v-else-if="hosts.length === 0" class="host-muted">暂无主机</div>
      <div v-else class="host-table-wrap">
        <table class="host-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>角色</th>
              <th>环境</th>
              <th>地址</th>
              <th>SSH</th>
              <th>认证</th>
              <th>凭据</th>
              <th>状态</th>
              <th>最近检查</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="host in hosts" :key="host.id">
              <td class="host-name">{{ host.name }}</td>
              <td>{{ roleLabel(host.role) }}</td>
              <td>{{ host.environment }}</td>
              <td>{{ host.address }}:{{ host.ssh_port }}</td>
              <td>{{ host.username }}</td>
              <td>{{ host.auth_type }}</td>
              <td>{{ host.credential_hint || '-' }}</td>
              <td>
                <NkTag size="sm" :type="statusType(host.status)">{{ statusLabel(host.status) }}</NkTag>
              </td>
              <td>{{ formatTime(host.last_checked_at) }}</td>
              <td>
                <div class="host-row-actions">
                  <NkButton size="sm" variant="ghost" @click="openEdit(host)">编辑</NkButton>
                  <NkButton size="sm" variant="ghost" :loading="testingId === host.id" @click="test(host.id)">连通</NkButton>
                  <NkButton size="sm" variant="ghost" @click="status(host.id)">状态</NkButton>
                  <NkButton size="sm" variant="ghost" type="danger" @click="remove(host)">删除</NkButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </NkCard>

    <NkCard v-if="showForm" class="host-card">
      <div class="host-card-title">{{ editingId ? '编辑主机' : '新建主机' }}</div>
      <div class="host-form-grid">
        <label class="host-field">
          <span>名称</span>
          <NkInput v-model="form.name" placeholder="l1-host" />
        </label>
        <label class="host-field">
          <span>角色</span>
          <NkSelect v-model="form.role" :options="roleOptions" />
        </label>
        <label class="host-field">
          <span>环境</span>
          <NkSelect v-model="form.environment" :options="envOptions" />
        </label>
        <label class="host-field">
          <span>地址</span>
          <NkInput v-model="form.address" placeholder="10.144.144.10" />
        </label>
        <label class="host-field">
          <span>SSH 端口</span>
          <NkInput v-model.number="form.ssh_port" type="number" min="1" max="65535" />
        </label>
        <label class="host-field">
          <span>用户名</span>
          <NkInput v-model="form.username" placeholder="root" />
        </label>
        <label class="host-field">
          <span>认证方式</span>
          <NkSelect v-model="form.auth_type" :options="authOptions" />
        </label>
        <label class="host-field">
          <span>标签（逗号分隔）</span>
          <NkInput v-model="form.tagsText" placeholder="prod,nas" />
        </label>
        <label class="host-field host-field-wide">
          <span>{{ form.auth_type === 'key' ? '私钥（留空保持不变）' : '密码（留空保持不变）' }}</span>
          <textarea v-model="form.secret" class="host-textarea" rows="3" />
        </label>
        <label class="host-field host-field-wide">
          <span>备注</span>
          <textarea v-model="form.notes" class="host-textarea" rows="2" />
        </label>
      </div>
      <div class="host-form-actions">
        <NkButton size="sm" type="primary" :loading="saving" @click="save">保存</NkButton>
        <NkButton size="sm" variant="ghost" @click="closeForm">取消</NkButton>
      </div>
    </NkCard>

    <NkCard v-if="statusText" class="host-card">
      <div class="host-card-title">状态输出</div>
      <pre class="host-status">{{ statusText }}</pre>
    </NkCard>
  </div>
</template>

<script setup lang="ts">
import { confirmDialog } from '@/utils/confirm'
import { onMounted, reactive, ref } from 'vue'
import { NKMessage } from '@nkui/vue'
import {
  createHost,
  deleteHost,
  getHostStatus,
  listHosts,
  testHost,
  updateHost,
  type Host,
} from '@/api/ops'

const loading = ref(false)
const saving = ref(false)
const testingId = ref<number | null>(null)
const hosts = ref<Host[]>([])
const total = ref(0)
const showForm = ref(false)
const editingId = ref<number | null>(null)
const statusText = ref('')

const filters = reactive({ keyword: '', role: '', environment: '' })
const form = reactive({
  name: '',
  role: 'host',
  environment: 'prod',
  address: '',
  ssh_port: 22,
  username: 'root',
  auth_type: 'password',
  secret: '',
  tagsText: '',
  notes: '',
})

const roleOptions = [
  { label: 'L1 主机', value: 'host' },
  { label: 'L2 备份', value: 'backup' },
  { label: 'ACloud 云服务器', value: 'cloud' },
]
const envOptions = [
  { label: 'prod', value: 'prod' },
  { label: 'staging', value: 'staging' },
  { label: 'dev', value: 'dev' },
]
const authOptions = [
  { label: '密码', value: 'password' },
  { label: '私钥', value: 'key' },
]

function roleLabel(role: string) {
  const labels: Record<string, string> = { host: 'L1 主机', backup: 'L2 备份', cloud: 'ACloud' }
  return labels[role] || role
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { online: '在线', offline: '离线', error: '异常', unknown: '未知' }
  return labels[status] || status
}

function statusType(status: string) {
  if (status === 'online') return 'success'
  if (status === 'offline') return 'warning'
  if (status === 'error') return 'danger'
  return 'neutral'
}

function formatTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

async function load() {
  loading.value = true
  try {
    const res = await listHosts({
      page: 1,
      page_size: 100,
      keyword: filters.keyword || undefined,
      role: filters.role || undefined,
      environment: filters.environment || undefined,
    })
    hosts.value = res.data.items || []
    total.value = res.data.total || 0
  } catch (err: any) {
    NKMessage.error(err.message || '加载主机失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  Object.assign(form, {
    name: '', role: 'host', environment: 'prod', address: '', ssh_port: 22,
    username: 'root', auth_type: 'password', secret: '', tagsText: '', notes: '',
  })
  showForm.value = true
}

function openEdit(host: Host) {
  editingId.value = host.id
  Object.assign(form, {
    name: host.name,
    role: host.role,
    environment: host.environment,
    address: host.address,
    ssh_port: host.ssh_port,
    username: host.username,
    auth_type: host.auth_type,
    secret: '',
    tagsText: (host.tags || []).join(','),
    notes: host.notes,
  })
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
}

async function save() {
  if (!form.name.trim() || !form.address.trim()) {
    NKMessage.warning('名称和地址不能为空')
    return
  }
  saving.value = true
  const payload: Record<string, any> = {
    name: form.name.trim(),
    role: form.role,
    environment: form.environment,
    address: form.address.trim(),
    ssh_port: Number(form.ssh_port) || 22,
    username: form.username.trim(),
    auth_type: form.auth_type,
    tags: form.tagsText.split(',').map((x) => x.trim()).filter(Boolean),
    notes: form.notes,
    os: '',
  }
  if (form.secret) {
    if (form.auth_type === 'key') payload.private_key = form.secret
    else payload.password = form.secret
  }
  try {
    if (editingId.value) {
      await updateHost(editingId.value, payload)
      NKMessage.success('主机已更新')
    } else {
      await createHost(payload)
      NKMessage.success('主机已创建')
    }
    closeForm()
    await load()
  } catch (err: any) {
    NKMessage.error(err.message || '保存主机失败')
  } finally {
    saving.value = false
  }
}

async function remove(host: Host) {
  if (!(await confirmDialog(`确认删除主机 ${host.name}？`))) return
  try {
    await deleteHost(host.id)
    NKMessage.success('已删除')
    await load()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  }
}

async function test(id: number) {
  testingId.value = id
  try {
    const res = await testHost(id)
    if (res.data.online) NKMessage.success(`连接成功 ${res.data.server_info || ''}`)
    else NKMessage.warning(res.data.error || '连接失败')
    await load()
  } catch (err: any) {
    NKMessage.error(err.message || '连接测试失败')
  } finally {
    testingId.value = null
  }
}

async function status(id: number) {
  statusText.value = ''
  try {
    const res = await getHostStatus(id)
    const data = res.data
    statusText.value = data.online
      ? [data.uptime, data.disk, data.memory].filter(Boolean).join('\n\n')
      : data.error || '离线'
  } catch (err: any) {
    NKMessage.error(err.message || '获取状态失败')
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.host-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.host-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.host-title {
  margin: 0;
  font-size: 22px;
}
.host-muted {
  color: var(--nk-text-color-secondary, #888);
  font-size: 13px;
}
.host-actions {
  display: flex;
  gap: 8px;
}
.host-card {
  padding: 16px;
}
.host-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.host-table-wrap {
  overflow-x: auto;
}
.host-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.host-table th,
.host-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--nk-border-color, #eee);
  text-align: left;
  white-space: nowrap;
}
.host-name {
  font-weight: 600;
}
.host-row-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.host-card-title {
  font-weight: 600;
  margin-bottom: 12px;
}
.host-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.host-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}
.host-field-wide {
  grid-column: 1 / -1;
}
.host-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--nk-border-color, #ddd);
  border-radius: 6px;
  font: inherit;
  resize: vertical;
}
.host-form-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.host-status {
  white-space: pre-wrap;
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
}
@include respond-to(lg) {
  .host-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
