type EventKind = 'mesure' | 'alerte' | 'hello' | 'open' | 'close' | 'error'

type EventMap = {
  mesure: (data: LiveMesureEvent['data']) => void
  alerte: (data: LiveAlerteEvent['data']) => void
  hello: (data: { user?: string | null }) => void
  open: () => void
  close: () => void
  error: (err: Event) => void
}

export interface LiveMesureEvent {
  kind: 'mesure'
  data: {
    id: number
    type: string
    valeur: number
    unite: string | null
    timestamp: string | null
    esp32_id: number | null
    salle: string | null
    source_ip: string | null
    topic_salle: string | null
  }
}

export interface LiveAlerteEvent {
  kind: 'alerte'
  data: {
    id: number
    type: string | null
    mesure_id: number | null
    niveau: 'info' | 'attention' | 'critique' | string
    message: string
    traitee: boolean
    cree_le: string
    esp32_id: number | null
    salle: string | null
    explication: string | null
    explication_cree_le: string | null
  }
}

class LiveSocket {
  private ws: WebSocket | null = null
  private url: string | null = null
  private listeners: Map<EventKind, Set<Function>> = new Map()
  private retry = 0
  private retryTimer: number | null = null
  private pingTimer: number | null = null
  private closedByUser = false

  /** Build the WS URL from VITE_API_URL (same base as axios) and connect. */
  connect(token: string) {
    if (this.ws) return // already connecting/connected
    const base = (import.meta as any).env?.VITE_API_URL || 'http://51.170.138.112:8000'
    const wsBase = base.replace(/^http/, 'ws')
    this.url = `${wsBase}/api/realtime/ws?token=${encodeURIComponent(token)}`
    this.closedByUser = false
    this.openSocket()
  }

  private openSocket() {
    if (!this.url) return
    try {
      this.ws = new WebSocket(this.url)
    } catch (err) {
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.retry = 0
      this.emit('open')
      // Heartbeat — every 25 s, send a tiny ping. The server ignores
      // the payload; it just keeps the socket from being torn down
      // by intermediaries that close idle connections.
      this.pingTimer = window.setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          try { this.ws.send(JSON.stringify({ kind: 'ping' })) } catch {}
        }
      }, 25000)
    }

    this.ws.onmessage = (ev) => {
      let msg: any
      try { msg = JSON.parse(ev.data) } catch { return }
      if (!msg || typeof msg !== 'object') return
      const kind = msg.kind
      if (kind === 'mesure' || kind === 'alerte' || kind === 'hello') {
        this.emit(kind, msg.data ?? msg)
      }
    }

    this.ws.onerror = (ev) => {
      this.emit('error', ev)
    }

    this.ws.onclose = () => {
      this.cleanupTimers()
      this.ws = null
      this.emit('close')
      if (!this.closedByUser) this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.retryTimer != null) return
    // Exponential backoff: 1s, 2s, 4s, … capped at 5s. The +Math.random
    // jitter prevents a thundering herd if many tabs reconnect at once.
    const delay = Math.min(1000 * 2 ** this.retry, 5000) + Math.random() * 250
    this.retry += 1
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null
      this.openSocket()
    }, delay)
  }

  private cleanupTimers() {
    if (this.pingTimer != null) {
      window.clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  on<K extends EventKind>(kind: K, cb: EventMap[K]): () => void {
    if (!this.listeners.has(kind)) this.listeners.set(kind, new Set())
    this.listeners.get(kind)!.add(cb as Function)
    return () => this.off(kind, cb)
  }

  off<K extends EventKind>(kind: K, cb: EventMap[K]) {
    this.listeners.get(kind)?.delete(cb as Function)
  }

  private emit(kind: EventKind, ...args: any[]) {
    this.listeners.get(kind)?.forEach(cb => {
      try { cb(...args) } catch { /* swallow listener errors */ }
    })
  }

  close() {
    this.closedByUser = true
    this.cleanupTimers()
    if (this.retryTimer != null) {
      window.clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    try { this.ws?.close() } catch {}
    this.ws = null
  }
}

export const liveSocket = new LiveSocket()
