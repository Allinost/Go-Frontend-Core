import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // @nkui/vue 以源码（junction）方式链接，跳过预构建，避免 dev 使用过期缓存。
  optimizeDeps: {
    exclude: ['@nkui/vue'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "sass:map";\n@use "sass:color";\n@use "sass:list";\n@use "@/styles/tokens" as *;\n`,
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:29090',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
