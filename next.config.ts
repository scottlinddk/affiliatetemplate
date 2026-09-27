import type { NextConfig } from 'next'
import { normalizeBasePath } from './src/lib/paths'

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  basePath: normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH),
  ...(process.env.STATIC_EXPORT === 'true'
    ? { output: 'export', trailingSlash: true }
    : {}),
  // Feed images must remain on the advertiser's host.
  images: { unoptimized: true },
  // Image validation uses dynamic paths. Include only public assets in server
  // deployments so revalidation can check them without tracing the whole repo.
  outputFileTracingIncludes: { '/*': ['./public/**/*'] },
}
export default config
