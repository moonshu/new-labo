import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import './App.css'

type ThemeTokens = {
  background: string
  surface: string
  surfaceMuted: string
  border: string
  text: string
  muted: string
  accent: string
  accentSoft: string
  onAccent: string
  glow: string
  shadowSoft: string
}

const themes = {
  light: {
    background: '#f5f5f7',
    surface: '#ffffff',
    surfaceMuted: '#f9fafb',
    border: 'rgba(15, 23, 42, 0.08)',
    text: '#111827',
    muted: '#4b5563',
    accent: '#6366f1',
    accentSoft: 'rgba(99, 102, 241, 0.12)',
    onAccent: '#f8fafc',
    glow: 'rgba(99, 102, 241, 0.45)',
    shadowSoft: '0 24px 60px rgba(15, 23, 42, 0.12)'
  },
  dusk: {
    background: '#0f172a',
    surface: '#111827',
    surfaceMuted: '#1f2937',
    border: 'rgba(148, 163, 184, 0.16)',
    text: '#e2e8f0',
    muted: '#94a3b8',
    accent: '#f472b6',
    accentSoft: 'rgba(244, 114, 182, 0.18)',
    onAccent: '#0f172a',
    glow: 'rgba(244, 114, 182, 0.45)',
    shadowSoft: '0 24px 60px rgba(15, 23, 42, 0.4)'
  },
  neon: {
    background: '#050816',
    surface: '#0b1120',
    surfaceMuted: '#111827',
    border: 'rgba(34, 211, 238, 0.24)',
    text: '#f8fafc',
    muted: '#a5b4fc',
    accent: '#22d3ee',
    accentSoft: 'rgba(34, 211, 238, 0.18)',
    onAccent: '#050816',
    glow: 'rgba(79, 70, 229, 0.55)',
    shadowSoft: '0 30px 70px rgba(10, 10, 45, 0.55)'
  }
} satisfies Record<string, ThemeTokens>

type ThemeKey = keyof typeof themes

type ButtonStyle = {
  id: string
  name: string
  description: string
  tags: string[]
  Preview: () => JSX.Element
  usage: string
  snippet: string
}

const themeOptions: { id: ThemeKey; label: string; hint: string }[] = [
  { id: 'light', label: 'Midday', hint: 'calm & airy' },
  { id: 'dusk', label: 'Afterglow', hint: 'moody gradients' },
  { id: 'neon', label: 'Nightshift', hint: 'retro future' }
]

const filterOptions = [
  { id: 'all', label: 'All styles' },
  { id: 'utility', label: 'Utility' },
  { id: 'playful', label: 'Playful' },
  { id: 'immersive', label: 'Immersive' },
  { id: 'tactile', label: 'Tactile' }
]

const PulseButton = () => (
  <motion.button
    className="btn btn-pulse"
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.96 }}
    transition={{ type: 'spring', stiffness: 240, damping: 18 }}
  >
    Launch sequence
    <motion.span
      className="btn-pulse-halo"
      aria-hidden
      animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.3, 1] }}
      transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
    />
  </motion.button>
)

const GhostButton = () => (
  <motion.button
    className="btn btn-ghost"
    whileHover={{ x: 4, boxShadow: '0 18px 40px rgba(99, 102, 241, 0.18)' }}
    whileTap={{ x: 0 }}
  >
    Outline path
    <span aria-hidden className="btn-chevron" />
  </motion.button>
)

const GlassButton = () => (
  <motion.button
    className="btn btn-glass"
    whileHover={{ rotate: -1.2, scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    Portal access
    <span aria-hidden className="btn-glint" />
  </motion.button>
)

const FloatingButton = () => (
  <motion.button
    className="btn btn-floating"
    animate={{ y: [-4, 4, -4] }}
    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
    whileHover={{ scale: 1.06 }}
    whileTap={{ scale: 0.92 }}
  >
    Hover capsule
  </motion.button>
)

const ToggleButton = () => {
  const [active, setActive] = useState(false)
  return (
    <motion.button
      className={`btn btn-toggle ${active ? 'is-active' : ''}`}
      onClick={() => setActive((prev) => !prev)}
      whileTap={{ scale: 0.94 }}
      layout
    >
      <motion.span className="toggle-pill" layout transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
        <motion.span className="toggle-thumb" layout transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
      </motion.span>
      <span className="toggle-label">{active ? 'Magnetic on' : 'Magnetic off'}</span>
    </motion.button>
  )
}

const IconButton = () => (
  <motion.button className="btn btn-icon" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.94 }}>
    Sketch idea
    <motion.span
      aria-hidden
      className="icon-arrow"
      initial={{ x: 0 }}
      whileHover={{ x: 6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    />
  </motion.button>
)

const buttonStyles: ButtonStyle[] = [
  {
    id: 'pulse',
    name: 'Pulse Primary',
    description: 'Breathing gradient button for key journeys that deserve spotlight energy.',
    tags: ['utility', 'immersive'],
    Preview: PulseButton,
    usage: 'Use for hero CTAs or onboarding decisions that benefit from rhythmic attention.',
    snippet: `const PulseButton = () => (
  <motion.button
    className="btn btn-pulse"
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.96 }}
    transition={{ type: 'spring', stiffness: 240, damping: 18 }}
  >
    Launch sequence
    <motion.span
      className="btn-pulse-halo"
      aria-hidden
      animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.3, 1] }}
      transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
    />
  </motion.button>
)`
  },
  {
    id: 'ghost',
    name: 'Threadline Ghost',
    description: 'Minimal outline with subtle glide — ideal for secondary navigation moments.',
    tags: ['utility', 'tactile'],
    Preview: GhostButton,
    usage: 'Pair with quieter layouts, secondary nav, or filter panels that require soft hierarchy.',
    snippet: `const GhostButton = () => (
  <motion.button
    className="btn btn-ghost"
    whileHover={{ x: 4 }}
    whileTap={{ x: 0 }}
  >
    Outline path
    <span aria-hidden className="btn-chevron" />
  </motion.button>
)`
  },
  {
    id: 'glass',
    name: 'Glass Portal',
    description: 'Transparent control hovering over blurred panels, built for futuristic overlays.',
    tags: ['immersive', 'playful'],
    Preview: GlassButton,
    usage: 'Overlay on imagery or dashboards where depth and hierarchy matter without full opacity.',
    snippet: `const GlassButton = () => (
  <motion.button
    className="btn btn-glass"
    whileHover={{ rotate: -1.2, scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    Portal access
    <span aria-hidden className="btn-glint" />
  </motion.button>
)`
  },
  {
    id: 'floating',
    name: 'Hover Capsule',
    description: 'Lightweight CTA that levitates on its own rhythm to invite interaction.',
    tags: ['playful', 'immersive'],
    Preview: FloatingButton,
    usage: 'Great for empty states or floating action prompts that should feel alive but unobtrusive.',
    snippet: `const FloatingButton = () => (
  <motion.button
    className="btn btn-floating"
    animate={{ y: [-4, 4, -4] }}
    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
    whileHover={{ scale: 1.06 }}
    whileTap={{ scale: 0.92 }}
  >
    Hover capsule
  </motion.button>
)`
  },
  {
    id: 'toggle',
    name: 'Magnetic Toggle',
    description: 'A pill switch that snaps with magnetised motion and friendly feedback.',
    tags: ['tactile'],
    Preview: ToggleButton,
    usage: 'Switch between dual states like simple mode/advanced mode or enable focused scenarios.',
    snippet: `const ToggleButton = () => {
  const [active, setActive] = useState(false)
  return (
    <motion.button
      className={\`btn btn-toggle \${active ? 'is-active' : ''}\`}
      onClick={() => setActive((prev) => !prev)}
      whileTap={{ scale: 0.94 }}
      layout
    >
      <motion.span className="toggle-pill" layout transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
        <motion.span className="toggle-thumb" layout transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
      </motion.span>
      <span className="toggle-label">{active ? 'Magnetic on' : 'Magnetic off'}</span>
    </motion.button>
  )
}`
  },
  {
    id: 'icon',
    name: 'Arrow Glyph',
    description: 'Compact icon-forward action with directional emphasis for quick progress.',
    tags: ['utility', 'playful'],
    Preview: IconButton,
    usage: 'Use when fast-forwarding a flow, revealing next steps, or continuing subtle tutorials.',
    snippet: `const IconButton = () => (
  <motion.button className="btn btn-icon" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.94 }}>
    Sketch idea
    <motion.span
      aria-hidden
      className="icon-arrow"
      initial={{ x: 0 }}
      whileHover={{ x: 6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    />
  </motion.button>
)`
  }
]

function ButtonCard({ style, onSelect }: { style: ButtonStyle; onSelect: (style: ButtonStyle) => void }) {
  return (
    <article
      className="button-card"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(style)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(style)
        }
      }}
    >
      <div className="button-card__headline">
        <h3>{style.name}</h3>
        <div className="button-card__tags">
          {style.tags.map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="button-card__preview">
        <style.Preview />
      </div>
      <p className="button-card__description">{style.description}</p>
    </article>
  )
}

function App() {
  const [theme, setTheme] = useState<ThemeKey>('light')
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedStyle, setSelectedStyle] = useState<ButtonStyle | null>(null)

  useEffect(() => {
    const tokens = themes[theme]
    Object.entries(tokens).forEach(([token, value]) => {
      document.documentElement.style.setProperty(`--color-${token}`, value)
    })
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const visibleStyles = useMemo(() => {
    if (activeFilter === 'all') {
      return buttonStyles
    }

    return buttonStyles.filter((style) => style.tags.includes(activeFilter))
  }, [activeFilter])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-hero">
          <span className="eyebrow">UI micro-studio</span>
          <h1>Synesthetic Button Dashboard</h1>
          <p>
            A compact playground for exploring button treatments across themes, moods, and tactile
            feedback. Mix and remix to decide which micro-interactions fit your story.
          </p>
        </div>
        <div className="header-controls">
          <div className="theme-switcher" role="group" aria-label="Switch theme">
            <span className="control-label">Environment</span>
            <div className="control-row">
              {themeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`pill-control ${theme === option.id ? 'is-active' : ''}`}
                  onClick={() => setTheme(option.id)}
                >
                  <span>{option.label}</span>
                  <small>{option.hint}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="filter-switcher" role="group" aria-label="Filter button styles">
            <span className="control-label">Curate focus</span>
            <div className="control-row">
              {filterOptions.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`pill-control ${activeFilter === filter.id ? 'is-active' : ''}`}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="button-grid">
          {visibleStyles.map((style) => (
            <ButtonCard key={style.id} style={style} onSelect={setSelectedStyle} />
          ))}
        </div>
      </main>

      {selectedStyle && (
        <div className="drawer-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedStyle(null)}>
          <div
            className="drawer-panel"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <button className="drawer-close" type="button" onClick={() => setSelectedStyle(null)}>
              Close
            </button>
            <div className="drawer-header">
              <span className="eyebrow">Style dossier</span>
              <h2>{selectedStyle.name}</h2>
              <p>{selectedStyle.description}</p>
            </div>
            <div className="drawer-preview">
              <selectedStyle.Preview />
            </div>
            <div className="drawer-body">
              <section>
                <h3>When to use</h3>
                <p>{selectedStyle.usage}</p>
              </section>
              <section>
                <h3>Snippet</h3>
                <pre>
                  <code>{selectedStyle.snippet}</code>
                </pre>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
