import type { KioskConfig } from './config'
import { mountEditor } from './editor'
import { mountKiosk } from './kiosk'

/**
 * Edit-mode shell: Sälj + Konfigurera tabs, same URL payload.
 * Shared kiosk links (#/k/...) mount sell view only via main.ts.
 */
export function mountEditApp(
  root: HTMLElement,
  initial: KioskConfig,
  startTab: 'sell' | 'settings' = 'settings',
): void {
  let config = structuredClone(initial)

  render(startTab)

  function render(next: 'sell' | 'settings'): void {
    root.replaceChildren()
    if (next === 'sell') {
      mountKiosk(root, config, {
        showNav: true,
        onNavigate: render,
      })
    } else {
      mountEditor(root, config, {
        showNav: true,
        onNavigate: render,
        onChange: (c) => {
          config = c
        },
      })
    }
  }
}
