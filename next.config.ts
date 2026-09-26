import type { NextConfig } from 'next'

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  ...(process.env.STATIC_EXPORT === 'true'
    ? { output: 'export', trailingSlash: true }
    : {}),
  // Feed images must remain on the advertiser's host.
  images: { unoptimized: true },
}
export default config
