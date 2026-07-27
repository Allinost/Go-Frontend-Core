<template>
  <div class="wh-detail">
    <div class="wh-detail__header">
      <h2 class="wh-detail__title">Webhook 配置详情</h2>
      <div class="wh-detail__actions">
        <NkButton size="sm" variant="ghost" @click="$router.push('/webhook')">返回列表</NkButton>
        <NkButton size="sm" variant="ghost" @click="$router.push(`/webhook/${configId}/edit`)">编辑</NkButton>
        <NkButton size="sm" :loading="testing" @click="handleTest">发送测试</NkButton>
        <NkButton size="sm" variant="outline" @click="showCustomSend = true">发送自定义内容</NkButton>
      </div>
    </div>

    <div class="wh-detail__stats">
      <NkCard class="wh-detail__stat-card">
        <div class="wh-detail__stat-value">{{ config?.total_sent ?? '-' }}</div>
        <div class="wh-detail__stat-label">总发送</div>
      </NkCard>
      <NkCard class="wh-detail__stat-card">
        <div class="wh-detail__stat-value wh-detail__stat-value--danger">{{ config?.total_failed ?? '-' }}</div>
        <div class="wh-detail__stat-label">总失败</div>
      </NkCard>
      <NkCard class="wh-detail__stat-card">
        <div class="wh-detail__stat-value">{{ config?.last_sent_at ? formatTime(config.last_sent_at) : '-' }}</div>
        <div class="wh-detail__stat-label">最后发送</div>
      </NkCard>
      <NkCard class="wh-detail__stat-card">
        <div class="wh-detail__stat-value">{{ config?.last_error || '-' }}</div>
        <div class="wh-detail__stat-label">最后错误</div>
      </NkCard>
    </div>

    <NkCard class="wh-detail__info">
      <NkLoading v-if="loading" />
      <div v-else class="wh-detail__info-grid">
        <div class="wh-detail__info-item">
          <span class="wh-detail__info-label">名称</span>
          <span class="wh-detail__info-value">{{ config?.name }}</span>
        </div>
        <div class="wh-detail__info-item">
          <span class="wh-detail__info-label">类型</span>
          <span class="wh-detail__info-value"><NkTag size="sm">{{ typeLabel(config?.type) }}</NkTag></span>
        </div>
        <div class="wh-detail__info-item">
          <span class="wh-detail__info-label">URL</span>
          <span class="wh-detail__info-value" style="word-break:break-all">{{ config?.url }}</span>
        </div>
        <div class="wh-detail__info-item">
          <span class="wh-detail__info-label">状态</span>
          <span class="wh-detail__info-value">
            <NkTag size="sm" :type="statusTagType(config?.status)">{{ statusLabel(config?.status) }}</NkTag>
          </span>
        </div>
        <div class="wh-detail__info-item">
          <span class="wh-detail__info-label">来源</span>
          <span class="wh-detail__info-value">{{ config?.source }}</span>
        </div>
        <div class="wh-detail__info-item">
          <span class="wh-detail__info-label">标签</span>
          <span class="wh-detail__info-value">
            <NkTag v-for="t in config?.tags" :key="t" size="sm" variant="outline" style="margin-right:4px">{{ t }}</NkTag>
            <span v-if="!config?.tags?.length">-</span>
          </span>
        </div>
        <div class="wh-detail__info-item">
          <span class="wh-detail__info-label">签名密钥</span>
          <span class="wh-detail__info-value">{{ config?.signing_key || '-' }}</span>
        </div>
        <div class="wh-detail__info-item">
          <span class="wh-detail__info-label">认证</span>
          <span class="wh-detail__info-value">{{ config?.auth_type ? `${config.auth_type}: ***` : '-' }}</span>
        </div>
        <div class="wh-detail__info-item" v-if="config?.custom_headers && Object.keys(config.custom_headers).length">
          <span class="wh-detail__info-label">自定义 Headers</span>
          <span class="wh-detail__info-value">
            <div v-for="(v, k) in config.custom_headers" :key="k" style="font-size:12px">{{ k }}: {{ v }}</div>
          </span>
        </div>
        <div class="wh-detail__info-item">
          <span class="wh-detail__info-label">白名单</span>
          <span class="wh-detail__info-value">
            {{ config?.whitelist_keywords?.join(', ') || '-' }}
            <span v-if="config?.whitelist_mode"> ({{ config.whitelist_mode === 'any' ? '任一匹配' : '全部匹配' }})</span>
          </span>
        </div>
        <div class="wh-detail__info-item">
          <span class="wh-detail__info-label">限流</span>
          <span class="wh-detail__info-value">{{ config?.max_per_minute }}/min, {{ config?.max_per_hour }}/h</span>
        </div>
        <div class="wh-detail__info-item">
          <span class="wh-detail__info-label">超时</span>
          <span class="wh-detail__info-value">{{ config?.timeout_ms }}ms</span>
        </div>
        <div class="wh-detail__info-item">
          <span class="wh-detail__info-label">去重窗口</span>
          <span class="wh-detail__info-value">{{ config?.dedup_window ? `${config.dedup_window}s` : '不启用' }}</span>
        </div>
        <div class="wh-detail__info-item">
          <span class="wh-detail__info-label">创建时间</span>
          <span class="wh-detail__info-value">{{ formatTime(config?.created_at) }}</span>
        </div>
      </div>
    </NkCard>
    <NkDialog v-model:visible="showCustomSend" title="发送自定义内容" :width="560">
      <div class="wh-detail__send-form">
        <div class="wh-detail__send-field">
          <label class="wh-detail__send-label">消息类型</label>
          <NkSelect v-model="sendForm.msg_type" :options="msgTypeOptions" />
        </div>
        <div class="wh-detail__send-field">
          <label class="wh-detail__send-label">标题 <span class="wh-create__required">*</span></label>
          <NkInput v-model="sendForm.title" placeholder="消息标题" />
        </div>
        <div class="wh-detail__send-field">
          <label class="wh-detail__send-label">内容 <span class="wh-create__required">*</span></label>
          <NkInput v-model="sendForm.content" type="textarea" :rows="5" placeholder="消息内容，支持 markdown" />
        </div>
        <div class="wh-detail__send-field">
          <label class="wh-detail__send-label">来源</label>
          <NkInput v-model="sendForm.source" placeholder="frontend-test" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showCustomSend = false">取消</NkButton>
        <NkButton :loading="sendingCustom" :disabled="!sendForm.title || !sendForm.content" @click="handleCustomSend">发送</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getConfig, testSendConfig, sendWebhook } from '@/api/webhook'
import type { WebhookConfig } from '@/types/webhook'
import { NKMessage } from '@nkui/vue/src/utils/message'

const route = useRoute()
const configId = computed(() => route.params.id as string)

const config = ref<WebhookConfig | null>(null)
const loading = ref(false)
const testing = ref(false)

const showCustomSend = ref(false)
const sendingCustom = ref(false)
const msgTypeOptions = [
  { label: '文本', value: 'text' },
  { label: 'Markdown', value: 'markdown' },
  { label: '卡片', value: 'card' },
  { label: '交互', value: 'interactive' },
]
const sendForm = reactive({
  msg_type: 'text' as string,
  title: '',
  content: '',
  source: 'frontend-test',
})

async function loadConfig() {
  loading.value = true
  try {
    const res = await getConfig(configId.value)
    config.value = res.data
  } catch (err: any) {
    NKMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleTest() {
  testing.value = true
  try {
    const res = await testSendConfig(configId.value)
    NKMessage.success(res.data?.message || '测试消息已发送')
  } catch (err: any) {
    NKMessage.error(err.message || '测试发送失败')
  } finally {
    testing.value = false
  }
}

async function handleCustomSend() {
  sendingCustom.value = true
  try {
    const res = await sendWebhook({
      webhook_ids: [configId.value],
      source: sendForm.source,
      title: sendForm.title,
      content: sendForm.content,
      msg_type: sendForm.msg_type as any,
    })
    NKMessage.success(`已发送：成功 ${res.data.success}，失败 ${res.data.failed}`)
    showCustomSend.value = false
  } catch (err: any) {
    NKMessage.error(err.message || '发送失败')
  } finally {
    sendingCustom.value = false
  }
}

function typeLabel(type?: string): string {
  const map: Record<string, string> = { feishu: '飞书', dingtalk: '钉钉', wecom: '企微', github: 'GitHub', generic: '通用' }
  return type ? map[type] || type : '-'
}

function statusLabel(status?: string): string {
  const map: Record<string, string> = { active: '活跃', paused: '暂停', disabled: '禁用' }
  return status ? map[status] || status : '-'
}

function statusTagType(status?: string): string {
  const map: Record<string, string> = { active: 'success', paused: 'warning', disabled: 'danger' }
  return status ? map[status] || 'info' : 'info'
}

function formatTime(t?: string): string {
  if (!t) return '-'
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(loadConfig)
</script>

<style lang="scss" scoped>
.wh-detail {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__actions {
    display: flex;
    gap: $nk-spacing-sm;
  }
  &__stats {
    display: flex;
    gap: $nk-spacing-lg;
    margin-bottom: $nk-spacing-lg;
  }
  &__stat-card {
    flex: 1;
    padding: $nk-spacing-lg;
    text-align: center;
  }
  &__stat-value {
    font-size: $nk-font-size-2xl;
    font-weight: $nk-font-weight-bold;
    color: $nk-color-primary-600;
    &--danger { color: $nk-color-error; }
  }
  &__stat-label {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
    margin-top: $nk-spacing-xs;
  }
  &__info {
    padding: $nk-spacing-xl;
  }
  &__info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $nk-spacing-lg;
  }
  &__info-item {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;
  }
  &__info-label {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  &__info-value {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-900;
  }
  &__send-form {
    padding: $nk-spacing-xs 0;
  }
  &__send-field {
    margin-bottom: $nk-spacing-lg;
  }
  &__send-label {
    display: block;
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
    margin-bottom: $nk-spacing-xs;
  }
}
</style>
