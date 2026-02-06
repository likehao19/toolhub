<script>
import { h, ref, watch } from 'vue'

// 读取 node_modules 里所有 *-icon.js 源码（懒加载）
const rawIconModules = import.meta.glob('../../../../node_modules/@univerjs/icons/dist/esm/*-icon.js', {
  query: '?raw',
  import: 'default'
})

const kebabize = (str) =>
  String(str)
    .replace(/Icon$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()

const pickElementObjectLiteral = (source) => {
  // 形如：const element = { ... };
  const m = String(source).match(/const\s+element\s*=\s*(\{[\s\S]*?\n\});/m)
  if (!m) return null
  return m[1]
}

const evalObjectLiteral = (objectLiteral) => {
  // 来自本地 node_modules 的固定源码，用 Function 解析 object literal
  // eslint-disable-next-line no-new-func
  return new Function(`return (${objectLiteral});`)()
}

const normalizeSvgAttrs = (attrs, { size, className, colorChannel1, idSuffix }) => {
  const out = { ...(attrs || {}) }
  if (out.fill === 'colorChannel1') out.fill = colorChannel1 || 'currentColor'
  if (out.tag === 'mask' && out.id && idSuffix) out.id = `${out.id}${idSuffix}`

  // svg 根节点统一控大小/类名，保持和原生一样用 currentColor
  if (out.xmlns && size != null) {
    out.width = String(size)
    out.height = String(size)
  }
  if (out.xmlns && className) {
    out.class = className
  }
  return out
}

const renderIconNode = (node, opts) => {
  if (!node || typeof node !== 'object') return null
  const tag = node.tag
  const attrs = normalizeSvgAttrs(node.attrs, opts)
  const children = Array.isArray(node.children) ? node.children.map((c) => renderIconNode(c, opts)) : undefined
  return h(tag, attrs, children)
}

export default {
  name: 'UniverIcon',
  props: {
    name: { type: String, required: true },
    className: { type: String, default: '' },
    size: { type: [Number, String], default: 16 },
    // 原生 IconBase 的 extend.colorChannel1，我们这里默认 currentColor（保证可见）
    colorChannel1: { type: String, default: 'currentColor' },
    // mask id 防冲突（原生 IconBase 会加 suffix）
    idSuffix: { type: String, default: '' }
  },
  setup(props) {
    const element = ref(null)

    const load = async () => {
      element.value = null
      const base = kebabize(props.name)
      const fileBase = base.endsWith('-icon') ? base : `${base}-icon`
      const file = `../../../../node_modules/@univerjs/icons/dist/esm/${fileBase}.js`
      const loader = rawIconModules[file]
      if (!loader) return

      try {
        const source = await loader()
        const objLiteral = pickElementObjectLiteral(source)
        if (!objLiteral) return
        element.value = evalObjectLiteral(objLiteral)
      } catch {
        element.value = null
      }
    }

    watch(
      () => props.name,
      () => void load(),
      { immediate: true }
    )

    return () => {
      if (!element.value) return null
      return renderIconNode(element.value, {
        size: props.size,
        className: props.className,
        colorChannel1: props.colorChannel1,
        idSuffix: props.idSuffix
      })
    }
  }
}
</script>

