<template>
  <div class="goodser__tab">
    <div class="goodser__tab-header">
      <span class="goodser__count">标签、状态码与维度字典为全局共享配置</span>
    </div>

    <NkTabs v-model="settingsTab" :items="settingsTabs" />

    <div v-if="settingsTab === 'tags'" class="goodser__settings-section">
      <div class="goodser__settings-header">
        <span>标签管理</span>
        <NkButton size="xs" @click="openCreateTag">新建标签</NkButton>
      </div>
      <NkLoading v-if="loadingTags" />
      <div v-else class="goodser__settings-list">
        <div v-for="t in tags" :key="t._id" class="goodser__settings-item">
          <span class="goodser__settings-item-name">{{ t.name }}</span>
          <NkButton size="xs" variant="ghost" type="danger" @click="handleDeleteTag(t)">删除</NkButton>
        </div>
        <div v-if="!tags.length" class="goodser__empty"><NkEmpty description="暂无标签" /></div>
      </div>
    </div>

    <div v-if="settingsTab === 'statusCodes'" class="goodser__settings-section">
      <div class="goodser__settings-header">
        <span>状态码管理</span>
        <NkButton size="xs" @click="openCreateStatusCode">新建状态码</NkButton>
      </div>
      <NkLoading v-if="loadingStatusCodes" />
      <div v-else class="goodser__settings-list">
        <div v-for="sc in statusCodes" :key="sc._id" class="goodser__settings-item">
          <span class="goodser__settings-item-name">{{ sc.code }} - {{ sc.label }}</span>
          <NkButton
            v-if="!sc.is_system"
            size="xs"
            variant="ghost"
            type="danger"
            @click="handleDeleteStatusCode(sc)"
          >删除</NkButton>
          <NkTag v-else size="xs">系统</NkTag>
        </div>
        <div v-if="!statusCodes.length" class="goodser__empty"><NkEmpty description="暂无状态码" /></div>
      </div>
    </div>

    <div v-if="settingsTab === 'dictionaries'" class="goodser__settings-section">
      <div class="goodser__settings-header">
        <span>维度字典</span>
        <NkButton size="xs" @click="openCreateDictionary">新建{{ dictionaryKindLabel }}</NkButton>
      </div>
      <div class="goodser__kind-chips">
        <span
          v-for="kind in dictionaryKindOptions"
          :key="kind.value"
          class="goodser__kind-chip"
          :class="{ 'goodser__kind-chip--active': dictionaryKind === kind.value }"
          @click="dictionaryKind = kind.value"
        >{{ kind.label }}</span>
      </div>
      <NkLoading v-if="loadingDictionaries" />
      <div v-else class="goodser__settings-list">
        <div v-for="d in dictionariesForKind" :key="d._id" class="goodser__settings-item">
          <span class="goodser__settings-item-name">
            {{ d.name }}
            <span class="goodser__dictionary-code">{{ d.code }}</span>
            <span v-if="d.kind === 'character' && d.parent_id" class="goodser__dictionary-code">
              · {{ dictionaryName(d.parent_id) }}
            </span>
            <NkTag v-if="!d.enabled" size="xs" type="info" style="margin-left: 4px">停用</NkTag>
          </span>
          <span class="goodser__settings-item-actions">
            <NkButton size="xs" variant="ghost" @click="openEditDictionary(d)">编辑</NkButton>
            <NkButton size="xs" variant="ghost" type="danger" @click="handleDeleteDictionary(d)">删除</NkButton>
          </span>
        </div>
        <div v-if="!dictionariesForKind.length" class="goodser__empty">
          <NkEmpty :description="`暂无${dictionaryKindLabel}字典`" />
        </div>
      </div>
    </div>

    <div v-if="settingsTab === 'apiKeys'" class="goodser__settings-section">
      <div class="goodser__settings-header">
        <span>API 密钥（n8n / OpenClaw / LangBot）</span>
        <NkButton size="xs" @click="openCreateKey">新建密钥</NkButton>
      </div>
      <p class="goodser__return-tip">
        密钥只在创建时显示一次；不同工具建议使用不同密钥，并按需勾选最小权限。
      </p>
      <NkLoading v-if="loadingApiKeys" />
      <div v-else class="goodser__settings-list">
        <div v-for="key in apiKeys" :key="key.id" class="goodser__api-key">
          <div class="goodser__api-key-main">
            <div class="goodser__api-key-head">
              <span class="goodser__settings-item-name">{{ key.name }}</span>
              <NkTag size="xs" :type="key.status === 'active' ? 'success' : 'info'">
                {{ key.status === 'active' ? '启用' : '停用' }}
              </NkTag>
            </div>
            <div class="goodser__api-key-meta">
              <span class="goodser__api-key-prefix">{{ key.key_prefix }}…</span>
              <span>{{ key.scopes || '未设置权限' }}</span>
              <span>{{ keyExpiresText(key) }}</span>
              <span v-if="key.last_used_at">最近使用 {{ String(key.last_used_at).slice(0, 10) }}</span>
            </div>
          </div>
          <div class="goodser__settings-item-actions">
            <NkButton size="xs" variant="ghost" @click="toggleKeyStatus(key)">
              {{ key.status === 'active' ? '停用' : '启用' }}
            </NkButton>
            <NkButton size="xs" variant="ghost" type="danger" @click="askDeleteKey(key)">删除</NkButton>
          </div>
        </div>
        <div v-if="!apiKeys.length" class="goodser__empty">
          <NkEmpty description="暂无 API 密钥，点击右上角新建" />
        </div>
      </div>
    </div>

    <!-- 新建 API 密钥 -->
    <NkDialog v-model:visible="showKeyDialog" title="新建 API 密钥" :width="520">
      <div class="goodser__product-form">
        <div class="goodser__form-field">
          <label class="goodser__form-label">名称 *</label>
          <NkInput v-model="keyForm.name" placeholder="例如 n8n 生产" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">权限范围 *</label>
          <div class="goodser__scope-list">
            <NkCheckbox
              v-for="scope in scopeOptions"
              :key="scope.value"
              :model-value="keyForm.scopes.includes(scope.value)"
              @change="toggleKeyScope(scope.value)"
            >{{ scope.label }}</NkCheckbox>
          </div>
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">有效期</label>
          <NkSelect v-model="keyForm.expiresDays" :options="expiresOptions" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showKeyDialog = false">取消</NkButton>
        <NkButton
          :loading="savingKey"
          :disabled="!keyForm.name.trim() || !keyForm.scopes.length"
          @click="handleCreateKey"
        >创建</NkButton>
      </template>
    </NkDialog>

    <!-- 新密钥只显示一次 -->
    <NkDialog :visible="!!createdKey" title="密钥已创建" :width="560" @update:visible="createdKey = null">
      <p class="goodser__return-tip">请立即复制并保存，关闭后无法再次查看完整密钥。</p>
      <div class="goodser__raw-key">{{ createdKey?.raw_key }}</div>
      <template #footer>
        <NkButton variant="ghost" @click="createdKey = null">关闭</NkButton>
        <NkButton @click="copyCreatedKey">复制密钥</NkButton>
      </template>
    </NkDialog>

    <ConfirmDialog
      v-model:visible="showDeleteKeyDialog"
      title="删除 API 密钥"
      :message="`确定删除「${deletingKey?.name || ''}」吗？使用该密钥的集成将立即失效。`"
      confirm-text="删除"
      danger
      :loading="savingKey"
      @confirm="handleDeleteKey"
    />

    <NkDialog v-model:visible="showCreateTagDialog" title="新建标签" :width="400">
      <NkInput v-model="newTagName" placeholder="标签名称" />
      <NkInput v-model="newTagColor" placeholder="颜色 (例如 #1890ff)" style="margin-top: 8px" />
      <template #footer>
        <NkButton variant="ghost" @click="showCreateTagDialog = false">取消</NkButton>
        <NkButton :loading="saving" :disabled="!newTagName.trim()" @click="handleCreateTag">确定</NkButton>
      </template>
    </NkDialog>

    <!-- 新建状态码 -->
    <NkDialog v-model:visible="showCreateCodeDialog" title="新建状态码" :width="400">
      <NkInput v-model="newCode.code" placeholder="编码 (例如 in_stock)" />
      <NkInput v-model="newCode.label" placeholder="显示名称 (例如 在库)" style="margin-top: 8px" />
      <template #footer>
        <NkButton variant="ghost" @click="showCreateCodeDialog = false">取消</NkButton>
        <NkButton
          :loading="saving"
          :disabled="!newCode.code.trim() || !newCode.label.trim()"
          @click="handleCreateStatusCode"
        >确定</NkButton>
      </template>
    </NkDialog>

    <!-- 新建/编辑字典 -->
    <NkDialog
      v-model:visible="showDictionaryDialog"
      :title="(editingDictionary ? '编辑' : '新建') + dictionaryKindLabel"
      :width="440"
    >
      <div class="goodser__product-form">
        <div v-if="dictionaryKind === 'character'" class="goodser__form-field">
          <label class="goodser__form-label">所属系列</label>
          <NkSelect v-model="dictionaryForm.parent_id" :options="parentSeriesOptions" placeholder="不归属系列" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">名称 *</label>
          <NkInput v-model="dictionaryForm.name" placeholder="显示名称" />
        </div>
        <div class="goodser__form-field">
          <label class="goodser__form-label">编码 *</label>
          <NkInput v-model="dictionaryForm.code" placeholder="唯一编码，例如 genshin" />
        </div>
        <div class="goodser__form-row">
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">排序</label>
            <NkInput v-model="dictionaryForm.sort_order" type="number" placeholder="0" />
          </div>
          <div class="goodser__form-field goodser__form-field--half">
            <label class="goodser__form-label">启用</label>
            <div style="padding-top: 6px">
              <NkCheckbox v-model="dictionaryForm.enabled">启用</NkCheckbox>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="showDictionaryDialog = false">取消</NkButton>
        <NkButton
          :loading="saving"
          :disabled="!dictionaryForm.name.trim() || !dictionaryForm.code.trim()"
          @click="handleSaveDictionary"
        >保存</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  addStatusCode,
  createDictionary,
  createTag,
  deleteDictionary,
  deleteTag,
  removeStatusCode,
  updateDictionary,
} from '@/api/goodser'
import {
  createAPIKey,
  deleteAPIKey,
  listAPIKeys,
  updateAPIKey,
  type APIKey,
  type CreatedAPIKey,
} from '@/api/auth'
import type { Dictionary, DictionaryKind, GoodserTag, StatusCode } from '@/types/goodser'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  tags: GoodserTag[]
  statusCodes: StatusCode[]
  dictionaries: Dictionary[]
  loadingTags: boolean
  loadingStatusCodes: boolean
  loadingDictionaries: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh', kind: 'tags' | 'statusCodes' | 'dictionaries'): void
}>()

const saving = ref(false)
const settingsTab = ref('tags')
const settingsTabs = [
  { label: '标签管理', value: 'tags' },
  { label: '状态码', value: 'statusCodes' },
  { label: '维度字典', value: 'dictionaries' },
  { label: 'API 密钥', value: 'apiKeys' },
]

// ---- 标签 ----
const showCreateTagDialog = ref(false)
const newTagName = ref('')
const newTagColor = ref('#1890ff')

function openCreateTag() {
  newTagName.value = ''
  newTagColor.value = '#1890ff'
  showCreateTagDialog.value = true
}

async function handleCreateTag() {
  if (!newTagName.value.trim()) return
  saving.value = true
  try {
    await createTag({ name: newTagName.value.trim(), color: newTagColor.value || null })
    NKMessage.success('创建成功')
    showCreateTagDialog.value = false
    emit('refresh', 'tags')
  } catch (err: any) {
    NKMessage.error(err.message || '创建失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteTag(tag: GoodserTag) {
  saving.value = true
  try {
    await deleteTag({ id: tag._id })
    NKMessage.success('已删除')
    emit('refresh', 'tags')
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败，可能仍被商品引用')
  } finally {
    saving.value = false
  }
}

// ---- 状态码 ----
const showCreateCodeDialog = ref(false)
const newCode = ref({ code: '', label: '' })

function openCreateStatusCode() {
  newCode.value = { code: '', label: '' }
  showCreateCodeDialog.value = true
}

async function handleCreateStatusCode() {
  if (!newCode.value.code.trim() || !newCode.value.label.trim()) return
  saving.value = true
  try {
    await addStatusCode({ code: newCode.value.code.trim(), label: newCode.value.label.trim() })
    NKMessage.success('创建成功')
    showCreateCodeDialog.value = false
    emit('refresh', 'statusCodes')
  } catch (err: any) {
    NKMessage.error(err.message || '创建失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteStatusCode(sc: StatusCode) {
  saving.value = true
  try {
    await removeStatusCode({ id: sc._id })
    NKMessage.success('已删除')
    emit('refresh', 'statusCodes')
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  } finally {
    saving.value = false
  }
}

// ---- 维度字典 ----
const dictionaryKind = ref<DictionaryKind>('series')
const showDictionaryDialog = ref(false)
const editingDictionary = ref<Dictionary | null>(null)
const dictionaryForm = ref({
  name: '',
  code: '',
  parent_id: '',
  sort_order: 0,
  enabled: true,
})
const dictionaryKindOptions: Array<{ label: string; value: DictionaryKind }> = [
  { label: '系列', value: 'series' },
  { label: '角色', value: 'character' },
  { label: '套型', value: 'set_type' },
  { label: '商品类型', value: 'product_type' },
]
const dictionaryKindLabel = computed(
  () => dictionaryKindOptions.find((k) => k.value === dictionaryKind.value)?.label || '字典',
)
const dictionariesForKind = computed(() =>
  props.dictionaries.filter((d) => d.kind === dictionaryKind.value),
)
const parentSeriesOptions = computed(() => [
  { label: '不归属系列', value: '' },
  ...props.dictionaries
    .filter((d) => d.kind === 'series' && d.enabled)
    .map((d) => ({ label: d.name, value: d._id })),
])

function dictionaryName(id?: string | null) {
  if (!id) return '-'
  return props.dictionaries.find((d) => d._id === id)?.name || id
}

function openCreateDictionary() {
  editingDictionary.value = null
  dictionaryForm.value = { name: '', code: '', parent_id: '', sort_order: 0, enabled: true }
  showDictionaryDialog.value = true
}

function openEditDictionary(item: Dictionary) {
  editingDictionary.value = item
  dictionaryForm.value = {
    name: item.name,
    code: item.code,
    parent_id: item.parent_id || '',
    sort_order: item.sort_order,
    enabled: item.enabled,
  }
  showDictionaryDialog.value = true
}

async function handleSaveDictionary() {
  const form = dictionaryForm.value
  if (!form.name.trim() || !form.code.trim()) return
  saving.value = true
  try {
    const parentId = dictionaryKind.value === 'character' ? form.parent_id || '' : null
    if (editingDictionary.value) {
      await updateDictionary({
        id: editingDictionary.value._id,
        name: form.name.trim(),
        code: form.code.trim(),
        parent_id: parentId,
        sort_order: Number(form.sort_order) || 0,
        enabled: form.enabled,
      })
      NKMessage.success('更新成功')
    } else {
      await createDictionary({
        kind: dictionaryKind.value,
        name: form.name.trim(),
        code: form.code.trim(),
        parent_id: parentId,
        sort_order: Number(form.sort_order) || 0,
        enabled: form.enabled,
      })
      NKMessage.success('创建成功')
    }
    showDictionaryDialog.value = false
    emit('refresh', 'dictionaries')
  } catch (err: any) {
    NKMessage.error(err.message || '保存字典失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteDictionary(item: Dictionary) {
  saving.value = true
  try {
    await deleteDictionary(item._id)
    NKMessage.success('已删除')
    emit('refresh', 'dictionaries')
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败，可能仍被引用')
  } finally {
    saving.value = false
  }
}

// ---- API 密钥 ----
const apiKeys = ref<APIKey[]>([])
const loadingApiKeys = ref(false)
const savingKey = ref(false)
const showKeyDialog = ref(false)
const createdKey = ref<CreatedAPIKey | null>(null)
const showDeleteKeyDialog = ref(false)
const deletingKey = ref<APIKey | null>(null)
const keyForm = ref({ name: '', scopes: [] as string[], expiresDays: '0' })
const scopeOptions = [
  { label: '店主只读 owner:read', value: 'owner:read' },
  { label: '店主写入 owner:write', value: 'owner:write' },
  { label: '客服只读 customer:read', value: 'customer:read' },
  { label: '客服下单 customer:order_request', value: 'customer:order_request' },
  { label: '集成管理 integration:manage', value: 'integration:manage' },
]
const expiresOptions = [
  { label: '永久有效', value: '0' },
  { label: '30 天', value: '30' },
  { label: '90 天', value: '90' },
  { label: '365 天', value: '365' },
]

async function fetchAPIKeys() {
  loadingApiKeys.value = true
  try {
    const res = await listAPIKeys({ page: 1, page_size: 100 })
    const payload = res.data
    apiKeys.value = Array.isArray(payload) ? payload : payload?.data || []
  } catch (err: any) {
    apiKeys.value = []
    NKMessage.error(err.message || '加载 API 密钥失败')
  } finally {
    loadingApiKeys.value = false
  }
}

function openCreateKey() {
  keyForm.value = { name: '', scopes: ['owner:read'], expiresDays: '0' }
  createdKey.value = null
  showKeyDialog.value = true
}

function toggleKeyScope(value: string) {
  const scopes = keyForm.value.scopes
  const index = scopes.indexOf(value)
  if (index >= 0) scopes.splice(index, 1)
  else scopes.push(value)
}

async function handleCreateKey() {
  if (!keyForm.value.name.trim() || !keyForm.value.scopes.length) return
  savingKey.value = true
  try {
    const days = Number(keyForm.value.expiresDays) || 0
    const res = await createAPIKey({
      name: keyForm.value.name.trim(),
      scopes: keyForm.value.scopes.join(' '),
      expires_in: days > 0 ? `${days * 24}h` : '',
    })
    createdKey.value = res.data || null
    showKeyDialog.value = false
    await fetchAPIKeys()
    NKMessage.success('密钥已创建')
  } catch (err: any) {
    NKMessage.error(err.message || '创建密钥失败')
  } finally {
    savingKey.value = false
  }
}

async function toggleKeyStatus(item: APIKey) {
  try {
    await updateAPIKey(item.id, { status: item.status === 'active' ? 'disabled' : 'active' })
    await fetchAPIKeys()
  } catch (err: any) {
    NKMessage.error(err.message || '更新密钥状态失败')
  }
}

function askDeleteKey(item: APIKey) {
  deletingKey.value = item
  showDeleteKeyDialog.value = true
}

async function handleDeleteKey() {
  if (!deletingKey.value) return
  savingKey.value = true
  try {
    await deleteAPIKey(deletingKey.value.id)
    NKMessage.success('已删除')
    showDeleteKeyDialog.value = false
    deletingKey.value = null
    await fetchAPIKeys()
  } catch (err: any) {
    NKMessage.error(err.message || '删除密钥失败')
  } finally {
    savingKey.value = false
  }
}

async function copyCreatedKey() {
  const raw = createdKey.value?.raw_key
  if (!raw) return
  try {
    await navigator.clipboard.writeText(raw)
    NKMessage.success('已复制到剪贴板')
  } catch {
    NKMessage.warning('复制失败，请手动选择文本复制')
  }
}

function keyExpiresText(item: APIKey) {
  if (!item.expires_at) return '永久'
  return `到期 ${String(item.expires_at).slice(0, 10)}`
}

onMounted(fetchAPIKeys)
</script>

<style lang="scss" scoped>
@use '../styles/shared';

.goodser {
  &__settings-section {
    margin-top: $nk-spacing-md;
  }

  &__settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $nk-spacing-sm;
    font-weight: $nk-font-weight-medium;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-700;
  }

  &__settings-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__settings-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $nk-spacing-xs $nk-spacing-sm;
    border-radius: $nk-radius-md;
    background: $nk-color-neutral-50;
    font-size: $nk-font-size-sm;
    gap: $nk-spacing-sm;
  }

  &__settings-item-name {
    color: $nk-color-neutral-800;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__settings-item-actions {
    display: flex;
    gap: $nk-spacing-xs;
    flex-shrink: 0;
  }

  &__dictionary-code {
    margin-left: 6px;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-400;
    font-family: $nk-font-family-mono;
  }

  &__kind-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: $nk-spacing-sm;
  }

  &__kind-chip {
    padding: 3px 12px;
    border-radius: 16px;
    font-size: $nk-font-size-xs;
    background: $nk-color-neutral-100;
    color: $nk-color-neutral-600;
    cursor: pointer;
    user-select: none;
    transition: all $nk-duration-fast;

    &:hover {
      background: $nk-color-neutral-200;
    }

    &--active {
      background: $nk-color-neutral-100;
      color: $nk-color-primary-600;
      font-weight: $nk-font-weight-medium;
    }
  }

  &__api-key {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: $nk-spacing-sm;
    padding: $nk-spacing-sm;
    border-radius: $nk-radius-md;
    background: $nk-color-neutral-50;
    font-size: $nk-font-size-sm;
  }

  &__api-key-main {
    min-width: 0;
    flex: 1;
  }

  &__api-key-head {
    display: flex;
    align-items: center;
    gap: $nk-spacing-xs;
    margin-bottom: 2px;
  }

  &__api-key-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__api-key-prefix {
    font-family: $nk-font-family-mono;
    color: $nk-color-neutral-600;
  }

  &__scope-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__raw-key {
    margin-top: $nk-spacing-sm;
    padding: $nk-spacing-sm $nk-spacing-md;
    border-radius: $nk-radius-md;
    background: $nk-color-neutral-100;
    font-family: $nk-font-family-mono;
    font-size: $nk-font-size-sm;
    word-break: break-all;
    color: $nk-color-neutral-900;
  }
}
</style>
