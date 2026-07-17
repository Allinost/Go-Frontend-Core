import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/admin/DashboardView.vue'),
        meta: { title: '仪表盘' },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/admin/users/UserListView.vue'),
        meta: { title: '用户管理', requiresAdmin: true },
      },
      {
        path: 'users/:id',
        name: 'UserDetail',
        component: () => import('@/views/admin/users/UserDetailView.vue'),
        meta: { title: '用户详情', requiresAdmin: true },
      },
      {
        path: 'modules/crypto',
        name: 'Crypto',
        component: () => import('@/views/admin/crypto/index.vue'),
        meta: { title: '加密工具' },
      },
      {
        path: 'roles',
        name: 'Roles',
        component: () => import('@/views/admin/roles/index.vue'),
        meta: { title: '角色权限管理', requiresAdmin: true },
      },
      {
        path: 'modules/schedule',
        name: 'Schedule',
        component: () => import('@/views/admin/schedule/index.vue'),
        meta: { title: '任务调度' },
      },
      {
        path: 'modules/zzz/goodser',
        name: 'Goodser',
        component: () => import('@/views/modules/zzz/goodser/index.vue'),
        meta: { title: '商品管理' },
      },
      {
        path: 'modules/migrate',
        name: 'Migrate',
        component: () => import('@/views/admin/migrate/index.vue'),
        meta: { title: '数据库迁移' },
      },
      {
        path: 'modules/net',
        name: 'Net',
        component: () => import('@/views/admin/net/index.vue'),
        meta: { title: '网络工具' },
      },
      {
        path: 'storage',
        name: 'Storage',
        component: () => import('@/views/admin/storage/index.vue'),
        meta: { title: '文件存储管理' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
