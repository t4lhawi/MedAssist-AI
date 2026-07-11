/* const LOGO_SRC = "/img/favicon.ico" */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, ImagePlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// ─────────────────────────────────────────────────────────────
// LOGO — drop the CHU logo file into src/assets and point this
// import at it. Once LOGO_SRC is set, the placeholder frames
// below automatically swap to the real image.
//   import chuLogo from '../../assets/chu-logo.png'
//   const LOGO_SRC: string | null = chuLogo
// ─────────────────────────────────────────────────────────────
const LOGO_SRC = "/img/favicon.ico"

function LogoMark({ size = 44 }: { size?: number }) {
  if (LOGO_SRC) {
    return (
      <img
        src={LOGO_SRC}
        alt="CHU Mohammed VI Oujda"
        style={{ width: size, height: size, filter: 'brightness(0) invert(1)' }}
        className="object-contain"
      />
    )
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="group/logo relative flex shrink-0 items-center justify-center rounded-[12px] border-[1.5px] border-dashed border-white/25 bg-white/[0.04] transition-colors duration-200 hover:border-white/40 hover:bg-white/[0.07]"
      title="Emplacement du logo CHU"
    >
      <ImagePlus size={Math.round(size * 0.4)} strokeWidth={1.6} className="text-white/35" />
    </div>
  )
}

function LogoMarkLight({ size = 40 }: { size?: number }) {
  if (LOGO_SRC) {
    return (
      <img
        src={LOGO_SRC}
        alt="CHU Mohammed VI Oujda"
        style={{ width: size, height: size }}
        className="rounded-[10px] object-contain"
      />
    )
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-slate-300 bg-slate-50"
      title="Emplacement du logo CHU"
    >
      <ImagePlus size={Math.round(size * 0.42)} strokeWidth={1.6} className="text-slate-300" />
    </div>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@medassist.ma')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-[--ink] lg:grid-cols-[1fr_28rem]">
      {/* ── Left hero panel ─────────────────────────────────── */}
      <section className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(circle at 12% 8%, rgba(46,99,255,0.28), transparent 42%), radial-gradient(circle at 88% 92%, rgba(91,140,255,0.16), transparent 48%)',
          }}
        />

        <div className="reveal relative flex items-center gap-3" style={{ animationDelay: '80ms' }}>
          <LogoMark size={64} />
          <div>
            <p className="font-display text-[15.5px] font-semibold tracking-[-0.01em]">MedAssist AI</p>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/40">CHU Mohammed VI · Oujda</p>
          </div>
        </div>

        <div className="reveal relative max-w-xl" style={{ animationDelay: '200ms' }}>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[--signal-light]">
            Plateforme hospitalière intelligente
          </p>
          <h1 className="font-display mt-4 text-[2.65rem] font-semibold leading-[1.1] tracking-[-0.02em]">
            Surveillance, alertes et assistance documentaire dans un seul espace.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-white/50">
            Connectez-vous pour suivre les capteurs, traiter les alertes et interroger les protocoles indexés par l'assistant IA.
          </p>
        </div>

        <div className="reveal relative" style={{ animationDelay: '320ms' }}>
          <svg viewBox="0 0 700 90" className="h-16 w-full max-w-xl text-white/[0.08]" preserveAspectRatio="none">
            <path
              d="M0,45 L120,45 L145,10 L170,78 L195,20 L220,45 L480,45 L505,10 L530,78 L555,20 L580,45 L700,45"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d="M0,45 L120,45 L145,10 L170,78 L195,20 L220,45 L480,45 L505,10 L530,78 L555,20 L580,45 L700,45"
              fill="none"
              stroke="#5B8CFF"
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray="90 1400"
              className="vitals-sweep"
            />
          </svg>
          <div className="mt-3 flex items-center gap-2 overflow-hidden">
            <ShieldCheck size={14} className="shrink-0 text-white/35" />
            <div className="ticker-mask relative h-4 flex-1 overflow-hidden">
              <p className="ticker-track absolute whitespace-nowrap font-mono text-[11px] tracking-[0.06em] text-white/35">
                Accès réservé aux utilisateurs autorisés&nbsp;&nbsp;·&nbsp;&nbsp;128 capteurs actifs&nbsp;&nbsp;·&nbsp;&nbsp;surveillance en continu&nbsp;&nbsp;·&nbsp;&nbsp;
                Accès réservé aux utilisateurs autorisés&nbsp;&nbsp;·&nbsp;&nbsp;128 capteurs actifs&nbsp;&nbsp;·&nbsp;&nbsp;surveillance en continu&nbsp;&nbsp;·&nbsp;&nbsp;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Right form panel ────────────────────────────────── */}
      <main className="flex items-center justify-center bg-[--paper] p-4">
        <div className="w-full max-w-sm">
          <div className="reveal mb-8 lg:hidden" style={{ animationDelay: '60ms' }}>
            <div className="mb-4">
              <LogoMarkLight size={56} />
            </div>
            <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-slate-900">MedAssist AI</h1>
            <p className="mt-1 text-[13px] text-slate-400">CHU Mohammed VI Oujda</p>
          </div>

          <div className="reveal mb-7" style={{ animationDelay: '120ms' }}>
            <h2 className="font-display text-[23px] font-semibold tracking-[-0.02em] text-slate-900">Connexion</h2>
            <p className="mt-1 text-[13.5px] text-slate-400">Accédez à votre espace de supervision.</p>
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            <label className="reveal block" style={{ animationDelay: '180ms' }}>
              <div className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl bg-slate-100 px-3.5 pb-2 pt-5 transition-all duration-200 ease-out focus-within:bg-white focus-within:shadow-[0_6px_20px_-6px_rgba(46,99,255,0.28)]">
                <Mail size={16} className="shrink-0 text-slate-400 transition-colors duration-200 group-focus-within:text-[--signal]" />
                <div className="relative min-w-0 flex-1">
                  <input
                    id="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    type="email"
                    placeholder=" "
                    autoComplete="email"
                    required
                    className="peer w-full border-0 bg-transparent p-0 text-[13.5px] text-slate-800 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[13.5px] text-slate-400 transition-all duration-200 ease-out peer-focus:-top-[15px] peer-focus:translate-y-0 peer-focus:text-[10.5px] peer-focus:font-medium peer-focus:text-[--signal] peer-[:not(:placeholder-shown)]:-top-[15px] peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10.5px] peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-slate-500">
                    Email
                  </span>
                </div>
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2.5px] origin-center scale-x-0 bg-gradient-to-r from-[--signal] to-[--signal-deep] transition-transform duration-300 ease-out group-focus-within:scale-x-100" />
              </div>
            </label>

            <label className="reveal block" style={{ animationDelay: '230ms' }}>
              <div className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl bg-slate-100 px-3.5 pb-2 pt-5 transition-all duration-200 ease-out focus-within:bg-white focus-within:shadow-[0_6px_20px_-6px_rgba(46,99,255,0.28)]">
                <Lock size={16} className="shrink-0 text-slate-400 transition-colors duration-200 group-focus-within:text-[--signal]" />
                <div className="relative min-w-0 flex-1">
                  <input
                    id="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    placeholder=" "
                    autoComplete="current-password"
                    required
                    className="peer w-full border-0 bg-transparent p-0 text-[13.5px] text-slate-800 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[13.5px] text-slate-400 transition-all duration-200 ease-out peer-focus:-top-[15px] peer-focus:translate-y-0 peer-focus:text-[10.5px] peer-focus:font-medium peer-focus:text-[--signal] peer-[:not(:placeholder-shown)]:-top-[15px] peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10.5px] peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-slate-500">
                    Mot de passe
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="shrink-0 text-slate-400 transition-colors duration-150 hover:text-slate-600"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2.5px] origin-center scale-x-0 bg-gradient-to-r from-[--signal] to-[--signal-deep] transition-transform duration-300 ease-out group-focus-within:scale-x-100" />
              </div>
              <div className="mt-1.5 text-right">
                <a href="#" className="text-[11.5px] font-medium text-[--signal] transition-colors hover:text-[--signal-deep]">
                  Oublié ?
                </a>
              </div>
            </label>

            {error && (
              <p className="animate-[shakeIn_0.4s_ease-out] rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-[--alert]" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ animationDelay: '280ms' }}
              className="reveal inline-flex w-full items-center justify-center gap-2 rounded-full bg-[--signal] px-4 py-3 text-[14px] font-semibold text-white shadow-[0_2px_10px_-2px_rgba(46,99,255,0.5)] transition-all duration-200 ease-out hover:bg-[--signal-deep] hover:shadow-[0_6px_18px_-4px_rgba(46,99,255,0.55)] active:scale-[0.98] active:duration-100 disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </main>

      <style>{`
        :root {
          --ink: #0a1628;
          --signal: #2e63ff;
          --signal-deep: #1a46c4;
          --signal-light: #5b8cff;
          --paper: #fbfaf6;
          --alert: #e14f4f;
        }

        .font-display { font-family: inherit; }
        .font-mono { font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace; }

        .reveal {
          opacity: 0;
          animation: revealUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes revealUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shakeIn {
          0% { opacity: 0; transform: translateY(-4px); }
          35% { opacity: 1; transform: translateX(-3px); }
          55% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        .vitals-sweep {
          animation: vitalsSweep 3.2s linear infinite;
        }
        @keyframes vitalsSweep {
          from { stroke-dashoffset: 1490; }
          to { stroke-dashoffset: 0; }
        }

        .ticker-mask {
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
        }
        .ticker-track {
          animation: tickerScroll 22s linear infinite;
        }
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .reveal { opacity: 1; animation: none; }
          .vitals-sweep, .ticker-track { animation: none; }
        }
      `}</style>
    </div>
  )
}