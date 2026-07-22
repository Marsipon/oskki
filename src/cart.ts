import { roundPrice, type Product } from './config'

export type CartLine = {
  product: Product
  qty: number
}

export type Cart = Map<string, CartLine>

/** Survives Sälj ↔ Konfigurera remounts within the same page session */
let sessionCart: Cart | null = null

export function createCart(): Cart {
  return new Map()
}

export function getSessionCart(): Cart {
  if (!sessionCart) sessionCart = createCart()
  return sessionCart
}

export function resetSessionCart(): void {
  sessionCart = createCart()
}

/**
 * Keep quantities for products that still exist; drop removed ones.
 * Refresh product snapshots so price/name edits apply.
 */
export function reconcileCart(cart: Cart, products: Product[]): void {
  const byId = new Map(products.map((p) => [p.id, p]))
  for (const [id, line] of [...cart.entries()]) {
    const product = byId.get(id)
    if (!product || product.fast) {
      cart.delete(id)
      continue
    }
    line.product = product
  }
}

export function addToCart(cart: Cart, product: Product): void {
  const existing = cart.get(product.id)
  if (existing) {
    existing.qty += 1
  } else {
    cart.set(product.id, { product, qty: 1 })
  }
}

/** Remove one; deletes the line at zero */
export function removeFromCart(cart: Cart, productId: string): number {
  const existing = cart.get(productId)
  if (!existing) return 0
  existing.qty -= 1
  if (existing.qty <= 0) {
    cart.delete(productId)
    return 0
  }
  return existing.qty
}

export function setQty(cart: Cart, productId: string, qty: number): void {
  if (qty <= 0) {
    cart.delete(productId)
    return
  }
  const line = cart.get(productId)
  if (line) line.qty = qty
}

export function clearCart(cart: Cart): void {
  cart.clear()
}

export function cartTotal(cart: Cart): number {
  let total = 0
  for (const line of cart.values()) {
    total += line.product.price * line.qty
  }
  return roundPrice(total)
}

export function cartCount(cart: Cart): number {
  let count = 0
  for (const line of cart.values()) count += line.qty
  return count
}

export function cartLines(cart: Cart): CartLine[] {
  return [...cart.values()]
}
