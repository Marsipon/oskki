import {
  CATEGORY_SUGGESTIONS,
  EMOJI_CHOICES,
  createProduct,
  formatPrice,
  isConfigReady,
  isValidSwish,
  normalizeSwish,
  type KioskConfig,
  type Product,
} from './config'
import { icon } from './icons'
import { bindNav, navHtml } from './nav'
import { renderQrSvg } from './qr'
import { copyKioskLink } from './share'
import { kioskShareUrl, writeRoute } from './state'
import { escapeHtml, on } from './utils'

export type EditorOptions = {
  showNav?: boolean
  onNavigate?: (tab: 'sell' | 'settings') => void
  onChange?: (config: KioskConfig) => void
}

function el<T extends HTMLElement>(selector: string, root: ParentNode): T {
  const node = root.querySelector(selector)
  if (!(node instanceof HTMLElement)) throw new Error(`Missing: ${selector}`)
  return node as T
}

export function mountEditor(
  root: HTMLElement,
  initial: KioskConfig,
  options: EditorOptions = {},
): void {
  let config: KioskConfig = structuredClone(initial)
  let editingId: string | null = null
  let toastTimer = 0
  const showNav = options.showNav ?? true

  if (config.products.length === 0) {
    config.products.push(
      createProduct({ name: 'Kaffe', price: 20, emoji: '☕', category: 'Fika' }),
    )
  }

  render()
  sync(false)

  function render(): void {
    root.innerHTML = `
      <div class="shell has-nav settings-shell">
        <header class="topbar">
          <div class="topbar-brand">${icon('store')} <strong>Inställningar</strong></div>
        </header>

        <main class="settings-main">
          <section class="card">
            <div class="card-head">${icon('building')} <h2>Förening</h2></div>
            <label class="field">
              <span>Föreningsnamn</span>
              <input id="org-name" type="text" maxlength="60" placeholder="T.ex. IK Björnen" />
            </label>
            <label class="field">
              <span>Swish</span>
              <input id="swish" class="mono" type="tel" inputmode="tel" maxlength="16" placeholder="07X XXX XX XX" />
            </label>
          </section>

          <section class="stack-gap">
            <div class="section-row">
              <div class="card-head tight">${icon('box')} <h2>Produkter</h2></div>
              <span class="muted" id="product-count">${config.products.length} stycken</span>
            </div>
            <div class="card list-card">
              <div id="product-list"></div>
              <button type="button" class="add-row" id="add-product">
                ${icon('plus')} Lägg till produkt
              </button>
            </div>
          </section>

          <section class="stack-gap">
            <div class="card-head tight">${icon('share')} <h2>Dela kiosk</h2></div>
            <button type="button" class="share-primary" id="copy-link" disabled>
              <span class="share-primary-left">
                <span class="share-icon">${icon('link')}</span>
                <span>
                  <strong>Kopiera länk</strong>
                  <small>All din data ryms i URL:en</small>
                </span>
              </span>
              ${icon('chevron')}
            </button>
            <button type="button" class="share-secondary" id="show-link-qr" disabled>
              ${icon('qr')} QR-kod till kiosken
            </button>
            <p class="footnote">Ingen databas behövs. Allt lagras direkt i länken du delar.</p>
          </section>
        </main>

        <div id="product-sheet" class="sheet" hidden></div>
        <div id="qr-sheet" class="sheet" hidden></div>
        <div id="toast" class="toast" hidden></div>
        ${showNav ? navHtml('settings') : ''}
      </div>
    `

    const nameInput = el<HTMLInputElement>('#org-name', root)
    const swishInput = el<HTMLInputElement>('#swish', root)
    nameInput.value = config.name
    swishInput.value = config.swish

    renderProductList()
    bindNav(root, options.onNavigate)

    nameInput.addEventListener('input', () => {
      config.name = nameInput.value
      sync()
    })

    swishInput.addEventListener('input', () => {
      config.swish = swishInput.value
      sync()
    })

    swishInput.addEventListener('blur', () => {
      if (isValidSwish(config.swish)) {
        config.swish = normalizeSwish(config.swish)
        swishInput.value = config.swish
        sync()
      }
    })

    el('#add-product', root).addEventListener('click', () => {
      const p = createProduct({ category: 'Fika' })
      config.products.push(p)
      editingId = p.id
      renderProductList()
      sync()
      openProductSheet(p)
    })

    on(el('#product-list', root), 'click', '[data-action]', (_e, node) => {
      const id = node.dataset.id
      if (!id) return
      const action = node.dataset.action
      if (action === 'edit') {
        const p = config.products.find((x) => x.id === id)
        if (!p) return
        editingId = id
        openProductSheet(p)
      }
      if (action === 'remove') {
        config.products = config.products.filter((p) => p.id !== id)
        if (config.products.length === 0) {
          config.products.push(createProduct({ name: 'Kaffe', price: 20, category: 'Fika' }))
        }
        renderProductList()
        sync()
      }
    })

    el<HTMLButtonElement>('#copy-link', root).addEventListener('click', async () => {
      if (!isConfigReady(config)) return
      const ok = await copyKioskLink(config)
      showToast(ok ? 'Länk kopierad' : 'Kunde inte kopiera')
    })

    el('#show-link-qr', root).addEventListener('click', () => {
      if (!isConfigReady(config)) return
      openLinkQr()
    })
  }

  function renderProductList(): void {
    const list = el('#product-list', root)
    const count = root.querySelector('#product-count')
    if (count) count.textContent = `${config.products.length} stycken`

    list.innerHTML = config.products
      .map((p, i) => {
        const divider =
          i < config.products.length - 1 ? '<div class="row-divider"></div>' : ''
        return `
          <div class="product-item">
            <div class="product-item-main">
              <span class="product-item-emoji">${escapeHtml(p.emoji)}</span>
              <span>
                <strong>${escapeHtml(p.name || 'Namnlös')}</strong>
                <span class="mono price-line">${formatPrice(p.price || 0)}${p.fast ? ' · Snabb' : ''}${p.category ? ` · ${escapeHtml(p.category)}` : ''}</span>
              </span>
            </div>
            <div class="product-item-actions">
              <button type="button" class="btn-icon muted-btn" data-action="edit" data-id="${escapeHtml(p.id)}" aria-label="Redigera">${icon('edit')}</button>
              <button type="button" class="btn-icon muted-btn" data-action="remove" data-id="${escapeHtml(p.id)}" aria-label="Ta bort">${icon('trash')}</button>
            </div>
          </div>
          ${divider}
        `
      })
      .join('')
  }

  function openProductSheet(product: Product): void {
    const sheet = el('#product-sheet', root)
    sheet.hidden = false
    sheet.innerHTML = `
      <div class="sheet-backdrop" data-close></div>
      <div class="sheet-panel">
        <header class="sheet-head">
          <h2>${product.name ? 'Redigera produkt' : 'Ny produkt'}</h2>
          <button type="button" class="btn-icon" data-close aria-label="Stäng">${icon('close')}</button>
        </header>
        <div class="sheet-body">
          <label class="field">
            <span>Namn</span>
            <input id="p-name" type="text" maxlength="40" value="${escapeHtml(product.name)}" />
          </label>
          <label class="field">
            <span>Pris (kr)</span>
            <input id="p-price" class="mono" type="number" inputmode="decimal" min="0" step="1" value="${product.price || ''}" />
          </label>
          <label class="field">
            <span>Kategori</span>
            <input id="p-cat" type="text" list="cat-list" maxlength="24" value="${escapeHtml(product.category)}" placeholder="T.ex. Fika" />
            <datalist id="cat-list">
              ${CATEGORY_SUGGESTIONS.map((c) => `<option value="${c}"></option>`).join('')}
            </datalist>
          </label>
          <div class="field">
            <span>Ikon</span>
            <div class="emoji-picker" id="p-emojis">
              ${EMOJI_CHOICES.map(
                (e) =>
                  `<button type="button" class="emoji-chip${e === product.emoji ? ' active' : ''}" data-emoji="${e}">${e}</button>`,
              ).join('')}
            </div>
          </div>
          <label class="check-row">
            <input id="p-fast" type="checkbox" ${product.fast ? 'checked' : ''} />
            <span>Snabbköp — öppna Swish direkt</span>
          </label>
        </div>
        <footer class="sheet-foot">
          <button type="button" class="btn btn-primary btn-block" id="p-save">Spara</button>
        </footer>
      </div>
    `

    let emoji = product.emoji

    on(sheet, 'click', '[data-close]', () => closeSheet(sheet))
    on(el('#p-emojis', sheet), 'click', '[data-emoji]', (_e, node) => {
      emoji = node.dataset.emoji || '☕'
      sheet.querySelectorAll('.emoji-chip').forEach((c) => {
        c.classList.toggle('active', c === node)
      })
    })

    el('#p-save', sheet).addEventListener('click', () => {
      const target = config.products.find((p) => p.id === (editingId || product.id))
      if (!target) return
      target.name = el<HTMLInputElement>('#p-name', sheet).value
      target.price = Math.max(0, Number(el<HTMLInputElement>('#p-price', sheet).value) || 0)
      target.category = el<HTMLInputElement>('#p-cat', sheet).value
      target.emoji = emoji
      target.fast = el<HTMLInputElement>('#p-fast', sheet).checked
      closeSheet(sheet)
      renderProductList()
      sync()
    })
  }

  function openLinkQr(): void {
    const sheet = el('#qr-sheet', root)
    const url = kioskShareUrl(config)
    sheet.hidden = false
    sheet.innerHTML = `
      <div class="sheet-backdrop" data-close></div>
      <div class="sheet-panel">
        <header class="sheet-head">
          <h2>Kiosk-QR</h2>
          <button type="button" class="btn-icon" data-close aria-label="Stäng">${icon('close')}</button>
        </header>
        <div class="sheet-body center">
          <div class="pay-qr">${renderQrSvg(url)}</div>
          <p class="muted">Skanna för att öppna kiosken</p>
        </div>
      </div>
    `
    on(sheet, 'click', '[data-close]', () => closeSheet(sheet))
  }

  function closeSheet(sheet: HTMLElement): void {
    sheet.hidden = true
    sheet.replaceChildren()
  }

  function sync(updateUrl = true): void {
    if (updateUrl) writeRoute('edit', config, true)
    options.onChange?.(config)

    const ready = isConfigReady(config)
    const copyBtn = root.querySelector<HTMLButtonElement>('#copy-link')
    const qrBtn = root.querySelector<HTMLButtonElement>('#show-link-qr')
    if (copyBtn) copyBtn.disabled = !ready
    if (qrBtn) qrBtn.disabled = !ready
  }

  function showToast(message: string): void {
    const toast = el('#toast', root)
    toast.hidden = false
    toast.textContent = message
    toast.classList.add('show')
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('show')
      window.setTimeout(() => {
        toast.hidden = true
      }, 140)
    }, 1600)
  }
}
