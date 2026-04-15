const FONT_SCALE_STEPS = {
  '--font-size-caption2': -3,
  '--font-size-caption': -2,
  '--font-size-footnote': -1,
  '--font-size-body': 0,
  '--font-size-callout': 1,
  '--font-size-headline': 2,
  '--font-size-title3': 4,
  '--font-size-title2': 8,
  '--font-size-title1': 12,
  '--font-size-large': 18,
}

let mediaQueryList = null
let mediaQueryHandler = null

function getRoot() {
  return document.documentElement
}

function resolveTheme(theme) {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme || 'light'
}

export function applyThemeMode(theme = 'light') {
  const root = getRoot()
  root.setAttribute('data-theme-setting', theme)
  root.setAttribute('data-theme', resolveTheme(theme))
}

export function applyFontSize(size) {
  const base = Number(size) || 14
  const root = getRoot()

  Object.entries(FONT_SCALE_STEPS).forEach(([token, offset]) => {
    root.style.setProperty(token, `${base + offset}px`)
  })
}

export function applyFontFamily(family) {
  const root = getRoot()
  if (!family || family === 'system') {
    root.style.removeProperty('--font-family')
    return
  }
  root.style.setProperty('--font-family', `"${family}", "PingFang SC", sans-serif`)
}

export function applyAnimations(enabled) {
  const root = getRoot()
  root.classList.toggle('no-animations', enabled === false)
}

export function applyAppearance(config = {}) {
  applyThemeMode(config.theme || 'light')
  applyFontSize(config.fontSize)
  applyFontFamily(config.fontFamily)
  applyAnimations(config.enableAnimations)
}

export function syncSystemThemePreference() {
  if (mediaQueryList && mediaQueryHandler) {
    mediaQueryList.removeEventListener('change', mediaQueryHandler)
  }

  mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQueryHandler = () => {
    if (getRoot().getAttribute('data-theme-setting') === 'auto') {
      applyThemeMode('auto')
    }
  }

  mediaQueryList.addEventListener('change', mediaQueryHandler)

  return () => {
    if (mediaQueryList && mediaQueryHandler) {
      mediaQueryList.removeEventListener('change', mediaQueryHandler)
    }
    mediaQueryList = null
    mediaQueryHandler = null
  }
}
