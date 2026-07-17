# Go Frontend Core - 项目说明

## 技术栈
- Vue 3 (Composition API + `<script setup>`)
- TypeScript
- Vite 6
- Vue Router 4
- Pinia (状态管理)
- Axios (HTTP 请求)
- NKUI 组件库 (`@nkui/vue`)

## 目录结构
```
src/
├── api/           # API 接口层 (Axios 封装)
├── assets/        # 静态资源
├── components/    # 通用布局组件 (AdminLayout, AdminSidebar, AdminHeader)
├── router/        # 路由配置 + 导航守卫
├── stores/        # Pinia 状态管理 (auth, app)
├── styles/        # 全局样式 (SCSS tokens, theme, global)
├── types/         # TypeScript 类型定义
├── utils/         # 工具函数 (auth token 管理)
├── views/         # 页面视图
│   ├── login/     # 登录页
│   ├── admin/     # 后台管理页面
│   │   ├── DashboardView.vue      # 仪表盘
│   │   ├── users/                 # 用户管理
│   │   ├── roles/                 # 角色权限管理
│   │   ├── storage/               # 文件存储管理
│   │   ├── crypto/                # 加密工具
│   │   ├── migrate/               # 数据库迁移
│   │   ├── net/                   # 网络工具
│   │   └── schedule/              # 任务调度
│   └── modules/               # 业务模块
│       └── zzz/goodser/        # 商品管理模块
├── App.vue
└── main.ts
```

## 命令
- `npm run dev` - 启动开发服务器 (端口 3000)
- `npm run build` - 构建生产版本
- `npm run preview` - 预览构建结果

## 开发规范
- 所有组件使用 `<script setup lang="ts">`
- 样式使用 SCSS，变量使用 NKUI tokens (`$nk-*`)
- API 调用统一通过 `src/api/` 下的模块
- 页面路由使用懒加载

## 后端 API
- 基础路径: `/api/v1`
- 开发环境通过 Vite proxy 代理到 `http://localhost:29090`
- 认证: Bearer JWT Token
- 响应格式: `{ code: 0, message: "success", data: {...} }`
