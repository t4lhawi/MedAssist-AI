import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@medassist.ma')
  const [password, setPassword] = useState('')
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

  const Logo = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21c-4.5-3-8-6.5-8-10.5A5.5 5.5 0 0 1 9.5 5c1 0 2 .3 2.5 1 .5-.7 1.5-1 2.5-1A5.5 5.5 0 0 1 20 10.5c0 4-3.5 7.5-8 10.5Z" />
    </svg>
  )

  return (
    <div className="grid min-h-screen bg-slate-950 lg:grid-cols-[1fr_28rem]">
      <section className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(circle at 15% 15%, rgba(59,130,246,0.25), transparent 45%), radial-gradient(circle at 85% 85%, rgba(37,99,235,0.2), transparent 50%)',
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-b from-blue-500 to-blue-600 shadow-[0_2px_8px_-1px_rgba(37,99,235,0.5)]">
            <Logo size={20} />
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.01em]">MedAssist AI</p>
            <p className="text-[11.5px] text-white/45">CHU Mohammed VI Oujda</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-blue-400">
            Plateforme hospitalière intelligente
          </p>
          <h1 className="mt-4 text-[2.6rem] font-semibold leading-[1.1] tracking-[-0.03em]">
            Surveillance, alertes et assistance documentaire dans un seul espace.
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-white/50">
            Connectez-vous pour suivre les capteurs, traiter les alertes et interroger les protocoles indexés par l'assistant IA.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-[12.5px] text-white/40">
          <ShieldCheck size={15} />
          Accès réservé aux utilisateurs autorisés
        </div>
      </section>

      <main className="flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[10px] bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_2px_8px_-1px_rgba(37,99,235,0.5)]">
              <Logo size={22} />
            </div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">MedAssist AI</h1>
            <p className="mt-1 text-[13px] text-slate-400">Plateforme hospitalière intelligente</p>
          </div>

          <div className="mb-7">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">Connexion</h2>
            <p className="mt-1 text-[13.5px] text-slate-400">Accédez à votre espace de supervision.</p>
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-slate-500">Email</span>
              <div className="flex items-center gap-2.5 rounded-xl bg-slate-100 px-3.5 py-3 transition-shadow focus-within:bg-white focus-within:shadow-[inset_0_0_0_1.5px_rgba(37,99,235,0.5)]">
                <Mail size={16} className="shrink-0 text-slate-400" />
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  required
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] text-slate-800 outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-slate-500">Mot de passe</span>
              <div className="flex items-center gap-2.5 rounded-xl bg-slate-100 px-3.5 py-3 transition-shadow focus-within:bg-white focus-within:shadow-[inset_0_0_0_1.5px_rgba(37,99,235,0.5)]">
                <Lock size={16} className="shrink-0 text-slate-400" />
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type="password"
                  required
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] text-slate-800 outline-none"
                />
              </div>
            </label>

            {error && (
              <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-[14px] font-semibold text-white shadow-[0_2px_8px_-1px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}