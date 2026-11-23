<template>
  <div class="admin-layout">
    <div v-if="mobileOpen" class="admin-layout__backdrop" @click="mobileOpen = false" />
    <AdminSidebar :mobile-open="mobileOpen" @navigate="mobileOpen = false" />
    <div class="admin-layout__main" :class="{ 'admin-layout__main--expanded': collapsed }">
      <AdminHeader @toggle-sidebar="mobileOpen = !mobileOpen" />
      <main class="admin-layout__content">
        <router-view v-slot="{ Component }">
          <Transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </router-view>
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
    padding: 26px 30px;
    background:
      radial-gradient(900px 420px at 8% -10%, color-mix(in srgb, $nk-color-primary-100 55%, transparent), transparent 60%),
      radial-gradient(760px 380px at 100% 0%, color-mix(in srgb, $nk-color-accent 7%, transparent), transparent 55%),
      $nk-color-neutral-50;
    scroll-behavior: smooth;
  }

  &__backdrop {
    display: none;
  }

  .page-fade-enter-active,
  .page-fade-leave-active {
    transition: opacity 0.16s ease, transform 0.16s ease;
  }

  .page-fade-enter-from {
    opacity: 0;
    transform: translateY(6px);
  }

  .page-fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
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
