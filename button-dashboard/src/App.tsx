import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type ThemeTokens = {
  background: string
  surface: string
  surfaceMuted: string
  highlight: string
  shadow: string
  text: string
  muted: string
  border: string
  glow: string
}

type ThemePreset = {
  id: string
  name: string
  description: string
  tokens: ThemeTokens
  accents: string[]
}

type AppIcon = {
  id: string
  label: string
  emoji: string
  notification?: string
}

type SegmentedOption = {
  id: string
  label: string
  helper: string
}

const themes: ThemePreset[] = [
  {
    id: 'cloud-dawn',
    name: 'Cloud Dawn',
    description: 'Soft blues with airy highlights',
    tokens: {
      background: '#e9edf7',
      surface: '#f6f8ff',
      surfaceMuted: '#e2e8f6',
      highlight: 'rgba(255, 255, 255, 0.95)',
      shadow: 'rgba(166, 179, 204, 0.55)',
      text: '#1f2433',
      muted: '#4b556a',
      border: 'rgba(41, 52, 84, 0.18)',
      glow: 'rgba(110, 140, 255, 0.28)',
    },
    accents: ['#6477ff', '#4e9dfc', '#ff7b9e', '#40c7b3'],
  },
  {
    id: 'midnight-ink',
    name: 'Midnight Ink',
    description: 'Moody surfaces with crystalline glow',
    tokens: {
      background: '#0f1220',
      surface: '#1a1f30',
      surfaceMuted: '#141927',
      highlight: 'rgba(86, 101, 140, 0.55)',
      shadow: 'rgba(4, 6, 13, 0.92)',
      text: '#e9eefc',
      muted: '#96a0bd',
      border: 'rgba(84, 96, 130, 0.28)',
      glow: 'rgba(92, 143, 255, 0.35)',
    },
    accents: ['#6c8bff', '#9c6cff', '#51e1ff', '#ff9aff'],
  },
  {
    id: 'desert-haze',
    name: 'Desert Haze',
    description: 'Warm neutrals with sunset tint',
    tokens: {
      background: '#f2eee6',
      surface: '#f9f3e9',
      surfaceMuted: '#ece1d1',
      highlight: 'rgba(255, 255, 255, 0.9)',
      shadow: 'rgba(182, 169, 150, 0.58)',
      text: '#463c33',
      muted: '#7d6d5f',
      border: 'rgba(112, 98, 81, 0.2)',
      glow: 'rgba(255, 173, 102, 0.32)',
    },
    accents: ['#ff8c5f', '#f6b645', '#87c095', '#ec6f91'],
  },
  {
    id: 'mint-oasis',
    name: 'Mint Oasis',
    description: 'Cool mints with lucid highlights',
    tokens: {
      background: '#e7f3f1',
      surface: '#f2fbf9',
      surfaceMuted: '#e0efeb',
      highlight: 'rgba(255, 255, 255, 0.94)',
      shadow: 'rgba(164, 185, 181, 0.52)',
      text: '#1d2f2b',
      muted: '#4a5d58',
      border: 'rgba(40, 64, 58, 0.16)',
      glow: 'rgba(88, 215, 193, 0.28)',
    },
    accents: ['#47c4ac', '#5fa7ff', '#7f8cff', '#ffa36b'],
  },
]

const appIcons: AppIcon[] = [
  { id: 'weather', label: 'Weather', emoji: '🌤️', notification: '12°' },
  { id: 'focus', label: 'Focus', emoji: '🧘' },
  { id: 'music', label: 'Sounds', emoji: '🎧', notification: '3' },
  { id: 'journey', label: 'Journeys', emoji: '🗺️' },
  { id: 'studio', label: 'Studio', emoji: '🎛️', notification: 'New' },
  { id: 'insights', label: 'Insights', emoji: '📈' },
]

const segmentedOptions: SegmentedOption[] = [
  { id: 'daily', label: 'Daily', helper: 'Quick actions' },
  { id: 'weekly', label: 'Weekly', helper: 'Checkpoints' },
  { id: 'focus', label: 'Focus', helper: 'Do not disturb' },
]

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized
  const num = parseInt(full, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return { r, g, b }
}

const hexToRgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const getReadableTextColor = (hex: string) => {
  const { r, g, b } = hexToRgb(hex)
  const [sr, sg, sb] = [r, g, b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  const luminance = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb
  return luminance > 0.55 ? '#101828' : '#f9fbff'
}

const createSurfaceGradient = (primary: string, muted: string) =>
  `linear-gradient(145deg, ${primary}, ${muted})`

export default function App() {
  const [activeThemeId, setActiveThemeId] = useState<ThemePreset['id']>(themes[0].id)
  const activeTheme = useMemo(
    () => themes.find((entry) => entry.id === activeThemeId) ?? themes[0],
    [activeThemeId],
  )

  const [accentColor, setAccentColor] = useState<string>(activeTheme.accents[0])
  const [clickCount, setClickCount] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isSwitchOn, setIsSwitchOn] = useState(true)
  const [selectedSegment, setSelectedSegment] = useState<SegmentedOption['id']>('daily')
  const [selectedIcon, setSelectedIcon] = useState<AppIcon['id']>('weather')
  const [showNotification, setShowNotification] = useState(false)
  const [fabRecording, setFabRecording] = useState(false)

  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setAccentColor((current) =>
      activeTheme.accents.includes(current) ? current : activeTheme.accents[0],
    )
  }, [activeTheme])

  useEffect(() => {
    return () => {
      if (notificationTimer.current) {
        clearTimeout(notificationTimer.current)
      }
    }
  }, [])

  const themeStyle = useMemo((): CSSProperties => {
    const { tokens } = activeTheme
    const readableOnAccent = getReadableTextColor(accentColor)

    return {
      '--color-bg': tokens.background,
      '--color-surface': tokens.surface,
      '--color-surface-muted': tokens.surfaceMuted,
      '--color-highlight': tokens.highlight,
      '--color-shadow': tokens.shadow,
      '--color-text': tokens.text,
      '--color-muted': tokens.muted,
      '--color-border': tokens.border,
      '--color-glow': tokens.glow,
      '--color-accent': accentColor,
      '--color-accent-soft': hexToRgba(accentColor, 0.22),
      '--color-accent-strong': hexToRgba(accentColor, 0.55),
      '--color-on-accent': readableOnAccent,
      '--surface-gradient': createSurfaceGradient(tokens.surface, tokens.surfaceMuted),
      '--surface-gradient-muted': createSurfaceGradient(tokens.surfaceMuted, tokens.surface),
      '--outline-accent': hexToRgba(accentColor, 0.45),
    } as CSSProperties
  }, [activeTheme, accentColor])

  const segmentedIndicatorStyle = useMemo((): CSSProperties => {
    const index = segmentedOptions.findIndex((option) => option.id === selectedSegment)
    return {
      '--indicator-index': index < 0 ? 0 : index,
      '--indicator-count': segmentedOptions.length,
    } as CSSProperties
  }, [selectedSegment])

  const triggerNotification = () => {
    setShowNotification(true)
    if (notificationTimer.current) {
      clearTimeout(notificationTimer.current)
    }

    notificationTimer.current = setTimeout(() => {
      setShowNotification(false)
    }, 2600)
  }

  const handleFabToggle = () => {
    setFabRecording((active) => !active)
  }

  return (
    <div className="app" style={themeStyle}>
      <div className="app__inner">
        <header className="app__header">
          <div className="app__intro">
            <p className="app__eyebrow">Neumorphism Playground</p>
            <h1>Button Dashboard</h1>
            <p className="app__lead">
              Explore how layered light and shadow shapes interactions. Tweak themes, experiment
              with accents, and preview common control patterns with neumorphic styling.
            </p>
          </div>
          <div className="control-panel">
            <div className="control-panel__group">
              <span className="control-panel__label">Themes</span>
              <div className="chip-row">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    className={`theme-chip${activeThemeId === theme.id ? ' is-active' : ''}`}
                    type="button"
                    aria-pressed={activeThemeId === theme.id}
                    onClick={() => setActiveThemeId(theme.id)}
                  >
                    <span className="theme-chip__name">{theme.name}</span>
                    <span className="theme-chip__meta">{theme.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="control-panel__group">
              <span className="control-panel__label">Accent palette</span>
              <div className="accent-row">
                {activeTheme.accents.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`accent-pill${accentColor === color ? ' is-active' : ''}`}
                    style={{ background: color }}
                    aria-pressed={accentColor === color}
                    onClick={() => setAccentColor(color)}
                  >
                    <span className="accent-pill__swatch" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <main className="dashboard-grid">
          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Primary Click Button</h2>
                <p className="panel__meta">Raised surface with click feedback and counter.</p>
              </div>
              <span className="panel__tag">Clicks tracked</span>
            </header>
            <div className="panel__body">
              <button
                className="neo-button"
                type="button"
                onClick={() => setClickCount((count) => count + 1)}
              >
                <span>Launch action</span>
                <span className="neo-button__state">{clickCount} clicks</span>
              </button>
              <p className="panel__note">
                Each press inverts the shadow briefly, mimicking a physical push.
              </p>
            </div>
          </section>

          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Toggle Button</h2>
                <p className="panel__meta">Accent-filled favorite toggle with inset press.</p>
              </div>
              <span className="panel__tag">{isFavorite ? 'Active' : 'Idle'}</span>
            </header>
            <div className="panel__body">
              <button
                className={`neo-toggle${isFavorite ? ' is-active' : ''}`}
                type="button"
                aria-pressed={isFavorite}
                onClick={() => setIsFavorite((state) => !state)}
              >
                <span className="neo-toggle__icon">{isFavorite ? '💎' : '🤍'}</span>
                <span className="neo-toggle__label">
                  {isFavorite ? 'Added to favorites' : 'Add to favorites'}
                </span>
              </button>
              <p className="panel__note">
                Accent fill boosts contrast while inset shadows indicate the pressed state.
              </p>
            </div>
          </section>

          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Switch Button</h2>
                <p className="panel__meta">Soft slider with tracked thumb glow.</p>
              </div>
              <span className="panel__tag">{isSwitchOn ? 'Enabled' : 'Muted'}</span>
            </header>
            <div className="panel__body panel__body--center">
              <button
                className={`neo-switch${isSwitchOn ? ' is-on' : ''}`}
                type="button"
                role="switch"
                aria-checked={isSwitchOn}
                onClick={() => setIsSwitchOn((state) => !state)}
              >
                <span className="neo-switch__track" />
                <span className="neo-switch__thumb" />
                <span className="neo-switch__hint">{isSwitchOn ? 'On' : 'Off'}</span>
              </button>
              <p className="panel__note">
                Thumb glow intensifies with the accent color while the background softens.
              </p>
            </div>
          </section>

          <section className="panel panel--wide">
            <header className="panel__header">
              <div>
                <h2>Notification Popup</h2>
                <p className="panel__meta">Transient toast emerging from the surface.</p>
              </div>
              <span className="panel__tag">Status</span>
            </header>
            <div className="panel__body panel__body--spread">
              <div className="panel__stack">
                <button className="neo-button" data-variant="accent" type="button" onClick={triggerNotification}>
                  Trigger notification
                </button>
                <p className="panel__note">
                  Subtle lift before appearing, then sinks when dismissed.
                </p>
              </div>
              <div className="toast-area">
                {showNotification && (
                  <div className="neo-toast" role="status" aria-live="polite">
                    <div className="neo-toast__icon">✨</div>
                    <div>
                      <p className="neo-toast__title">Routine completed</p>
                      <p className="neo-toast__meta">We saved today’s summary to Insights.</p>
                    </div>
                    <button
                      className="neo-toast__dismiss"
                      type="button"
                      onClick={() => setShowNotification(false)}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="panel panel--wide">
            <header className="panel__header">
              <div>
                <h2>Icon App Launcher</h2>
                <p className="panel__meta">Neumorphic workspace tiles with ambient counters.</p>
              </div>
              <span className="panel__tag">Launcher</span>
            </header>
            <div className="panel__body">
              <div className="icon-grid">
                {appIcons.map((icon) => {
                  const isActive = selectedIcon === icon.id
                  return (
                    <button
                      key={icon.id}
                      type="button"
                      className={`neo-icon${isActive ? ' is-active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => setSelectedIcon(icon.id)}
                    >
                      <span className="neo-icon__emoji" role="img" aria-hidden="true">
                        {icon.emoji}
                      </span>
                      <span className="neo-icon__label">{icon.label}</span>
                      {icon.notification ? (
                        <span className="neo-icon__badge">{icon.notification}</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <p className="panel__note">
                Use accent outlines to spotlight a chosen destination without losing softness.
              </p>
            </div>
          </section>

          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Segmented Actions</h2>
                <p className="panel__meta">Filter buttons with sliding neumorphic rail.</p>
              </div>
              <span className="panel__tag">Context</span>
            </header>
            <div className="panel__body">
              <div
                className="segmented-control"
                role="group"
                aria-label="Action timeframe"
                style={segmentedIndicatorStyle}
              >
                {segmentedOptions.map((option) => {
                  const isActive = selectedSegment === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`segmented-control__button${isActive ? ' is-active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => setSelectedSegment(option.id)}
                    >
                      <span>{option.label}</span>
                      <span className="segmented-control__helper">{option.helper}</span>
                    </button>
                  )
                })}
                <span className="segmented-control__indicator" />
              </div>
              <p className="panel__note">
                Segmented buttons sit on a shared surface, sliding indicator lifts with accent glow.
              </p>
            </div>
          </section>

          <section className="panel">
            <header className="panel__header">
              <div>
                <h2>Floating Action</h2>
                <p className="panel__meta">Circular record button with pulse feedback.</p>
              </div>
              <span className="panel__tag">{fabRecording ? 'Recording' : 'Idle'}</span>
            </header>
            <div className="panel__body panel__body--center">
              <button
                className={`neo-fab${fabRecording ? ' is-active' : ''}`}
                type="button"
                aria-pressed={fabRecording}
                onClick={handleFabToggle}
              >
                <span className="neo-fab__inner">{fabRecording ? '⏹' : '⏺'}</span>
              </button>
              <p className="panel__note">
                Raised rim keeps the circular action tactile while accent glow pulses when armed.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

