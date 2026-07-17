<template>
  <div class="role-manage">
    <h2 class="role-manage__title">角色权限管理</h2>

    <NkTabs v-model="activeTab" :items="tabs" @change="onTabChange" />

    <div class="role-manage__content">
      <div v-if="activeTab === 'roles'" class="role-manage__roles">
        <div v-if="roles.length === 0" class="role-manage__empty">
          <NkEmpty description="暂无角色数据" />
        </div>
        <div v-else class="role-manage__cards">
          <NkCard v-for="role in roles" :key="role.name" class="role-manage__card">
            <div class="role-manage__card-top">
              <div class="role-manage__card-info">
                <span class="role-manage__card-name">{{ role.name }}</span>
                <NkTag v-if="role.is_system" size="sm" type="primary" style="margin-left: 8px">系统角色</NkTag>
              </div>
              <span class="role-manage__card-count">
                <NkIcon name="user" size="xs" /> {{ role.user_count ?? '--' }} 用户
              </span>
            </div>
            <p class="role-manage__card-desc">{{ role.description || '暂无描述' }}</p>
            <div class="role-manage__card-perms">
              <span class="role-manage__perms-label">权限：</span>
              <NkTag
                v-for="perm in getRolePermissions(role.name)"
                :key="perm"
                size="sm"
                variant="outline"
                type="info"
                style="margin: 2px 4px 2px 0"
              >
                {{ perm }}
              </NkTag>
            </div>
          </NkCard>
        </div>
      </div>

      <div v-if="activeTab === 'users'" class="role-manage__users">
        <div class="role-manage__users-header">
          <NkInput v-model="search" placeholder="搜索用户名/昵称" size="sm" style="width: 240px" />
          <NkButton size="sm" @click="loadUsers">搜索</NkButton>
        </div>

        <div class="role-manage__table-card">
          <table class="role-user-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>昵称</th>
                <th>当前角色</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.id }}</td>
                <td>{{ user.username }}</td>
                <td>{{ user.nickname || '-' }}</td>
                <td>
                  <NkTag
                    v-for="role in user.roles"
                    :key="role"
                    size="sm"
                    :type="role === 'admin' ? 'primary' : 'info'"
                    style="margin-right: 4px"
                  >
                    {{ role }}
                  </NkTag>
                  <span v-if="!user.roles?.length" class="role-user-table__no-role">-</span>
                </td>
                <td>
                  <NkButton size="sm" variant="ghost" @click="openAssignDialog(user)">分配角色</NkButton>
                </td>
              </tr>
              <tr v-if="!users.length && !loading">
                <td colspan="5" class="role-user-table__empty">
                  <NkEmpty description="暂无用户数据" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="role-manage__pagination">
          <NkPagination
            v-model="currentPage"
            :total="total"
            :page-size="pageSize"
            @change="loadUsers"
          />
        </div>
      </div>
    </div>

    <NkDialog v-model:visible="showAssignDialog" title="分配角色" :width="420">
      <div class="role-manage__dialog-body">
        <p class="role-manage__dialog-user">
          为用户 <strong>{{ assigningUser?.username }}</strong> 分配角色：
        </p>
        <div class="role-manage__dialog-current">
          <span>当前角色：</span>
          <NkTag
            v-for="role in assigningUser?.roles"
            :key="role"
            size="sm"
            :type="role === 'admin' ? 'primary' : 'info'"
            style="margin-right: 4px"
          >
            {{ role }}
          </NkTag>
          <span v-if="!assigningUser?.roles?.length">-</span>
        </div>
        <NkSelect
          v-model="selectedRole"
          :options="roleOptions"
          placeholder="请选择角色"
          style="width: 100%; margin-top: 16px"
        />
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showAssignDialog = false">取消</NkButton>
        <NkButton :loading="assigning" :disabled="!selectedRole" @click="handleAssign">确认分配</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { listUsers } from '@/api/auth'
import { listRoles, assignRole } from '@/api/role'
import type { RoleInfo } from '@/api/role'
import type { UserInfo } from '@/types/api'
import { NKMessage } from '@nkui/vue/src/utils/message'

const rolePermissions: Record<string, string[]> = {
  admin: ['*:* (所有权限)'],
  user: ['task:read', 'task:create', 'task:update', 'task:delete', 'user:read', 'user:update'],
}

const activeTab = ref('roles')
const tabs = [
  { label: '角色列表', value: 'roles' },
  { label: '用户角色分配', value: 'users' },
]

const roles = ref<RoleInfo[]>([])

const search = ref('')
const users = ref<UserInfo[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const showAssignDialog = ref(false)
const assigning = ref(false)
const assigningUser = ref<UserInfo | null>(null)
const selectedRole = ref('')

async function loadRoles() {
  try {
    const res = await listRoles()
    roles.value = res.data
  } catch {
    roles.value = [
      { name: 'admin', description: '系统管理员，拥有所有权限', is_system: true },
      { name: 'user', description: '普通用户，拥有任务管理及用户查看权限', is_system: true },
    ]
  }
}

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

function getRolePermissions(roleName: string): string[] {
  return rolePermissions[roleName] || []
}

const roleOptions = computed(() =>
  roles.value.map((r) => ({ label: r.name, value: r.name })),
)

function openAssignDialog(user: UserInfo) {
  assigningUser.value = user
  selectedRole.value = ''
  showAssignDialog.value = true
}

async function handleAssign() {
  if (!assigningUser.value || !selectedRole.value) return
  assigning.value = true
  try {
    await assignRole(assigningUser.value.id, selectedRole.value)
    NKMessage.success('角色分配成功')
    showAssignDialog.value = false
    loadUsers()
    loadRoles()
  } catch (err: any) {
    NKMessage.error(err.message || '分配角色失败')
  } finally {
    assigning.value = false
  }
}

function onTabChange(value: string | number) {
  activeTab.value = value as string
  if (activeTab.value === 'users' && users.value.length === 0) {
    loadUsers()
  }
}

onMounted(loadRoles)
</script>

<style lang="scss" scoped>
.role-manage {
  max-width: 1200px;

  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    margin-bottom: $nk-spacing-xl;
    color: $nk-color-neutral-900;
  }

  &__content {
    margin-top: $nk-spacing-lg;
  }

  &__empty {
    padding: $nk-spacing-3xl 0;
  }

  &__cards {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-lg;
  }

  &__card {
    padding: $nk-spacing-lg;

    :deep(.nk-card__body) {
      padding: 0;
    }
  }

  &__card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-sm;
  }

  &__card-info {
    display: flex;
    align-items: center;
  }

  &__card-name {
    font-size: $nk-font-size-lg;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }

  &__card-count {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__card-desc {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
    margin-bottom: $nk-spacing-md;
  }

  &__card-perms {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }

  &__perms-label {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-400;
    margin-right: 4px;
  }

  &__users-header {
    display: flex;
    gap: $nk-spacing-sm;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
  }

  &__table-card {
    overflow: hidden;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: $nk-spacing-lg;
  }

  &__dialog-body {
    padding: $nk-spacing-sm 0;
  }

  &__dialog-user {
    margin-bottom: $nk-spacing-sm;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-700;
  }

  &__dialog-current {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.role-user-table {
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

  &__no-role {
    color: $nk-color-neutral-400;
  }
}
</style>
