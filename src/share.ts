import { kioskShareUrl } from './state'
import type { KioskConfig } from './config'

export async function copyKioskLink(config: KioskConfig): Promise<boolean> {
  const url = kioskShareUrl(config)
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return true
    }
  } catch {
    // fall through
  }
  return fallbackCopy(url)
}

function fallbackCopy(text: string): boolean {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(ta)
  return ok
}
