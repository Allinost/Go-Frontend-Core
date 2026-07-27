<template>
  <div class="wh-create">
    <div class="wh-create__header">
      <h2 class="wh-create__title">创建 Webhook 配置</h2>
    </div>

    <NkCard class="wh-create__card">
      <div class="wh-create__form">
        <div class="wh-create__row">
          <div class="wh-create__field wh-create__field--half">
            <label class="wh-create__label">名称 <span class="wh-create__required">*</span></label>
            <NkInput v-model="form.name" placeholder="配置名称" />
          </div>
          <div class="wh-create__field wh-create__field--half">
            <label class="wh-create__label">类型 <span class="wh-create__required">*</span></label>
            <NkSelect v-model="form.type" :options="typeOptions" placeholder="选择类型" />
          </div>
        </div>

        <div class="wh-create__field">
          <label class="wh-create__label">Webhook URL <span class="wh-create__required">*</span></label>
          <NkInput v-model="form.url" placeholder="https://example.com/webhook" />
        </div>

        <div class="wh-create__row">
          <div class="wh-create__field wh-create__field--half">
            <label class="wh-create__label">来源</label>
            <NkInput v-model="form.source" placeholder="system" />
          </div>
          <div class="wh-create__field wh-create__field--half">
            <label class="wh-create__label">标签</label>
            <NkInput v-model="tagsInput" placeholder="逗号分隔" @blur="applyTags" />
          </div>
        </div>

        <div class="wh-create__row">
          <div class="wh-create__field wh-create__field--half">
            <label class="wh-create__label">签名密钥</label>
            <NkInput v-model="form.signing_key" placeholder="signing_key" type="password" />
          </div>
          <div class="wh-create__field wh-create__field--half">
            <label class="wh-create__label">认证方式</label>
            <NkSelect v-model="form.auth_type" :options="authOptions" placeholder="不启用" clearable />
          </div>
        </div>

        <div v-if="form.auth_type" class="wh-create__field">
          <label class="wh-create__label">认证值</label>
          <NkInput v-model="form.auth_value" placeholder="认证值" type="password" />
        </div>

        <div class="wh-create__field">
          <label class="wh-create__label">自定义 Headers（JSON）</label>
          <NkInput v-model="customHeadersStr" placeholder='{"X-Custom": "value"}' />
        </div>

        <div class="wh-create__row">
          <div class="wh-create__field wh-create__field--half">
            <label class="wh-create__label">白名单关键字</label>
            <NkInput v-model="whitelistInput" placeholder="逗号分隔" @blur="applyWhitelist" />
          </div>
          <div class="wh-create__field wh-create__field--half">
            <label class="wh-create__label">匹配模式</label>
            <NkSelect v-model="form.whitelist_mode" :options="[{label:'任一匹配',value:'any'},{label:'全部匹配',value:'all'}]" />
          </div>
        </div>

        <div class="wh-create__row">
          <div class="wh-create__field wh-create__field--third">
            <label class="wh-create__label">每分钟上限</label>
            <NkInput v-model.number="form.max_per_minute" type="number" placeholder="60" />
          </div>
          <div class="wh-create__field wh-create__field--third">
            <label class="wh-create__label">每小时上限</label>
            <NkInput v-model.number="form.max_per_hour" type="number" placeholder="1000" />
          </div>
          <div class="wh-create__field wh-create__field--third">
            <label class="wh-create__label">超时 (ms)</label>
            <NkInput v-model.number="form.timeout_ms" type="number" placeholder="10000" />
          </div>
        </div>

        <div class="wh-create__field">
          <label class="wh-create__label">去重窗口（秒，0=不启用）</label>
          <NkInput v-model.number="form.dedup_window" type="number" placeholder="0" />
        </div>

        <div class="wh-create__actions">
          <NkButton variant="ghost" @click="$router.push('/webhook')">取消</NkButton>
          <NkButton :loading="saving" :disabled="!form.name || !form.type || !form.url" @click="handleSave">创建</NkButton>
        </div>
      </div>
    </NkCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { createConfig } from '@/api/webhook'
import { NKMessage } from '@nkui/vue/src/utils/message'

const router = useRouter()

const form = reactive({
  name: '',
  type: '' as string,
  url: '',
  source: 'system',
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
const saving = ref(false)

function applyTags() {
  form.tags = tagsInput.value.split(',').map(s => s.trim()).filter(Boolean)
}

function applyWhitelist() {
  form.whitelist_keywords = whitelistInput.value.split(',').map(s => s.trim()).filter(Boolean)
}

async function handleSave() {
  saving.value = true
  try {
    const payload: any = { ...form }
    if (customHeadersStr.value) {
      try { payload.custom_headers = JSON.parse(customHeadersStr.value) } catch { NKMessage.warning('自定义 Headers JSON 格式无效') }
    }
    if (!payload.signing_key) delete payload.signing_key
    if (!payload.auth_type) { delete payload.auth_type; delete payload.auth_value }
    if (!payload.auth_value) delete payload.auth_value
    if (payload.dedup_window === 0) delete payload.dedup_window

    await createConfig(payload)
    NKMessage.success('创建成功')
    router.push('/webhook')
  } catch (err: any) {
    NKMessage.error(err.message || '创建失败')
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.wh-create {
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
