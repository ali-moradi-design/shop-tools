import { ImageResponse } from 'next/og';

export const alt = 'Toolbench Supply Co. — tools with the specs that matter';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default share image: the wordmark on white, like the site header. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#0f1114' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div style={{ width: 96, height: 96, background: '#ffc20e', border: '8px solid #0f1114', display: 'flex' }} />
          <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: 8 }}>TOOLBENCH</div>
        </div>
        <div style={{ fontSize: 30, letterSpacing: 10, marginTop: 14, color: '#6a727a' }}>SUPPLY CO. — TECH SPECS FIRST</div>
        <div style={{ fontSize: 38, marginTop: 64 }}>The right spec. In stock today.</div>
      </div>
    ),
    size,
  );
}
