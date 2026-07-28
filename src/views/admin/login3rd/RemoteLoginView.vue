<template>
  <div class="l3-remote">
    <div class="l3-remote__header">
      <NkButton size="sm" variant="ghost" @click="goBack">← 返回列表</NkButton>
      <h3 class="l3-remote__title">远程登录 — {{ accountLabel }}</h3>
      <div class="l3-remote__status">
        <span :class="['l3-remote__dot', connectionClass]"></span>
        <span class="l3-remote__status-text">{{ connectionText }}</span>
      </div>
    </div>

    <div class="l3-remote__body">
      <div class="l3-remote__viewport">
        <div v-if="!sessionStarted" class="l3-remote__placeholder">
          <p>点击下方按钮启动远程浏览器会话</p>
          <NkButton :loading="starting" @click="startSession">启动远程登录</NkButton>
        </div>

        <div v-else-if="!screenshotUrl" class="l3-remote__placeholder">
          <NkLoading />
          <p>等待浏览器连接...</p>
        </div>

        <div v-else class="l3-remote__screenshot-wrapper">
          <img :src="screenshotUrl" alt="远程浏览器截图" class="l3-remote__screenshot" />
          <div v-if="loginSuccess" class="l3-remote__success-overlay">
            <div class="l3-remote__success-box">✅ 登录成功</div>
          </div>
        </div>
      </div>

      <div class="l3-remote__panel">
        <div class="l3-remote__panel-section">
          <h4 class="l3-remote__panel-title">CSS 操作</h4>
          <div class="l3-remote__panel-row">
            <NkInput v-model="cssSelector" placeholder="CSS 选择器" size="sm" style="flex: 1" />
          </div>
          <div class="l3-remote__panel-row">
            <NkInput v-model="cssValue" placeholder="值" size="sm" style="flex: 1" @keyup.enter="sendCssAction" />
            <NkButton size="sm" :disabled="!cssSelector" @click="sendCssAction">发送</NkButton>
          </div>
        </div>

        <div v-if="presetButtons.length" class="l3-remote__panel-section">
          <h4 class="l3-remote__panel-title">快速操作</h4>
          <div class="l3-remote__panel-buttons">
            <NkButton v-for="btn in presetButtons" :key="btn.label" size="xs" variant="outline" @click="sendPreset(btn)">
              {{ btn.label }}
            </NkButton>
          </div>
        </div>

        <div class="l3-remote__panel-section">
          <h4 class="l3-remote__panel-title">会话操作</h4>
          <div class="l3-remote__panel-buttons">
            <NkButton size="xs" variant="outline" :loading="refreshing" @click="handleRefresh">刷新状态</NkButton>
            <NkButton size="xs" variant="outline" :loading="verifying" @click="handleVerify">验证 session</NkButton>
          </div>
        </div>
      </div>
    </div>

    <NkDialog v-model:visible="showResultDialog" :title="loginSuccess ? '登录成功' : '登录失败'" :width="420">
      <p>{{ resultMessage }}</p>
      <template #footer>
        <NkButton @click="goBack">返回列表</NkButton>
        <NkButton v-if="!loginSuccess" variant="ghost" @click="showResultDialog = false">关闭</NkButton>
      </template>
    </NkDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  remoteLogin,
  getAccount,
  refreshSession,
  verifySession,
} from '@/api/login3rd'
import type {
  Login3rdAccount,
  Login3rdPlatform,
  RemoteLoginResp,
} from '@/types/login3rd'
import { listPlatforms } from '@/api/login3rd'
import { NKMessage } from '@nkui/vue/src/utils/message'

const route = useRoute()
const router = useRouter()
const accountId = route.params.id as string

const accountLabel = ref('')
const platforms = ref<Login3rdPlatform[]>([])

const starting = ref(false)
const sessionStarted = ref(false)
const sessionToken = ref('')
const screenshotUrl = ref('')
const loginSuccess = ref(false)

const cssSelector = ref('')
const cssValue = ref('')

const wsConnected = ref(false)
const wsError = ref(false)

const showResultDialog = ref(false)
const resultMessage = ref('')

const refreshing = ref(false)
const verifying = ref(false)

const presetButtons = computed(() => {
  const pid = currentPlatform.value?.id
  const p = platforms.value.find(x => x.id === pid)
  return p?.form_config?.preset_buttons || []
})

const currentPlatform = ref<Login3rdPlatform | null>(null)

const connectionClass = computed(() => {
  if (loginSuccess.value) return 'l3-remote__dot--success'
  if (wsError.value) return 'l3-remote__dot--error'
  if (wsConnected.value) return 'l3-remote__dot--connected'
  if (sessionStarted.value) return 'l3-remote__dot--connecting'
  return 'l3-remote__dot--idle'
})

const connectionText = computed(() => {
  if (loginSuccess.value) return '登录成功'
  if (wsError.value) return '连接错误'
  if (wsConnected.value) return '已连接'
  if (sessionStarted.value) return '连接中...'
  return '未启动'
})

let ws: WebSocket | null = null
let screenshotTimer: ReturnType<typeof setInterval> | null = null

async function loadAccount() {
  try {
    const res = await getAccount(accountId)
    accountLabel.value = res.data.label
  } catch {
    accountLabel.value = '未知账号'
  }
}

async function loadPlatforms() {
  try {
    const res = await listPlatforms()
    platforms.value = res.data
  } catch {
    // silent
  }
}

function getWsBaseUrl(httpUrl: string): string {
  return httpUrl.replace(/^https?:\/\//, (match) => {
    return match.startsWith('https') ? 'wss://' : 'ws://'
  })
}

async function startSession() {
  starting.value = true
  try {
    const res = await remoteLogin(accountId)
    const data: RemoteLoginResp = res.data
    sessionToken.value = data.token

    const platformResp = await getAccount(accountId)
    const pid = platformResp.data.platform_id
    currentPlatform.value = platforms.value.find(p => p.id === pid) || null

    sessionStarted.value = true
    connectWebSocket(data.url)
  } catch (err: any) {
    NKMessage.error(err.message || '启动远程登录失败')
  } finally {
    starting.value = false
  }
}

function connectWebSocket(url: string) {
  const wsUrl = getWsBaseUrl(url)
  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    wsConnected.value = true
    wsError.value = false
  }

  ws.onmessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data)
      if (msg.type === 'screenshot' && msg.data) {
        screenshotUrl.value = `data:image/png;base64,${msg.data}`
      } else if (msg.type === 'success') {
        loginSuccess.value = true
        resultMessage.value = msg.message || '登录成功'
        showResultDialog.value = true
        cleanup()
      } else if (msg.type === 'error') {
        wsError.value = true
        resultMessage.value = msg.message || '登录过程出错'
        showResultDialog.value = true
      } else if (msg.type === 'timeout') {
        resultMessage.value = '登录超时，请重试'
        showResultDialog.value = true
        cleanup()
      }
    } catch {
      // ignore non-JSON messages
    }
  }

  ws.onerror = () => {
    wsError.value = true
    wsConnected.value = false
  }

  ws.onclose = () => {
    wsConnected.value = false
    if (!loginSuccess.value) {
      wsError.value = true
    }
  }
}

function sendWsMessage(type: string, payload: Record<string, any>) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...payload, token: sessionToken.value }))
  } else {
    NKMessage.warning('WebSocket 未连接')
  }
}

function sendCssAction() {
  if (!cssSelector.value) return
  sendWsMessage('css_action', {
    selector: cssSelector.value,
    value: cssValue.value,
  })
}

function sendPreset(btn: { label: string; selector: string }) {
  sendWsMessage('click', { selector: btn.selector })
}

async function handleRefresh() {
  refreshing.value = true
  try {
    await refreshSession(accountId)
    NKMessage.success('Session 已刷新')
  } catch (err: any) {
    NKMessage.error(err.message || '刷新失败')
  } finally {
    refreshing.value = false
  }
}

async function handleVerify() {
  verifying.value = true
  try {
    await verifySession(accountId)
    NKMessage.success('Session 有效')
  } catch (err: any) {
    NKMessage.error(err.message || 'Session 无效')
  } finally {
    verifying.value = false
  }
}

function cleanup() {
  if (ws) {
    ws.onclose = null
    ws.close()
    ws = null
  }
  if (screenshotTimer) {
    clearInterval(screenshotTimer)
    screenshotTimer = null
  }
}

function goBack() {
  cleanup()
  router.back()
}

onMounted(() => {
  loadAccount()
  loadPlatforms()
})

onUnmounted(() => {
  cleanup()
})
</script>

<style lang="scss" scoped>
.l3-remote {
  max-width: 1200px;

  &__header {
    display: flex;
    align-items: center;
    gap: $nk-spacing-md;
    margin-bottom: $nk-spacing-lg;
  }

  &__title {
    flex: 1;
    font-size: $nk-font-size-lg;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-900;
  }

  &__status {
    display: flex;
    align-items: center;
    gap: $nk-spacing-xs;
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-500;
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;

    &--idle { background: $nk-color-neutral-300; }
    &--connecting { background: $nk-color-warning; animation: pulse 1s infinite; }
    &--connected { background: $nk-color-success; }
    &--error { background: $nk-color-error; }
    &--success { background: $nk-color-success; }
  }

  &__body {
    display: flex;
    gap: $nk-spacing-lg;
  }

  &__viewport {
    flex: 1;
    min-height: 400px;
    background: $nk-color-neutral-50;
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }

  &__placeholder {
    text-align: center;
    color: $nk-color-neutral-400;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $nk-spacing-md;
  }

  &__screenshot-wrapper {
    width: 100%;
    position: relative;
  }

  &__screenshot {
    width: 100%;
    display: block;
  }

  &__success-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__success-box {
    background: white;
    padding: $nk-spacing-xl $nk-spacing-2xl;
    border-radius: $nk-radius-lg;
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-bold;
    color: $nk-color-success;
  }

  &__panel {
    width: 300px;
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-lg;
  }

  &__panel-section {
    background: $nk-color-neutral-50;
    border: 1px solid $nk-color-neutral-200;
    border-radius: $nk-radius-md;
    padding: $nk-spacing-md;
  }

  &__panel-title {
    font-size: $nk-font-size-sm;
    font-weight: $nk-font-weight-semibold;
    color: $nk-color-neutral-700;
    margin-bottom: $nk-spacing-sm;
  }

  &__panel-row {
    display: flex;
    gap: $nk-spacing-xs;
    margin-bottom: $nk-spacing-xs;

    &:last-child { margin-bottom: 0; }
  }

  &__panel-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: $nk-spacing-xs;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>