import { useState, useEffect } from 'react'

function getStored() {
  return localStorage.getItem('theme') ?? 'system'
}

function applyTheme(theme) {
  const root = document.documentElement
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  if (isDark) root.setAttribute('data-theme', 'dark')
  else root.removeAttribute('data-theme')
}

// Apply immediately on import so there's no flash
applyTheme(getStored())

export function useTheme() {
  const [theme, setThemeState] = useState(getStored)

  useEffect(() => { applyTheme(theme) }, [theme])

  // Track OS preference changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = (t) => {
    localStorage.setItem('theme', t)
    setThemeState(t)
  }

  return { theme, setTheme }
}
