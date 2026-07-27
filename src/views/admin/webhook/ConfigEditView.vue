<template>
  <div class="wh-edit">
    <div class="wh-edit__header">
      <h2 class="wh-edit__title">编辑 Webhook 配置</h2>
    </div>

    <NkCard class="wh-edit__card">
      <NkLoading v-if="loading" />
      <div v-else class="wh-edit__form">
        <div class="wh-edit__row">
          <div class="wh-edit__field wh-edit__field--half">
            <label class="wh-edit__label">名称 <span class="wh-edit__required">*</span></label>
            <NkInput v-model="form.name" placeholder="配置名称" />
          </div>
          <div class="wh-edit__field wh-edit__field--half">
            <label class="wh-edit__label">类型</label>
            <NkSelect v-model="form.type" :options="typeOptions" disabled />
          </div>
        </div>

        <div class="wh-edit__field">
          <label class="wh-edit__label">Webhook URL <span class="wh-edit__required">*</span></label>
          <NkInput v-model="form.url" placeholder="https://example.com/webhook" />
        </div>

        <div class="wh-edit__row">
          <div class="wh-edit__field wh-edit__field--half">
            <label class="wh-edit__label">来源</label>
            <NkInput v-model="form.source" />
          </div>
          <div class="wh-edit__field wh-edit__field--half">
            <label class="wh-edit__label">标签</label>
            <NkInput v-model="tagsInput" placeholder="逗号分隔" @blur="applyTags" />
          </div>
        </div>

        <div class="wh-edit__row">
          <div class="wh-edit__field wh-edit__field--half">
            <label class="wh-edit__label">签名密钥（留空不修改）</label>
            <NkInput v-model="form.signing_key" placeholder="留空保持原值" type="password" />
          </div>
          <div class="wh-edit__field wh-edit__field--half">
            <label class="wh-edit__label">认证方式</label>
            <NkSelect v-model="form.auth_type" :options="authOptions" placeholder="不启用" clearable />
          </div>
        </div>

        <div v-if="form.auth_type" class="wh-edit__field">
          <label class="wh-edit__label">认证值（留空不修改）</label>
          <NkInput v-model="form.auth_value" placeholder="留空保持原值" type="password" />
        </div>

        <div class="wh-edit__field">
          <label class="wh-edit__label">自定义 Headers（JSON）</label>
          <NkInput v-model="customHeadersStr" placeholder='{"X-Custom": "value"}' />
        </div>

        <div class="wh-edit__row">
          <div class="wh-edit__field wh-edit__field--half">
            <label class="wh-edit__label">白名单关键字</label>
            <NkInput v-model="whitelistInput" placeholder="逗号分隔" @blur="applyWhitelist" />
          </div>
          <div class="wh-edit__field wh-edit__field--half">
            <label class="wh-edit__label">匹配模式</label>
            <NkSelect v-model="form.whitelist_mode" :options="[{label:'任一匹配',value:'any'},{label:'全部匹配',value:'all'}]" />
          </div>
        </div>

        <div class="wh-edit__row">
          <div class="wh-edit__field wh-edit__field--third">
            <label class="wh-edit__label">每分钟上限</label>
            <NkInput v-model.number="form.max_per_minute" type="number" />
          </div>
          <div class="wh-edit__field wh-edit__field--third">
            <label class="wh-edit__label">每小时上限</label>
            <NkInput v-model.number="form.max_per_hour" type="number" />
          </div>
          <div class="wh-edit__field wh-edit__field--third">
            <label class="wh-edit__label">超时 (ms)</label>
            <NkInput v-model.number="form.timeout_ms" type="number" />
          </div>
        </div>

        <div class="wh-edit__field">
          <label class="wh-edit__label">去重窗口（秒，0=不启用）</label>
          <NkInput v-model.number="form.dedup_window" type="number" />
        </div>

        <div class="wh-edit__actions">
          <NkButton variant="ghost" @click="$router.push(`/webhook/${configId}`)">取消</NkButton>
          <NkButton :loading="saving" :disabled="!form.name || !form.url" @click="handleSave">保存</NkButton>
        </div>
      </div>
    </NkCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getConfig, updateConfig } from '@/api/webhook'
import type { WebhookConfig } from '@/types/webhook'
import { NKMessage } from '@nkui/vue/src/utils/message'

const route = useRoute()
const router = useRouter()
const configId = computed(() => route.params.id as string)

const loading = ref(false)
const saving = ref(false)
const form = reactive({
  name: '',
  type: '' as string,
  url: '',
  source: '',
  tags: [] as string[],
  signing_key: '',
  auth_type: '' as string,
  auth_value: '',
  custom_headers: {} as Record<string, string>,
  whitelist_keywords: [] as string[],
  whitelist_mode: 'any' as string,
  max_per_minute: 60,
  max_per_hour: 1000,
  dedup_window: 0,
  timeout_ms: 10000,
})

const typeOptions = [
  { label: '飞书', value: 'feishu' },
  { label: '钉钉', value: 'dingtalk' },
  { label: '企微', value: 'wecom' },
  { label: 'GitHub', value: 'github' },
  { label: '通用', value: 'generic' },
]

const authOptions = [
  { label: 'Basic', value: 'basic' },
  { label: 'Bearer', value: 'bearer' },
  { label: 'Header', value: 'header' },
]

const tagsInput = ref('')
const whitelistInput = ref('')
const customHeadersStr = ref('')

async function loadConfig() {
  loading.value = true
  try {
    const res = await getConfig(configId.value)
    const c = res.data
    form.name = c.name
    form.type = c.type
    form.url = c.url
    form.source = c.source
    form.tags = [...c.tags]
    form.signing_key = ''
    form.auth_type = c.auth_type || ''
    form.auth_value = ''
    form.custom_headers = { ...c.custom_headers }
    form.whitelist_keywords = [...c.whitelist_keywords]
    form.whitelist_mode = c.whitelist_mode
    form.max_per_minute = c.max_per_minute
    form.max_per_hour = c.max_per_hour
    form.dedup_window = c.dedup_window
    form.timeout_ms = c.timeout_ms

    tagsInput.value = c.tags.join(', ')
    whitelistInput.value = c.whitelist_keywords.join(', ')
    customHeadersStr.value = Object.keys(c.custom_headers).length ? JSON.stringify(c.custom_headers) : ''
  } catch (err: any) {
    NKMessage.error(err.message || '加载配置失败')
  } finally {
    loading.value = false
  }
}

function applyTags() {
  form.tags = tagsInput.value.split(',').map(s => s.trim()).filter(Boolean)
}

function applyWhitelist() {
  form.whitelist_keywords = whitelistInput.value.split(',').map(s => s.trim()).filter(Boolean)
}

async function handleSave() {
  saving.value = true
  try {
    const payload: any = {
      name: form.name,
      url: form.url,
      source: form.source,
      tags: form.tags,
      whitelist_keywords: form.whitelist_keywords,
      whitelist_mode: form.whitelist_mode,
      max_per_minute: form.max_per_minute,
      max_per_hour: form.max_per_hour,
      dedup_window: form.dedup_window,
      timeout_ms: form.timeout_ms,
    }

    if (customHeadersStr.value) {
      try { payload.custom_headers = JSON.parse(customHeadersStr.value) } catch { NKMessage.warning('自定义 Headers JSON 格式无效') }
    }

    if (form.signing_key) payload.signing_key = form.signing_key
    if (form.auth_type) {
      payload.auth_type = form.auth_type
      if (form.auth_value) payload.auth_value = form.auth_value
    }

    await updateConfig(configId.value, payload)
    NKMessage.success('保存成功')
    router.push(`/webhook/${configId.value}`)
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadConfig)
</script>

<style lang="scss" scoped>
.wh-edit {
  &__header {
    margin-bottom: $nk-spacing-lg;
  }
  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }
  &__card {
    padding: $nk-spacing-xl;
  }
  &__form {
    max-width: 720px;
  }
  &__row {
    display: flex;
    gap: $nk-spacing-lg;
  }
  &__field {
    margin-bottom: $nk-spacing-lg;
    flex: 1;
    &--half { flex: 0 0 calc(50% - #{$nk-spacing-lg} / 2); }
    &--third { flex: 0 0 calc(33.33% - #{$nk-spacing-lg} * 2 / 3); }
  }
  &__label {
    display: block;
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
    margin-bottom: $nk-spacing-xs;
  }
  &__required {
    color: $nk-color-error;
  }
  &__actions {
    display: flex;
    gap: $nk-spacing-sm;
    justify-content: flex-end;
    margin-top: $nk-spacing-xl;
    padding-top: $nk-spacing-lg;
    border-top: 1px solid $nk-color-neutral-200;
  }
}
</style>
