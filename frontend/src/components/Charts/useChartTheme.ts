import { useEffect, useState } from 'react'
import { useTheme } from '../../context/ThemeContext'

/**
 * Recharts can't read CSS variables directly — it needs concrete color
 * strings for `stroke`, `fill`, `tick.fill`, etc. This hook reads the
 * current values of the theme tokens (after the `<html>` class is set)
 * and re-reads them whenever the theme changes.
 *
 * Pass an `extra: Record<string, string>` if a chart needs more tokens
 * than the defaults below; we resolve them against `documentElement`.
 */
export function useChartTheme(extra: Record<string, string> = {}) {
  const { resolvedTheme } = useTheme()
  const [vars, setVars] = useState<Record<string, string>>(() => readVars(extra))

  useEffect(() => {
    setVars(readVars(extra))
    // The CSS variables are also flipped when the OS preference changes
    // while in `system` mode. We listen to the same media query so the
    // chart re-renders on flip.
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setVars(readVars(extra))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme])

  return vars
}

function readVars(extra: Record<string, string>) {
  if (typeof window === 'undefined') return {}
  const styles = getComputedStyle(document.documentElement)
  const out: Record<string, string> = {}
  // Defaults — every chart uses at least these.
  const defaults: Record<string, string> = {
    grid: '--border-color',
    tick: '--text-muted',
    label: '--text-secondary',
    tooltipBg: '--bg-elevated',
    tooltipBorder: '--border-color',
    tooltipShadow: '--shadow-3',
    cardBg: '--bg-card',
    cardBorder: '--border-color',
    emptyIcon: '--border-strong',
    pillActiveBg: '--bg-card',
    pillActiveFg: '--text-primary',
    pillInactiveFg: '--text-muted',
    pillTrack: '--bg-hover',
    emptyBg: '--bg-input',
  }
  const merged = { ...defaults, ...extra }
  for (const key in merged) {
    out[key] = styles.getPropertyValue(merged[key]).trim()
  }
  return out
}
