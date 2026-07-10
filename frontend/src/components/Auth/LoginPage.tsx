import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hospital, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
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

  return (
    <div className="grid min-h-screen bg-slate-950 lg:grid-cols-[1fr_30rem]">
      <section className="hidden flex-col justify-between p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Hospital size={24} />
          </div>
          <div>
            <p className="text-lg font-bold">MedAssist AI</p>
            <p className="text-xs text-white/55">CHU Mohammed VI Oujda</p>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">Plateforme hospitaliere intelligente</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Surveillance, alertes et assistance documentaire dans un seul espace.</h1>
          <p className="mt-4 text-base leading-7 text-white/65">
            Connectez-vous pour suivre les capteurs, traiter les alertes et interroger les protocoles indexes par l'assistant IA.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-white/55">
          <ShieldCheck size={16} />
          Acces reserve aux utilisateurs autorises
        </div>
      </section>

      <main className="flex items-center justify-center bg-slate-100 p-4 lg:bg-white">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft md:p-8">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
              <Hospital size={26} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">MedAssist AI</h1>
            <p className="mt-1 text-sm text-slate-500">Plateforme hospitaliere intelligente</p>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Connexion</h2>
            <p className="mt-1 text-sm text-slate-500">Accedez a votre espace de supervision.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Email</span>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary">
                <Mail size={17} className="text-slate-400" />
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  required
                  className="min-w-0 flex-1 border-0 p-0 text-sm outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Mot de passe</span>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary">
                <Lock size={17} className="text-slate-400" />
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type="password"
                  required
                  className="min-w-0 flex-1 border-0 p-0 text-sm outline-none"
                />
              </div>
            </label>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
            >
              {loading && <Loader2 size={17} className="animate-spin" />}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
