/** Escape text for safe HTML insertion */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** Tiny helper for event delegation */
export function on<K extends keyof HTMLElementEventMap>(
  root: ParentNode,
  type: K,
  selector: string,
  handler: (event: HTMLElementEventMap[K], el: HTMLElement) => void,
): void {
  root.addEventListener(type, (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const el = target.closest(selector)
    if (!(el instanceof HTMLElement) || !root.contains(el)) return
    handler(event as HTMLElementEventMap[K], el)
  })
}

export function animateBump(el: Element): void {
  el.classList.remove('bump')
  // Restart CSS animation
  void (el as HTMLElement).offsetWidth
  el.classList.add('bump')
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
