import {
  EMPTY_CONFIG,
  fromWire,
  toWire,
  type KioskConfig,
} from './config'
import { decodePayload, encodePayload } from './compress'

export type AppMode = 'edit' | 'kiosk'

export type Route = {
  mode: AppMode
  config: KioskConfig
}

/**
 * URL shape (hash-based, works on GitHub Pages):
 *   #/edit/<payload>  — create / tweak kiosk
 *   #/k/<payload>     — sell mode
 *   #/edit            — empty editor
 */
export function readRoute(): Route {
  const hash = location.hash.replace(/^#/, '')
  const parts = hash.split('/').filter(Boolean)

  if (parts.length === 0) {
    return { mode: 'edit', config: structuredClone(EMPTY_CONFIG) }
  }

  const modeToken = parts[0]
  const payload = parts[1] ?? ''

  const mode: AppMode = modeToken === 'k' || modeToken === 'kiosk' ? 'kiosk' : 'edit'

  if (!payload) {
    return { mode, config: structuredClone(EMPTY_CONFIG) }
  }

  try {
    const json = decodePayload(payload)
    const wire = JSON.parse(json) as Parameters<typeof fromWire>[0]
    return { mode, config: fromWire(wire) }
  } catch {
    return { mode: 'edit', config: structuredClone(EMPTY_CONFIG) }
  }
}

export function writeRoute(mode: AppMode, config: KioskConfig, replace = true): void {
  const json = JSON.stringify(toWire(config))
  const payload = encodePayload(json)
  const next = mode === 'kiosk' ? `#/k/${payload}` : `#/edit/${payload}`

  if (replace) {
    history.replaceState(null, '', next)
    return
  }

  // Assignment fires hashchange so the app can remount without reload
  if (location.hash === next) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    location.hash = next
  }
}

export function kioskShareUrl(config: KioskConfig): string {
  const json = JSON.stringify(toWire(config))
  const payload = encodePayload(json)
  const base = `${location.origin}${location.pathname}${location.search}`
  return `${base}#/k/${payload}`
}

export function editShareUrl(config: KioskConfig): string {
  const json = JSON.stringify(toWire(config))
  const payload = encodePayload(json)
  const base = `${location.origin}${location.pathname}${location.search}`
  return `${base}#/edit/${payload}`
}
