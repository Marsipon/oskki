import {
  formatPrice,
  isConfigReady,
  productCategories,
  type KioskConfig,
  type Product,
} from './config'
import {
  addToCart,
  cartCount,
  cartLines,
  cartTotal,
  clearCart,
  getSessionCart,
  reconcileCart,
  removeFromCart,
} from './cart'
import { icon } from './icons'
import { bindNav, navHtml } from './nav'
import { renderQrSvg } from './qr'
import { fuzzyFilterProducts } from './search'
import { writeRoute } from './state'
import { buildSwishMessage, buildSwishPayload } from './swish'
import { animateBump, escapeHtml, on } from './utils'

export type KioskOptions = {
  /** Show bottom tab bar (edit shell). Shared kiosk links hide it. */
  showNav?: boolean
  activeTab?: 'sell' | 'settings'
  onNavigate?: (tab: 'sell' | 'settings') => void
}

function el<T extends HTMLElement>(selector: string, root: ParentNode): T {
  const node = root.querySelector(selector)
  if (!(node instanceof HTMLElement)) throw new Error(`Missing: ${selector}`)
  return node as T
}

export function mountKiosk(
  root: HTMLElement,
  config: KioskConfig,
  options: KioskOptions = {},
): void {
  const showNav = options.showNav ?? false

  if (!isConfigReady(config)) {
    root.innerHTML = `
      <div class="shell ${showNav ? 'has-nav' : ''}">
        <header class="topbar">
          <div class="topbar-brand">${icon('store')} <strong>Oskki</strong></div>
          ${configButtonHtml()}
        </header>
        <main class="empty-state">
          <h1>Kiosken är inte klar</h1>
          <p>Öppna konfigurera och fyll i förening, Swish och produkter.</p>
        </main>
        ${showNav ? navHtml('sell') : ''}
      </div>
    `
    bindNav(root, options.onNavigate)
    bindConfigButton(root, config, options)
    return
  }

  const cart = getSessionCart()
  reconcileCart(cart, config.products)
  let filter = 'Alla'
  let query = ''
  const categories = productCategories(config)

  root.innerHTML = `
    <div class="shell ${showNav ? 'has-nav' : ''}">
      <header class="topbar">
        <div class="topbar-brand">${icon('store')} <strong>${escapeHtml(config.name)}</strong></div>
        ${configButtonHtml()}
      </header>

      <main class="sell-main">
        <div class="search-bar" id="search-bar">
          <label class="search-field">
            ${icon('search')}
            <input id="search-input" type="search" enterkeyhint="search" autocomplete="off"
              placeholder="Sök produkt..." />
          </label>
          <button type="button" class="btn-icon search-clear" id="clear-search" aria-label="Rensa sök" hidden>
            ${icon('close')}
          </button>
        </div>
        ${
          categories.length
            ? `<div class="cats" id="cats" role="tablist">
                <button type="button" class="cat active" data-cat="Alla">Alla</button>
                ${categories
                  .map(
                    (c) =>
                      `<button type="button" class="cat" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`,
                  )
                  .join('')}
              </div>`
            : ''
        }
        <div id="product-grid" class="product-grid"></div>
        <p id="search-empty" class="search-empty" hidden>Inga produkter matchade.</p>
      </main>

      <section class="sticky-cart hidden" id="sticky-cart" aria-live="polite">
        <div class="sticky-cart-meta">
          <span id="cart-count">0 enheter</span>
          <strong id="cart-total" class="mono">0 kr</strong>
        </div>
        <div class="sticky-cart-actions">
          <button type="button" class="btn-icon-border" id="clear-cart" aria-label="Rensa">
            ${icon('close')}
          </button>
          <button type="button" class="btn-swish" id="show-swish">
            Swish ${icon('qr')}
          </button>
        </div>
      </section>

      <div id="pay" class="pay-screen" hidden></div>
      ${showNav ? navHtml('sell') : ''}
    </div>
  `

  const grid = el('#product-grid', root)
  const sticky = el('#sticky-cart', root)
  const cartCountEl = el('#cart-count', root)
  const cartTotalEl = el('#cart-total', root)
  const pay = el('#pay', root)
  const searchInput = el<HTMLInputElement>('#search-input', root)
  const searchEmpty = el('#search-empty', root)
  const clearSearch = el('#clear-search', root)

  renderGrid()
  syncClearButton()
  bindNav(root, options.onNavigate)
  bindConfigButton(root, config, options)

  clearSearch.addEventListener('click', () => {
    query = ''
    searchInput.value = ''
    syncClearButton()
    renderGrid()
    searchInput.focus()
  })

  searchInput.addEventListener('input', () => {
    query = searchInput.value
    syncClearButton()
    renderGrid()
  })

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && query) {
      query = ''
      searchInput.value = ''
      syncClearButton()
      renderGrid()
    }
  })

  const cats = root.querySelector('#cats')
  if (cats) {
    on(cats, 'click', '.cat', (_e, node) => {
      filter = node.dataset.cat || 'Alla'
      cats.querySelectorAll('.cat').forEach((c) => {
        c.classList.toggle('active', c === node)
      })
      renderGrid()
    })
  }

  function syncClearButton(): void {
    clearSearch.hidden = !query.trim()
  }

  // Tap card → add one (minus control handled separately)
  on(grid, 'click', '.product-card', (event, node) => {
    if ((event.target as Element | null)?.closest('[data-action="dec"]')) return
    addOne(node)
  })

  on(grid, 'keydown', '.product-card', (event, node) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    addOne(node)
  })

  // Tap − → remove one
  on(grid, 'click', '[data-action="dec"]', (event, node) => {
    event.preventDefault()
    event.stopPropagation()

    const card = node.closest<HTMLElement>('.product-card')
    const id = card?.dataset.id
    if (!id || !card) return

    const qty = removeFromCart(cart, id)
    syncCardQty(card, qty)
    refreshCart(true)
  })

  function addOne(node: HTMLElement): void {
    const id = node.dataset.id
    const product = config.products.find((p) => p.id === id)
    if (!product) return

    node.classList.add('pop')
    window.setTimeout(() => node.classList.remove('pop'), 140)

    if (product.fast) {
      openPay([{ product, qty: 1 }])
      return
    }

    addToCart(cart, product)
    syncCardQty(node, cart.get(product.id)?.qty ?? 0)
    refreshCart(true)
  }

  el('#clear-cart', root).addEventListener('click', () => {
    clearCart(cart)
    grid.querySelectorAll('.product-card').forEach((card) => {
      syncCardQty(card as HTMLElement, 0)
    })
    refreshCart()
  })

  el('#show-swish', root).addEventListener('click', () => {
    if (cartCount(cart) === 0) return
    openPay(cartLines(cart))
  })

  function renderGrid(): void {
    const byCategory = config.products.filter(
      (p) => filter === 'Alla' || p.category.trim() === filter,
    )
    const products = fuzzyFilterProducts(byCategory, query)
    grid.innerHTML = products.map((p) => productCardHtml(p, cart.get(p.id)?.qty ?? 0)).join('')
    searchEmpty.hidden = products.length > 0
    searchEmpty.textContent = query.trim()
      ? 'Inga produkter matchade.'
      : 'Inga produkter i kategorin.'
  }

  function syncCardQty(card: HTMLElement, qty: number): void {
    let stepper = card.querySelector<HTMLElement>('.qty-stepper')
    if (qty <= 0) {
      stepper?.remove()
      return
    }

    if (!stepper) {
      stepper = document.createElement('div')
      stepper.className = 'qty-stepper'
      stepper.innerHTML = qtyStepperInner(qty)
      card.appendChild(stepper)
    } else {
      const label = stepper.querySelector('.qty-value')
      if (label) label.textContent = String(qty)
    }

    stepper.classList.remove('pop')
    void stepper.offsetWidth
    stepper.classList.add('pop')
  }

  function refreshCart(bump = false): void {
    const count = cartCount(cart)
    const total = cartTotal(cart)
    cartCountEl.textContent = `${count} ${count === 1 ? 'enhet' : 'enheter'}`
    cartTotalEl.textContent = formatPrice(total)
    sticky.classList.toggle('hidden', count === 0)
    if (bump) animateBump(cartTotalEl)
  }

  function openPay(lines: { product: Product; qty: number }[]): void {
    const total = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0)
    if (total <= 0) return

    const message = buildSwishMessage(
      lines.map((l) => ({ name: l.product.name, qty: l.qty })),
    )
    const payload = buildSwishPayload(config.swish, total, message)

    pay.hidden = false
    pay.innerHTML = `
      <header class="topbar">
        <div class="topbar-brand">${icon('store')} <strong>${escapeHtml(config.name)}</strong></div>
        <button type="button" class="btn-icon" id="pay-close" aria-label="Stäng">${icon('close')}</button>
      </header>
      <div class="pay-body">
        <div class="pay-intro">
          <h1>Betala med Swish</h1>
          <p>Mottagare: <strong>${escapeHtml(config.name)}</strong></p>
        </div>
        <div class="pay-qr-wrap">
          <div class="pay-qr">${renderQrSvg(payload)}</div>
          <p class="pay-label">Att betala</p>
          <p class="pay-amount mono">${formatPrice(total)}</p>
          ${message ? `<p class="pay-goods">${escapeHtml(message)}</p>` : ''}
        </div>
        <p class="pay-hint">Skanna koden i <strong>Swish-appen</strong> för att slutföra betalningen.</p>
      </div>
      <footer class="pay-footer">
        <button type="button" class="btn btn-primary btn-block" id="pay-done">
          ${icon('check')} Klar
        </button>
        <button type="button" class="btn btn-outline btn-block" id="pay-back">Tillbaka</button>
      </footer>
    `

    el('#pay-close', pay).addEventListener('click', () => closePay(false))
    el('#pay-back', pay).addEventListener('click', () => closePay(false))
    el('#pay-done', pay).addEventListener('click', () => closePay(true))
  }

  function closePay(done: boolean): void {
    pay.hidden = true
    pay.replaceChildren()
    if (done) {
      clearCart(cart)
      renderGrid()
      refreshCart()
    }
  }
}

function configButtonHtml(): string {
  return `
    <button type="button" class="btn-icon topbar-config" id="open-config" aria-label="Konfigurera">
      ${icon('gear')}
    </button>
  `
}

function bindConfigButton(
  root: HTMLElement,
  config: KioskConfig,
  options: KioskOptions,
): void {
  const btn = root.querySelector('#open-config')
  if (!(btn instanceof HTMLElement)) return

  btn.addEventListener('click', () => {
    if (options.onNavigate) {
      options.onNavigate('settings')
      return
    }
    writeRoute('edit', config, false)
  })
}

function qtyStepperInner(qty: number): string {
  return `
    <button type="button" class="qty-dec" data-action="dec" aria-label="Minska">
      ${icon('minus')}
    </button>
    <span class="qty-value mono">${qty}</span>
  `
}

function productCardHtml(product: Product, qty: number): string {
  const fastClass = product.fast ? ' product-card-fast' : ''
  const stepper =
    !product.fast && qty > 0
      ? `<div class="qty-stepper">${qtyStepperInner(qty)}</div>`
      : ''

  return `
    <div class="product-card${fastClass}" role="button" tabindex="0" data-id="${escapeHtml(product.id)}">
      ${product.fast ? '<span class="fast-tag">Snabb</span>' : ''}
      <span class="product-emoji">${escapeHtml(product.emoji)}</span>
      <span class="product-name">${escapeHtml(product.name)}</span>
      <span class="product-price mono">${formatPrice(product.price)}</span>
      ${stepper}
    </div>
  `
}
