<template>
  <div class="user-list">
    <div class="user-list__header">
      <h2 class="user-list__title">用户管理</h2>
      <div class="user-list__actions">
        <NkInput v-model="search" placeholder="搜索用户名/昵称" size="sm" style="width: 240px" />
        <NkButton size="sm" @click="loadUsers">搜索</NkButton>
      </div>
    </div>

    <div class="user-list__table-card">
      <table class="user-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>昵称</th>
            <th>邮箱</th>
            <th>状态</th>
            <th>角色</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.nickname || '-' }}</td>
            <td>{{ user.email || '-' }}</td>
            <td>
              <NkTag
                v-if="user.status"
                :type="user.status === 'active' ? 'success' : user.status === 'inactive' ? 'warning' : 'danger'"
                size="sm"
              >
                {{ statusLabel(user.status) }}
              </NkTag>
              <span v-else class="user-table__no-status">-</span>
            </td>
            <td>
              <NkTag v-for="role in user.roles" :key="role" size="sm" type="info" style="margin-right: 4px">
                {{ role }}
              </NkTag>
              <span v-if="!user.roles?.length" class="user-table__no-role">-</span>
            </td>
            <td>{{ formatDate(user.created_at) }}</td>
            <td>
              <NkButton size="sm" variant="ghost" @click="editUser(user.id)">编辑</NkButton>
              <NkButton size="sm" variant="ghost" type="danger" @click="confirmDelete(user)">删除</NkButton>
            </td>
          </tr>
          <tr v-if="!users.length && !loading">
            <td colspan="8" class="user-table__empty">
              <NkEmpty description="暂无用户数据" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="user-list__pagination">
      <NkPagination
        v-model="currentPage"
        :total="total"
        :page-size="pageSize"
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
import { NKMessage } from '@nkui/vue/src/utils/message'

const router = useRouter()

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

  &__table-card {
    overflow: hidden;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: $nk-spacing-lg;
  }
}

.user-table {
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

  &__empty {
    text-align: center;
    padding: $nk-spacing-3xl;
  }

  &__no-role,
  &__no-status {
    color: $nk-color-neutral-400;
  }
}
</style>
