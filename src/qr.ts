import { renderSVG } from 'uqr'

/** Render a Swish payload as an inline SVG string */
export function renderQrSvg(payload: string): string {
  return renderSVG(payload, {
    ecc: 'M',
    border: 2,
    pixelSize: 8,
    whiteColor: '#ffffff',
    blackColor: '#0a0a0a',
  })
}
