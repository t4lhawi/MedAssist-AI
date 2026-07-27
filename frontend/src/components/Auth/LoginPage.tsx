import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Mail, Lock, ShieldCheck, Eye, EyeOff, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { TextField } from '../ui/Field'

const LOGO_SRC: string = '/favicon.ico'

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <>
      {/* Light-mode logo: colored favicon as-is (hidden in dark mode) */}
      <span
        aria-label="CHU Mohammed VI Oujda"
        role="img"
        style={{
          width: size,
          height: size,
          backgroundImage: `url(${LOGO_SRC})`,
        }}
        className="inline-block shrink-0 bg-no-repeat bg-center bg-contain align-middle [.dark_&]:hidden"
      />
      {/* Dark-mode logo: same favicon used as a CSS mask, filled with white
          via the .logo-themed-dark class in index.css (hidden in light mode) */}
      <span
        aria-label="CHU Mohammed VI Oujda"
        role="img"
        style={{ width: size, height: size }}
        className="logo-themed-dark hidden shrink-0 align-middle [.dark_&]:inline-block"
      />
    </>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@chuoujda.ma')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => navigate('/'), 700)
      return () => clearTimeout(t)
    }
  }, [success, navigate])

  const handleCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLock(e.getModifierState('CapsLock'))
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      setSuccess(true)
    } catch {
      setError('Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="login-page relative min-h-screen overflow-hidden"
      style={{
        // Soft blue-tinted gradient so the colorful hospital logo reads clearly
        background:
          'linear-gradient(135deg, #EFF4FB 0%, #F4F7FC 35%, #F8FAFD 65%, #EEF3F9 100%)',
      }}
    >
      {/* ── Decorative background ─────────────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* Stronger blue wash behind the logo so the favicon reads clearly */}
        <div
          className="login-blob login-blob-a absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full"
          style={{
            background: 'radial-gradient(circle at center, rgba(59,130,246,0.30), transparent 60%)',
            filter: 'blur(55px)',
          }}
        />
        <div
          className="login-blob login-blob-b absolute -bottom-48 -right-40 h-[560px] w-[560px] rounded-full"
          style={{
            background: 'radial-gradient(circle at center, rgba(99,179,237,0.20), transparent 65%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Soft teal accent in the middle for depth */}
        <div
          className="login-blob login-blob-c absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle at center, rgba(147,197,253,0.14), transparent 70%)',
            filter: 'blur(70px)',
          }}
        />
        {/* Faint grid texture for a more designed, less-flat feel */}
        <div
          className="grid-texture absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.045) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage:
              'radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 80%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 80%)',
          }}
        />
      </div>

      {/* ── Page content — split layout, fills the viewport ─────── */}
      <main className="relative z-10 grid min-h-screen w-full grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        {/* Left: visual / brand panel — fills the half, no centering */}
        <aside className="login-reveal relative hidden flex-col justify-between overflow-hidden p-10 sm:p-14 lg:flex">
          <div className="flex items-center gap-4">
            <LogoMark size={56} />
            <div className="flex flex-col leading-tight">
              <span className="text-[16px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                MedAssist AI
              </span>
              <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                CHU Mohammed VI · Oujda
              </span>
            </div>
          </div>

          <div className="max-w-[520px]">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'var(--color-primary)' }}
            >
              Plateforme de Suivi Clinique
            </p>
            <h1
              className="mt-3 text-[40px] font-semibold leading-[1.08] tracking-tight sm:text-[48px]"
              style={{ color: 'var(--text-primary)' }}
            >
              Des soins, coordonnés en temps réel.
            </h1>
            <p
              className="mt-4 max-w-[440px] text-[14.5px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Un espace de travail unifié pour les équipes du CHU Mohammed VI d'Oujda —
              suivez les signaux des patients, coordonnez les gardes et agissez sur l'essentiel en premier.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2 text-[12px]">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium shadow-[0_1px_2px_var(--shadow-1)] backdrop-blur"
                style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--bg-card) 70%, transparent)' }}
              >
                <ShieldCheck size={12} strokeWidth={2.4} /> Conforme HDS
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium shadow-[0_1px_2px_var(--shadow-1)] backdrop-blur"
                style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--bg-card) 70%, transparent)' }}
              >
                Chiffrement de bout en bout
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium shadow-[0_1px_2px_var(--shadow-1)] backdrop-blur"
                style={{ color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--bg-card) 70%, transparent)' }}
              >
                Surveillance 24h/24
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" style={{ animationDuration: '2.2s' }} />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-medium">Tous les systèmes opérationnels</span>
              <span aria-hidden="true">·</span>
              <span>v1.0.0</span>
            </div>
            <div
              className="h-px w-full"
              style={{ background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--text-primary) 12%, transparent), transparent)' }}
            />
            <div
              className="login-reveal flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]"
              style={{ animationDelay: '540ms', color: 'var(--text-muted)' }}
            >
              <span>© 2026 MedAssist</span>
              <span aria-hidden="true">·</span>
              <span>Créé par{' '}
                <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Mohamed Talhaoui
                </span>
              </span>
            </div>
          </div>
        </aside>

        {/* Right: form panel — fills its half, content left-aligned */}
        <section className="flex min-h-screen w-full flex-col px-6 py-10 sm:px-10 sm:py-14 lg:px-16">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-3">
              <LogoMark size={36} />
              <div className="flex flex-col leading-tight">
                <span className="text-[13.5px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  MedAssist AI
                </span>
                <span className="text-[10.5px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  CHU Mohammed VI · Oujda
                </span>
              </div>
            </div>
            <span
              className="text-[10.5px] font-medium uppercase tracking-[0.1em]"
              style={{ color: 'var(--text-muted)' }}
            >
              v1.0.0
            </span>
          </div>

          <div className="flex w-full max-w-[460px] flex-col justify-center lg:flex-1">
          {/* Heading — left-aligned, no centering */}
          <div className="login-reveal mb-7" style={{ animationDelay: '120ms' }}>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--color-primary)' }}
            >
              Accès Sécurisé
            </p>
            <h2
              className="mt-2 text-[28px] font-semibold leading-[1.15] tracking-tight sm:text-[30px]"
              style={{ color: 'var(--text-primary)' }}
            >
              Bon retour parmi nous
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Connectez-vous pour accéder à la plateforme de suivi MedAssist.
            </p>
          </div>

          {/* ── Login card ─────────────────────────────────────── */}
          <section
            className="login-reveal relative w-full rounded-[20px] p-6 sm:p-7"
            style={{
              animationDelay: '200ms',
              background: 'color-mix(in srgb, var(--bg-elevated) 78%, transparent)',
              border: '1px solid color-mix(in srgb, var(--bg-elevated) 90%, transparent)',
              boxShadow:
                '0 1px 2px var(--shadow-1), 0 24px 60px -32px var(--shadow-3), 0 8px 20px -10px var(--shadow-2)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
            aria-labelledby="login-heading"
          >
            <h2 id="login-heading" className="sr-only">
              Connexion
            </h2>

            {/* Card product identity — small status row, like a real product */}
            <div
              className="mb-5 flex items-center justify-between border-b pb-4"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" style={{ animationDuration: '2.2s' }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Tous les systèmes opérationnels
                </span>
              </div>
              <span className="text-[10.5px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
                v1.0.0
              </span>
            </div>

            <form onSubmit={submit} noValidate className="space-y-4">
              <div className="login-reveal" style={{ animationDelay: '260ms' }}>
                <TextField
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="vous@hopital.com"
                  aria-label="Adresse e-mail"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  leadingIcon={<Mail size={16} strokeWidth={2.1} />}
                  fieldSize="md"
                  containerClassName="!mb-0"
                  className="!rounded-[14px] !bg-input"
                />
              </div>

              <div className="login-reveal" style={{ animationDelay: '320ms' }}>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="Mot de passe"
                    aria-label="Mot de passe"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={handleCapsLock}
                    onKeyUp={handleCapsLock}
                    onBlur={() => setCapsLock(false)}
                    className="peer w-full rounded-[14px] border-0 px-4 py-3.5 pl-11 pr-12 text-[14px] outline-none transition-all duration-200 ease-out"
                    style={{
                      color: 'var(--text-primary)',
                      background: 'var(--bg-input)',
                      boxShadow: 'inset 0 0 0 1px var(--border-color)',
                    }}
                    onFocus={e => {
                      e.currentTarget.style.background = 'var(--bg-elevated)'
                      e.currentTarget.style.boxShadow =
                        'inset 0 0 0 1.5px color-mix(in srgb, var(--color-primary) 55%, transparent), 0 0 0 4px color-mix(in srgb, var(--color-primary) 8%, transparent)'
                    }}
                    onBlurCapture={e => {
                      e.currentTarget.style.background = 'var(--bg-input)'
                      e.currentTarget.style.boxShadow = 'inset 0 0 0 1px var(--border-color)'
                    }}
                  />
                  <Lock
                    size={16}
                    strokeWidth={2.1}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors duration-200"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.currentTarget.style.background = 'var(--bg-hover)'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between text-[12px]">
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium transition-opacity duration-200 ${
                      capsLock ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ color: 'var(--color-warning)' }}
                    aria-live="polite"
                  >
                    <AlertCircle size={11} strokeWidth={2.4} />
                    Verrouillage des majuscules activé
                  </span>
                  <a
                    href="#"
                    aria-disabled="true"
                    onClick={e => e.preventDefault()}
                    className="cursor-not-allowed text-[12px] font-medium select-none"
                    style={{ color: 'var(--border-strong)' }}
                  >
                    Mot de passe oublié ?
                  </a>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="login-fade-in flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium"
                  style={{
                    background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-danger) 30%, transparent)',
                    color: 'var(--color-danger)',
                  }}
                >
                  <AlertCircle size={14} className="mt-0.5 shrink-0" strokeWidth={2.4} />
                  <span>{error}</span>
                </div>
              )}

              <div className="login-reveal pt-1" style={{ animationDelay: '380ms' }}>
                <button
                  type="submit"
                  disabled={loading || success}
                  aria-label={success ? 'Connecté' : 'Se connecter'}
                  className={`relative inline-flex h-[50px] w-full items-center justify-center gap-2 overflow-hidden rounded-full text-[14px] font-semibold transition-all duration-200 ease-out ${
                    success ? '' : 'active:translate-y-0 active:duration-100'
                  } disabled:cursor-default`}
                  style={
                    success
                      ? {
                          background: 'var(--color-success)',
                          color: '#FFFFFF',
                          boxShadow: '0 8px 24px -8px color-mix(in srgb, var(--color-success) 55%, transparent)',
                        }
                      : {
                          background: 'var(--text-primary)',
                          color: 'var(--bg-card)',
                          boxShadow: '0 4px 14px -4px var(--shadow-3)',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (success || loading) return
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'color-mix(in srgb, var(--text-primary) 88%, transparent)'
                    el.style.boxShadow = '0 10px 24px -6px var(--shadow-3)'
                    el.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    if (success || loading) return
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'var(--text-primary)'
                    el.style.boxShadow = '0 4px 14px -4px var(--shadow-3)'
                    el.style.transform = ''
                  }}
                >
                  {success ? (
                    <>
                      <Check size={17} strokeWidth={2.6} className="login-pop" />
                      <span className="login-pop">Connecté</span>
                    </>
                  ) : loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Connexion en cours…</span>
                    </>
                  ) : (
                    <span>Se connecter</span>
                  )}
                </button>
              </div>
            </form>
          </section>
          </div>
        </section>
      </main>

      <style>{`
        /* Reveal entrance — fade + tiny upward translate. */
        .login-reveal {
          opacity: 0;
          transform: translateY(8px);
          animation: loginReveal 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes loginReveal {
          to { opacity: 1; transform: translateY(0); }
        }

        /* Soft fade for inline error / success states. */
        .login-fade-in {
          animation: loginFadeIn 200ms ease-out;
        }
        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(-2px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Tiny pop when the button morphs into success. */
        .login-pop {
          animation: loginPop 220ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes loginPop {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* Drifting blurred circles — slow, very low amplitude. */
        .login-blob {
          will-change: transform;
          animation: loginBlob 22s ease-in-out infinite;
        }
        .login-blob-b { animation-duration: 26s; animation-delay: -8s; }
        .login-blob-c { animation-duration: 30s; animation-delay: -14s; }
        @keyframes loginBlob {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(24px, -18px, 0) scale(1.05); }
        }

        @media (prefers-reduced-motion: reduce) {
          .login-reveal { opacity: 1; transform: none; animation: none; }
          .login-blob { animation: none; }
          .login-fade-in, .login-pop { animation: none; }
        }

        /* Dark mode overrides — bespoke because the page uses custom
           gradients and radial blobs that don't read with the generic
           token flips. We override the page background, the grid
           texture, and bump the blob alpha so the colored wash still
           shows on a near-black surface. */
        .dark .login-page {
          background: linear-gradient(135deg, #0B1220 0%, #0F172A 35%, #111827 65%, #0B1220 100%) !important;
        }
        .dark .login-blob-a {
          background: radial-gradient(circle at center, rgba(96, 165, 250, 0.40), transparent 60%) !important;
        }
        .dark .login-blob-b {
          background: radial-gradient(circle at center, rgba(99, 179, 237, 0.30), transparent 65%) !important;
        }
        .dark .login-blob-c {
          background: radial-gradient(circle at center, rgba(147, 197, 253, 0.22), transparent 70%) !important;
        }
        .dark .login-page .grid-texture {
          opacity: 0.6;
        }
        .dark .login-page .grid-texture > div {
          background-image:
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px) !important;
        }
      `}</style>
    </div>
  )
}