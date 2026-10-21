import { ImageResponse } from 'next/og';

export const alt = 'Welt & Grain — full-grain leather boots, shoes and bags';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default share image: the wordmark on white, like the site header. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#111' }}>
        <div style={{ fontSize: 110, fontWeight: 700, letterSpacing: 6, fontFamily: 'serif' }}>WELT &amp; GRAIN</div>
        <div style={{ width: 760, borderTop: '4px dashed #111', marginTop: 18 }} />
        <div style={{ fontSize: 26, letterSpacing: 14, marginTop: 18 }}>LEATHER CO.</div>
        <div style={{ fontSize: 34, marginTop: 70 }}>Full-Grain Leather. Honest Prices.</div>
      </div>
    ),
    size,
  );
}
