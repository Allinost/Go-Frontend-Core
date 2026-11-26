<template>
  <div class="user-list">
    <div class="user-list__header">
      <h2 class="user-list__title">用户管理</h2>
      <div class="user-list__actions">
        <NkInput v-model="search" placeholder="搜索用户名/昵称" size="sm" style="width: 240px" @keyup.enter="handleSearch" />
        <NkButton size="sm" @click="handleSearch">搜索</NkButton>
      </div>
    </div>

    <NkTable :columns="columns" :data="users" :loading="loading" empty-text="暂无用户数据">
      <template #cell-status="{ value }">
        <NkTag v-if="value" size="sm" :type="statusType(value)">{{ statusLabel(value) }}</NkTag>
        <span v-else class="user-list__muted">-</span>
      </template>
      <template #cell-roles="{ row }">
        <NkTag v-for="role in row.roles || []" :key="role" size="sm" type="info" style="margin-right: 4px">
          {{ role }}
        </NkTag>
        <span v-if="!row.roles?.length" class="user-list__muted">-</span>
      </template>
      <template #cell-actions="{ row }">
        <NkButton size="sm" variant="ghost" @click="editUser(row.id)">编辑</NkButton>
        <NkButton size="sm" variant="ghost" type="danger" @click="confirmDelete(row)">删除</NkButton>
      </template>
    </NkTable>

    <div class="user-list__pagination">
      <NkPagination
        v-model="currentPage"
        :total="total"
        :page-size="pageSize"
        @change="loadUsers"
      />
    </div>

    <NkDialog v-model:visible="showDeleteDialog" title="确认删除" :width="400">
      <p>确定要删除用户 <strong>{{ deletingUser?.username }}</strong> 吗？此操作不可恢复。</p>
      <template #footer>
        <NkButton variant="ghost" @click="showDeleteDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="deleting" @click="handleDelete">确认删除</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listUsers, deleteUser } from '@/api/auth'
import type { UserInfo } from '@/types/api'
import { NKMessage, type NkTableColumn } from '@nkui/vue'

const router = useRouter()

const columns: NkTableColumn[] = [
  { key: 'id', title: 'ID', width: 70, sortable: true },
  { key: 'username', title: '用户名', sortable: true },
  { key: 'nickname', title: '昵称' },
  { key: 'email', title: '邮箱' },
  { key: 'status', title: '状态', width: 100 },
  { key: 'roles', title: '角色' },
  { key: 'created_at', title: '创建时间', width: 120, formatter: (row) => formatDate(row.created_at) },
  { key: 'actions', title: '操作', width: 160 },
]

const users = ref<UserInfo[]>([])
const loading = ref(false)
const search = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const showDeleteDialog = ref(false)
const deleting = ref(false)
const deletingUser = ref<UserInfo | null>(null)

async function loadUsers() {
  loading.value = true
  try {
    const res = await listUsers({
      page: currentPage.value,
      page_size: pageSize.value,
      search: search.value || undefined,
    })
    users.value = res.data.data
    total.value = res.data.total
  } catch (err: any) {
    NKMessage.error(err.message || '加载用户列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  loadUsers()
}

function editUser(id: number) {
  router.push(`/users/${id}`)
}

function confirmDelete(user: UserInfo) {
  deletingUser.value = user
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingUser.value) return
  deleting.value = true
  try {
    await deleteUser(deletingUser.value.id)
    NKMessage.success('用户已删除')
    showDeleteDialog.value = false
    loadUsers()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

function statusType(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'active') return 'success'
  if (status === 'inactive') return 'warning'
  return 'danger'
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: '正常',
    inactive: '未激活',
    suspended: '已停用',
  }
  return map[status] || status
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

onMounted(loadUsers)
</script>

<style lang="scss" scoped>
.user-list {
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

  &__actions {
    display: flex;
    gap: $nk-spacing-sm;
    align-items: center;
  }

  &__muted {
    color: $nk-color-neutral-400;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: $nk-spacing-lg;
  }
}
</style>
