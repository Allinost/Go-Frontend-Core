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
        path: 'users/login3rd',
        name: 'Login3rd',
        component: () => import('@/views/admin/login3rd/index.vue'),
        meta: { title: '第三方登录管理' },
      },
      {
        path: 'users/login3rd/remote/:id',
        name: 'Login3rdRemote',
        component: () => import('@/views/admin/login3rd/RemoteLoginView.vue'),
        meta: { title: '远程登录' },
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
        path: 'modules/zzz/ia',
        name: 'IA',
        component: () => import('@/views/modules/zzz/ia/index.vue'),
        meta: { title: '投资分析' },
      },
      {
        path: 'modules/zzz/goodser',
        name: 'Goodser',
        component: () => import('@/views/modules/zzz/goodser/index.vue'),
        meta: { title: 'Goodser' },
      },
      {
        path: 'modules/zzz/shopchecker/products',
        name: 'ShopChecker',
        component: () => import('@/views/modules/zzz/shopchecker/index.vue'),
        meta: { title: 'ShopChecker' },
      },
      {
        path: 'modules/zzz/shopchecker/products/create',
        name: 'ShopCheckerCreate',
        component: () => import('@/views/modules/zzz/shopchecker/ProductCreateView.vue'),
        meta: { title: '创建商品' },
      },
      {
        path: 'modules/zzz/shopchecker/products/:id',
        name: 'ShopCheckerDetail',
        component: () => import('@/views/modules/zzz/shopchecker/ProductDetailView.vue'),
        meta: { title: '商品详情' },
      },
      {
        path: 'modules/zzz/shopchecker/products/:id/edit',
        name: 'ShopCheckerEdit',
        component: () => import('@/views/modules/zzz/shopchecker/ProductEditView.vue'),
        meta: { title: '编辑商品' },
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
        path: 'modules/servicenav',
        name: 'ServiceNav',
        component: () => import('@/views/admin/servicenav/index.vue'),
        meta: { title: '服务导航' },
      },
      {
        path: 'storage',
        name: 'Storage',
        component: () => import('@/views/admin/storage/index.vue'),
        meta: { title: '文件存储管理' },
      },
      {
        path: 'webhook',
        name: 'Webhook',
        component: () => import('@/views/admin/webhook/index.vue'),
        meta: { title: 'Webhook' },
      },
      {
        path: 'webhook/create',
        name: 'WebhookConfigCreate',
        component: () => import('@/views/admin/webhook/ConfigCreateView.vue'),
        meta: { title: '创建 Webhook 配置' },
      },
      {
        path: 'webhook/:id',
        name: 'WebhookConfigDetail',
        component: () => import('@/views/admin/webhook/ConfigDetailView.vue'),
        meta: { title: 'Webhook 配置详情' },
      },
      {
        path: 'webhook/:id/edit',
        name: 'WebhookConfigEdit',
        component: () => import('@/views/admin/webhook/ConfigEditView.vue'),
        meta: { title: '编辑 Webhook 配置' },
      },
      ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
