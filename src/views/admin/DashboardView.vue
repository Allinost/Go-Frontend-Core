<template>
  <div class="dashboard">
    <h2 class="dashboard__title">仪表盘</h2>

    <NkLoading v-if="loading" />
    <div v-else>
      <div v-if="services.length > 0" class="dashboard__nav">
        <a
          v-for="item in services"
          :key="item._id"
          class="dashboard__nav-card"
          :href="item.address || undefined"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="dashboard__nav-card-top">
            <span class="dashboard__nav-name">{{ item.name }}</span>
            <div class="dashboard__nav-types">
              <NkTag v-for="t in item.types" :key="t" size="sm" variant="outline" type="info">
                {{ t }}
              </NkTag>
            </div>
          </div>
          <div class="dashboard__nav-address">
            <span v-if="item.address" class="dashboard__nav-link">{{ item.address }}</span>
            <span v-else class="dashboard__nav-empty">-</span>
          </div>
          <div class="dashboard__nav-ports">
            <a
              v-if="item.intranet_port != null"
              class="dashboard__nav-port"
              :href="intranetHref(item)"
              target="_blank"
              rel="noopener noreferrer"
            >
              内网 {{ item.intranet_port }}
            </a>
            <span v-else class="dashboard__nav-port dashboard__nav-empty">内网 -</span>
            <a
              v-if="item.easytier_port != null"
              class="dashboard__nav-port dashboard__nav-port--right"
              :href="easytierHref(item)"
              target="_blank"
              rel="noopener noreferrer"
            >
              EasyTier {{ item.easytier_port }}
            </a>
            <span v-else class="dashboard__nav-port dashboard__nav-port--right dashboard__nav-empty">EasyTier -</span>
          </div>
        </a>
      </div>
      <NkEmpty v-else description="暂无可用服务" />
    </div>

    <div class="dashboard__welcome">
      <NkCard>
        <h3>欢迎使用 Go 后端管理系统</h3>
        <p>当前登录用户：{{ authStore.username }}</p>
      </NkCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listServices } from '@/api/servicenav'
import type { ServiceItem } from '@/api/servicenav'
import { NKMessage } from '@nkui/vue/src/utils/message'

const authStore = useAuthStore()
const loading = ref(false)
const services = ref<ServiceItem[]>([])

async function fetchServices() {
  loading.value = true
  try {
    const res = await listServices({ page: 1, page_size: 100, sort_by: 'name', sort_order: 'asc' })
    services.value = res.data?.items ?? []
  } catch (e: any) {
    NKMessage.error(e.message || '加载服务导航失败')
  } finally {
    loading.value = false
  }
}

function intranetHref(item: ServiceItem): string {
  const proto = item.protocol || 'http'
  return `${proto}://nas.hailong.site:${item.intranet_port}`
}

function easytierHref(item: ServiceItem): string {
  const proto = item.protocol || 'http'
  return `${proto}://et.hailong.site:${item.easytier_port}`
}

onMounted(fetchServices)
</script>

<style lang="scss" scoped>
.dashboard {
  max-width: 1200px;

  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    margin-bottom: $nk-spacing-xl;
    color: $nk-color-neutral-900;
  }

  &__nav {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: $nk-spacing-lg;
    margin-bottom: $nk-spacing-xl;
  }

  &__nav-card {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-sm;
    padding: $nk-spacing-lg;
    background: $nk-color-neutral-0;
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-lg;
    text-decoration: none;
    transition: all $nk-duration-fast;
    box-shadow: $nk-shadow-sm;

    &:hover {
      border-color: $nk-color-primary-500;
      box-shadow: $nk-shadow-md;
      transform: translateY(-2px);
    }
  }

  &__nav-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: $nk-spacing-sm;
  }

  &__nav-name {
    font-size: $nk-font-size-lg;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__nav-types {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  &__nav-address {
    font-size: $nk-font-size-sm;
    word-break: break-all;
  }

  &__nav-link {
    color: $nk-color-primary-600;
  }

  &__nav-empty {
    color: $nk-color-neutral-400;
  }

  &__nav-ports {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: $nk-spacing-sm;
    font-size: $nk-font-size-sm;
    border-top: 1px solid $nk-color-neutral-100;
    padding-top: $nk-spacing-sm;
  }

  &__nav-port {
    color: $nk-color-primary-600;
    text-decoration: none;
    white-space: nowrap;

    &:hover {
      text-decoration: underline;
    }

    &--right {
      margin-left: auto;
    }
  }

  &__welcome {
    h3 {
      margin-bottom: $nk-spacing-sm;
      font-size: $nk-font-size-lg;
    }
    p {
      color: $nk-color-neutral-600;
    }
  }
}
</style>