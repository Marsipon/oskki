import type { Product } from './config'

/** Normalize for forgiving Swedish search */
function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('sv')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/**
 * Tiny fuzzy score — subsequence match with bonuses for
 * contiguous runs and matches at word starts.
 * 0 = no match.
 */
export function fuzzyScore(query: string, text: string): number {
  const q = normalize(query)
  const t = normalize(text)
  if (!q) return 1
  if (!t) return 0

  // Fast path: substring
  const idx = t.indexOf(q)
  if (idx >= 0) {
    let score = 200 - idx
    if (idx === 0 || /\s/.test(t[idx - 1]!)) score += 40
    return score
  }

  let ti = 0
  let score = 0
  let run = 0

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi]!
    const found = t.indexOf(ch, ti)
    if (found < 0) return 0

    run = found === ti ? run + 1 : 1
    score += 1 + run * 3
    if (found === 0 || /\s/.test(t[found - 1]!)) score += 8
    ti = found + 1
  }

  // Prefer shorter names when equally fuzzy
  score += Math.max(0, 40 - t.length)
  return score
}

export function fuzzyFilterProducts(products: Product[], query: string): Product[] {
  const q = query.trim()
  if (!q) return products

  return products
    .map((product) => {
      const nameScore = fuzzyScore(q, product.name)
      const catScore = product.category ? fuzzyScore(q, product.category) * 0.7 : 0
      return { product, score: Math.max(nameScore, catScore) }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.product)
}
