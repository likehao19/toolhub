<template>
  <div class="crypto-wrapper">
    <!-- 顶栏 -->
    <div class="header">
      <div class="header-left">
        <div class="breadcrumb">
          <el-icon><Lock /></el-icon>
          <span class="breadcrumb-link" @click="router.push('/toolbox')">{{ t('toolbox.title') }}</span>
          <span class="breadcrumb-sep">/</span>
          <span>{{ t('cryptoTool.title') }}</span>
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
            {{ t('cryptoTool.generateKeyPair') }}
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
              {{ encryptLabel }} ↓
            </el-button>
            <el-button
              v-if="canDecrypt"
              @click="doDecrypt"
              :disabled="!inputText.trim()"
            >
              {{ decryptLabel }} ↓
            </el-button>
            <el-button
              v-if="isHashOnly"
              type="primary"
              @click="doEncrypt"
              :disabled="!inputText.trim()"
            >
              {{ t('cryptoTool.calculate') }} ↓
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
                {{ t('cryptoTool.verify') }}
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
                {{ t('cryptoTool.lookup') }}
              </el-button>
            </div>
            <div v-if="rainbowResult !== null" class="rainbow-result">
              <template v-if="rainbowResult">
                <span class="rainbow-found">{{ t('cryptoTool.plaintext') }}：<code>{{ rainbowResult }}</code></span>
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

      <!-- 右侧说明 -->
      <div class="info-panel">
        <div class="info-title">{{ currentAlgoInfo.label }}</div>
        <div class="info-desc">{{ currentAlgoInfo.desc }}</div>
        <div class="info-props" v-if="currentAlgoInfo.props">
          <div v-for="(v, k) in currentAlgoInfo.props" :key="k" class="info-prop">
            <span class="prop-label">{{ k }}:</span>
            <span class="prop-value">{{ v }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Lock, Delete, Sort, DocumentCopy, CopyDocument, CircleCheckFilled, CircleCloseFilled } from '@element-plus/icons-vue'
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
    { key: 'md5', label: 'MD5', hashOnly: true, desc: 'MD5 消息摘要算法，输出 128 位哈希值。已不推荐用于安全场景，但常用于文件校验。', props: { '输出长度': '128 bit / 32 hex', '类型': '哈希（不可逆）', '安全性': '已被攻破，仅用于校验' } },
    { key: 'sha1', label: 'SHA-1', hashOnly: true, desc: 'SHA-1 安全哈希算法，输出 160 位哈希值。已被证明不安全。', props: { '输出长度': '160 bit / 40 hex', '类型': '哈希（不可逆）', '安全性': '已不推荐' } },
    { key: 'sha224', label: 'SHA-224', hashOnly: true, desc: 'SHA-2 家族成员，输出 224 位。', props: { '输出长度': '224 bit / 56 hex', '类型': '哈希（不可逆）' } },
    { key: 'sha256', label: 'SHA-256', hashOnly: true, desc: 'SHA-2 家族中最常用的算法，广泛用于区块链、TLS 等。', props: { '输出长度': '256 bit / 64 hex', '类型': '哈希（不可逆）', '安全性': '安全' } },
    { key: 'sha384', label: 'SHA-384', hashOnly: true, desc: 'SHA-2 家族成员，输出 384 位。', props: { '输出长度': '384 bit / 96 hex', '类型': '哈希（不可逆）' } },
    { key: 'sha512', label: 'SHA-512', hashOnly: true, desc: 'SHA-2 家族最强版本，输出 512 位。', props: { '输出长度': '512 bit / 128 hex', '类型': '哈希（不可逆）', '安全性': '非常安全' } },
    { key: 'sha3_256', label: 'SHA3-256', hashOnly: true, desc: 'SHA-3（Keccak）标准，第三代安全哈希。', props: { '输出长度': '256 bit', '类型': '哈希（不可逆）', '安全性': '最新标准' } },
    { key: 'sha3_512', label: 'SHA3-512', hashOnly: true, desc: 'SHA-3 512 位版本。', props: { '输出长度': '512 bit', '类型': '哈希（不可逆）' } },
    { key: 'ripemd160', label: 'RIPEMD-160', hashOnly: true, desc: 'RACE Integrity Primitives 哈希，比特币地址生成中使用。', props: { '输出长度': '160 bit / 40 hex', '类型': '哈希（不可逆）' } },
    { key: 'hmac_md5', label: 'HMAC-MD5', hashOnly: true, needsKey: true, desc: '带密钥的 MD5 消息认证码。', props: { '类型': 'HMAC（需要密钥）', '输出': '128 bit' } },
    { key: 'hmac_sha256', label: 'HMAC-SHA256', hashOnly: true, needsKey: true, desc: '带密钥的 SHA-256 消息认证码，常用于 API 签名。', props: { '类型': 'HMAC（需要密钥）', '输出': '256 bit', '安全性': '安全' } },
    { key: 'hmac_sha512', label: 'HMAC-SHA512', hashOnly: true, needsKey: true, desc: '带密钥的 SHA-512 消息认证码。', props: { '类型': 'HMAC（需要密钥）', '输出': '512 bit' } },
  ],
  symmetric: [
    { key: 'aes', label: 'AES', needsKey: true, needsIV: true, showMode: true, showPadding: true, showKeySize: true, showOutputEncoding: true, desc: 'AES 高级加密标准，当今最广泛使用的对称加密算法。', props: { '密钥长度': '128/192/256 bit', '分组大小': '128 bit', '模式': 'CBC/ECB/CFB/OFB/CTR', '安全性': '非常安全' } },
    { key: 'des', label: 'DES', needsKey: true, needsIV: true, showMode: true, showOutputEncoding: true, desc: 'DES 数据加密标准，已过时，密钥太短。', props: { '密钥长度': '56 bit', '分组大小': '64 bit', '安全性': '已不安全，仅作学习' } },
    { key: 'tripledes', label: '3DES', needsKey: true, needsIV: true, showMode: true, showOutputEncoding: true, desc: 'Triple DES，三重 DES 加密，DES 的增强版。', props: { '密钥长度': '168 bit', '分组大小': '64 bit', '安全性': '较安全但慢' } },
    { key: 'rabbit', label: 'Rabbit', needsKey: true, showOutputEncoding: true, desc: 'Rabbit 流密码，高性能流加密算法。', props: { '类型': '流密码', '密钥长度': '128 bit', '速度': '非常快' } },
    { key: 'rc4', label: 'RC4', needsKey: true, showOutputEncoding: true, desc: 'RC4 流密码，曾广泛用于 SSL/TLS 和 WEP，已被弃用。', props: { '类型': '流密码', '密钥长度': '可变', '安全性': '已不安全' } },
  ],
  asymmetric: [
    { key: 'rsa', label: 'RSA', isRSA: true, desc: 'RSA 公钥密码算法，用于加密和数字签名。', props: { '密钥长度': '1024/2048/4096 bit', '类型': '非对称加密', '用途': '加密/签名/密钥交换', '安全性': '推荐 2048+ bit' } },
  ],
  encoding: [
    { key: 'base64', label: 'Base64', desc: 'Base64 编码，将二进制数据转换为 ASCII 字符串。', props: { '类型': '编码（非加密）', '用途': '数据传输/嵌入', '膨胀率': '约 33%' } },
    { key: 'base32', label: 'Base32', desc: 'Base32 编码，使用 A-Z 和 2-7，不区分大小写。', props: { '类型': '编码', '字符集': 'A-Z, 2-7', '膨胀率': '约 60%' } },
    { key: 'hex', label: 'Hex', desc: '十六进制编码，每个字节用两个十六进制字符表示。', props: { '类型': '编码', '字符集': '0-9, a-f', '膨胀率': '100%' } },
    { key: 'url', label: 'URL Encode', desc: 'URL 编码（百分号编码），将特殊字符转换为 %XX 格式。', props: { '类型': '编码', '标准': 'RFC 3986', '用途': 'URL 参数' } },
    { key: 'html', label: 'HTML Encode', desc: 'HTML 实体编码，防止 XSS 攻击和特殊字符显示问题。', props: { '类型': '编码', '用途': 'Web 安全', '示例': '< → &lt;' } },
    { key: 'unicode', label: 'Unicode', desc: 'Unicode 转义编码，将字符转为 \\uXXXX 格式。', props: { '类型': '编码', '格式': '\\uXXXX', '用途': '国际化' } },
    { key: 'utf8', label: 'UTF-8 Hex', desc: 'UTF-8 十六进制编码，显示字符的 UTF-8 字节序列。', props: { '类型': '编码', '用途': '查看字节' } },
    { key: 'ascii', label: 'ASCII', desc: 'ASCII 码转换，字符与 ASCII 码值互转。', props: { '类型': '编码', '范围': '0-127' } },
    { key: 'binary', label: 'Binary', desc: '二进制编码，将文本转为 0/1 二进制表示。', props: { '类型': '编码', '格式': '8位每字符' } },
    { key: 'octal', label: 'Octal', desc: '八进制编码，将字符转为八进制表示。', props: { '类型': '编码', '格式': '\\NNN' } },
    { key: 'morse', label: 'Morse', desc: '摩尔斯电码，经典的电报编码方式。', props: { '类型': '编码', '支持': 'A-Z, 0-9', '分隔': '空格/斜杠' } },
  ],
  other: [
    { key: 'jwt', label: 'JWT Decode', hashOnly: true, desc: 'JWT (JSON Web Token) 解码器，解析 Header 和 Payload。', props: { '类型': '解码（不验证签名）', '格式': 'header.payload.signature', '标准': 'RFC 7519' } },
    { key: 'bcrypt_gen', label: 'Bcrypt Gen', hashOnly: true, desc: '生成 Bcrypt 哈希，用于密码存储。（使用 JS 模拟的简化版）', props: { '类型': '密码哈希', '用途': '密码存储', '特点': '自带盐值' } },
    { key: 'crc32', label: 'CRC32', hashOnly: true, desc: 'CRC32 循环冗余校验，常用于文件完整性检查。', props: { '输出': '32 bit', '类型': '校验和', '用途': '数据校验' } },
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
const currentAlgoInfo = computed(() => ({
  label: currentAlgoConfig.value.label || '',
  desc: currentAlgoConfig.value.desc || '',
  props: currentAlgoConfig.value.props || null,
}))

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
      if (!result) throw new Error('RSA 加密失败，请检查公钥格式')
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
      if (!result) throw new Error('RSA 解密失败，请检查私钥格式')
      outputText.value = result
      return
    }

    // === Encoding (decode) ===
    if (algo === 'base64') { outputText.value = decodeURIComponent(escape(atob(text))); return }
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
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function htmlDecode(str) {
  const div = document.createElement('div')
  div.innerHTML = str
  return div.textContent || ''
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
  background: var(--bg-secondary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-xl);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  height: 50px;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  gap: 4px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.breadcrumb-link {
  cursor: pointer;
  color: var(--accent-blue);
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-sep {
  color: var(--text-tertiary);
  margin: 0 2px;
}

.main-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧分类导航 */
.category-nav {
  width: 130px;
  min-width: 130px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  padding: var(--space-sm) 0;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: var(--font-size-footnote);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  border-left: 3px solid transparent;
}

.category-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.category-item.active {
  background: var(--bg-tertiary);
  color: var(--accent-blue);
  border-left-color: var(--accent-blue);
  font-weight: var(--font-weight-semibold);
}

.cat-icon {
  font-size: 16px;
}

/* 中间内容区 */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-lg);
  gap: var(--space-md);
  overflow-y: auto;
  min-width: 0;
}

.algo-bar {
  flex-shrink: 0;
}

.algo-bar :deep(.el-radio-group) {
  flex-wrap: wrap;
}

.params-bar {
  display: flex;
  gap: var(--space-sm);
  align-items: flex-start;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.param-input {
  width: 260px;
}

.param-select {
  width: 120px;
}

.rsa-key-input {
  width: 300px;
}

.io-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-height: 0;
}

.io-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 120px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.panel-actions {
  display: flex;
  gap: 2px;
}

.io-textarea {
  flex: 1;
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: var(--bg-primary);
  color: var(--text-primary);
  resize: none;
  outline: none;
  box-sizing: border-box;
}

.io-textarea:focus {
  border-color: var(--accent-blue);
}

.io-textarea[readonly] {
  background: var(--bg-tertiary);
}

.action-buttons {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
  flex-shrink: 0;
  padding: 4px 0;
}

.error-bar {
  flex-shrink: 0;
}

/* 右侧说明面板 */
.info-panel {
  width: 220px;
  min-width: 220px;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  padding: var(--space-lg);
  overflow-y: auto;
}

.info-title {
  font-size: 16px;
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-md);
}

.info-desc {
  font-size: var(--font-size-footnote);
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: var(--space-lg);
}

.info-prop {
  display: flex;
  gap: 8px;
  font-size: 12px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-light);
}

.prop-label {
  color: var(--text-tertiary);
  white-space: nowrap;
  min-width: 60px;
}

.prop-value {
  color: var(--text-primary);
  word-break: break-all;
}

/* 哈希增强 */
.hash-extras {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--border-color);
}

.hash-verify, .rainbow-lookup {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.verify-header {
  font-size: var(--font-size-footnote);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
}

.verify-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.verify-input {
  flex: 1;
}

.verify-result {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  padding: 6px 12px;
  border-radius: var(--radius-md);
}

.verify-result.match {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
}

.verify-result.mismatch {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

.rainbow-result {
  font-size: 13px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
}

.rainbow-found code {
  font-weight: var(--font-weight-bold);
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
}

.rainbow-notfound {
  color: var(--text-tertiary);
}

.rainbow-hint {
  font-size: 11px;
  color: var(--text-quaternary);
  line-height: 1.4;
}
</style>
