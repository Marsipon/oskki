import { mountEditApp } from './app'
import { mountKiosk } from './kiosk'
import { readRoute } from './state'
import './styles.css'

const app = document.querySelector<HTMLElement>('#app')
if (!app) throw new Error('#app saknas')

function boot(): void {
  const { mode, config } = readRoute()
  app!.replaceChildren()

  if (mode === 'kiosk') {
    document.title = config.name ? `${config.name} · Oskki` : 'Oskki'
    mountKiosk(app!, config, { showNav: false })
  } else {
    document.title = config.name ? `${config.name} · Inställningar` : 'Oskki'
    mountEditApp(app!, config)
  }
}

boot()

window.addEventListener('hashchange', boot)
window.addEventListener('popstate', boot)
