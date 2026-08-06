<template>
  <div class="servicenav">
    <h2 class="servicenav__title">服务导航</h2>

    <NkTabs v-model="activeTab" :items="tabs" @change="onTabChange" />

    <div class="servicenav__note">
      访问规则：开启内网访问时，访问地址、内网端口与 EasyTier 端口均按所选「传输协议」（http/https 等）拼接跳转；关闭内网访问时，访问地址默认以 https 跳转，内网与 EasyTier 仍跟随所选协议。
    </div>

    <!-- 服务列表 -->
    <div v-if="activeTab === 'services'" class="servicenav__tab">
      <div class="servicenav__toolbar">
        <NkInput
          v-model="keyword"
          placeholder="搜索服务名称..."
          clearable
          size="sm"
          @clear="onSearch"
        />
        <NkButton size="sm" @click="onSearch">搜索</NkButton>
        <NkSelect
          v-model="filterType"
          :options="typeOptions"
          placeholder="类型筛选"
          clearable
          filterable
          size="sm"
          style="width: 160px"
          @change="onSearch"
        />
        <NkSelect
          v-model="sortBy"
          :options="sortByOptions"
          size="sm"
          style="width: 130px"
          @change="onSearch"
        />
        <NkSelect
          v-model="sortOrder"
          :options="sortOrderOptions"
          size="sm"
          style="width: 110px"
          @change="onSearch"
        />
        <div class="servicenav__toolbar-spacer" />
        <NkButton size="sm" type="primary" @click="openCreateDialog">新建服务</NkButton>
      </div>

      <NkCard class="servicenav__card">
        <NkLoading v-if="listLoading" />

        <div v-else-if="services.length === 0" class="servicenav__empty">
          <NkEmpty description="暂无服务数据" />
        </div>

        <div v-else class="servicenav__table-wrap">
          <table class="servicenav__table">
            <thead>
              <tr>
                <th>名称</th>
                <th>类型</th>
                <th>协议</th>
                <th>访问地址</th>
                <th>内网端口</th>
                <th>EasyTier 端口</th>
                <th>账号</th>
                <th>备注</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in services" :key="item._id">
                <td class="servicenav__cell-name">{{ item.name }}</td>
                <td>
                  <div class="servicenav__cell-types">
                    <NkTag v-for="t in item.types" :key="t" size="sm" variant="outline" type="info" style="margin: 1px 4px 1px 0">
                      {{ t }}
                    </NkTag>
                    <span v-if="!item.types?.length" class="servicenav__cell-placeholder">-</span>
                  </div>
                </td>
                <td>
                  <NkTag size="sm" :type="protocolTagType(item)">{{ protocolDisplay(item) }}</NkTag>
                </td>
                <td>
                  <a v-if="item.address" class="servicenav__link" :href="addressHref(item)" target="_blank" rel="noopener noreferrer">
                    {{ item.address }}
                  </a>
                  <span v-else class="servicenav__cell-placeholder">-</span>
                </td>
                <td>
                  <a v-if="item.intranet_port != null" class="servicenav__link" :href="intranetHref(item)" target="_blank" rel="noopener noreferrer">
                    {{ item.intranet_port }}
                  </a>
                  <span v-else class="servicenav__cell-placeholder">不支持内网访问</span>
                </td>
                <td>
                  <a v-if="item.easytier_port != null" class="servicenav__link" :href="easytierHref(item)" target="_blank" rel="noopener noreferrer">
                    {{ item.easytier_port }}
                  </a>
                  <span v-else class="servicenav__cell-placeholder">-</span>
                </td>
                <td>{{ item.account || '-' }}</td>
                <td class="servicenav__cell-remark">{{ item.remark || '-' }}</td>
                <td class="servicenav__cell-time">{{ formatDate(item.created_at) }}</td>
                <td>
                  <div class="servicenav__actions">
                    <NkButton size="sm" variant="ghost" @click="openEditDialog(item)">编辑</NkButton>
                    <NkButton size="sm" variant="ghost" type="danger" @click="confirmDeleteService(item)">删除</NkButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </NkCard>

      <div class="servicenav__pagination">
        <NkPagination v-model="page" :total="total" :page-size="pageSize" @change="fetchServices" />
      </div>
    </div>

    <!-- 类型管理 -->
    <div v-if="activeTab === 'types'" class="servicenav__tab">
      <div class="servicenav__toolbar">
        <NkButton size="sm" type="primary" @click="openCreateTypeDialog">新建类型</NkButton>
      </div>

      <NkCard class="servicenav__card">
        <NkLoading v-if="typesLoading" />
        <div v-else-if="types.length === 0" class="servicenav__empty">
          <NkEmpty description="暂无类型数据" />
        </div>
        <div v-else class="servicenav__table-wrap">
          <table class="servicenav__table">
            <thead>
              <tr>
                <th>名称</th>
                <th>备注</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="type in types" :key="type._id">
                <td class="servicenav__cell-name">{{ type.name }}</td>
                <td>{{ type.remark || '-' }}</td>
                <td class="servicenav__cell-time">{{ formatDate(type.created_at) }}</td>
                <td>
                  <div class="servicenav__actions">
                    <NkButton size="sm" variant="ghost" @click="openEditTypeDialog(type)">编辑</NkButton>
                    <NkButton size="sm" variant="ghost" type="danger" @click="confirmDeleteType(type)">删除</NkButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </NkCard>
    </div>

    <!-- 服务创建/编辑弹窗 -->
    <NkDialog v-model:visible="serviceDialog.visible" :title="serviceDialog.isEdit ? '编辑服务' : '新建服务'" :width="560">
      <div class="servicenav__form">
        <div class="servicenav__form-row">
          <label class="servicenav__form-label">服务名称 <span class="servicenav__required">*</span></label>
          <NkInput v-model="serviceForm.name" placeholder="输入服务名称" :error="serviceNameError" />
        </div>
        <div class="servicenav__form-row">
          <label class="servicenav__form-label">类型 <span class="servicenav__required">*</span></label>
          <NkSelect
            v-model="serviceForm.types"
            :options="typeOptions"
            multiple
            filterable
            placeholder="请选择类型（可多选）"
          />
        </div>
        <div class="servicenav__form-row">
          <label class="servicenav__form-label">传输协议</label>
          <input
            v-model="serviceForm.protocol"
            list="protocol-presets"
            class="servicenav__protocol-input"
            placeholder="默认 http，可手动输入其它协议"
            maxlength="20"
          />
          <datalist id="protocol-presets">
            <option v-for="p in PROTOCOL_PRESETS" :key="p" :value="p" />
          </datalist>
        </div>
        <div class="servicenav__form-row">
          <label class="servicenav__form-label">访问地址</label>
          <NkInput v-model="serviceForm.address" placeholder="如 files.home.lan 或 https://files.home.lan" />
        </div>
        <div class="servicenav__form-row">
          <div class="servicenav__form-inline">
            <div class="servicenav__form-field">
              <label class="servicenav__form-label">支持内网访问</label>
              <NkSwitch v-model="intranetEnabled" size="sm" />
            </div>
            <div class="servicenav__form-field">
              <label class="servicenav__form-label">内网端口</label>
              <NkInput v-model="serviceForm.intranet_port" type="number" min="0" placeholder="如 8080" :disabled="!intranetEnabled" />
            </div>
          </div>
        </div>
        <div class="servicenav__form-row">
          <label class="servicenav__form-label">EasyTier 端口</label>
          <NkInput v-model="serviceForm.easytier_port" type="number" min="0" placeholder="如 20001" />
        </div>
        <div class="servicenav__form-row">
          <label class="servicenav__form-label">账号</label>
          <NkInput v-model="serviceForm.account" placeholder="登录账号（可选）" />
        </div>
        <div class="servicenav__form-row">
          <label class="servicenav__form-label">密码提示</label>
          <NkInput v-model="serviceForm.password_hint" placeholder="如：首次部署时的默认密码" />
        </div>
        <div class="servicenav__form-row">
          <label class="servicenav__form-label">备注</label>
          <NkInput v-model="serviceForm.remark" placeholder="备注（可选）" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="serviceDialog.visible = false">取消</NkButton>
        <NkButton type="primary" :loading="serviceSaving" @click="submitService">{{ serviceDialog.isEdit ? '保存' : '创建' }}</NkButton>
      </template>
    </NkDialog>

    <!-- 类型创建/编辑弹窗 -->
    <NkDialog v-model:visible="typeDialog.visible" :title="typeDialog.isEdit ? '编辑类型' : '新建类型'" :width="440">
      <div class="servicenav__form">
        <div class="servicenav__form-row">
          <label class="servicenav__form-label">类型名称 <span class="servicenav__required">*</span></label>
          <NkInput v-model="typeForm.name" placeholder="如 web / file" :error="typeNameError" />
        </div>
        <div class="servicenav__form-row">
          <label class="servicenav__form-label">备注</label>
          <NkInput v-model="typeForm.remark" placeholder="备注（可选）" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="typeDialog.visible = false">取消</NkButton>
        <NkButton type="primary" :loading="typeSaving" @click="submitType">{{ typeDialog.isEdit ? '保存' : '创建' }}</NkButton>
      </template>
    </NkDialog>

    <!-- 删除确认 -->
    <NkDialog v-model:visible="deleteServiceDialog" title="确认删除" :width="400">
      <p>确定要删除服务 <strong>{{ deletingService?.name }}</strong> 吗？此操作不可恢复。</p>
      <template #footer>
        <NkButton variant="ghost" @click="deleteServiceDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="deletingServiceLoading" @click="handleDeleteService">确认删除</NkButton>
      </template>
    </NkDialog>

    <NkDialog v-model:visible="deleteTypeDialog" title="确认删除" :width="400">
      <p>确定要删除类型 <strong>{{ deletingType?.name }}</strong> 吗？</p>
      <template #footer>
        <NkButton variant="ghost" @click="deleteTypeDialog = false">取消</NkButton>
        <NkButton type="danger" :loading="deletingTypeLoading" @click="handleDeleteType">确认删除</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  listServices,
  createService,
  updateService,
  deleteService,
  listTypes,
  createType,
  updateType,
  deleteType,
} from '@/api/servicenav'
import type { ServiceItem, ServiceType, CreateServiceRequest } from '@/api/servicenav'

const activeTab = ref<'services' | 'types'>('services')
const tabs = [
  { label: '服务列表', value: 'services' },
  { label: '类型管理', value: 'types' },
]

const listLoading = ref(false)
const services = ref<ServiceItem[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)
const keyword = ref('')
const filterType = ref('')
const sortBy = ref('name')
const sortOrder = ref('asc')

const sortByOptions = [
  { label: '按名称', value: 'name' },
  { label: '按创建时间', value: 'created_at' },
]
const sortOrderOptions = [
  { label: '升序', value: 'asc' },
  { label: '降序', value: 'desc' },
]

const types = ref<ServiceType[]>([])
const typesLoading = ref(false)
const typeOptions = computed(() =>
  types.value.map((t) => ({ label: t.name, value: t.name })),
)

async function fetchTypes() {
  typesLoading.value = true
  try {
    const res = await listTypes()
    types.value = res.data ?? []
  } catch (e: any) {
    NKMessage.error(e.message || '加载类型列表失败')
  } finally {
    typesLoading.value = false
  }
}

async function fetchServices() {
  listLoading.value = true
  try {
    const res = await listServices({
      page: page.value,
      page_size: pageSize,
      keyword: keyword.value || undefined,
      type: filterType.value || undefined,
      sort_by: sortBy.value as any,
      sort_order: sortOrder.value as any,
    })
    const data = res.data
    services.value = data?.items ?? []
    total.value = data?.total ?? 0
  } catch (e: any) {
    NKMessage.error(e.message || '加载服务列表失败')
  } finally {
    listLoading.value = false
  }
}

function onSearch() {
  page.value = 1
  fetchServices()
}

function onTabChange(value: string | number) {
  activeTab.value = value as 'services' | 'types'
  if (activeTab.value === 'services') fetchServices()
  else fetchTypes()
}

const serviceDialog = reactive<{ visible: boolean; isEdit: boolean; editId: string }>({
  visible: false,
  isEdit: false,
  editId: '',
})
const serviceSaving = ref(false)
const serviceForm = reactive({
  name: '',
  types: [] as string[],
  protocol: '',
  address: '',
  intranet_port: '',
  easytier_port: '',
  account: '',
  password_hint: '',
  remark: '',
})
const intranetEnabled = ref(false)
const serviceNameError = ref('')

const PROTOCOL_PRESETS = ['http', 'https', 'ftp', 'ws', 'wss', 'ssh']

function resetServiceForm() {
  serviceForm.name = ''
  serviceForm.types = []
  serviceForm.protocol = ''
  serviceForm.address = ''
  serviceForm.intranet_port = ''
  serviceForm.easytier_port = ''
  serviceForm.account = ''
  serviceForm.password_hint = ''
  serviceForm.remark = ''
  intranetEnabled.value = false
  serviceNameError.value = ''
}

function openCreateDialog() {
  serviceDialog.isEdit = false
  serviceDialog.editId = ''
  resetServiceForm()
  serviceForm.protocol = 'http'
  serviceDialog.visible = true
}

function openEditDialog(item: ServiceItem) {
  serviceDialog.isEdit = true
  serviceDialog.editId = item._id
  serviceForm.name = item.name
  serviceForm.types = [...(item.types || [])]
  serviceForm.protocol = item.protocol
  serviceForm.address = item.address || ''
  serviceForm.intranet_port = item.intranet_port != null ? String(item.intranet_port) : ''
  serviceForm.easytier_port = item.easytier_port != null ? String(item.easytier_port) : ''
  serviceForm.account = item.account || ''
  serviceForm.password_hint = item.password_hint || ''
  serviceForm.remark = item.remark || ''
  intranetEnabled.value = item.intranet_port != null
  serviceNameError.value = ''
  serviceDialog.visible = true
}

function buildServicePayload() {
  const payload: Record<string, any> = {
    name: serviceForm.name.trim(),
    types: [...serviceForm.types],
    address: serviceForm.address.trim(),
    account: serviceForm.account.trim(),
    password_hint: serviceForm.password_hint.trim(),
    remark: serviceForm.remark.trim(),
  }
  const protocolVal = serviceForm.protocol.trim()
  if (protocolVal) {
    payload.protocol = protocolVal
  } else if (!serviceDialog.isEdit) {
    payload.protocol = 'http'
  }
  if (intranetEnabled.value) {
    const port = serviceForm.intranet_port === '' ? null : Number(serviceForm.intranet_port)
    payload.intranet_port = port
    if (port === null) payload.clear_intranet_port = true
  } else {
    payload.intranet_port = null
    payload.clear_intranet_port = true
  }
  const et = serviceForm.easytier_port === '' ? null : Number(serviceForm.easytier_port)
  payload.easytier_port = et
  if (et === null) payload.clear_easytier_port = true
  return payload
}

async function submitService() {
  serviceNameError.value = ''
  if (!serviceForm.name.trim()) {
    serviceNameError.value = '名称不能为空'
    NKMessage.warning('请填写服务名称')
    return
  }
  if (serviceForm.types.length === 0) {
    NKMessage.warning('请至少选择一种类型')
    return
  }
  serviceSaving.value = true
  try {
    const payload = buildServicePayload()
    if (serviceDialog.isEdit) {
      await updateService(serviceDialog.editId, payload)
      NKMessage.success('服务更新成功')
    } else {
      await createService(payload as CreateServiceRequest)
      NKMessage.success('服务创建成功')
    }
    serviceDialog.visible = false
    fetchServices()
  } catch (e: any) {
    handleServiceError(e)
  } finally {
    serviceSaving.value = false
  }
}

function handleServiceError(e: any) {
  const msg = e.message || '操作失败'
  if (msg.includes('已存在')) {
    serviceNameError.value = '名称已存在'
  }
  NKMessage.error(msg)
}

const deleteServiceDialog = ref(false)
const deletingService = ref<ServiceItem | null>(null)
const deletingServiceLoading = ref(false)

function confirmDeleteService(item: ServiceItem) {
  deletingService.value = item
  deleteServiceDialog.value = true
}

async function handleDeleteService() {
  if (!deletingService.value) return
  deletingServiceLoading.value = true
  try {
    await deleteService(deletingService.value._id)
    NKMessage.success('服务已删除')
    deleteServiceDialog.value = false
    fetchServices()
  } catch (e: any) {
    NKMessage.error(e.message || '删除失败')
  } finally {
    deletingServiceLoading.value = false
  }
}

const typeDialog = reactive<{ visible: boolean; isEdit: boolean; editId: string }>({
  visible: false,
  isEdit: false,
  editId: '',
})
const typeSaving = ref(false)
const typeForm = reactive({ name: '', remark: '' })
const typeNameError = ref('')

function resetTypeForm() {
  typeForm.name = ''
  typeForm.remark = ''
  typeNameError.value = ''
}

function openCreateTypeDialog() {
  typeDialog.isEdit = false
  typeDialog.editId = ''
  resetTypeForm()
  typeDialog.visible = true
}

function openEditTypeDialog(type: ServiceType) {
  typeDialog.isEdit = true
  typeDialog.editId = type._id
  typeForm.name = type.name
  typeForm.remark = type.remark || ''
  typeNameError.value = ''
  typeDialog.visible = true
}

async function submitType() {
  typeNameError.value = ''
  if (!typeForm.name.trim()) {
    typeNameError.value = '名称不能为空'
    NKMessage.warning('请填写类型名称')
    return
  }
  typeSaving.value = true
  try {
    const payload = { name: typeForm.name.trim(), remark: typeForm.remark.trim() || undefined }
    if (typeDialog.isEdit) {
      await updateType(typeDialog.editId, payload)
      NKMessage.success('类型更新成功')
    } else {
      await createType(payload)
      NKMessage.success('类型创建成功')
    }
    typeDialog.visible = false
    fetchTypes()
  } catch (e: any) {
    const msg = e.message || '操作失败'
    if (msg.includes('已存在')) typeNameError.value = '名称已存在'
    NKMessage.error(msg)
  } finally {
    typeSaving.value = false
  }
}

const deleteTypeDialog = ref(false)
const deletingType = ref<ServiceType | null>(null)
const deletingTypeLoading = ref(false)

function confirmDeleteType(type: ServiceType) {
  deletingType.value = type
  deleteTypeDialog.value = true
}

async function handleDeleteType() {
  if (!deletingType.value) return
  deletingTypeLoading.value = true
  try {
    await deleteType(deletingType.value._id)
    NKMessage.success('类型已删除')
    deleteTypeDialog.value = false
    fetchTypes()
  } catch (e: any) {
    const msg = e.message || '删除失败'
    if (msg.includes('已被服务条目引用')) {
      NKMessage.error('服务类型已被服务条目引用，无法删除')
    } else {
      NKMessage.error(msg)
    }
  } finally {
    deletingTypeLoading.value = false
  }
}

function protocolDisplay(item: ServiceItem): string {
  return item.protocol || 'http'
}

function protocolTagType(item: ServiceItem): string {
  return (item.protocol || 'http') === 'https' ? 'primary' : 'info'
}

const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//

function withScheme(target: string, proto: string): string {
  if (SCHEME_RE.test(target)) return target
  return `${proto}://${target}`
}

function addressHref(item: ServiceItem): string {
  const intranetOn = item.intranet_port != null
  const proto = intranetOn ? item.protocol || 'http' : 'https'
  return withScheme(item.address, proto)
}

function intranetHref(item: ServiceItem): string {
  const proto = item.protocol || 'http'
  return `${proto}://nas.hailong.site:${item.intranet_port}`
}

function easytierHref(item: ServiceItem): string {
  const proto = item.protocol || 'http'
  return `${proto}://et.hailong.site:${item.easytier_port}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(() => {
  fetchTypes()
  fetchServices()
})
</script>

<style lang="scss" scoped>
.servicenav {
  max-width: 1400px;

  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    margin-bottom: $nk-spacing-xl;
    color: $nk-color-neutral-900;
  }

  &__note {
    margin-top: $nk-spacing-lg;
    margin-bottom: $nk-spacing-lg;
    padding: $nk-spacing-md $nk-spacing-lg;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-700;
    background: $nk-color-primary-50;
    border: 1px solid $nk-color-primary-200;
    border-radius: $nk-radius-md;
    line-height: $nk-line-height-relaxed;
  }

  &__tab {
    margin-top: $nk-spacing-lg;
  }

  &__toolbar {
    display: flex;
    gap: $nk-spacing-sm;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: $nk-spacing-lg;

    &-spacer {
      flex: 1;
    }
  }

  &__card {
    overflow: hidden;
  }

  &__empty {
    padding: $nk-spacing-3xl 0;
  }

  &__table-wrap {
    width: 100%;
    overflow-x: auto;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: $nk-font-size-sm;

    th, td {
      text-align: left;
      padding: $nk-spacing-sm $nk-spacing-md;
      border-bottom: 1px solid $nk-color-neutral-200;
      white-space: nowrap;
    }

    th {
      font-weight: $nk-font-weight-medium;
      color: $nk-color-neutral-500;
      background: $nk-color-neutral-50;
      font-size: $nk-font-size-xs;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      color: $nk-color-neutral-700;
    }

    tbody tr:hover {
      background: $nk-color-neutral-50;
    }
  }

  &__cell-name {
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-900;
  }

  &__cell-types {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    max-width: 220px;
  }

  &__cell-remark {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__cell-time {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
  }

  &__cell-placeholder {
    color: $nk-color-neutral-400;
  }

  &__link {
    color: $nk-color-primary-600;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__actions {
    display: flex;
    gap: 4px;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: $nk-spacing-lg;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }

  &__form-row {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;
  }

  &__form-inline {
    display: flex;
    gap: $nk-spacing-md;

    .servicenav__form-field {
      flex: 1;
    }
  }

  &__form-label {
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-medium;
    color: $nk-color-neutral-700;
  }

  &__required {
    color: $nk-color-error;
  }

  &__protocol-input {
    height: 36px;
    padding: 0 12px;
    font-size: $nk-font-size-base;
    border: 1px solid $nk-color-neutral-300;
    border-radius: $nk-radius-sm;
    background: $nk-color-neutral-0;
    color: $nk-color-neutral-900;
    outline: none;
    transition: border-color $nk-duration-fast $nk-easing-ease;

    &:focus {
      border-color: $nk-color-primary-500;
      box-shadow: 0 0 0 3px rgba(var(--nk-color-primary-500-rgb), 0.12);
    }

    &::placeholder {
      color: $nk-color-neutral-400;
    }
  }
}
</style>