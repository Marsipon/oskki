/** Product shown in the kiosk */
export type Product = {
  id: string
  name: string
  price: number
  emoji: string
  /** Optional filter chip, e.g. Fika / Dryck */
  category: string
  /** Skip cart — open Swish immediately */
  fast: boolean
}

/** Full kiosk configuration — the single source of truth in the URL */
export type KioskConfig = {
  name: string
  swish: string
  products: Product[]
}

/** Compact wire format for shorter share links */
type WireProduct = {
  i: string
  n: string
  r: number
  e?: string
  c?: string
  f?: 1
}

type WireConfig = {
  n: string
  s: string
  p: WireProduct[]
}

export const EMPTY_CONFIG: KioskConfig = {
  name: '',
  swish: '',
  products: [],
}

export function createProduct(
  partial?: Partial<Pick<Product, 'name' | 'price' | 'emoji' | 'category' | 'fast'>>,
): Product {
  return {
    id: crypto.randomUUID().slice(0, 8),
    name: partial?.name ?? '',
    price: partial?.price ?? 0,
    emoji: partial?.emoji ?? '☕',
    category: partial?.category ?? '',
    fast: partial?.fast ?? false,
  }
}

export function toWire(config: KioskConfig): WireConfig {
  return {
    n: config.name.trim(),
    s: normalizeSwish(config.swish),
    p: config.products.map((p) => {
      const wire: WireProduct = {
        i: p.id,
        n: p.name.trim(),
        r: roundPrice(p.price),
      }
      if (p.emoji && p.emoji !== '☕') wire.e = p.emoji
      if (p.category.trim()) wire.c = p.category.trim()
      if (p.fast) wire.f = 1
      return wire
    }),
  }
}

export function fromWire(wire: WireConfig): KioskConfig {
  return {
    name: wire.n ?? '',
    swish: wire.s ?? '',
    products: (wire.p ?? []).map((p) => ({
      id: p.i || crypto.randomUUID().slice(0, 8),
      name: p.n ?? '',
      price: roundPrice(Number(p.r) || 0),
      emoji: p.e || '☕',
      category: p.c ?? '',
      fast: p.f === 1,
    })),
  }
}

export function isConfigReady(config: KioskConfig): boolean {
  return (
    config.name.trim().length > 0 &&
    isValidSwish(config.swish) &&
    config.products.length > 0 &&
    config.products.every((p) => p.name.trim().length > 0 && p.price > 0)
  )
}

export function productCategories(config: KioskConfig): string[] {
  const set = new Set<string>()
  for (const p of config.products) {
    const c = p.category.trim()
    if (c) set.add(c)
  }
  return [...set]
}

/**
 * Accept common Swish formats:
 * mobile 07XXXXXXXX / 7XXXXXXXX / +467XXXXXXXX
 * company numbers as 10 digits
 */
export function normalizeSwish(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('46') && digits.length === 11) {
    return `0${digits.slice(2)}`
  }
  if (digits.length === 9 && digits.startsWith('7')) {
    return `0${digits}`
  }
  return digits
}

export function isValidSwish(raw: string): boolean {
  const n = normalizeSwish(raw)
  return /^\d{10}$/.test(n)
}

export function formatPrice(price: number): string {
  const rounded = roundPrice(price)
  return Number.isInteger(rounded)
    ? `${rounded} kr`
    : `${rounded.toFixed(2).replace('.', ',')} kr`
}

export function roundPrice(price: number): number {
  return Math.round(price * 100) / 100
}

export const EMOJI_CHOICES = [
  '☕',
  '🍵',
  '🥤',
  '💧',
  '🥐',
  '🍪',
  '🌭',
  '🧁',
  '🍰',
  '🍫',
  '🍌',
  '🍎',
  '🎟️',
  '🏸',
  '⚽',
  '🏒',
  '🏊',
  '💪',
  '🎁',
] as const

export const CATEGORY_SUGGESTIONS = ['Fika', 'Dryck', 'Mat', 'Avgift', 'Övrigt'] as const
