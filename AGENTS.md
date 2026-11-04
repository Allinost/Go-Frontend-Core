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
│       └── zzz/
│           ├── goodser/              # 商品管理模块
│           ├── developmentManager/   # 项目开发管理（列表 + 详情六 Tab）
│           └── ...
├── App.vue
└── main.ts
```

## 命令
- `npm run dev` - 启动开发服务器 (端口 3000)
- `npm run build` - 构建生产版本
- `npm run preview` - 预览构建结果

## 生产镜像（GHCR）
- `Dockerfile`：Node 构建 → nginx 静态托管，`/api/` 反代到 `http://gobackendcore:29090`
- `deploy/nginx.conf`：SPA 回退、静态缓存、`/healthz`
- CI：`.github/workflows/ci.yml`（手动触发；仓库变量 `ENABLE_GHCR_BUILD=true` 才执行）
- 镜像：`ghcr.io/allinost/go-frontend-core:<tag>`
- 依赖 `@nkui/vue` 是 `file:../NKUI/Vue3`：CI 会把 NKUI 检出到 `nkui/`；本地构建可先创建 `nkui -> ../NKUI` 链接
- 构建时默认值通过 Docker build args 注入：`VITE_API_BASE_URL` / `VITE_APP_TITLE` / `VITE_INTRANET_HOST` / `VITE_EASYTIER_HOST`；CI 从仓库 Variables 读取，未配置时使用代码兜底

## 已接入模块
- `developmentManager`（项目开发管理）：`/modules/zzz/developmentmanager`
  - API 封装：`src/api/developmentManager.ts`
  - 类型：`src/types/developmentManager.ts`
  - 页面：`src/views/modules/zzz/developmentManager/`（项目列表 + 概览/部署/数据字典/需求/生成/资产）
  - 容器管理（运维管理菜单）：`/modules/zzz/containers`，管理 `container_project` 类型项目并直达部署 Tab

## 全局设置
- 顶部导航「设置」（用户名左侧）：前端 API 地址/站点标题/内网域名/EasyTier 域名/主题；管理员可见「后端设置」（公开地址、Browser 地址、外部工具地址、依赖状态）
- 实现：`src/components/SettingsDialog.vue`、`src/api/settings.ts`、`src/utils/appSettings.ts`
- 前端默认值来自构建时 `.env`，真实域名/地址不写进代码：
  - `VITE_API_BASE_URL`、`VITE_APP_TITLE`
  - `VITE_INTRANET_HOST`、`VITE_EASYTIER_HOST`
- 浏览器覆盖值保存在 localStorage（`go_admin_api_base` 等），修改后刷新生效
- `.env` 已被 `.gitignore` 排除；提交前用 `.env.example` 作为模板

## 纯前端项目
- `developmentManager` 支持 `template` / `frontend_base` / `frontend_module` 三类前端项目，允许不绑定后端
- 前端项目生成代码为 Vue 3 + TypeScript + 本地 mock（`PageView.vue` / `api.ts` / `types.ts`），不引入后端依赖

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
