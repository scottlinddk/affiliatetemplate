import { ImageResponse } from 'next/og'
import { site } from '@/config/site'
import { defaultTheme } from '@/lib/theme'
export const alt = `${site.name} – gode valg til din hverdag`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const dynamic = 'force-static'
export default function SocialImage() {
  const colors =
    defaultTheme.colors[defaultTheme.mode === 'dark' ? 'dark' : 'light']
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: 90,
        background: colors.secondary,
        color: colors.secondaryForeground,
      }}
    >
      <div style={{ fontSize: 34, marginBottom: 50 }}>{`${site.name}.`}</div>
      <div style={{ fontSize: 72, lineHeight: 1.15, maxWidth: 900 }}>
        Gode valg til en bedre hverdag.
      </div>
      <div style={{ fontSize: 26, marginTop: 40 }}>
        Produkter · Prissammenligning · Købsguides
      </div>
    </div>,
    size,
  )
}
