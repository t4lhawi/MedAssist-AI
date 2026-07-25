import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

/**
 * Header button that flips between light and dark. Renders the icon for
 * the theme the user will switch *to* (Sun when in dark mode — "click to
 * go light", Moon when in light mode).
 */
export default function ThemeToggle() {
  const { resolvedTheme, toggle } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const label = isDark ? 'Basculer en mode clair' : 'Basculer en mode sombre'

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
      className="relative flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
      style={{ color: 'var(--text-secondary)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {/* Two stacked icons: the active one is fully opaque, the inactive
          one is hidden. We swap them with a 200ms fade + rotation so
          the transition reads as a smooth morph. */}
      <Sun
        size={16}
        strokeWidth={2}
        className="theme-toggle-icon absolute"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.6)',
        }}
      />
      <Moon
        size={16}
        strokeWidth={2}
        className="theme-toggle-icon"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark ? 'rotate(90deg) scale(0.6)' : 'rotate(0deg) scale(1)',
        }}
      />
      <style>{`
        .theme-toggle-icon {
          transition: opacity var(--dur-base) var(--ease-out),
                      transform var(--dur-base) var(--ease-spring);
        }
      `}</style>
    </button>
  )
}
