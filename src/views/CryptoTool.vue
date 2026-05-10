<template>
  <div class="crypto-wrapper">
    <!-- 顶栏 -->
    <div class="header">
      <div class="header-left">
        <div class="page-title-block">
          <div class="page-eyebrow">Developer Tools</div>
          <div class="breadcrumb">
            <el-icon><Lock /></el-icon>
            <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
            <span class="breadcrumb-sep">/</span>
            <span>{{ t('cryptoTool.title') }}</span>
          </div>
        </div>
      </div>
      <div class="header-right">
        <el-button size="small" text @click="swapInputOutput" :title="t('cryptoTool.swap')">
          <el-icon><Sort /></el-icon>
        </el-button>
        <el-button size="small" text @click="clearAll" :title="t('cryptoTool.clear')">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 主体 -->
    <div class="main-body">
      <!-- 左侧分类导航 -->
      <div class="category-nav">
        <div
          v-for="cat in categories"
          :key="cat.key"
          class="category-item"
          :class="{ active: activeCategory === cat.key }"
          @click="activeCategory = cat.key"
        >
          <span class="cat-icon">{{ cat.icon }}</span>
          <span class="cat-label">{{ cat.label }}</span>
        </div>
      </div>

      <!-- 中间内容区 -->
      <div class="content-area">
        <!-- 算法选择栏 -->
        <div class="algo-bar">
          <el-radio-group v-model="activeAlgo" size="small">
            <el-radio-button
              v-for="algo in currentAlgos"
              :key="algo.key"
              :value="algo.key"
            >
              {{ algo.label }}
            </el-radio-button>
          </el-radio-group>

          <!-- 算法说明:点击感叹号弹出气泡(原右侧 info-panel 被合并到这里) -->
          <el-popover
            placement="bottom-end"
            :width="320"
            trigger="click"
            popper-class="crypto-info-popover"
          >
            <template #reference>
              <button class="info-trigger" type="button" :title="currentAlgoInfo.label">!</button>
            </template>
            <div class="info-pop">
              <div class="info-pop-title">{{ currentAlgoInfo.label }}</div>
              <div v-if="currentAlgoInfo.desc" class="info-pop-desc">{{ currentAlgoInfo.desc }}</div>
              <div v-if="currentAlgoInfo.props && currentAlgoInfo.props.length" class="info-pop-props">
                <div v-for="p in currentAlgoInfo.props" :key="p.label" class="info-pop-prop">
                  <span class="prop-label">{{ p.label }}:</span>
                  <span class="prop-value">{{ p.value }}</span>
                </div>
              </div>
            </div>
          </el-popover>
        </div>

        <!-- 参数栏（部分算法需要key/iv等） -->
        <div class="params-bar" v-if="needsParams">
          <el-input
            v-if="needsKey"
            v-model="secretKey"
            size="small"
            :placeholder="t('cryptoTool.keyPlaceholder')"
            class="param-input"
            clearable
          >
            <template #prepend>Key</template>
          </el-input>
          <el-input
            v-if="needsIV"
            v-model="iv"
            size="small"
            :placeholder="t('cryptoTool.ivPlaceholder')"
            class="param-input"
            clearable
          >
            <template #prepend>IV</template>
          </el-input>
          <el-select v-if="showMode" v-model="cipherMode" size="small" class="param-select">
            <el-option label="CBC" value="CBC" />
            <el-option label="ECB" value="ECB" />
            <el-option label="CFB" value="CFB" />
            <el-option label="OFB" value="OFB" />
            <el-option label="CTR" value="CTR" />
          </el-select>
          <el-select v-if="showPadding" v-model="padding" size="small" class="param-select">
            <el-option label="Pkcs7" value="Pkcs7" />
            <el-option label="ZeroPadding" value="ZeroPadding" />
            <el-option label="NoPadding" value="NoPadding" />
          </el-select>
          <el-select v-if="showKeySize" v-model="keySize" size="small" class="param-select" style="width:100px">
            <el-option label="128bit" :value="128" />
            <el-option label="192bit" :value="192" />
            <el-option label="256bit" :value="256" />
          </el-select>
          <el-select v-if="showOutputEncoding" v-model="outputEncoding" size="small" class="param-select">
            <el-option label="Hex" value="hex" />
            <el-option label="Base64" value="base64" />
          </el-select>
        </div>

        <!-- RSA 密钥对参数 -->
        <div class="params-bar" v-if="isRSA">
          <el-input
            v-model="rsaPublicKey"
            type="textarea"
            :rows="3"
            size="small"
            :placeholder="t('cryptoTool.rsaPublicKeyPlaceholder')"
            class="rsa-key-input"
          />
          <el-input
            v-model="rsaPrivateKey"
            type="textarea"
            :rows="3"
            size="small"
            :placeholder="t('cryptoTool.rsaPrivateKeyPlaceholder')"
            class="rsa-key-input"
          />
          <el-button size="small" type="primary" @click="generateRSAKeyPair">
            <el-icon style="margin-right: 6px;"><Key /></el-icon>{{ t('cryptoTool.generateKeyPair') }}
          </el-button>
        </div>

        <!-- 输入输出区 -->
        <div class="io-area">
          <div class="io-panel">
            <div class="panel-header">
              <span>{{ t('cryptoTool.input') }}</span>
              <div class="panel-actions">
                <el-button size="small" text @click="pasteInput">
                  <el-icon><DocumentCopy /></el-icon>
                </el-button>
              </div>
            </div>
            <textarea
              v-model="inputText"
              class="io-textarea"
              :placeholder="t('cryptoTool.inputPlaceholder')"
              spellcheck="false"
            />
          </div>

          <!-- 操作按钮 -->
          <div class="action-buttons">
            <el-button
              v-if="canEncrypt"
              type="primary"
              @click="doEncrypt"
              :disabled="!inputText.trim()"
            >
              <el-icon style="margin-right: 6px;"><Lock /></el-icon>{{ encryptLabel }}
            </el-button>
            <el-button
              v-if="canDecrypt"
              @click="doDecrypt"
              :disabled="!inputText.trim()"
            >
              <el-icon style="margin-right: 6px;"><Unlock /></el-icon>{{ decryptLabel }}
            </el-button>
            <el-button
              v-if="isHashOnly"
              type="primary"
              @click="doEncrypt"
              :disabled="!inputText.trim()"
            >
              <el-icon style="margin-right: 6px;"><MagicStick /></el-icon>{{ t('cryptoTool.calculate') }}
            </el-button>
          </div>

          <div class="io-panel">
            <div class="panel-header">
              <span>{{ t('cryptoTool.output') }}</span>
              <div class="panel-actions">
                <el-button size="small" text @click="copyOutput" :disabled="!outputText">
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </div>
            </div>
            <textarea
              v-model="outputText"
              class="io-textarea"
              :placeholder="t('cryptoTool.outputPlaceholder')"
              spellcheck="false"
              readonly
            />
          </div>
        </div>

        <!-- 哈希增强功能 -->
        <div class="hash-extras" v-if="isHashCategory">
          <!-- 哈希对比验证 -->
          <div class="hash-verify">
            <div class="verify-header">{{ t('cryptoTool.hashVerify') }}</div>
            <div class="verify-row">
              <el-input
                v-model="verifyHash"
                size="small"
                :placeholder="t('cryptoTool.verifyPlaceholder')"
                clearable
                class="verify-input"
              />
              <el-button size="small" type="primary" @click="doVerifyHash" :disabled="!outputText || !verifyHash.trim()">
                <el-icon style="margin-right: 6px;"><Check /></el-icon>{{ t('cryptoTool.verify') }}
              </el-button>
            </div>
            <div v-if="verifyResult !== null" class="verify-result" :class="verifyResult ? 'match' : 'mismatch'">
              <el-icon><CircleCheckFilled v-if="verifyResult" /><CircleCloseFilled v-else /></el-icon>
              {{ verifyResult ? t('cryptoTool.hashMatch') : t('cryptoTool.hashMismatch') }}
            </div>
          </div>

          <!-- 彩虹表在线查询 -->
          <div class="rainbow-lookup">
            <div class="verify-header">{{ t('cryptoTool.rainbowLookup') }}</div>
            <div class="verify-row">
              <el-input
                v-model="rainbowInput"
                size="small"
                :placeholder="t('cryptoTool.rainbowPlaceholder')"
                clearable
                class="verify-input"
              />
              <el-button size="small" type="warning" @click="doRainbowLookup" :loading="rainbowLoading" :disabled="!rainbowInput.trim()">
                <el-icon style="margin-right: 6px;"><Search /></el-icon>{{ t('cryptoTool.lookup') }}
              </el-button>
            </div>
            <div v-if="rainbowResult !== null" class="rainbow-result">
              <template v-if="rainbowResult">
                <span class="rainbow-found">{{ t('cryptoTool.plaintext') }}: <code>{{ rainbowResult }}</code></span>
              </template>
              <template v-else>
                <span class="rainbow-notfound">{{ t('cryptoTool.notFound') }}</span>
              </template>
            </div>
            <div class="rainbow-hint">{{ t('cryptoTool.rainbowHint') }}</div>
          </div>
        </div>

        <!-- 错误提示 -->
        <div class="error-bar" v-if="errorMsg">
          <el-alert :title="errorMsg" type="error" show-icon :closable="false" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Lock, Unlock, Delete, Sort, DocumentCopy, CopyDocument, CircleCheckFilled, CircleCloseFilled, Key, MagicStick, Check, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import CryptoJS from 'crypto-js'
import { JSEncrypt } from 'jsencrypt'

const router = useRouter()

// ========== 分类与算法定义 ==========
const categories = [
  { key: 'hash', icon: '#️⃣', label: t('cryptoTool.categories.hash') },
  { key: 'symmetric', icon: '🔐', label: t('cryptoTool.categories.symmetric') },
  { key: 'asymmetric', icon: '🔑', label: t('cryptoTool.categories.asymmetric') },
  { key: 'encoding', icon: '🔤', label: t('cryptoTool.categories.encoding') },
  { key: 'other', icon: '🛠️', label: t('cryptoTool.categories.other') },
]

const algoMap = {
  hash: [
    { key: 'md5', label: 'MD5', hashOnly: true },
    { key: 'sha1', label: 'SHA-1', hashOnly: true },
    { key: 'sha224', label: 'SHA-224', hashOnly: true },
    { key: 'sha256', label: 'SHA-256', hashOnly: true },
    { key: 'sha384', label: 'SHA-384', hashOnly: true },
    { key: 'sha512', label: 'SHA-512', hashOnly: true },
    { key: 'sha3_256', label: 'SHA3-256', hashOnly: true },
    { key: 'sha3_512', label: 'SHA3-512', hashOnly: true },
    { key: 'ripemd160', label: 'RIPEMD-160', hashOnly: true },
    { key: 'hmac_md5', label: 'HMAC-MD5', hashOnly: true, needsKey: true },
    { key: 'hmac_sha256', label: 'HMAC-SHA256', hashOnly: true, needsKey: true },
    { key: 'hmac_sha512', label: 'HMAC-SHA512', hashOnly: true, needsKey: true },
  ],
  symmetric: [
    { key: 'aes', label: 'AES', needsKey: true, needsIV: true, showMode: true, showPadding: true, showKeySize: true, showOutputEncoding: true },
    { key: 'des', label: 'DES', needsKey: true, needsIV: true, showMode: true, showOutputEncoding: true },
    { key: 'tripledes', label: '3DES', needsKey: true, needsIV: true, showMode: true, showOutputEncoding: true },
    { key: 'rabbit', label: 'Rabbit', needsKey: true, showOutputEncoding: true },
    { key: 'rc4', label: 'RC4', needsKey: true, showOutputEncoding: true },
  ],
  asymmetric: [
    { key: 'rsa', label: 'RSA', isRSA: true },
  ],
  encoding: [
    { key: 'base64', label: 'Base64' },
    { key: 'base32', label: 'Base32' },
    { key: 'hex', label: 'Hex' },
    { key: 'url', label: 'URL Encode' },
    { key: 'html', label: 'HTML Encode' },
    { key: 'unicode', label: 'Unicode' },
    { key: 'utf8', label: 'UTF-8 Hex' },
    { key: 'ascii', label: 'ASCII' },
    { key: 'binary', label: 'Binary' },
    { key: 'octal', label: 'Octal' },
    { key: 'morse', label: 'Morse' },
  ],
  other: [
    { key: 'jwt', label: 'JWT Decode', hashOnly: true },
    { key: 'bcrypt_gen', label: 'Bcrypt Gen', hashOnly: true },
    { key: 'crc32', label: 'CRC32', hashOnly: true },
  ],
}

const activeCategory = ref('hash')
const activeAlgo = ref('md5')
const inputText = ref('')
const outputText = ref('')
const errorMsg = ref('')

// 加密参数
const secretKey = ref('')
const iv = ref('')
const cipherMode = ref('CBC')
const padding = ref('Pkcs7')
const keySize = ref(256)
const outputEncoding = ref('hex')

// RSA 密钥
const rsaPublicKey = ref('')
const rsaPrivateKey = ref('')

// 哈希增强
const verifyHash = ref('')
const verifyResult = ref(null)
const rainbowInput = ref('')
const rainbowResult = ref(null)
const rainbowLoading = ref(false)
const isHashCategory = computed(() => activeCategory.value === 'hash')

// 切换分类时自动选第一个算法
watch(activeCategory, (cat) => {
  const algos = algoMap[cat]
  if (algos && algos.length) {
    activeAlgo.value = algos[0].key
  }
  errorMsg.value = ''
})

const currentAlgos = computed(() => algoMap[activeCategory.value] || [])
const currentAlgoConfig = computed(() => currentAlgos.value.find(a => a.key === activeAlgo.value) || {})
const currentAlgoInfo = computed(() => {
  const algoKey = activeAlgo.value
  const descValue = t(`cryptoTool.algos.${algoKey}.desc`)
  const propsValue = t(`cryptoTool.algos.${algoKey}.props`)
  return {
    label: currentAlgoConfig.value.label || '',
    // t() 没找到 key 时会返回 key 本身（字符串），这里 fallback 成空
    desc: typeof descValue === 'string' && descValue.startsWith('cryptoTool.algos.') ? '' : descValue,
    props: Array.isArray(propsValue) ? propsValue : null,
  }
})

const needsKey = computed(() => currentAlgoConfig.value.needsKey)
const needsIV = computed(() => currentAlgoConfig.value.needsIV)
const showMode = computed(() => currentAlgoConfig.value.showMode)
const showPadding = computed(() => currentAlgoConfig.value.showPadding)
const showKeySize = computed(() => currentAlgoConfig.value.showKeySize)
const showOutputEncoding = computed(() => currentAlgoConfig.value.showOutputEncoding)
const needsParams = computed(() => needsKey.value || needsIV.value || showMode.value || showOutputEncoding.value)
const isRSA = computed(() => currentAlgoConfig.value.isRSA)
const isHashOnly = computed(() => currentAlgoConfig.value.hashOnly && !isRSA.value)
const canEncrypt = computed(() => !isHashOnly.value && !isRSA.value)
const canDecrypt = computed(() => !isHashOnly.value && !isRSA.value)
const encryptLabel = computed(() => activeCategory.value === 'encoding' ? t('cryptoTool.encode') : t('cryptoTool.encrypt'))
const decryptLabel = computed(() => activeCategory.value === 'encoding' ? t('cryptoTool.decode') : t('cryptoTool.decrypt'))

// ========== 加密/解密逻辑 ==========
function getCryptoJSMode() {
  const modes = { CBC: CryptoJS.mode.CBC, ECB: CryptoJS.mode.ECB, CFB: CryptoJS.mode.CFB, OFB: CryptoJS.mode.OFB, CTR: CryptoJS.mode.CTR }
  return modes[cipherMode.value] || CryptoJS.mode.CBC
}

function getCryptoJSPadding() {
  const pads = { Pkcs7: CryptoJS.pad.Pkcs7, ZeroPadding: CryptoJS.pad.ZeroPadding, NoPadding: CryptoJS.pad.NoPadding }
  return pads[padding.value] || CryptoJS.pad.Pkcs7
}

function formatOutput(wordArray) {
  if (outputEncoding.value === 'base64') return CryptoJS.enc.Base64.stringify(wordArray)
  return wordArray.toString(CryptoJS.enc.Hex)
}

function parseInput(str) {
  if (outputEncoding.value === 'base64') return CryptoJS.enc.Base64.parse(str)
  return CryptoJS.enc.Hex.parse(str)
}

function doEncrypt() {
  errorMsg.value = ''
  try {
    const algo = activeAlgo.value
    const text = inputText.value

    // === Hash ===
    if (algo === 'md5') { outputText.value = CryptoJS.MD5(text).toString(); return }
    if (algo === 'sha1') { outputText.value = CryptoJS.SHA1(text).toString(); return }
    if (algo === 'sha224') { outputText.value = CryptoJS.SHA224(text).toString(); return }
    if (algo === 'sha256') { outputText.value = CryptoJS.SHA256(text).toString(); return }
    if (algo === 'sha384') { outputText.value = CryptoJS.SHA384(text).toString(); return }
    if (algo === 'sha512') { outputText.value = CryptoJS.SHA512(text).toString(); return }
    if (algo === 'sha3_256') { outputText.value = CryptoJS.SHA3(text, { outputLength: 256 }).toString(); return }
    if (algo === 'sha3_512') { outputText.value = CryptoJS.SHA3(text, { outputLength: 512 }).toString(); return }
    if (algo === 'ripemd160') { outputText.value = CryptoJS.RIPEMD160(text).toString(); return }

    // === HMAC ===
    if (algo === 'hmac_md5') { outputText.value = CryptoJS.HmacMD5(text, secretKey.value).toString(); return }
    if (algo === 'hmac_sha256') { outputText.value = CryptoJS.HmacSHA256(text, secretKey.value).toString(); return }
    if (algo === 'hmac_sha512') { outputText.value = CryptoJS.HmacSHA512(text, secretKey.value).toString(); return }

    // === Symmetric ===
    if (algo === 'aes') {
      const key = CryptoJS.enc.Utf8.parse(secretKey.value)
      const ivVal = CryptoJS.enc.Utf8.parse(iv.value)
      const encrypted = CryptoJS.AES.encrypt(text, key, { iv: ivVal, mode: getCryptoJSMode(), padding: getCryptoJSPadding() })
      outputText.value = outputEncoding.value === 'base64' ? encrypted.toString() : encrypted.ciphertext.toString(CryptoJS.enc.Hex)
      return
    }
    if (algo === 'des') {
      const key = CryptoJS.enc.Utf8.parse(secretKey.value)
      const ivVal = CryptoJS.enc.Utf8.parse(iv.value)
      const encrypted = CryptoJS.DES.encrypt(text, key, { iv: ivVal, mode: getCryptoJSMode(), padding: getCryptoJSPadding() })
      outputText.value = outputEncoding.value === 'base64' ? encrypted.toString() : encrypted.ciphertext.toString(CryptoJS.enc.Hex)
      return
    }
    if (algo === 'tripledes') {
      const key = CryptoJS.enc.Utf8.parse(secretKey.value)
      const ivVal = CryptoJS.enc.Utf8.parse(iv.value)
      const encrypted = CryptoJS.TripleDES.encrypt(text, key, { iv: ivVal, mode: getCryptoJSMode(), padding: getCryptoJSPadding() })
      outputText.value = outputEncoding.value === 'base64' ? encrypted.toString() : encrypted.ciphertext.toString(CryptoJS.enc.Hex)
      return
    }
    if (algo === 'rabbit') {
      const encrypted = CryptoJS.Rabbit.encrypt(text, secretKey.value)
      outputText.value = outputEncoding.value === 'base64' ? encrypted.toString() : encrypted.ciphertext.toString(CryptoJS.enc.Hex)
      return
    }
    if (algo === 'rc4') {
      const encrypted = CryptoJS.RC4.encrypt(text, secretKey.value)
      outputText.value = outputEncoding.value === 'base64' ? encrypted.toString() : encrypted.ciphertext.toString(CryptoJS.enc.Hex)
      return
    }

    // === RSA ===
    if (algo === 'rsa') {
      const encrypt = new JSEncrypt()
      encrypt.setPublicKey(rsaPublicKey.value)
      const result = encrypt.encrypt(text)
      if (!result) throw new Error(t('cryptoTool.rsaEncryptFailed'))
      outputText.value = result
      return
    }

    // === Encoding ===
    if (algo === 'base64') { outputText.value = btoa(unescape(encodeURIComponent(text))); return }
    if (algo === 'base32') { outputText.value = base32Encode(text); return }
    if (algo === 'hex') { outputText.value = Array.from(new TextEncoder().encode(text)).map(b => b.toString(16).padStart(2, '0')).join(' '); return }
    if (algo === 'url') { outputText.value = encodeURIComponent(text); return }
    if (algo === 'html') { outputText.value = htmlEncode(text); return }
    if (algo === 'unicode') { outputText.value = Array.from(text).map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join(''); return }
    if (algo === 'utf8') { outputText.value = Array.from(new TextEncoder().encode(text)).map(b => b.toString(16).padStart(2, '0')).join(' '); return }
    if (algo === 'ascii') { outputText.value = Array.from(text).map(c => c.charCodeAt(0)).join(' '); return }
    if (algo === 'binary') { outputText.value = Array.from(new TextEncoder().encode(text)).map(b => b.toString(2).padStart(8, '0')).join(' '); return }
    if (algo === 'octal') { outputText.value = Array.from(new TextEncoder().encode(text)).map(b => '\\' + b.toString(8).padStart(3, '0')).join(''); return }
    if (algo === 'morse') { outputText.value = morseEncode(text); return }

    // === Other ===
    if (algo === 'jwt') { outputText.value = jwtDecode(text); return }
    if (algo === 'bcrypt_gen') { outputText.value = simpleBcryptHash(text); return }
    if (algo === 'crc32') { outputText.value = crc32(text).toString(16).padStart(8, '0'); return }

  } catch (e) {
    errorMsg.value = e.message || String(e)
  }
}

function doDecrypt() {
  errorMsg.value = ''
  try {
    const algo = activeAlgo.value
    const text = inputText.value

    // === Symmetric ===
    if (algo === 'aes') {
      const key = CryptoJS.enc.Utf8.parse(secretKey.value)
      const ivVal = CryptoJS.enc.Utf8.parse(iv.value)
      let cipherParams
      if (outputEncoding.value === 'base64') {
        cipherParams = text
      } else {
        cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Hex.parse(text) })
      }
      const decrypted = CryptoJS.AES.decrypt(cipherParams, key, { iv: ivVal, mode: getCryptoJSMode(), padding: getCryptoJSPadding() })
      outputText.value = decrypted.toString(CryptoJS.enc.Utf8)
      return
    }
    if (algo === 'des') {
      const key = CryptoJS.enc.Utf8.parse(secretKey.value)
      const ivVal = CryptoJS.enc.Utf8.parse(iv.value)
      let cipherParams = outputEncoding.value === 'base64' ? text : CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Hex.parse(text) })
      const decrypted = CryptoJS.DES.decrypt(cipherParams, key, { iv: ivVal, mode: getCryptoJSMode(), padding: getCryptoJSPadding() })
      outputText.value = decrypted.toString(CryptoJS.enc.Utf8)
      return
    }
    if (algo === 'tripledes') {
      const key = CryptoJS.enc.Utf8.parse(secretKey.value)
      const ivVal = CryptoJS.enc.Utf8.parse(iv.value)
      let cipherParams = outputEncoding.value === 'base64' ? text : CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Hex.parse(text) })
      const decrypted = CryptoJS.TripleDES.decrypt(cipherParams, key, { iv: ivVal, mode: getCryptoJSMode(), padding: getCryptoJSPadding() })
      outputText.value = decrypted.toString(CryptoJS.enc.Utf8)
      return
    }
    if (algo === 'rabbit') {
      const decrypted = CryptoJS.Rabbit.decrypt(outputEncoding.value === 'base64' ? text : CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Hex.parse(text) }), secretKey.value)
      outputText.value = decrypted.toString(CryptoJS.enc.Utf8)
      return
    }
    if (algo === 'rc4') {
      const decrypted = CryptoJS.RC4.decrypt(outputEncoding.value === 'base64' ? text : CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Hex.parse(text) }), secretKey.value)
      outputText.value = decrypted.toString(CryptoJS.enc.Utf8)
      return
    }

    // === RSA ===
    if (algo === 'rsa') {
      const decrypt = new JSEncrypt()
      decrypt.setPrivateKey(rsaPrivateKey.value)
      const result = decrypt.decrypt(text)
      if (!result) throw new Error(t('cryptoTool.rsaDecryptFailed'))
      outputText.value = result
      return
    }

    // === Encoding (decode) ===
    if (algo === 'base64') {
      const bytes = Uint8Array.from(atob(text), c => c.charCodeAt(0))
      outputText.value = new TextDecoder().decode(bytes)
      return
    }
    if (algo === 'base32') { outputText.value = base32Decode(text); return }
    if (algo === 'hex') { outputText.value = new TextDecoder().decode(new Uint8Array(text.trim().split(/\s+/).map(h => parseInt(h, 16)))); return }
    if (algo === 'url') { outputText.value = decodeURIComponent(text); return }
    if (algo === 'html') { outputText.value = htmlDecode(text); return }
    if (algo === 'unicode') { outputText.value = text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))); return }
    if (algo === 'utf8') { outputText.value = new TextDecoder().decode(new Uint8Array(text.trim().split(/\s+/).map(h => parseInt(h, 16)))); return }
    if (algo === 'ascii') { outputText.value = text.trim().split(/\s+/).map(n => String.fromCharCode(parseInt(n))).join(''); return }
    if (algo === 'binary') { outputText.value = new TextDecoder().decode(new Uint8Array(text.trim().split(/\s+/).map(b => parseInt(b, 2)))); return }
    if (algo === 'octal') { outputText.value = text.replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8))); return }
    if (algo === 'morse') { outputText.value = morseDecode(text); return }

  } catch (e) {
    errorMsg.value = e.message || String(e)
  }
}

// ========== Helper 函数 ==========
function htmlEncode(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function htmlDecode(str) {
  const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'", '&#x2F;': '/', '&nbsp;': ' ' }
  return str.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&\w+;/g, m => entities[m] || m)
}

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
function base32Encode(str) {
  const bytes = new TextEncoder().encode(str)
  let bits = ''
  for (const b of bytes) bits += b.toString(2).padStart(8, '0')
  while (bits.length % 5 !== 0) bits += '0'
  let result = ''
  for (let i = 0; i < bits.length; i += 5) {
    result += BASE32_CHARS[parseInt(bits.slice(i, i + 5), 2)]
  }
  while (result.length % 8 !== 0) result += '='
  return result
}

function base32Decode(str) {
  const cleaned = str.replace(/=+$/, '').toUpperCase()
  let bits = ''
  for (const c of cleaned) {
    const idx = BASE32_CHARS.indexOf(c)
    if (idx === -1) throw new Error(`Invalid Base32 character: ${c}`)
    bits += idx.toString(2).padStart(5, '0')
  }
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

const MORSE_MAP = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
  'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
  'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
  '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', ' ': '/',
}
const MORSE_REVERSE = Object.fromEntries(Object.entries(MORSE_MAP).map(([k, v]) => [v, k]))

function morseEncode(str) {
  return str.toUpperCase().split('').map(c => MORSE_MAP[c] || c).join(' ')
}

function morseDecode(str) {
  return str.trim().split(' ').map(code => {
    if (code === '/') return ' '
    return MORSE_REVERSE[code] || code
  }).join('')
}

function jwtDecode(token) {
  const parts = token.trim().split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT format (expected 3 parts)')
  const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')))
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
  return JSON.stringify({ header, payload }, null, 2)
}

function simpleBcryptHash(str) {
  // 使用多轮 SHA-256 模拟（真正的 bcrypt 需要原生库）
  let hash = CryptoJS.SHA256(str)
  for (let i = 0; i < 1000; i++) hash = CryptoJS.SHA256(hash)
  return '$2b$10$' + CryptoJS.enc.Base64.stringify(hash).slice(0, 53)
}

function crc32(str) {
  const bytes = new TextEncoder().encode(str)
  let crc = 0xFFFFFFFF
  for (const byte of bytes) {
    crc ^= byte
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

// ========== 哈希增强功能 ==========
function doVerifyHash() {
  if (!outputText.value || !verifyHash.value.trim()) return
  verifyResult.value = outputText.value.toLowerCase().trim() === verifyHash.value.toLowerCase().trim()
}

async function doRainbowLookup() {
  const hash = rainbowInput.value.trim()
  if (!hash) return
  rainbowLoading.value = true
  rainbowResult.value = null
  try {
    // 使用多个免费 MD5/SHA1 查询 API
    const resp = await fetch(`https://api.hashify.net/hash/md5/hex?value=${encodeURIComponent(hash)}`, {
      signal: AbortSignal.timeout(5000)
    }).catch(() => null)

    if (resp && resp.ok) {
      const data = await resp.json().catch(() => null)
      if (data && data.Digest && data.Digest.toLowerCase() === hash.toLowerCase()) {
        // hashify returns the hash of input, not reverse lookup
        // fallback to nitrxgen
      }
    }

    // 尝试 nitrxgen API
    const resp2 = await fetch(`https://www.nitrxgen.net/md5db/${encodeURIComponent(hash)}`, {
      signal: AbortSignal.timeout(5000)
    }).catch(() => null)

    if (resp2 && resp2.ok) {
      const text = await resp2.text()
      if (text && text.trim()) {
        rainbowResult.value = text.trim()
        return
      }
    }

    rainbowResult.value = false // 未找到
  } catch {
    rainbowResult.value = false
  } finally {
    rainbowLoading.value = false
  }
}

// 切换算法时重置验证状态
watch(activeAlgo, () => {
  verifyResult.value = null
  rainbowResult.value = null
})

function generateRSAKeyPair() {
  const crypt = new JSEncrypt({ default_key_size: '2048' })
  crypt.getKey()
  rsaPublicKey.value = crypt.getPublicKey()
  rsaPrivateKey.value = crypt.getPrivateKey()
  ElMessage.success(t('cryptoTool.keyPairGenerated'))
}

// ========== UI 操作 ==========
function swapInputOutput() {
  const tmp = inputText.value
  inputText.value = outputText.value
  outputText.value = tmp
}

function clearAll() {
  inputText.value = ''
  outputText.value = ''
  errorMsg.value = ''
}

async function pasteInput() {
  try {
    inputText.value = await navigator.clipboard.readText()
  } catch {
    ElMessage.warning(t('cryptoTool.pasteError'))
  }
}

function copyOutput() {
  navigator.clipboard.writeText(outputText.value)
  ElMessage.success(t('cryptoTool.copied'))
}
</script>

<style scoped>
.crypto-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-primary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.86);
  border-bottom: 1px solid rgba(60, 40, 20, 0.1);
  height: 52px;
  box-sizing: border-box;
}

.header-left { display: flex; align-items: center; min-width: 0; flex: 1; }
.header-right { display: flex; gap: 4px; }

.page-title-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.page-eyebrow {
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.breadcrumb-link { cursor: pointer; color: var(--accent-blue); }
.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-sep { color: var(--text-tertiary); margin: 0 2px; }
.breadcrumb .el-icon { font-size: 14px; color: var(--accent-blue); }

/* main-body 改成 grid:260px 给左侧分类导航 + 1fr 给中间内容区。
   原先 flex+flex:1 在某些条件下 content-area 没真正拉满,
   grid 是确定性两栏,不会受子元素 min-content 影响。 */
.main-body {
  flex: 1;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

/* 左侧分类导航：扁平列表，无卡片
   不再设 width / min-width:grid 第一栏已经固定 260px,这里设宽度反而会和 grid 冲突。 */
.category-nav {
  overflow: hidden;
  padding: 8px 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: color 0.15s, background 0.15s;
  border-left: 2px solid transparent;
}

.category-item:hover {
  color: var(--text-primary);
  background: rgba(60, 40, 20, 0.03);
}

.category-item.active {
  color: var(--accent-blue);
  font-weight: var(--font-weight-semibold);
  background: rgba(47, 111, 228, 0.06);
  border-left-color: var(--accent-blue);
}

.cat-icon { font-size: 15px; flex-shrink: 0; }
.cat-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 中间内容区:按分割线区分段落
   grid 子项默认 stretch,自然占满 1fr 宽度。min-width:0 让内部 textarea 不会撑开列。 */
.content-area {
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: transparent;
}

.algo-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}

.algo-bar :deep(.el-radio-group) { display: inline-flex; flex-wrap: wrap; gap: 4px; }

/* 感叹号触发按钮:替代了原来右侧常驻的 info-panel
   margin-left:auto 把按钮推到 algo-bar 最右边,与原 info-panel 位置一致,
   不再让算法栏右半部分留白。 */
.info-trigger {
  flex-shrink: 0;
  margin-left: auto;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--text-tertiary);
  background: transparent;
  color: var(--text-tertiary);
  font-family: inherit;
  font-weight: 700;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.info-trigger:hover {
  color: var(--accent-blue);
  border-color: var(--accent-blue);
  background: rgba(47, 111, 228, 0.08);
}
.info-trigger:focus-visible {
  outline: 2px solid var(--accent-blue);
  outline-offset: 2px;
}

/* 弹出气泡内容 */
.info-pop { display: flex; flex-direction: column; gap: 10px; }
.info-pop-title {
  font-size: 14px;
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.1);
}
.info-pop-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.65;
}
.info-pop-props { display: flex; flex-direction: column; }
.info-pop-prop {
  display: flex;
  gap: 8px;
  font-size: 12px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(60, 40, 20, 0.06);
}
.info-pop-prop:last-child { border-bottom: 0; }
.info-pop-prop .prop-label { color: var(--text-tertiary); white-space: nowrap; min-width: 60px; }
.info-pop-prop .prop-value { color: var(--text-primary); word-break: break-all; }

.params-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(60, 40, 20, 0.08);
}

.params-bar :deep(.el-input-group__prepend) {
  background: rgba(60, 40, 20, 0.03);
  font-size: 12px;
}
.params-bar :deep(.el-button),
.content-area :deep(.el-button) { --el-button-border-radius: 8px; }

.param-input { width: 240px; }
.param-select { width: 120px; }
.rsa-key-input { width: 100%; max-width: 360px; }

/* 输入输出区：去除卡片，保留文本框 */
.io-area {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
  padding: 14px 18px;
}

.io-panel {
  display: flex;
  flex-direction: column;
  min-height: 240px;
  min-width: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.panel-actions { display: flex; gap: 2px; }

.io-textarea {
  flex: 1;
  width: 100%;
  border: 1px solid rgba(60, 40, 20, 0.12);
  border-radius: 8px;
  padding: 12px;
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: rgba(255, 255, 255, 0.7);
  color: var(--text-primary);
  resize: none;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.io-textarea:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(47, 111, 228, 0.1);
  background: #fff;
}

.io-textarea[readonly] { background: rgba(60, 40, 20, 0.025); }

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  flex-shrink: 0;
  padding: 4px 0;
}

.error-bar {
  flex-shrink: 0;
  padding: 0 18px 12px;
}

/* 哈希增强：用分割线分两栏，无卡片 */
.hash-extras {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid rgba(60, 40, 20, 0.08);
}

.hash-verify, .rainbow-lookup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 18px;
}
.hash-verify { border-right: 1px solid rgba(60, 40, 20, 0.08); }

.verify-header {
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.verify-row { display: flex; gap: 8px; align-items: center; }
.verify-input { flex: 1; }

.verify-result {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  padding: 6px 0;
}

.verify-result.match { color: #67c23a; }
.verify-result.mismatch { color: #f56c6c; }

.rainbow-result {
  font-size: 13px;
  padding: 4px 0;
}

.rainbow-found code {
  font-weight: var(--font-weight-bold);
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.rainbow-notfound { color: var(--text-tertiary); }

.rainbow-hint {
  font-size: 11px;
  color: var(--text-quaternary);
  line-height: 1.4;
}

.content-area::-webkit-scrollbar,
.category-nav::-webkit-scrollbar { width: 5px; }
.content-area::-webkit-scrollbar-thumb,
.category-nav::-webkit-scrollbar-thumb {
  background: var(--text-quaternary);
  border-radius: 3px;
}

@media (max-width: 1180px) {
  .main-body { grid-template-columns: 220px minmax(0, 1fr); }
}

@media (max-width: 960px) {
  .main-body { grid-template-columns: minmax(0, 1fr); }
  .category-nav {
    border-right: 0;
    border-bottom: 1px solid rgba(60, 40, 20, 0.1);
    padding: 6px 8px;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 2px;
  }
  .category-item {
    padding: 6px 10px;
    border-left: 0;
    border-bottom: 2px solid transparent;
    border-radius: 6px;
  }
  .category-item.active {
    border-left: 0;
    border-bottom-color: var(--accent-blue);
  }
  .io-area { grid-template-columns: 1fr; }
  .action-buttons { flex-direction: row; justify-content: center; }
}

@media (max-width: 720px) {
  .header {
    height: auto;
    min-height: 52px;
    padding: 10px 14px;
    align-items: flex-start;
    flex-direction: column;
  }
  .header-left,
  .header-right { width: 100%; }
  .hash-extras { grid-template-columns: 1fr; }
  .hash-verify { border-right: 0; border-bottom: 1px solid rgba(60, 40, 20, 0.08); }
  .verify-row { flex-direction: column; align-items: stretch; }
}
</style>

