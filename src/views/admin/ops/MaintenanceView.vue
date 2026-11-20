<template>
  <div class="maint-page">
    <div class="maint-header">
      <div>
        <h2 class="maint-title">系统维护</h2>
        <div class="maint-muted">L1 / L2 手动维护切换，默认不做自动 failover。</div>
      </div>
      <div class="maint-actions">
        <NkTag :type="status?.active ? 'warning' : 'success'" size="sm">
          当前节点 {{ status?.node || 'L1' }}
        </NkTag>
        <NkButton size="sm" variant="ghost" :loading="loading" @click="loadAll">刷新</NkButton>
      </div>
    </div>

    <NkCard v-if="loading" class="maint-card">
      <NkLoading />
    </NkCard>

    <template v-else>
      <NkCard v-if="status?.active" class="maint-card">
        <div class="maint-card-title">
          <span>维护进行中</span>
          <NkTag type="warning" size="sm">{{ modeLabel(status.active.mode) }}</NkTag>
        </div>
        <div v-if="status.warning" class="maint-warning">{{ status.warning }}</div>
        <div class="maint-grid">
          <div><span class="maint-label">来源节点</span>{{ status.active.source_node }}</div>
          <div><span class="maint-label">目标节点</span>{{ status.active.target_node }}</div>
          <div><span class="maint-label">L1→L2 已同步</span>{{ status.active.sync_confirmed ? '是' : '否' }}</div>
          <div><span class="maint-label">已切 L2</span>{{ status.active.switched_to_l2 ? '是' : '否' }}</div>
          <div><span class="maint-label">操作人</span>{{ status.active.started_by || '-' }}</div>
          <div><span class="maint-label">开始时间</span>{{ formatTime(status.active.started_at) }}</div>
        </div>
        <div v-if="status.active.note" class="maint-note">备注：{{ status.active.note }}</div>

        <div class="maint-divider" />

        <div class="maint-form">
          <div class="maint-form-title">结束维护</div>
          <div class="maint-field">
            <span class="maint-label">确实切到 L2</span>
            <NkSwitch v-model="endForm.switched_to_l2" size="sm" />
          </div>
          <div class="maint-field">
            <span class="maint-label">L2→L1 已反向同步</span>
            <NkSwitch v-model="endForm.sync_back_confirmed" size="sm" />
          </div>
          <textarea v-model="endForm.note" class="maint-textarea" rows="2" placeholder="结束维护备注（可选）" />
          <div class="maint-form-actions">
            <NkButton size="sm" type="primary" :loading="submitting" @click="handleEnd">结束维护</NkButton>
          </div>
        </div>
      </NkCard>

      <NkCard v-else class="maint-card">
        <div class="maint-card-title">开始维护</div>
        <div class="maint-form">
          <div class="maint-field">
            <span class="maint-label">维护模式</span>
            <NkSelect v-model="startForm.mode" :options="modeOptions" style="width: 240px" />
          </div>
          <div v-if="startForm.mode !== 'shutdown'" class="maint-field">
            <span class="maint-label">L1→L2 已同步</span>
            <NkSwitch v-model="startForm.sync_confirmed" size="sm" />
          </div>
          <textarea v-model="startForm.note" class="maint-textarea" rows="2" placeholder="维护原因/窗口说明（可选）" />
          <div class="maint-form-actions">
            <NkButton size="sm" type="primary" :loading="submitting" @click="handleStart">开始维护</NkButton>
          </div>
          <div class="maint-muted">
            迁移模式需先人工完成 L1→L2 同步并勾选确认；结束迁回前需完成 L2→L1 反向同步。
          </div>
        </div>
      </NkCard>

      <NkCard class="maint-card">
        <div class="maint-card-title">维护历史</div>
        <div v-if="history.length === 0" class="maint-muted">暂无记录</div>
        <div v-else class="maint-table-wrap">
          <table class="maint-table">
            <thead>
              <tr>
                <th>模式</th>
                <th>状态</th>
                <th>目标</th>
                <th>切 L2</th>
                <th>反向同步</th>
                <th>开始</th>
                <th>结束</th>
                <th>操作人</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in history" :key="item.id">
                <td>{{ modeLabel(item.mode) }}</td>
                <td>{{ item.status }}</td>
                <td>{{ item.target_node }}</td>
                <td>{{ item.switched_to_l2 ? '是' : '否' }}</td>
                <td>{{ item.sync_back_confirmed ? '是' : '否' }}</td>
                <td>{{ formatTime(item.started_at) }}</td>
                <td>{{ item.ended_at ? formatTime(item.ended_at) : '-' }}</td>
                <td>{{ item.started_by || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </NkCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  endMaintenance,
  getMaintenanceStatus,
  listMaintenanceHistory,
  startMaintenance,
  type Maintenance,
  type MaintenanceStatus,
} from '@/api/ops'

const loading = ref(false)
const submitting = ref(false)
const status = ref<MaintenanceStatus | null>(null)
const history = ref<Maintenance[]>([])
const startForm = reactive({
  mode: 'shutdown',
  sync_confirmed: false,
  note: '',
})
const endForm = reactive({
  switched_to_l2: true,
  sync_back_confirmed: false,
  note: '',
})

const modeOptions = computed(() =>
  (status.value?.modes || ['shutdown', 'migrate_return', 'migrate_no_return']).map((mode) => ({
    label: modeLabel(mode),
    value: mode,
  })),
)

function modeLabel(mode: string) {
  const labels: Record<string, string> = {
    shutdown: '停机维护',
    migrate_return: '迁移并迁回',
    migrate_no_return: '迁移不迁回',
  }
  return labels[mode] || mode
}

function formatTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

async function loadAll() {
  loading.value = true
  try {
    const [s, h] = await Promise.all([getMaintenanceStatus(), listMaintenanceHistory(50)])
    status.value = s.data
    history.value = h.data.items || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载维护状态失败')
  } finally {
    loading.value = false
  }
}

async function handleStart() {
  if (startForm.mode !== 'shutdown' && !startForm.sync_confirmed) {
    NKMessage.warning('请先完成 L1→L2 同步并勾选确认')
    return
  }
  submitting.value = true
  try {
    await startMaintenance({
      mode: startForm.mode,
      sync_confirmed: startForm.sync_confirmed,
      note: startForm.note,
    })
    NKMessage.success('已开始维护')
    startForm.note = ''
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '开始维护失败')
  } finally {
    submitting.value = false
  }
}

async function handleEnd() {
  submitting.value = true
  try {
    await endMaintenance({
      switched_to_l2: endForm.switched_to_l2,
      sync_back_confirmed: endForm.sync_back_confirmed,
      note: endForm.note,
    })
    NKMessage.success('已结束维护')
    endForm.note = ''
    endForm.sync_back_confirmed = false
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '结束维护失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped lang="scss">
.maint-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.maint-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.maint-title {
  margin: 0;
  font-size: 22px;
}
.maint-muted {
  color: var(--nk-text-color-secondary, #888);
  font-size: 13px;
}
.maint-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.maint-card {
  padding: 16px;
}
.maint-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  margin-bottom: 12px;
}
.maint-warning {
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(250, 173, 20, 0.12);
  color: #ad6800;
  font-size: 13px;
}
.maint-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 18px;
  font-size: 13px;
}
.maint-label {
  color: var(--nk-text-color-secondary, #888);
  margin-right: 8px;
}
.maint-note {
  margin-top: 10px;
  font-size: 13px;
}
.maint-divider {
  height: 1px;
  background: var(--nk-border-color, #eee);
  margin: 16px 0;
}
.maint-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.maint-form-title {
  font-weight: 600;
}
.maint-field {
  display: flex;
  align-items: center;
  gap: 12px;
}
.maint-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--nk-border-color, #ddd);
  border-radius: 6px;
  font: inherit;
  resize: vertical;
}
.maint-form-actions {
  display: flex;
  gap: 8px;
}
.maint-table-wrap {
  overflow-x: auto;
}
.maint-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.maint-table th,
.maint-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--nk-border-color, #eee);
  text-align: left;
  white-space: nowrap;
}
@media (max-width: 900px) {
  .maint-grid {
    grid-template-columns: 1fr;
  }
}
</style>
