import { deflateSync, inflateSync } from 'fflate'

/**
 * Compress JSON → Base64URL for shareable kiosk links.
 *
 * Pipeline: JSON → UTF-8 → deflate → Base64URL
 * Prefix `1` = deflated, `0` = raw (fallback if deflate grows the payload).
 */

const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export function encodePayload(json: string): string {
  const bytes = new TextEncoder().encode(json)
  const compressed = deflateSync(bytes, { level: 9 })
  const useCompressed = compressed.length < bytes.length
  const payload = useCompressed ? compressed : bytes
  return (useCompressed ? '1' : '0') + bytesToBase64Url(payload)
}

export function decodePayload(encoded: string): string {
  if (!encoded) throw new Error('Tom länk')
  const flag = encoded[0]
  const body = encoded.slice(1)
  const bytes = base64UrlToBytes(body)
  const raw = flag === '1' ? inflateSync(bytes) : bytes
  return new TextDecoder().decode(raw)
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0
    const triple = (a << 16) | (b << 8) | c
    out += B64[(triple >> 18) & 63]
    out += B64[(triple >> 12) & 63]
    if (i + 1 < bytes.length) out += B64[(triple >> 6) & 63]
    if (i + 2 < bytes.length) out += B64[triple & 63]
  }
  return out
}

function base64UrlToBytes(b64: string): Uint8Array {
  const cleaned = b64.replace(/[^A-Za-z0-9\-_]/g, '')
  const len = cleaned.length
  const out = new Uint8Array(Math.floor((len * 3) / 4))
  let o = 0
  for (let i = 0; i < len; i += 4) {
    const a = idx(cleaned[i]!)
    const b = idx(cleaned[i + 1]!)
    const c = i + 2 < len ? idx(cleaned[i + 2]!) : 0
    const d = i + 3 < len ? idx(cleaned[i + 3]!) : 0
    const n = (a << 18) | (b << 12) | (c << 6) | d
    out[o++] = (n >> 16) & 255
    if (i + 2 < len) out[o++] = (n >> 8) & 255
    if (i + 3 < len) out[o++] = n & 255
  }
  return out.subarray(0, o)
}

function idx(ch: string): number {
  const n = B64.indexOf(ch)
  if (n < 0) throw new Error('Ogiltig länk')
  return n
}
