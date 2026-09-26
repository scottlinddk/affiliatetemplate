import type { CSSProperties } from 'react'
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: 'arrow' | 'search' | 'heart' | 'compare' | 'check' | 'leaf' | 'close'
  size?: number
  style?: CSSProperties
}) {
  const paths = {
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    heart:
      'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    compare: 'M5 20V10m7 10V4m7 16v-7',
    check: 'm5 12 4 4L19 6',
    leaf: 'M5 19C-3 8 10 1 21 3c0 14-7 20-16 16Zm0 0 10-9',
    close: 'm6 6 12 12M6 18 18 6',
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  )
}
