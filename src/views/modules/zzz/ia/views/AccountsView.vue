<template>
  <div class="ia-accounts">
    <div class="ia-accounts__header">
      <h2 class="ia-accounts__title">账户管理</h2>
      <NkButton type="primary" @click="openCreate">新建账户</NkButton>
    </div>
    <div class="ia-accounts__filters">
      <NkInput v-model="filters.keyword" placeholder="名称/券商" size="sm" style="width: 200px" clearable @keyup.enter="load" />
      <NkSelect v-model="filters.type" :options="typeOptions" size="sm" clearable placeholder="账户类型" @change="load" />
      <NkSelect v-model="filters.status" :options="statusOptions" size="sm" clearable placeholder="状态" @change="load" />
      <NkButton size="sm" @click="load">搜索</NkButton>
      <NkButton size="sm" variant="ghost" @click="reset">重置</NkButton>
    </div>
    <NkLoading v-if="loading" />
    <table v-else class="ia-accounts__table">
      <thead>
        <tr>
          <th>名称</th>
          <th>类型</th>
          <th>券商</th>
          <th>币种</th>
          <th>成本法</th>
          <th>状态</th>
          <th>备注</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="acc in accounts" :key="acc.id">
          <td>{{ acc.name }}</td>
          <td><NkTag>{{ typeLabel(acc.type) }}</NkTag></td>
          <td>{{ acc.broker || '-' }}</td>
          <td>{{ acc.currency || '-' }}</td>
          <td>{{ acc.cost_method || '-' }}</td>
          <td><NkTag :type="acc.status === 'active' ? 'success' : 'info'">{{ statusLabel(acc.status) }}</NkTag></td>
          <td>{{ acc.remark || '-' }}</td>
          <td>
            <div class="ia-accounts__btns">
              <NkButton size="xs" @click="openEdit(acc)">编辑</NkButton>
              <NkButton size="xs" type="danger" @click="handleDelete(acc)">删除</NkButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <NkEmpty v-if="!loading && accounts.length === 0" description="暂无账户" />
    <NkPagination v-if="total > pageSize" v-model="page" :total="total" :page-size="pageSize" @change="load" />

    <NkDialog v-model:visible="dialogVisible" :title="editingId ? '编辑账户' : '新建账户'" width="480px">
      <div class="ia-accounts__form">
        <div class="ia-accounts__field">
          <label class="ia-accounts__label">名称 *</label>
          <NkInput v-model="form.name" placeholder="账户名称" />
        </div>
        <div class="ia-accounts__row">
          <div class="ia-accounts__field">
            <label class="ia-accounts__label">类型 *</label>
            <NkSelect v-model="form.type" :options="typeOptions" />
          </div>
          <div class="ia-accounts__field">
            <label class="ia-accounts__label">券商</label>
            <NkInput v-model="form.broker" placeholder="如 华泰证券" />
          </div>
        </div>
        <div class="ia-accounts__row">
          <div class="ia-accounts__field">
            <label class="ia-accounts__label">币种</label>
            <NkInput v-model="form.currency" placeholder="CNY" />
          </div>
          <div class="ia-accounts__field">
            <label class="ia-accounts__label">成本法</label>
            <NkSelect v-model="form.cost_method" :options="costMethodOptions" clearable />
          </div>
        </div>
        <div v-if="editingId" class="ia-accounts__field">
          <label class="ia-accounts__label">状态</label>
          <NkSelect v-model="form.status" :options="statusOptions" />
        </div>
        <div class="ia-accounts__field">
          <label class="ia-accounts__label">备注</label>
          <NkTextarea v-model="form.remark" />
        </div>
      </div>
      <template #footer>
        <NkButton @click="dialogVisible = false">取消</NkButton>
        <NkButton type="primary" :loading="saving" @click="handleSave">保存</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { listAccounts, createAccount, updateAccount, deleteAccount } from '@/api/ia'
import type { Account, CreateAccountReq, UpdateAccountReq } from '@/types/ia'
import { NKMessage } from '@nkui/vue/src/utils/message'

const loading = ref(false)
const saving = ref(false)
const accounts = ref<Account[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20

const filters = reactive({
  keyword: '',
  type: '',
  status: '',
})

const typeOptions = [
  { label: '券商账户', value: 'broker' },
  { label: '银行账户', value: 'bank' },
  { label: '基金账户', value: 'fund' },
  { label: '其他', value: 'other' },
]

const costMethodOptions = [
  { label: '加权平均(wa)', value: 'wa' },
  { label: '先进先出(fifo)', value: 'fifo' },
  { label: '后进先出(lifo)', value: 'lifo' },
]

const statusOptions = [
  { label: '正常', value: 'active' },
  { label: '停用', value: 'paused' },
]

const typeMap: Record<string, string> = { broker: '券商', bank: '银行', fund: '基金', other: '其他' }
const statusMap: Record<string, string> = { active: '正常', paused: '停用' }
function typeLabel(t: string) { return typeMap[t] || t }
function statusLabel(s: string) { return statusMap[s] || s }

const dialogVisible = ref(false)
const editingId = ref<string>('')
const form = reactive<CreateAccountReq & UpdateAccountReq & { status: string }>({
  name: '',
  type: 'broker',
  broker: '',
  currency: 'CNY',
  cost_method: 'wa',
  remark: '',
  status: 'active',
})

async function load() {
  loading.value = true
  try {
    const res = await listAccounts({
      page: page.value,
      page_size: pageSize,
      type: filters.type || undefined,
      status: filters.status || undefined,
      keyword: filters.keyword || undefined,
    })
    accounts.value = res.data?.items || []
    total.value = res.data?.total || 0
  } catch (e) {
    accounts.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function reset() {
  filters.keyword = ''
  filters.type = ''
  filters.status = ''
  page.value = 1
  load()
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, {
    name: '', type: 'broker', broker: '', currency: 'CNY',
    cost_method: 'wa', remark: '', status: 'active',
  })
  dialogVisible.value = true
}

function openEdit(acc: Account) {
  editingId.value = acc.id
  Object.assign(form, {
    name: acc.name,
    type: acc.type,
    broker: acc.broker,
    currency: acc.currency,
    cost_method: acc.cost_method,
    remark: acc.remark,
    status: acc.status,
  })
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.name || !form.type) {
    NKMessage.error('请填写必填项')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await updateAccount(editingId.value, {
        name: form.name,
        type: form.type,
        broker: form.broker,
        currency: form.currency,
        cost_method: form.cost_method,
        remark: form.remark,
        status: form.status,
      })
      NKMessage.success('已更新')
    } else {
      await createAccount({
        name: form.name,
        type: form.type,
        broker: form.broker,
        currency: form.currency,
        cost_method: form.cost_method,
        remark: form.remark,
      })
      NKMessage.success('已创建')
    }
    dialogVisible.value = false
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(acc: Account) {
  if (!confirm(`确定删除账户「${acc.name}」？若存在持仓或交易会失败。`)) return
  try {
    await deleteAccount(acc.id)
    NKMessage.success('已删除')
    load()
  } catch (e: any) {
    NKMessage.error(e.message || '删除失败')
  }
}

onMounted(load)
</script>

<style lang="scss" scoped>
.ia-accounts {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__filters {
    display: flex;
    gap: $nk-spacing-sm;
    margin-bottom: $nk-spacing-lg;
  }
  &__table {
    width: 100%;
    border-collapse: collapse;
    th, td {
      padding: $nk-spacing-sm $nk-spacing-md;
      border-bottom: 1px solid $nk-color-neutral-200;
      text-align: left;
      white-space: nowrap;
    }
    th {
      background: $nk-color-neutral-50;
      font-weight: $nk-font-weight-medium;
      color: $nk-color-neutral-600;
      font-size: $nk-font-size-sm;
    }
    td { color: $nk-color-neutral-800; }
    tr:hover td { background: $nk-color-neutral-50; }
  }
  &__btns {
    display: flex;
    gap: $nk-spacing-xs;
  }
  &__form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }
  &__row {
    display: flex;
    gap: $nk-spacing-md;
    & > * { flex: 1; }
  }
  &__field {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;
  }
  &__label {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
    font-weight: $nk-font-weight-medium;
  }
}
</style>
