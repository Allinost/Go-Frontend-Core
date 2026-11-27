<template>
  <div class="wh-create">
    <div class="wh-create__header">
      <h2 class="wh-create__title">创建 Webhook 配置</h2>
    </div>

    <NkCard class="wh-create__card">
      <NkForm
        ref="formRef"
        class="wh-create__form"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit="handleSave"
      >
        <div class="wh-create__row">
          <NkFormItem class="wh-create__field wh-create__field--half" label="名称" prop="name" required>
            <NkInput v-model="form.name" placeholder="配置名称" />
          </NkFormItem>
          <NkFormItem class="wh-create__field wh-create__field--half" label="类型" prop="type" required>
            <NkSelect v-model="form.type" :options="typeOptions" placeholder="选择类型" />
          </NkFormItem>
        </div>

        <NkFormItem class="wh-create__field" label="Webhook URL" prop="url" required>
          <NkInput v-model="form.url" placeholder="https://example.com/webhook" />
        </NkFormItem>

        <div class="wh-create__row">
          <NkFormItem class="wh-create__field wh-create__field--half" label="来源">
            <NkInput v-model="form.source" placeholder="system" />
          </NkFormItem>
          <NkFormItem class="wh-create__field wh-create__field--half" label="标签" help="多个标签用逗号分隔">
            <NkInput v-model="tagsInput" placeholder="逗号分隔" @blur="applyTags" />
          </NkFormItem>
        </div>

        <div class="wh-create__row">
          <NkFormItem class="wh-create__field wh-create__field--half" label="签名密钥">
            <NkInput v-model="form.signing_key" placeholder="signing_key" type="password" />
          </NkFormItem>
          <NkFormItem class="wh-create__field wh-create__field--half" label="认证方式">
            <NkSelect v-model="form.auth_type" :options="authOptions" placeholder="不启用" clearable />
          </NkFormItem>
        </div>

        <NkFormItem v-if="form.auth_type" class="wh-create__field" label="认证值" prop="auth_value">
          <NkInput v-model="form.auth_value" placeholder="认证值" type="password" />
        </NkFormItem>

        <NkFormItem class="wh-create__field" label="自定义 Headers（JSON）" prop="custom_headers" help='例如 {"X-Custom": "value"}'>
          <NkInput v-model="customHeadersStr" placeholder='{"X-Custom": "value"}' />
        </NkFormItem>

        <div class="wh-create__row">
          <NkFormItem class="wh-create__field wh-create__field--half" label="白名单关键字" help="多个关键字用逗号分隔">
            <NkInput v-model="whitelistInput" placeholder="逗号分隔" @blur="applyWhitelist" />
          </NkFormItem>
          <NkFormItem class="wh-create__field wh-create__field--half" label="匹配模式">
            <NkSelect v-model="form.whitelist_mode" :options="[{label:'任一匹配',value:'any'},{label:'全部匹配',value:'all'}]" />
          </NkFormItem>
        </div>

        <div class="wh-create__row">
          <NkFormItem class="wh-create__field wh-create__field--third" label="每分钟上限" prop="max_per_minute">
            <NkInput v-model.number="form.max_per_minute" type="number" placeholder="60" />
          </NkFormItem>
          <NkFormItem class="wh-create__field wh-create__field--third" label="每小时上限" prop="max_per_hour">
            <NkInput v-model.number="form.max_per_hour" type="number" placeholder="1000" />
          </NkFormItem>
          <NkFormItem class="wh-create__field wh-create__field--third" label="超时 (ms)" prop="timeout_ms">
            <NkInput v-model.number="form.timeout_ms" type="number" placeholder="10000" />
          </NkFormItem>
        </div>

        <NkFormItem class="wh-create__field" label="去重窗口（秒）" prop="dedup_window" help="0 表示不启用">
          <NkInput v-model.number="form.dedup_window" type="number" placeholder="0" />
        </NkFormItem>

        <div class="wh-create__actions">
          <NkButton variant="ghost" @click="$router.push('/webhook')">取消</NkButton>
          <NkButton type="primary" :loading="saving" @click="onSaveClick">创建</NkButton>
        </div>
      </NkForm>
    </NkCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { createConfig } from '@/api/webhook'
import { NKMessage, NkForm, NkFormItem, type FormRules } from '@nkui/vue'

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
const formRef = ref<InstanceType<typeof NkForm>>()

const nonNegative = (value: unknown) => Number(value) >= 0 || '不能为负数'

const rules: FormRules = {
  name: { required: true, message: '请输入配置名称', max: 64 },
  type: { required: true, message: '请选择类型' },
  url: {
    required: true,
    message: '请输入 Webhook 地址',
    pattern: /^https?:\/\/\S+$/,
  },
  max_per_minute: { validator: nonNegative },
  max_per_hour: { validator: nonNegative },
  timeout_ms: { validator: nonNegative },
  dedup_window: { validator: nonNegative },
}

async function onSaveClick() {
  if (await formRef.value?.validate()) handleSave()
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

.wh-create {
  @include respond-to(sm) {
    &__row {
      flex-direction: column;
      gap: 0;
    }

    &__field--half,
    &__field--third {
      flex: 1 1 auto;
    }
  }
}
</style>
