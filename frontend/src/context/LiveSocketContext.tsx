import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { liveSocket, LiveAlerteEvent, LiveMesureEvent } from '../services/realtime'
import { useAuth } from './AuthContext'

/**
 * LiveSocketProvider — opens the singleton WebSocket once an auth token
 * is available, closes it on logout. Children consume events through
 * the typed ``useLiveSocket`` hook (returns the same `liveSocket`
 * instance), so any number of pages can subscribe without opening
 * their own connection.
 *
 * The provider also tracks a small "status" string the navbar can
 * render as a colored dot if we ever want to show connection health.
 */
type Status = 'idle' | 'connecting' | 'live' | 'closed'

interface LiveContextValue {
  status: Status
  onMesure: (cb: (data: LiveMesureEvent['data']) => void) => () => void
  onAlerte: (cb: (data: LiveAlerteEvent['data']) => void) => () => void
}

const LiveSocketContext = createContext<LiveContextValue>({} as LiveContextValue)

export function LiveSocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (!token) {
      liveSocket.close()
      setStatus('idle')
      return
    }
    setStatus('connecting')
    liveSocket.connect(token)
    const offOpen = liveSocket.on('open', () => setStatus('live'))
    const offClose = liveSocket.on('close', () => setStatus('closed'))
    return () => {
      offOpen()
      offClose()
      // Don't close the socket here — other pages may still be mounted.
      // The provider above this one unmounts on logout, which is the
      // only place we tear the socket down.
    }
  }, [token])

  const value: LiveContextValue = {
    status,
    onMesure: (cb) => liveSocket.on('mesure', cb),
    onAlerte: (cb) => liveSocket.on('alerte', cb),
  }
  return <LiveSocketContext.Provider value={value}>{children}</LiveSocketContext.Provider>
}

export const useLiveSocket = () => useContext(LiveSocketContext)
