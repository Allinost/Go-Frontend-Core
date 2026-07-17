<template>
  <div class="crypto-page">
    <h2 class="crypto-page__title">加密工具</h2>

    <NkTabs v-model="activeTab" :items="tabs" @change="onTabChange" />

    <div class="crypto-page__content">
      <!-- Encrypt -->
      <div v-if="activeTab === 'encrypt'">
        <NkCard>
          <template #header>加密</template>
          <div class="crypto-page__form">
            <div class="crypto-page__field">
              <label>算法</label>
              <NkSelect v-model="encryptForm.algo" :options="algoOptions" placeholder="选择加密算法" />
            </div>
            <div class="crypto-page__field">
              <label>待加密数据</label>
              <NkTextarea v-model="encryptForm.data" placeholder="请输入要加密的数据" :rows="5" />
            </div>
            <div class="crypto-page__field">
              <label>或上传文件</label>
              <input type="file" @change="onEncryptFile" class="crypto-page__file-input" />
            </div>
            <div class="crypto-page__field">
              <label>密钥 (可选，留空自动生成)</label>
              <NkInput v-model="encryptForm.keyHex" placeholder="Hex 编码密钥" />
            </div>
            <NkButton :loading="encrypting" @click="handleEncrypt">加密</NkButton>
            <div v-if="encryptResult" class="crypto-page__result">
              <label>加密结果</label>
              <div class="crypto-page__result-box">
                <NkTextarea :model-value="encryptResult" readonly :rows="4" />
                <NkButton size="sm" variant="ghost" @click="copyText(encryptResult)">复制</NkButton>
              </div>
            </div>
          </div>
        </NkCard>
      </div>

      <!-- Decrypt -->
      <div v-if="activeTab === 'decrypt'">
        <NkCard>
          <template #header>解密</template>
          <div class="crypto-page__form">
            <div class="crypto-page__field">
              <label>算法</label>
              <NkSelect v-model="decryptForm.algo" :options="algoOptions" placeholder="选择加密算法" />
            </div>
            <div class="crypto-page__field">
              <label>待解密数据</label>
              <NkTextarea v-model="decryptForm.data" placeholder="请输入要解密的数据" :rows="5" />
            </div>
            <div class="crypto-page__field">
              <label>或上传文件</label>
              <input type="file" @change="onDecryptFile" class="crypto-page__file-input" />
            </div>
            <div class="crypto-page__field">
              <label>密钥 (可选)</label>
              <NkInput v-model="decryptForm.keyHex" placeholder="Hex 编码密钥" />
            </div>
            <NkButton :loading="decrypting" @click="handleDecrypt">解密</NkButton>
            <div v-if="decryptResult" class="crypto-page__result">
              <label>解密结果</label>
              <div class="crypto-page__result-box">
                <NkTextarea :model-value="decryptResult" readonly :rows="4" />
                <NkButton size="sm" variant="ghost" @click="copyText(decryptResult)">复制</NkButton>
              </div>
            </div>
          </div>
        </NkCard>
      </div>

      <!-- Compress -->
      <div v-if="activeTab === 'compress'">
        <NkCard>
          <template #header>压缩</template>
          <div class="crypto-page__form">
            <div class="crypto-page__field">
              <label>压缩方法</label>
              <NkSelect v-model="compressForm.method" :options="methodOptions" placeholder="选择压缩方法" />
            </div>
            <div class="crypto-page__field">
              <label>压缩级别 (1-9)</label>
              <NkInput v-model.number="compressForm.level" type="number" min="1" max="9" />
            </div>
            <div class="crypto-page__field">
              <label>待压缩数据</label>
              <NkTextarea v-model="compressForm.data" placeholder="请输入要压缩的数据" :rows="5" />
            </div>
            <div class="crypto-page__field">
              <label>或上传文件</label>
              <input type="file" @change="onCompressFile" class="crypto-page__file-input" />
            </div>
            <NkButton :loading="compressing" @click="handleCompress">压缩</NkButton>
            <div v-if="compressResult" class="crypto-page__result">
              <label>压缩结果 (Hex)</label>
              <div class="crypto-page__result-box">
                <NkTextarea :model-value="compressResult" readonly :rows="4" />
                <NkButton size="sm" variant="ghost" @click="copyText(compressResult)">复制</NkButton>
              </div>
            </div>
          </div>
        </NkCard>
      </div>

      <!-- Decompress -->
      <div v-if="activeTab === 'decompress'">
        <NkCard>
          <template #header>解压</template>
          <div class="crypto-page__form">
            <div class="crypto-page__field">
              <label>Hex 数据</label>
              <NkTextarea v-model="decompressForm.data" placeholder="请输入 Hex 格式的压缩数据" :rows="5" />
            </div>
            <div class="crypto-page__field">
              <label>或上传文件</label>
              <input type="file" @change="onDecompressFile" class="crypto-page__file-input" />
            </div>
            <NkButton :loading="decompressing" @click="handleDecompress">解压</NkButton>
            <div v-if="decompressResult" class="crypto-page__result">
              <label>解压结果</label>
              <div class="crypto-page__result-box">
                <NkTextarea :model-value="decompressResult" readonly :rows="4" />
                <NkButton size="sm" variant="ghost" @click="copyText(decompressResult)">复制</NkButton>
              </div>
            </div>
          </div>
        </NkCard>
      </div>

      <!-- Hash -->
      <div v-if="activeTab === 'hash'">
        <NkCard>
          <template #header>哈希</template>
          <div class="crypto-page__form">
            <div class="crypto-page__field">
              <label>算法</label>
              <NkSelect v-model="hashForm.algo" :options="hashAlgoOptions" placeholder="选择哈希算法" />
            </div>
            <div class="crypto-page__field">
              <label>待哈希数据</label>
              <NkTextarea v-model="hashForm.data" placeholder="请输入要哈希的数据" :rows="5" />
            </div>
            <div class="crypto-page__field">
              <label>或上传文件</label>
              <input type="file" @change="onHashFile" class="crypto-page__file-input" />
            </div>
            <NkButton :loading="hashing" @click="handleHash">计算哈希</NkButton>
            <div v-if="hashResult" class="crypto-page__result">
              <label>哈希结果</label>
              <div class="crypto-page__result-box">
                <NkTextarea :model-value="hashResult.algo + ': ' + hashResult.result" readonly :rows="2" />
                <NkButton size="sm" variant="ghost" @click="copyText(hashResult.result)">复制</NkButton>
              </div>
            </div>
          </div>
        </NkCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { NKMessage } from '@nkui/vue/src/utils/message'
import {
  encrypt as apiEncrypt,
  decrypt as apiDecrypt,
  compress as apiCompress,
  decompress as apiDecompress,
  hash as apiHash,
} from '@/api/crypto'

const activeTab = ref('encrypt')

const tabs = [
  { label: '加密', value: 'encrypt' },
  { label: '解密', value: 'decrypt' },
  { label: '压缩', value: 'compress' },
  { label: '解压', value: 'decompress' },
  { label: '哈希', value: 'hash' },
]

const algoOptions = [
  { label: 'AES-GCM', value: 'aes-gcm' },
  { label: 'ChaCha20', value: 'chacha20' },
]

const methodOptions = [
  { label: 'GZip', value: 'gzip' },
  { label: 'Zlib', value: 'zlib' },
  { label: 'ZIP', value: 'zip' },
]

const hashAlgoOptions = [
  { label: 'SHA256', value: 'sha256' },
  { label: 'SHA512', value: 'sha512' },
  { label: 'BLAKE3', value: 'blake3' },
]

function onTabChange(value: string | number) {
  activeTab.value = value as string
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

// Encrypt
const encryptForm = reactive({ data: '', keyHex: '', algo: 'aes-gcm' })
const encrypting = ref(false)
const encryptResult = ref('')

async function onEncryptFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) encryptForm.data = await readFileAsText(file)
}

async function handleEncrypt() {
  if (!encryptForm.data) { NKMessage.warning('请输入待加密数据或上传文件'); return }
  encrypting.value = true; encryptResult.value = ''
  try {
    const res = await apiEncrypt({ data: encryptForm.data, key_hex: encryptForm.keyHex || undefined, algo: encryptForm.algo as 'aes-gcm' | 'chacha20' })
    encryptResult.value = res.data.result; NKMessage.success('加密成功')
  } catch (err: any) { NKMessage.error(err.message || '加密失败') }
  finally { encrypting.value = false }
}

// Decrypt
const decryptForm = reactive({ data: '', keyHex: '', algo: 'aes-gcm' })
const decrypting = ref(false)
const decryptResult = ref('')

async function onDecryptFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) decryptForm.data = await readFileAsText(file)
}

async function handleDecrypt() {
  if (!decryptForm.data) { NKMessage.warning('请输入待解密数据或上传文件'); return }
  decrypting.value = true; decryptResult.value = ''
  try {
    const res = await apiDecrypt({ data: decryptForm.data, key_hex: decryptForm.keyHex || undefined, algo: decryptForm.algo as 'aes-gcm' | 'chacha20' })
    decryptResult.value = res.data.result; NKMessage.success('解密成功')
  } catch (err: any) { NKMessage.error(err.message || '解密失败') }
  finally { decrypting.value = false }
}

// Compress
const compressForm = reactive({ data: '', method: 'gzip', level: 6 })
const compressing = ref(false)
const compressResult = ref('')

async function onCompressFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) compressForm.data = await readFileAsText(file)
}

async function handleCompress() {
  if (!compressForm.data) { NKMessage.warning('请输入待压缩数据或上传文件'); return }
  compressing.value = true; compressResult.value = ''
  try {
    const res = await apiCompress({ data: compressForm.data, method: compressForm.method as 'gzip' | 'zlib' | 'zip', level: compressForm.level })
    compressResult.value = res.data.result; NKMessage.success('压缩成功')
  } catch (err: any) { NKMessage.error(err.message || '压缩失败') }
  finally { compressing.value = false }
}

// Decompress
const decompressForm = reactive({ data: '' })
const decompressing = ref(false)
const decompressResult = ref('')

async function onDecompressFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) decompressForm.data = await readFileAsText(file)
}

async function handleDecompress() {
  if (!decompressForm.data) { NKMessage.warning('请输入待解压数据或上传文件'); return }
  decompressing.value = true; decompressResult.value = ''
  try {
    const res = await apiDecompress({ data: decompressForm.data })
    decompressResult.value = res.data.result; NKMessage.success('解压成功')
  } catch (err: any) { NKMessage.error(err.message || '解压失败') }
  finally { decompressing.value = false }
}

// Hash
const hashForm = reactive({ data: '', algo: 'sha256' })
const hashing = ref(false)
const hashResult = ref<{ result: string; algo: string } | null>(null)

async function onHashFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) hashForm.data = await readFileAsText(file)
}

async function handleHash() {
  if (!hashForm.data) { NKMessage.warning('请输入待哈希数据或上传文件'); return }
  hashing.value = true; hashResult.value = null
  try {
    const res = await apiHash({ data: hashForm.data, algo: hashForm.algo as 'sha256' | 'sha512' | 'blake3' })
    hashResult.value = res.data; NKMessage.success('哈希计算成功')
  } catch (err: any) { NKMessage.error(err.message || '哈希计算失败') }
  finally { hashing.value = false }
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => NKMessage.success('已复制到剪贴板'))
}
</script>

<style lang="scss" scoped>
.crypto-page {
  max-width: 800px;

  &__title {
    font-size: $nk-font-size-xl;
    font-weight: $nk-font-weight-semibold;
    margin-bottom: $nk-spacing-xl;
    color: $nk-color-neutral-900;
  }

  &__content {
    margin-top: $nk-spacing-lg;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-md;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;

    label {
      font-size: $nk-font-size-sm;
      font-weight: $nk-font-weight-medium;
      color: $nk-color-neutral-600;
    }
  }

  &__file-input {
    font-size: $nk-font-size-sm;
    color: $nk-color-neutral-600;
  }

  &__result {
    display: flex;
    flex-direction: column;
    gap: $nk-spacing-xs;

    label {
      font-size: $nk-font-size-sm;
      font-weight: $nk-font-weight-medium;
      color: $nk-color-neutral-600;
    }
  }

  &__result-box {
    display: flex;
    align-items: flex-start;
    gap: $nk-spacing-sm;
  }
}
</style>
