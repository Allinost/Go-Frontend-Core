<template>
  <NkDialog :visible="visible" title="设置" width="760" @update:visible="emit('update:visible', $event)">
    <NkTabs v-model="activeTab" :items="tabs" />

    <div v-if="activeTab === 'frontend'" class="settings-panel">
      <div class="settings-row">
        <label class="settings-label">后端 API 地址</label>
        <NkInput v-model="frontendForm.apiBase" placeholder="http://localhost:29090 或 /api/v1" />
        <div class="settings-hint">修改后需刷新页面生效；留空恢复默认 `/api/v1`。</div>
      </div>
      <div class="settings-row">
        <label class="settings-label">站点标题</label>
        <NkInput v-model="frontendForm.siteTitle" placeholder="Monitor Controller" />
      </div>
      <div class="settings-row">
        <label class="settings-label">主题</label>
        <NkSelect v-model="frontendForm.theme" :options="themeOptions" style="width: 180px" />
      </div>
      <div class="settings-actions">
        <NkButton size="sm" @click="saveFrontend">保存前端设置</NkButton>
        <NkButton size="sm" variant="ghost" @click="refreshPage">刷新页面</NkButton>
        <NkButton size="sm" variant="ghost" type="danger" @click="resetFrontend">恢复默认</NkButton>
      </div>
    </div>

    <div v-else class="settings-panel">
      <NkLoading v-if="backendLoading" />
      <template v-else-if="view">
        <div class="settings-status">
          <NkTag
            v-for="s in view.status"
            :key="s.name"
            size="sm"
            :type="s.status === 'ok' ? 'success' : 'danger'"
          >{{ statusLabel(s.name) }}: {{ s.status === 'ok' ? '正常' : '异常' }}</NkTag>
        </div>
        <div class="settings-meta">
          <span>版本：{{ view.meta.version }}</span>
          <span>模式：{{ view.meta.mode }}</span>
          <span>设置文件：{{ view.meta.settings_file }}（{{ view.meta.persisted ? '已持久化' : '使用默认值' }}）</span>
          <span>Chrome：{{ view.meta.chrome_remote_url || '未配置' }}</span>
        </div>

        <div class="settings-form">
          <div class="settings-row">
            <label class="settings-label">公开访问地址（回调/远程登录）</label>
            <NkInput v-model="backendForm.public_base_url" placeholder="https://et.hailong.site:29090" />
          </div>
          <div class="settings-row">
            <label class="settings-label">前端默认标题</label>
            <NkInput v-model="backendForm.frontend_title" />
          </div>
          <div class="settings-row">
            <label class="settings-label">前端默认 API 地址</label>
            <NkInput v-model="backendForm.frontend_api_base_url" placeholder="/api/v1" />
          </div>
          <div class="settings-row">
            <label class="settings-label">n8n 地址</label>
            <NkInput v-model="backendForm.n8n_url" placeholder="http://n8n:5678" />
          </div>
          <div class="settings-row">
            <label class="settings-label">OpenClaw 地址</label>
            <NkInput v-model="backendForm.openclaw_url" placeholder="http://openclaw:18789" />
          </div>
          <div class="settings-row">
            <label class="settings-label">LangBot 地址</label>
            <NkInput v-model="backendForm.langbot_url" placeholder="http://langbot:5300" />
          </div>
        </div>

        <div class="settings-hint">
          数据库、Redis、JWT、Chrome 等连接/密钥仍由 `.env` 管理，修改后需重启后端；此处只展示状态与外部工具地址。
        </div>

        <div class="settings-actions">
          <NkButton size="sm" :loading="backendSaving" @click="saveBackend">保存后端设置</NkButton>
          <NkButton size="sm" variant="ghost" @click="loadBackend">重新读取</NkButton>
        </div>
      </template>
      <NkEmpty v-else description="暂无后端设置（需要管理员权限）" />
    </div>

    <template #footer>
      <NkButton variant="ghost" @click="emit('update:visible', false)">关闭</NkButton>
    </template>
  </NkDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import type { ThemeMode } from '@/stores/app'
import {
  getApiBase,
  setApiBase,
  resetApiBase,
  getSiteTitle,
  setSiteTitle,
} from '@/utils/appSettings'
import { getAppSettings, updateAppSettings } from '@/api/settings'
import type { AppSettings, SettingsView } from '@/api/settings'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>()

const authStore = useAuthStore()
const appStore = useAppStore()

const activeTab = ref('frontend')
const tabs = computed(() =>
  authStore.isAdmin
    ? [
        { label: '前端设置', value: 'frontend' },
        { label: '后端设置', value: 'backend' },
      ]
    : [{ label: '前端设置', value: 'frontend' }],
)

const themeOptions = [
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
]

const frontendForm = reactive({
  apiBase: getApiBase(),
  siteTitle: getSiteTitle(),
  theme: appStore.theme as ThemeMode,
})

const backendLoading = ref(false)
const backendSaving = ref(false)
const view = ref<SettingsView | null>(null)
const backendForm = reactive<AppSettings>({
  public_base_url: '',
  frontend_title: '',
  frontend_api_base_url: '/api/v1',
  n8n_url: '',
  openclaw_url: '',
  langbot_url: '',
})

const statusLabels: Record<string, string> = {
  'mysql:main': 'MySQL',
  'redis:main': 'Redis',
  'postgres:nas': 'PostgreSQL',
  'rustfs:rustfs': 'RustFS',
  's3:minio': 'MinIO',
}
function statusLabel(name: string): string {
  return statusLabels[name] || name
}

function resetFrontendForm() {
  frontendForm.apiBase = getApiBase()
  frontendForm.siteTitle = getSiteTitle()
  frontendForm.theme = appStore.theme
}

async function loadBackend() {
  if (!authStore.isAdmin) return
  backendLoading.value = true
  try {
    const res = await getAppSettings()
    view.value = res.data
    Object.assign(backendForm, res.data.settings)
  } catch (err: any) {
    NKMessage.error(err.message || '读取后端设置失败')
  } finally {
    backendLoading.value = false
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    resetFrontendForm()
    if (authStore.isAdmin) {
      activeTab.value = 'frontend'
      loadBackend()
    }
  },
)

watch(activeTab, (tab) => {
  if (tab === 'backend') loadBackend()
})

function saveFrontend() {
  const previous = getApiBase()
  const normalized = setApiBase(frontendForm.apiBase)
  frontendForm.apiBase = normalized
  setSiteTitle(frontendForm.siteTitle)
  appStore.setTheme(frontendForm.theme)
  if (normalized !== previous) {
    NKMessage.success('已保存，刷新页面后生效')
  } else {
    NKMessage.success('前端设置已保存')
  }
}

function resetFrontend() {
  resetApiBase()
  setSiteTitle('')
  appStore.setTheme('light')
  resetFrontendForm()
  NKMessage.success('已恢复默认，刷新页面后生效')
}

function refreshPage() {
  window.location.reload()
}

async function saveBackend() {
  backendSaving.value = true
  try {
    const res = await updateAppSettings({ ...backendForm })
    view.value = res.data
    Object.assign(backendForm, res.data.settings)
    NKMessage.success('后端设置已保存')
  } catch (err: any) {
    NKMessage.error(err.message || '保存后端设置失败')
  } finally {
    backendSaving.value = false
  }
}
</script>

<style lang="scss" scoped>
.settings-panel {
  padding-top: $nk-spacing-md;
  display: flex;
  flex-direction: column;
  gap: $nk-spacing-md;
}

.settings-row {
  display: flex;
  flex-direction: column;
  gap: $nk-spacing-xs;
}

.settings-label {
  font-size: $nk-font-size-sm;
  font-weight: $nk-font-weight-medium;
  color: $nk-color-neutral-700;
}

.settings-hint {
  font-size: $nk-font-size-xs;
  color: $nk-color-neutral-500;
  line-height: $nk-line-height-relaxed;
}

.settings-actions {
  display: flex;
  gap: $nk-spacing-sm;
}

.settings-status {
  display: flex;
  flex-wrap: wrap;
  gap: $nk-spacing-xs;
}

.settings-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: $nk-font-size-xs;
  color: $nk-color-neutral-500;
}

.settings-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $nk-spacing-md;
}

.settings-row:first-child,
.settings-form .settings-row:first-child {
  grid-column: 1 / -1;
}

@media (max-width: 720px) {
  .settings-form {
    grid-template-columns: 1fr;
  }
}
</style>
