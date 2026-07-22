# Oskki

**Skapa. Dela. Sälj.**

Extremt lättviktig webbapp för föreningskiosker. Öppna en länk, tryck på produkter, visa Swish-QR — klart.

Ingen backend. Ingen databas. Ingen inloggning. All konfiguration ligger i URL:en.

## Kom igång

```bash
npm install
npm run dev
```

Bygg för produktion (GitHub Pages-vänlig, relativ `base`):

```bash
npm run build
```

Utdata hamnar i `dist/`.

## Så funkar det

1. **Konfigurera** — föreningsnamn, Swish, produkter (kategori, snabbköp). URL:en uppdateras automatiskt.
2. **Kopiera länk** — dela kiosklänken (`#/k/...`).
3. **Sälj** — tryck produkt → sticky cart → Swish-QR. Snabb-produkter hoppar direkt till Swish.

## Stack

- Vite + TypeScript
- Vanilla DOM + modern CSS
- `uqr` — lokal QR-generering
- `fflate` — komprimerar kioskdata i länken

Inga UI-ramverk. Inga externa fonts. Inga API-anrop.

## Länkformat

```
#/edit/<payload>   redigera
#/k/<payload>      kiosk / sälj
```

Payload = deflate(JSON) → Base64URL.
