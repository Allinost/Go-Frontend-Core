<template>
  <div class="dm-page">
    <div class="dm-subtabs">
      <div
        v-for="t in subTabs"
        :key="t.value"
        class="dm-subtab"
        :class="{ 'dm-subtab--active': subTab === t.value }"
        @click="subTab = t.value"
      >{{ t.label }}</div>
    </div>

    <!-- ==================== 容器 ==================== -->
    <div v-if="subTab === 'containers'" class="dm-card">
      <div class="dm-card__header">
        <span class="dm-card__title">容器（{{ containers.length }}）</span>
        <NkButton size="sm" @click="openContainer()">新建容器</NkButton>
      </div>
      <NkLoading v-if="loading" />
      <table v-else class="dm-table">
        <thead>
          <tr>
            <th>容器名</th>
            <th>镜像</th>
            <th>compose 引用</th>
            <th>副本</th>
            <th>网络</th>
            <th>状态备注</th>
            <th style="width: 230px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in containers" :key="c.id">
            <td><span class="dm-code">{{ c.container_name }}</span></td>
            <td class="dm-muted">{{ c.image || '-' }}</td>
            <td class="dm-muted">{{ c.compose_ref || '-' }}</td>
            <td>{{ c.replicas }}</td>
            <td class="dm-muted">{{ c.network_mode || '-' }}</td>
            <td class="dm-muted">{{ c.status_note || '-' }}</td>
            <td>
              <NkButton size="sm" variant="ghost" @click="openResources(c)">资源</NkButton>
              <NkButton size="sm" variant="ghost" @click="openVolumes(c)">卷</NkButton>
              <NkButton size="sm" variant="ghost" @click="openContainer(c)">编辑</NkButton>
              <NkButton size="sm" variant="ghost" type="danger" @click="askConfirm(`确定删除容器 ${c.container_name} 吗？将级联标记其卷与接入点。`, () => doDeleteContainer(c))">删除</NkButton>
            </td>
          </tr>
          <tr v-if="!containers.length && !loading">
            <td colspan="7" class="dm-table__empty">暂无容器</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ==================== 网络接入点 ==================== -->
    <div v-if="subTab === 'access-points'" class="dm-card">
      <div class="dm-card__header">
        <span class="dm-card__title">网络接入点（{{ accessPoints.length }}）</span>
        <NkButton size="sm" @click="openAccessPoint()">新建接入点</NkButton>
      </div>
      <NkLoading v-if="loading" />
      <table v-else class="dm-table">
        <thead>
          <tr>
            <th>端口</th>
            <th>容器</th>
            <th>协议 / 暴露</th>
            <th>反代</th>
            <th>访问地址</th>
            <th>白名单</th>
            <th style="width: 140px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in accessPoints" :key="a.id">
            <td>
              <span class="dm-code">{{ a.listen_port }}</span>
              <span class="dm-muted"> → </span>
              <span class="dm-code">{{ a.host_port || '-' }}</span>
            </td>
            <td class="dm-muted">{{ containerName(a.container_id) }}</td>
            <td>
              <NkTag size="sm">{{ a.protocol }}</NkTag>
              <NkTag size="sm" :type="a.exposure === 'extranet' ? 'danger' : a.exposure === 'none' ? 'default' : 'warning'">
                {{ exposureLabel(a.exposure) }}
              </NkTag>
            </td>
            <td class="dm-muted">
              <div v-if="a.proxy_type">{{ a.proxy_type }}<span v-if="a.domain"> · {{ a.domain }}</span></div>
              <span v-else>直连</span>
            </td>
            <td>
              <template v-if="a.url">
                <span class="dm-code">{{ a.url }}</span>
              </template>
              <NkTag v-else size="sm" type="default">不可达</NkTag>
            </td>
            <td class="dm-muted">{{ a.whitelist_name || '不限制' }}</td>
            <td>
              <NkButton size="sm" variant="ghost" @click="openAccessPoint(a)">编辑</NkButton>
              <NkButton size="sm" variant="ghost" type="danger" @click="askConfirm(`确定删除接入点 ${a.listen_port} 吗？`, () => doDeleteAccessPoint(a))">删除</NkButton>
            </td>
          </tr>
          <tr v-if="!accessPoints.length && !loading">
            <td colspan="7" class="dm-table__empty">暂无接入点</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ==================== 白名单 ==================== -->
    <div v-if="subTab === 'whitelists'" class="dm-card">
      <div class="dm-card__header">
        <span class="dm-card__title">白名单组（{{ whitelists.length }}）</span>
        <NkButton size="sm" @click="openWhitelist()">新建白名单组</NkButton>
      </div>
      <NkLoading v-if="loading" />
      <table v-else class="dm-table">
        <thead>
          <tr>
            <th>组名</th>
            <th>成员数</th>
            <th>说明</th>
            <th style="width: 190px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in whitelists" :key="w.id">
            <td><span class="dm-code">{{ w.name }}</span></td>
            <td>{{ w.member_count }}</td>
            <td class="dm-muted">{{ w.note || '-' }}</td>
            <td>
              <NkButton size="sm" variant="ghost" @click="openMembers(w)">成员</NkButton>
              <NkButton size="sm" variant="ghost" @click="openWhitelist(w)">编辑</NkButton>
              <NkButton size="sm" variant="ghost" type="danger" @click="askConfirm(`确定删除白名单组 ${w.name} 吗？被接入点引用时将拒绝删除。`, () => doDeleteWhitelist(w))">删除</NkButton>
            </td>
          </tr>
          <tr v-if="!whitelists.length && !loading">
            <td colspan="4" class="dm-table__empty">暂无白名单组（允许空组，可先建组后补成员）</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ==================== 备份 ==================== -->
    <div v-if="subTab === 'backups'" class="dm-card">
      <div class="dm-card__header">
        <span class="dm-card__title">备份（{{ backups.length }}）</span>
        <NkButton size="sm" @click="openBackup()">新建备份</NkButton>
      </div>
      <NkLoading v-if="loading" />
      <table v-else class="dm-table">
        <thead>
          <tr>
            <th>类型</th>
            <th>容器 / 卷</th>
            <th>策略</th>
            <th>目标</th>
            <th>保留</th>
            <th>最近执行</th>
            <th>状态</th>
            <th style="width: 140px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in backups" :key="b.id">
            <td><NkTag size="sm">{{ b.backup_type }}</NkTag></td>
            <td class="dm-muted">{{ b.container_id ? containerName(b.container_id) : '-' }} / {{ b.volume_id || '-' }}</td>
            <td class="dm-muted">{{ b.strategy_cron || '-' }}</td>
            <td class="dm-muted">{{ b.destination || '-' }}</td>
            <td>{{ b.retention_days || '不限' }}</td>
            <td class="dm-muted">{{ formatTime(b.last_run_at) }}</td>
            <td>
              <NkTag size="sm" :type="b.last_status === 'success' ? 'success' : b.last_status === 'failed' ? 'danger' : 'default'">
                {{ b.last_status || '未执行' }}
              </NkTag>
              <div v-if="b.last_error" class="dm-error" style="font-size: 12px">{{ b.last_error }}</div>
            </td>
            <td>
              <NkButton size="sm" variant="ghost" @click="openBackup(b)">编辑</NkButton>
              <NkButton size="sm" variant="ghost" type="danger" @click="askConfirm('确定删除该备份记录吗？', () => doDeleteBackup(b))">删除</NkButton>
            </td>
          </tr>
          <tr v-if="!backups.length && !loading">
            <td colspan="8" class="dm-table__empty">暂无备份记录</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ==================== 容器表单 ==================== -->
    <NkDialog v-model:visible="containerVisible" :title="editingContainer ? '编辑容器' : '新建容器'" :width="620">
      <div class="dm-form-grid">
        <div class="dm-form-item">
          <span class="dm-form-label">容器名 *</span>
          <NkInput v-model="containerForm.container_name" size="sm" placeholder="developmentmanager-api" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">镜像</span>
          <NkInput v-model="containerForm.image" size="sm" placeholder="registry.local/app:1.0" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">compose 引用</span>
          <NkInput v-model="containerForm.compose_ref" size="sm" placeholder="docker-compose.yml / 服务名" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">副本数</span>
          <NkInput v-model.number="containerForm.replicas" type="number" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">网络模式</span>
          <NkInput v-model="containerForm.network_mode" size="sm" placeholder="bridge / host" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">状态备注</span>
          <NkInput v-model="containerForm.status_note" size="sm" placeholder="常驻 / 按需启动" />
        </div>
        <div class="dm-form-item dm-form-item--full">
          <span class="dm-form-label">环境变量说明（每行 KEY=VALUE）</span>
          <NkTextarea v-model="containerForm.env_text" :rows="3" placeholder="APP_ENV=production" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="containerVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="saveContainer">保存</NkButton>
      </template>
    </NkDialog>

    <!-- ==================== 资源分配 ==================== -->
    <NkDialog v-model:visible="resourceVisible" :title="`资源分配 · ${currentContainer?.container_name || ''}`" :width="620">
      <div class="dm-form-grid">
        <div class="dm-form-item"><span class="dm-form-label">CPU 上限</span><NkInput v-model="resourceForm.cpu_limit" size="sm" placeholder="2 / 1.5 / 500m" /></div>
        <div class="dm-form-item"><span class="dm-form-label">CPU 权重</span><NkInput v-model.number="resourceForm.cpu_shares" type="number" size="sm" /></div>
        <div class="dm-form-item"><span class="dm-form-label">内存上限</span><NkInput v-model="resourceForm.mem_limit" size="sm" placeholder="2g" /></div>
        <div class="dm-form-item"><span class="dm-form-label">内存预留</span><NkInput v-model="resourceForm.mem_reservation" size="sm" placeholder="512m" /></div>
        <div class="dm-form-item"><span class="dm-form-label">GPU 说明</span><NkInput v-model="resourceForm.gpu_note" size="sm" /></div>
        <div class="dm-form-item"><span class="dm-form-label">存储配额</span><NkInput v-model="resourceForm.storage_quota" size="sm" placeholder="100G" /></div>
        <div class="dm-form-item dm-form-item--full"><span class="dm-form-label">备注</span><NkTextarea v-model="resourceForm.notes" :rows="2" /></div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="resourceVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="saveResources">保存</NkButton>
      </template>
    </NkDialog>

    <!-- ==================== 卷映射 ==================== -->
    <NkDialog v-model:visible="volumeVisible" :title="`卷映射 · ${currentContainer?.container_name || ''}`" :width="760">
      <table class="dm-table">
        <thead>
          <tr><th>宿主路径</th><th>容器路径</th><th>模式</th><th>用途</th><th>备份</th><th style="width: 110px">操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="v in volumes" :key="v.id">
            <td class="dm-code">{{ v.host_path }}</td>
            <td class="dm-code">{{ v.container_path }}</td>
            <td>{{ v.mode }}</td>
            <td class="dm-muted">{{ v.purpose || '-' }}</td>
            <td>{{ v.in_backup ? '是' : '否' }}</td>
            <td>
              <NkButton size="sm" variant="ghost" @click="editVolume(v)">编辑</NkButton>
              <NkButton size="sm" variant="ghost" type="danger" @click="removeVolume(v)">删除</NkButton>
            </td>
          </tr>
          <tr v-if="!volumes.length"><td colspan="6" class="dm-table__empty">暂无卷映射</td></tr>
        </tbody>
      </table>
      <div class="dm-form-grid" style="margin-top: 16px">
        <div class="dm-form-item"><span class="dm-form-label">宿主路径 *</span><NkInput v-model="volumeForm.host_path" size="sm" /></div>
        <div class="dm-form-item"><span class="dm-form-label">容器路径 *</span><NkInput v-model="volumeForm.container_path" size="sm" /></div>
        <div class="dm-form-item">
          <span class="dm-form-label">模式</span>
          <NkSelect v-model="volumeForm.mode" :options="[{ label: '读写 rw', value: 'rw' }, { label: '只读 ro', value: 'ro' }]" size="sm" />
        </div>
        <div class="dm-form-item"><span class="dm-form-label">用途</span><NkInput v-model="volumeForm.purpose" size="sm" /></div>
        <div class="dm-form-item">
          <span class="dm-form-label">纳入备份</span>
          <NkSwitch v-model="volumeForm.in_backup" size="sm" />
        </div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="resetVolumeForm">清空表单</NkButton>
        <NkButton :loading="saving" @click="saveVolume">{{ editingVolumeId ? '更新卷映射' : '添加卷映射' }}</NkButton>
      </template>
    </NkDialog>

    <!-- ==================== 接入点表单 ==================== -->
    <NkDialog v-model:visible="accessPointVisible" :title="editingAccessPoint ? '编辑接入点' : '新建接入点'" :width="720">
      <div class="dm-form-grid">
        <div class="dm-form-item"><span class="dm-form-label">监听端口 *</span><NkInput v-model.number="apForm.listen_port" type="number" size="sm" /></div>
        <div class="dm-form-item"><span class="dm-form-label">宿主端口（空=不映射）</span><NkInput v-model="apForm.host_port" size="sm" /></div>
        <div class="dm-form-item">
          <span class="dm-form-label">宿主容器</span>
          <NkSelect v-model="apForm.container_id" :options="containerOptions" clearable size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">协议</span>
          <NkSelect v-model="apForm.protocol" :options="[{ label: 'TCP', value: 'tcp' }, { label: 'UDP', value: 'udp' }]" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">暴露范围</span>
          <NkSelect v-model="apForm.exposure" :options="exposureOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">网络区域</span>
          <NkSelect v-model="apForm.network_zone" :options="zoneOptions" size="sm" />
        </div>
        <div class="dm-form-item">
          <span class="dm-form-label">反代类型（空=直连）</span>
          <NkSelect v-model="apForm.proxy_type" :options="proxyOptions" clearable size="sm" />
        </div>
        <div class="dm-form-item"><span class="dm-form-label">域名</span><NkInput v-model="apForm.domain" size="sm" placeholder="api.example.com" /></div>
        <div class="dm-form-item"><span class="dm-form-label">反代上游</span><NkInput v-model="apForm.upstream_url" size="sm" placeholder="http://container:8080" /></div>
        <div class="dm-form-item">
          <span class="dm-form-label">TLS</span>
          <NkSwitch v-model="apForm.tls" size="sm" />
        </div>
        <div class="dm-form-item dm-form-item--full"><span class="dm-form-label">访问地址（留空=不可达）</span><NkInput v-model="apForm.url" size="sm" placeholder="https://api.example.com" /></div>
        <div class="dm-form-item">
          <span class="dm-form-label">白名单组（空=不限制）</span>
          <NkSelect v-model="apForm.whitelist_id" :options="whitelistOptions" clearable size="sm" />
        </div>
        <div class="dm-form-item"><span class="dm-form-label">用途</span><NkInput v-model="apForm.purpose" size="sm" placeholder="API / 管理台" /></div>
        <div class="dm-form-item dm-form-item--full"><span class="dm-form-label">备注</span><NkTextarea v-model="apForm.notes" :rows="2" /></div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="accessPointVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="saveAccessPoint">保存</NkButton>
      </template>
    </NkDialog>

    <!-- ==================== 白名单表单 ==================== -->
    <NkDialog v-model:visible="whitelistVisible" :title="editingWhitelist ? '编辑白名单组' : '新建白名单组'" :width="520">
      <div class="dm-form-grid">
        <div class="dm-form-item dm-form-item--full"><span class="dm-form-label">组名 *</span><NkInput v-model="whitelistForm.name" size="sm" placeholder="ia-market-allow" /></div>
        <div class="dm-form-item dm-form-item--full"><span class="dm-form-label">说明</span><NkTextarea v-model="whitelistForm.note" :rows="2" /></div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="whitelistVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="saveWhitelist">保存</NkButton>
      </template>
    </NkDialog>

    <!-- ==================== 白名单成员 ==================== -->
    <NkDialog v-model:visible="membersVisible" :title="`白名单成员 · ${currentWhitelist?.name || ''}`" :width="620">
      <table class="dm-table">
        <thead><tr><th>容器</th><th>说明</th><th style="width: 80px">操作</th></tr></thead>
        <tbody>
          <tr v-for="m in members" :key="m.id">
            <td><span class="dm-code">{{ m.container_name || m.container_id }}</span></td>
            <td class="dm-muted">{{ m.note || '-' }}</td>
            <td><NkButton size="sm" variant="ghost" type="danger" @click="removeMember(m)">移除</NkButton></td>
          </tr>
          <tr v-if="!members.length"><td colspan="3" class="dm-table__empty">组内暂无成员（允许空组）</td></tr>
        </tbody>
      </table>
      <div class="dm-form-grid" style="margin-top: 16px">
        <div class="dm-form-item">
          <span class="dm-form-label">添加容器</span>
          <NkSelect v-model="memberForm.container_id" :options="containerOptions" size="sm" />
        </div>
        <div class="dm-form-item"><span class="dm-form-label">说明</span><NkInput v-model="memberForm.note" size="sm" /></div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="membersVisible = false">关闭</NkButton>
        <NkButton :loading="saving" @click="addMember">添加成员</NkButton>
      </template>
    </NkDialog>

    <!-- ==================== 备份表单 ==================== -->
    <NkDialog v-model:visible="backupVisible" :title="editingBackup ? '编辑备份' : '新建备份'" :width="640">
      <div class="dm-form-grid">
        <div class="dm-form-item">
          <span class="dm-form-label">备份类型 *</span>
          <NkSelect v-model="backupForm.backup_type" :options="[{ label: '整机 full', value: 'full' }, { label: '数据库 db', value: 'db' }, { label: '卷 volume', value: 'volume' }]" size="sm" />
        </div>
        <div class="dm-form-item"><span class="dm-form-label">策略 cron</span><NkInput v-model="backupForm.strategy_cron" size="sm" placeholder="0 3 * * *" /></div>
        <div class="dm-form-item">
          <span class="dm-form-label">关联容器</span>
          <NkSelect v-model="backupForm.container_id" :options="containerOptions" clearable size="sm" />
        </div>
        <div class="dm-form-item"><span class="dm-form-label">目标位置</span><NkInput v-model="backupForm.destination" size="sm" placeholder="/backup 或 s3://..." /></div>
        <div class="dm-form-item"><span class="dm-form-label">保留天数（0=不限）</span><NkInput v-model.number="backupForm.retention_days" type="number" size="sm" /></div>
        <div class="dm-form-item">
          <span class="dm-form-label">启用</span>
          <NkSwitch v-model="backupForm.enabled" size="sm" />
        </div>
        <div v-if="editingBackup" class="dm-form-item">
          <span class="dm-form-label">最近状态</span>
          <NkSelect v-model="backupForm.last_status" :options="[{ label: '未执行', value: '' }, { label: '成功', value: 'success' }, { label: '失败', value: 'failed' }, { label: '运行中', value: 'running' }]" size="sm" />
        </div>
        <div v-if="editingBackup" class="dm-form-item"><span class="dm-form-label">最近错误</span><NkInput v-model="backupForm.last_error" size="sm" /></div>
        <div class="dm-form-item dm-form-item--full"><span class="dm-form-label">恢复说明</span><NkTextarea v-model="backupForm.restore_note" :rows="2" /></div>
      </div>
      <template #footer>
        <NkButton variant="ghost" @click="backupVisible = false">取消</NkButton>
        <NkButton :loading="saving" @click="saveBackup">保存</NkButton>
      </template>
    </NkDialog>

    <!-- ==================== 通用确认 ==================== -->
    <NkDialog v-model:visible="confirmVisible" title="确认操作" :width="420">
      <p>{{ confirmText }}</p>
      <template #footer>
        <NkButton variant="ghost" @click="confirmVisible = false">取消</NkButton>
        <NkButton type="danger" :loading="confirmLoading" @click="runConfirm">确认</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  listContainers,
  createContainer,
  updateContainer,
  deleteContainer,
  getResourceAlloc,
  upsertResourceAlloc,
  listVolumes,
  createVolume,
  updateVolume,
  deleteVolume,
  listAccessPoints,
  createAccessPoint,
  updateAccessPoint,
  deleteAccessPoint,
  listWhitelists,
  createWhitelist,
  updateWhitelist,
  deleteWhitelist,
  listWhitelistMembers,
  addWhitelistMember,
  removeWhitelistMember,
  listBackups,
  createBackup,
  updateBackup,
  deleteBackup,
} from '@/api/developmentManager'
import type {
  Project, Container, VolumeMapping, AccessPoint, Whitelist, WhitelistMember, Backup,
} from '@/types/developmentManager'

const props = defineProps<{ project: Project }>()

const subTab = ref('containers')
const subTabs = [
  { label: '容器', value: 'containers' },
  { label: '网络接入点', value: 'access-points' },
  { label: '白名单组', value: 'whitelists' },
  { label: '备份', value: 'backups' },
]

const loading = ref(false)
const saving = ref(false)
const containers = ref<Container[]>([])
const accessPoints = ref<AccessPoint[]>([])
const whitelists = ref<Whitelist[]>([])
const backups = ref<Backup[]>([])

const exposureOptions = [
  { label: '不暴露', value: 'none' },
  { label: '内网', value: 'intranet' },
  { label: '公网', value: 'extranet' },
]
const zoneOptions = [
  { label: '内网', value: 'intranet' },
  { label: '公网', value: 'extranet' },
  { label: '反代网络', value: 'proxy_net' },
]
const proxyOptions = [
  { label: 'nginx', value: 'nginx' },
  { label: 'caddy', value: 'caddy' },
  { label: 'traefik', value: 'traefik' },
  { label: 'other', value: 'other' },
]

const containerOptions = computed(() =>
  containers.value.map((c) => ({ label: c.container_name, value: c.id })),
)
const whitelistOptions = computed(() =>
  whitelists.value.map((w) => ({ label: `${w.name}（${w.member_count}）`, value: w.id })),
)

function containerName(id?: number | null): string {
  if (!id) return '-'
  return containers.value.find((c) => c.id === id)?.container_name || `#${id}`
}

function exposureLabel(v: string): string {
  return exposureOptions.find((o) => o.value === v)?.label || v
}

function formatTime(value?: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

async function loadAll() {
  loading.value = true
  try {
    const [c, a, w, b] = await Promise.all([
      listContainers(props.project.id),
      listAccessPoints(props.project.id),
      listWhitelists(props.project.id),
      listBackups(props.project.id),
    ])
    containers.value = c.data || []
    accessPoints.value = a.data || []
    whitelists.value = w.data || []
    backups.value = b.data || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载部署资产失败')
  } finally {
    loading.value = false
  }
}

// ---------- 通用确认 ----------
const confirmVisible = ref(false)
const confirmText = ref('')
const confirmLoading = ref(false)
let confirmAction: (() => Promise<void>) | null = null

function askConfirm(text: string, action: () => Promise<void>) {
  confirmText.value = text
  confirmAction = action
  confirmVisible.value = true
}

async function runConfirm() {
  if (!confirmAction) return
  confirmLoading.value = true
  try {
    await confirmAction()
    confirmVisible.value = false
  } catch (err: any) {
    NKMessage.error(err.message || '操作失败')
  } finally {
    confirmLoading.value = false
  }
}

// ---------- 容器 ----------
const containerVisible = ref(false)
const editingContainer = ref<Container | null>(null)
const containerForm = reactive({
  container_name: '',
  image: '',
  compose_ref: '',
  replicas: 1,
  network_mode: '',
  status_note: '',
  env_text: '',
})

function openContainer(c?: Container) {
  editingContainer.value = c || null
  containerForm.container_name = c?.container_name || ''
  containerForm.image = c?.image || ''
  containerForm.compose_ref = c?.compose_ref || ''
  containerForm.replicas = c?.replicas ?? 1
  containerForm.network_mode = c?.network_mode || ''
  containerForm.status_note = c?.status_note || ''
  containerForm.env_text = Object.entries(c?.env_notes || {})
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  containerVisible.value = true
}

function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {}
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const idx = line.indexOf('=')
      if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    })
  return env
}

async function saveContainer() {
  if (!containerForm.container_name.trim()) {
    NKMessage.warning('容器名不能为空')
    return
  }
  saving.value = true
  try {
    const payload = {
      container_name: containerForm.container_name.trim(),
      image: containerForm.image.trim(),
      compose_ref: containerForm.compose_ref.trim(),
      replicas: Number(containerForm.replicas) || 1,
      network_mode: containerForm.network_mode.trim(),
      status_note: containerForm.status_note.trim(),
      env_notes: parseEnv(containerForm.env_text),
    }
    if (editingContainer.value) {
      await updateContainer(editingContainer.value.id, payload)
      NKMessage.success('容器已更新')
    } else {
      await createContainer(props.project.id, payload)
      NKMessage.success('容器已创建')
    }
    containerVisible.value = false
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function doDeleteContainer(c: Container) {
  await deleteContainer(c.id)
  NKMessage.success('容器已删除')
  await loadAll()
}

// ---------- 资源分配 ----------
const resourceVisible = ref(false)
const currentContainer = ref<Container | null>(null)
const resourceForm = reactive({
  cpu_limit: '',
  cpu_shares: 0,
  mem_limit: '',
  mem_reservation: '',
  gpu_note: '',
  storage_quota: '',
  notes: '',
})

async function openResources(c: Container) {
  currentContainer.value = c
  resourceVisible.value = true
  try {
    const res = await getResourceAlloc(c.id)
    const r = res.data
    resourceForm.cpu_limit = r.cpu_limit
    resourceForm.cpu_shares = r.cpu_shares
    resourceForm.mem_limit = r.mem_limit
    resourceForm.mem_reservation = r.mem_reservation
    resourceForm.gpu_note = r.gpu_note
    resourceForm.storage_quota = r.storage_quota
    resourceForm.notes = r.notes
  } catch {
    resourceForm.cpu_limit = ''
    resourceForm.cpu_shares = 0
    resourceForm.mem_limit = ''
    resourceForm.mem_reservation = ''
    resourceForm.gpu_note = ''
    resourceForm.storage_quota = ''
    resourceForm.notes = ''
  }
}

async function saveResources() {
  if (!currentContainer.value) return
  saving.value = true
  try {
    await upsertResourceAlloc(currentContainer.value.id, { ...resourceForm, cpu_shares: Number(resourceForm.cpu_shares) || 0 })
    NKMessage.success('资源分配已保存')
    resourceVisible.value = false
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// ---------- 卷映射 ----------
const volumeVisible = ref(false)
const volumes = ref<VolumeMapping[]>([])
const editingVolumeId = ref<number | null>(null)
const volumeForm = reactive({ host_path: '', container_path: '', mode: 'rw', purpose: '', in_backup: false })

async function openVolumes(c: Container) {
  currentContainer.value = c
  resetVolumeForm()
  volumeVisible.value = true
  await loadVolumes()
}

async function loadVolumes() {
  if (!currentContainer.value) return
  try {
    const res = await listVolumes(currentContainer.value.id)
    volumes.value = res.data || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载卷映射失败')
  }
}

function resetVolumeForm() {
  editingVolumeId.value = null
  volumeForm.host_path = ''
  volumeForm.container_path = ''
  volumeForm.mode = 'rw'
  volumeForm.purpose = ''
  volumeForm.in_backup = false
}

function editVolume(v: VolumeMapping) {
  editingVolumeId.value = v.id
  volumeForm.host_path = v.host_path
  volumeForm.container_path = v.container_path
  volumeForm.mode = v.mode
  volumeForm.purpose = v.purpose
  volumeForm.in_backup = v.in_backup
}

async function saveVolume() {
  if (!volumeForm.host_path.trim() || !volumeForm.container_path.trim()) {
    NKMessage.warning('宿主路径与容器路径不能为空')
    return
  }
  saving.value = true
  try {
    if (editingVolumeId.value) {
      await updateVolume(editingVolumeId.value, { ...volumeForm })
      NKMessage.success('卷映射已更新')
    } else if (currentContainer.value) {
      await createVolume(currentContainer.value.id, { ...volumeForm })
      NKMessage.success('卷映射已添加')
    }
    resetVolumeForm()
    await loadVolumes()
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function removeVolume(v: VolumeMapping) {
  try {
    await deleteVolume(v.id)
    NKMessage.success('卷映射已删除')
    await loadVolumes()
  } catch (err: any) {
    NKMessage.error(err.message || '删除失败')
  }
}

// ---------- 接入点 ----------
const accessPointVisible = ref(false)
const editingAccessPoint = ref<AccessPoint | null>(null)
const apForm = reactive({
  listen_port: 80,
  host_port: '',
  container_id: null as number | null,
  protocol: 'tcp',
  exposure: 'intranet',
  network_zone: 'intranet',
  proxy_type: '',
  domain: '',
  upstream_url: '',
  tls: false,
  url: '',
  whitelist_id: null as number | null,
  purpose: '',
  notes: '',
})

function openAccessPoint(a?: AccessPoint) {
  editingAccessPoint.value = a || null
  apForm.listen_port = a?.listen_port ?? 80
  apForm.host_port = a?.host_port != null ? String(a.host_port) : ''
  apForm.container_id = a?.container_id ?? null
  apForm.protocol = a?.protocol || 'tcp'
  apForm.exposure = a?.exposure || 'intranet'
  apForm.network_zone = a?.network_zone || 'intranet'
  apForm.proxy_type = a?.proxy_type || ''
  apForm.domain = a?.domain || ''
  apForm.upstream_url = a?.upstream_url || ''
  apForm.tls = a?.tls || false
  apForm.url = a?.url || ''
  apForm.whitelist_id = a?.whitelist_id ?? null
  apForm.purpose = a?.purpose || ''
  apForm.notes = a?.notes || ''
  accessPointVisible.value = true
}

async function saveAccessPoint() {
  if (!apForm.listen_port) {
    NKMessage.warning('监听端口不能为空')
    return
  }
  saving.value = true
  try {
    const payload = {
      listen_port: Number(apForm.listen_port),
      host_port: apForm.host_port === '' ? null : Number(apForm.host_port),
      container_id: apForm.container_id || null,
      protocol: apForm.protocol,
      exposure: apForm.exposure,
      network_zone: apForm.network_zone,
      proxy_type: apForm.proxy_type || '',
      domain: apForm.domain.trim(),
      upstream_url: apForm.upstream_url.trim(),
      tls: apForm.tls,
      url: apForm.url.trim() || null,
      whitelist_id: apForm.whitelist_id || null,
      purpose: apForm.purpose.trim(),
      notes: apForm.notes.trim(),
    }
    if (editingAccessPoint.value) {
      await updateAccessPoint(editingAccessPoint.value.id, payload)
      NKMessage.success('接入点已更新')
    } else {
      await createAccessPoint(props.project.id, payload)
      NKMessage.success('接入点已创建')
    }
    accessPointVisible.value = false
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function doDeleteAccessPoint(a: AccessPoint) {
  await deleteAccessPoint(a.id)
  NKMessage.success('接入点已删除')
  await loadAll()
}

// ---------- 白名单 ----------
const whitelistVisible = ref(false)
const editingWhitelist = ref<Whitelist | null>(null)
const whitelistForm = reactive({ name: '', note: '' })

function openWhitelist(w?: Whitelist) {
  editingWhitelist.value = w || null
  whitelistForm.name = w?.name || ''
  whitelistForm.note = w?.note || ''
  whitelistVisible.value = true
}

async function saveWhitelist() {
  if (!whitelistForm.name.trim()) {
    NKMessage.warning('组名不能为空')
    return
  }
  saving.value = true
  try {
    if (editingWhitelist.value) {
      await updateWhitelist(editingWhitelist.value.id, { ...whitelistForm })
      NKMessage.success('白名单组已更新')
    } else {
      await createWhitelist(props.project.id, { ...whitelistForm })
      NKMessage.success('白名单组已创建')
    }
    whitelistVisible.value = false
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function doDeleteWhitelist(w: Whitelist) {
  await deleteWhitelist(w.id)
  NKMessage.success('白名单组已删除')
  await loadAll()
}

const membersVisible = ref(false)
const currentWhitelist = ref<Whitelist | null>(null)
const members = ref<WhitelistMember[]>([])
const memberForm = reactive({ container_id: null as number | null, note: '' })

async function openMembers(w: Whitelist) {
  currentWhitelist.value = w
  memberForm.container_id = null
  memberForm.note = ''
  membersVisible.value = true
  await loadMembers()
}

async function loadMembers() {
  if (!currentWhitelist.value) return
  try {
    const res = await listWhitelistMembers(currentWhitelist.value.id)
    members.value = res.data || []
  } catch (err: any) {
    NKMessage.error(err.message || '加载成员失败')
  }
}

async function addMember() {
  if (!currentWhitelist.value || !memberForm.container_id) {
    NKMessage.warning('请选择容器')
    return
  }
  saving.value = true
  try {
    await addWhitelistMember(currentWhitelist.value.id, { ...memberForm })
    NKMessage.success('成员已添加')
    memberForm.container_id = null
    memberForm.note = ''
    await loadMembers()
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '添加失败')
  } finally {
    saving.value = false
  }
}

async function removeMember(m: WhitelistMember) {
  if (!currentWhitelist.value) return
  try {
    await removeWhitelistMember(currentWhitelist.value.id, m.id)
    NKMessage.success('成员已移除')
    await loadMembers()
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '移除失败')
  }
}

// ---------- 备份 ----------
const backupVisible = ref(false)
const editingBackup = ref<Backup | null>(null)
const backupForm = reactive({
  backup_type: 'db',
  strategy_cron: '',
  container_id: null as number | null,
  destination: '',
  retention_days: 7,
  enabled: true,
  last_status: '',
  last_error: '',
  restore_note: '',
})

function openBackup(b?: Backup) {
  editingBackup.value = b || null
  backupForm.backup_type = b?.backup_type || 'db'
  backupForm.strategy_cron = b?.strategy_cron || ''
  backupForm.container_id = b?.container_id ?? null
  backupForm.destination = b?.destination || ''
  backupForm.retention_days = b?.retention_days ?? 7
  backupForm.enabled = b?.enabled ?? true
  backupForm.last_status = b?.last_status || ''
  backupForm.last_error = b?.last_error || ''
  backupForm.restore_note = b?.restore_note || ''
  backupVisible.value = true
}

async function saveBackup() {
  saving.value = true
  try {
    const payload: Record<string, any> = {
      backup_type: backupForm.backup_type,
      strategy_cron: backupForm.strategy_cron.trim(),
      container_id: backupForm.container_id || null,
      destination: backupForm.destination.trim(),
      retention_days: Number(backupForm.retention_days) || 0,
      enabled: backupForm.enabled,
      restore_note: backupForm.restore_note.trim(),
    }
    if (editingBackup.value) {
      payload.last_status = backupForm.last_status
      payload.last_error = backupForm.last_error.trim()
      await updateBackup(editingBackup.value.id, payload)
      NKMessage.success('备份记录已更新')
    } else {
      await createBackup(props.project.id, payload)
      NKMessage.success('备份记录已创建')
    }
    backupVisible.value = false
    await loadAll()
  } catch (err: any) {
    NKMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function doDeleteBackup(b: Backup) {
  await deleteBackup(b.id)
  NKMessage.success('备份记录已删除')
  await loadAll()
}

onMounted(loadAll)
</script>
