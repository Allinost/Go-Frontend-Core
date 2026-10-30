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
        <NkButton size="sm" @click="openImportDialog">从项目导入</NkButton>
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
                <th>关联项目</th>
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
                  <template v-if="item.project_id">
                    <a class="servicenav__link" @click="openProject(item.project_id)">
                      {{ item.project_name || item.project_key }}
                    </a>
                    <div v-if="item.container_name" class="servicenav__cell-placeholder">{{ item.container_name }}</div>
                  </template>
                  <span v-else class="servicenav__cell-placeholder">-</span>
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
          <label class="servicenav__form-label">关联项目（可选）</label>
          <NkSelect
            v-model="serviceForm.project_id"
            :options="projectOptions"
            clearable
            filterable
            placeholder="关联到 developmentManager 项目"
            @change="onProjectChange"
          />
        </div>
        <div v-if="serviceForm.project_id" class="servicenav__form-row">
          <label class="servicenav__form-label">关联容器（可选）</label>
          <NkSelect
            v-model="serviceForm.container_id"
            :options="containerOptions"
            clearable
            filterable
            placeholder="选择项目下的容器"
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

    <!-- 从项目导入导航 -->
    <NkDialog v-model:visible="importDialog.visible" title="从项目导入导航" :width="760">
      <div class="servicenav__import-note">
        仅导入 <strong>后端基座 / 前端基座 / 容器项目 / 前端模板</strong> 类型项目下已登记且访问地址非空的网络接入点。
        模块（backend_module / frontend_module）不导入——模块挂载在基座上运行。
      </div>
      <div class="servicenav__form-row">
        <label class="servicenav__form-label">附加类型（可选）</label>
        <NkSelect
          v-model="importForm.types"
          :options="typeOptions"
          multiple
          filterable
          placeholder="导入条目统一附加的服务类型"
        />
      </div>
      <div class="servicenav__form-row">
        <label class="servicenav__form-label">已导入条目</label>
        <NkSwitch v-model="importForm.updateExisting" size="sm" />
        <span class="servicenav__import-hint">{{ importForm.updateExisting ? '按接入点更新名称/协议/地址' : '已存在则跳过' }}</span>
      </div>

      <div class="servicenav__import-projects">
        <div class="servicenav__import-projects-header">
          <span>可导入项目（{{ importProjects.length }}）</span>
          <div class="servicenav__import-projects-actions">
            <NkButton size="sm" variant="ghost" @click="selectAllImportProjects(true)">全选</NkButton>
            <NkButton size="sm" variant="ghost" @click="selectAllImportProjects(false)">清空</NkButton>
          </div>
        </div>
        <div v-if="importProjects.length === 0" class="servicenav__cell-placeholder">暂无可导入项目</div>
        <label v-for="p in importProjects" :key="p.id" class="servicenav__import-item">
          <input
            type="checkbox"
            :checked="importForm.projectIds.includes(p.id)"
            @change="toggleImportProject(p.id)"
          />
          <span class="servicenav__import-item-name">{{ p.name }}</span>
          <span class="servicenav__cell-placeholder">{{ p.project_key }}</span>
          <NkTag size="sm" variant="outline" type="info">{{ projectTypeLabel(p.type) }}</NkTag>
        </label>
      </div>

      <div v-if="importResult" class="servicenav__import-result">
        导入完成：项目 {{ importResult.projects }} 个，接入点 {{ importResult.access_points }} 个，
        新增 <strong>{{ importResult.created }}</strong>，更新 <strong>{{ importResult.updated }}</strong>，跳过 <strong>{{ importResult.skipped }}</strong>。
      </div>

      <template #footer>
        <NkButton variant="ghost" @click="importDialog.visible = false">关闭</NkButton>
        <NkButton type="primary" :loading="importLoading" @click="submitImport">开始导入</NkButton>
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
import { useRouter } from 'vue-router'
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
  importFromProjects,
} from '@/api/servicenav'
import type {
  ServiceItem,
  ServiceType,
  CreateServiceRequest,
  ImportFromProjectsResponse,
} from '@/api/servicenav'
import { listProjects, listContainers } from '@/api/developmentManager'
import type { Project, Container } from '@/types/developmentManager'

const router = useRouter()

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
  project_id: null as number | null,
  container_id: null as number | null,
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
  serviceForm.project_id = null
  serviceForm.container_id = null
  containers.value = []
  intranetEnabled.value = false
  serviceNameError.value = ''
}

// ---------- 项目 / 容器关联 ----------
const allProjects = ref<Project[]>([])
const containers = ref<Container[]>([])

const projectTypeLabels: Record<string, string> = {
  base: '后端基座',
  template: '前端模板',
  backend_module: '后端模块',
  frontend_module: '前端模块',
  frontend_base: '前端基座',
  container_project: '容器项目',
}
function projectTypeLabel(type: string): string {
  return projectTypeLabels[type] || type
}

const projectOptions = computed(() =>
  allProjects.value
    .filter((p) => !p.deleted)
    .map((p) => ({ label: `${p.name}（${projectTypeLabel(p.type)}）`, value: p.id })),
)
const containerOptions = computed(() =>
  containers.value.map((c) => ({ label: c.container_name, value: c.id })),
)

async function loadProjectOptions() {
  try {
    const res = await listProjects({ page: 1, page_size: 100 })
    allProjects.value = res.data.items || []
  } catch {
    allProjects.value = []
  }
}

async function loadContainers(projectId: number) {
  try {
    const res = await listContainers(projectId)
    containers.value = res.data || []
  } catch {
    containers.value = []
  }
}

async function onProjectChange() {
  serviceForm.container_id = null
  containers.value = []
  if (serviceForm.project_id) {
    await loadContainers(serviceForm.project_id)
  }
}

function openProject(projectId?: number | null) {
  if (!projectId) return
  router.push(`/modules/zzz/developmentmanager/${projectId}`)
}

// ---------- 从项目导入 ----------
const IMPORTABLE_TYPES = ['base', 'frontend_base', 'container_project', 'template']
const importDialog = reactive({ visible: false })
const importLoading = ref(false)
const importResult = ref<ImportFromProjectsResponse | null>(null)
const importForm = reactive({
  types: [] as string[],
  updateExisting: false,
  projectIds: [] as number[],
})

const importProjects = computed(() =>
  allProjects.value.filter((p) => !p.deleted && IMPORTABLE_TYPES.includes(p.type)),
)

async function openImportDialog() {
  importResult.value = null
  importForm.types = []
  importForm.updateExisting = false
  if (!allProjects.value.length) {
    await loadProjectOptions()
  }
  importForm.projectIds = importProjects.value.map((p) => p.id)
  importDialog.visible = true
}

function toggleImportProject(id: number) {
  const idx = importForm.projectIds.indexOf(id)
  if (idx >= 0) importForm.projectIds.splice(idx, 1)
  else importForm.projectIds.push(id)
}

function selectAllImportProjects(all: boolean) {
  importForm.projectIds = all ? importProjects.value.map((p) => p.id) : []
}

async function submitImport() {
  if (!importForm.projectIds.length) {
    NKMessage.warning('请至少选择一个项目')
    return
  }
  importLoading.value = true
  try {
    const res = await importFromProjects({
      project_ids: importForm.projectIds,
      types: importForm.types,
      update_existing: importForm.updateExisting,
    })
    importResult.value = res.data
    NKMessage.success(
      `导入完成：新增 ${res.data.created}，更新 ${res.data.updated}，跳过 ${res.data.skipped}`,
    )
    fetchServices()
    loadProjectOptions()
  } catch (e: any) {
    NKMessage.error(e.message || '导入失败')
  } finally {
    importLoading.value = false
  }
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
  serviceForm.project_id = item.project_id ?? null
  serviceForm.container_id = item.container_id ?? null
  containers.value = []
  if (serviceForm.project_id) {
    loadContainers(serviceForm.project_id)
  }
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

  payload.project_id = serviceForm.project_id || null
  payload.container_id = serviceForm.container_id || null
  if (!serviceForm.project_id) {
    payload.clear_project = true
    payload.clear_container = true
  } else if (!serviceForm.container_id) {
    payload.clear_container = true
  }
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
  loadProjectOptions()
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

  &__import-note {
    padding: $nk-spacing-sm $nk-spacing-md;
    margin-bottom: $nk-spacing-md;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
    background: $nk-color-primary-50;
    border: 1px solid $nk-color-primary-200;
    border-radius: $nk-radius-sm;
    line-height: $nk-line-height-relaxed;
  }

  &__import-hint {
    font-size: $nk-font-size-xs;
    color: $nk-color-neutral-500;
    margin-left: $nk-spacing-sm;
  }

  &__import-projects {
    margin-top: $nk-spacing-md;
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-md;
    padding: $nk-spacing-sm $nk-spacing-md;
    max-height: 300px;
    overflow-y: auto;

    &-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: $nk-font-size-sm;
      color: $nk-color-neutral-700;
      margin-bottom: $nk-spacing-xs;
    }

    &-actions {
      display: flex;
      gap: 4px;
    }
  }

  &__import-item {
    display: flex;
    align-items: center;
    gap: $nk-spacing-sm;
    padding: 6px 0;
    border-bottom: 1px solid $nk-color-neutral-100;
    cursor: pointer;

    &:last-child {
      border-bottom: none;
    }

    &-name {
      font-size: $nk-font-size-sm;
      color: $nk-color-neutral-900;
      font-weight: $nk-font-weight-medium;
    }
  }

  &__import-result {
    margin-top: $nk-spacing-md;
    padding: $nk-spacing-sm $nk-spacing-md;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-700;
    background: $nk-color-neutral-50;
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-sm;
  }
}
</style>