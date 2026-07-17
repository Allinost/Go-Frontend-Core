<template>
  <div class="admin-layout">
    <AdminSidebar />
    <div class="admin-layout__main" :class="{ 'admin-layout__main--expanded': collapsed }">
      <AdminHeader />
      <main class="admin-layout__content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import AdminSidebar from './AdminSidebar.vue'
import AdminHeader from './AdminHeader.vue'

const appStore = useAppStore()
const collapsed = computed(() => appStore.sidebarCollapsed)
</script>

<style lang="scss" scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: margin-left $nk-duration-normal;
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    padding: $nk-spacing-xl;
    background: $nk-color-neutral-50;
  }
}
</style>
