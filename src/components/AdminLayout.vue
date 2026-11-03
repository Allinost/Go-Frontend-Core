<template>
  <div class="admin-layout">
    <div v-if="mobileOpen" class="admin-layout__backdrop" @click="mobileOpen = false" />
    <AdminSidebar :mobile-open="mobileOpen" @navigate="mobileOpen = false" />
    <div class="admin-layout__main" :class="{ 'admin-layout__main--expanded': collapsed }">
      <AdminHeader @toggle-sidebar="mobileOpen = !mobileOpen" />
      <main class="admin-layout__content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import AdminSidebar from './AdminSidebar.vue'
import AdminHeader from './AdminHeader.vue'

const appStore = useAppStore()
const route = useRoute()
const collapsed = computed(() => appStore.sidebarCollapsed)
const mobileOpen = ref(false)

// 移动端切换页面后自动收起导航抽屉。
watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)
</script>

<style lang="scss" scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  position: relative;

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

  &__backdrop {
    display: none;
  }

  @media (max-width: 768px) {
    &__content {
      padding: $nk-spacing-md;
    }

    &__backdrop {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 1040;
      background: rgba(0, 0, 0, 0.45);
    }
  }
}
</style>
