import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { roleLabelFr, normalizeRole } from '../../utils/permissions'

/** Clean 403 page shown when a user navigates to a route their role
 *  isn't allowed to access. Keeps them in the app (no full reload) and
 *  offers a path back to the dashboard. */
export default function AccessDenied() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const role = user ? normalizeRole(user.role) : null

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-5 p-8 text-center"
         style={{ minHeight: 'calc(100vh - 14rem)' }}>
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)' }}
      >
        <ShieldAlert size={28} strokeWidth={2.2} style={{ color: 'var(--color-danger)' }} />
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]"
           style={{ color: 'var(--color-danger)' }}>
          Accès refusé
        </p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}>
          Cette page n'est pas accessible avec votre rôle.
        </h1>
        <p className="mx-auto mt-3 max-w-[44ch] text-[14px] leading-relaxed"
           style={{ color: 'var(--text-secondary)' }}>
          {user ? (
            <>
              Vous êtes connecté en tant que{' '}
              <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {roleLabelFr(role)}
              </strong>
              . Si vous pensez qu'il s'agit d'une erreur, contactez un
              administrateur de la plateforme.
            </>
          ) : (
            <>
              Vous devez être connecté pour accéder à cette page.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.97]"
          style={{
            background: 'var(--text-primary)',
            color: 'var(--bg-card)',
            boxShadow: '0 2px 8px -2px var(--shadow-2)',
          }}
        >
          <ArrowLeft size={13} strokeWidth={2.4} />
          Retour au tableau de bord
        </button>
        {!user && (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-color)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
            }}
          >
            <LogIn size={13} strokeWidth={2.4} />
            Se connecter
          </button>
        )}
        {user && (
          <button
            type="button"
            onClick={() => { logout(); navigate('/login') }}
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--color-danger)',
              borderColor: 'color-mix(in srgb, var(--color-danger) 30%, transparent)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-danger) 10%, transparent)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
            }}
          >
            <LogIn size={13} strokeWidth={2.4} />
            Se connecter avec un autre compte
          </button>
        )}
      </div>
    </div>
  )
}
