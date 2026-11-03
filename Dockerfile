# Go-Frontend-Core 生产镜像
# 构建上下文需要包含 NKUI 源码：CI 会将 NKUI 检出到 ./nkui；本地构建可创建 nkui -> ../NKUI 的链接
FROM node:22-alpine AS builder
WORKDIR /app

# 依赖描述（@nkui/vue 使用 file:../NKUI/Vue3）
COPY package.json package-lock.json ./
# 放到 /NKUI/Vue3，满足 ../NKUI/Vue3 相对路径
COPY nkui/Vue3 /NKUI/Vue3
RUN npm ci
# NKUI 以源码方式被引用（realpath 在 /NKUI/Vue3），
# 让它的 vue / marked 解析到前端已安装的依赖，避免出现两份 Vue。
RUN ln -s /app/node_modules /NKUI/Vue3/node_modules

COPY src ./src
COPY public ./public
COPY index.html env.d.ts tsconfig.json vite.config.ts ./
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
