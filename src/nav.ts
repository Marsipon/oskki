import { icon } from './icons'
import { on } from './utils'

export function navHtml(active: 'sell' | 'settings'): string {
  return `
    <nav class="bottom-nav">
      <button type="button" class="nav-item${active === 'sell' ? ' active' : ''}" data-tab="sell">
        ${icon('grid')}
        <span>Sälj</span>
      </button>
      <button type="button" class="nav-item${active === 'settings' ? ' active' : ''}" data-tab="settings">
        ${icon('gear')}
        <span>Konfigurera</span>
      </button>
    </nav>
  `
}

export function bindNav(
  root: HTMLElement,
  onNavigate?: (tab: 'sell' | 'settings') => void,
): void {
  if (!onNavigate) return
  on(root, 'click', '[data-tab]', (_e, node) => {
    const tab = node.dataset.tab
    if (tab === 'sell' || tab === 'settings') onNavigate(tab)
  })
}
