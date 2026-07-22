import { normalizeSwish, roundPrice } from './config'

const MESSAGE_MAX = 50

/**
 * Swish payment QR payload (static QR with amount + message).
 * Format: C{payee};{amount};{message};{edit}
 * edit=0 → nothing editable in the Swish app
 */
export function buildSwishPayload(
  swishNumber: string,
  amount: number,
  message: string,
): string {
  const payee = normalizeSwish(swishNumber)
  const amt = formatSwishAmount(amount)
  const msg = sanitizeMessage(message)
  return `C${payee};${amt};${msg};0`
}

function formatSwishAmount(amount: number): string {
  const rounded = roundPrice(amount)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

function sanitizeMessage(message: string): string {
  return message
    .replace(/[;\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MESSAGE_MAX)
}

/** Prefix like `Kiosk-220726:` (DDMMYY) */
export function swishMessagePrefix(date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `Kiosk-${dd}${mm}${yy}:`
}

/**
 * Swish message: `Kiosk-DDMMYY:` + packed goods (max 50 chars total).
 * No org name — payee is already the association Swish number.
 * Example: `Kiosk-220726:2×Kaffe,Bulle`
 */
export function buildSwishMessage(
  lines: { name: string; qty: number }[],
  date = new Date(),
): string {
  const prefix = swishMessagePrefix(date)
  const budget = MESSAGE_MAX - prefix.length
  if (budget <= 0) return sanitizeMessage(prefix)
  if (lines.length === 0) return sanitizeMessage(prefix)

  const goods = packGoods(
    lines.map((line) => formatLine(line.name, line.qty)),
    budget,
  )
  return sanitizeMessage(prefix + goods)
}

function formatLine(name: string, qty: number): string {
  const clean = name.replace(/[;\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
  return qty > 1 ? `${qty}×${clean}` : clean
}

function packGoods(parts: string[], max: number): string {
  if (parts.length === 0) return ''

  if (parts.length === 1) return clip(parts[0]!, max)

  const fitted: string[] = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!
    const next = fitted.length ? `${fitted.join(',')},${part}` : part

    if (next.length <= max) {
      fitted.push(part)
      continue
    }

    if (fitted.length === 0) return clip(part, max)
    return withOverflow(fitted, parts.length - fitted.length, max)
  }

  return fitted.join(',')
}

function withOverflow(fitted: string[], left: number, max: number): string {
  const base = fitted.join(',')
  if (left <= 0) return clip(base, max)

  const plus = `+${left}`
  if (base.length + plus.length <= max) return base + plus

  const room = max - plus.length
  if (room <= 0) return clip(plus, max)
  const trimmed = base.slice(0, room).replace(/,+$/u, '')
  return clip(trimmed + plus, max)
}

function clip(value: string, max: number): string {
  return value.slice(0, max)
}
