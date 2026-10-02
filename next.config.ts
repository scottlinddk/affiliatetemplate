import type { NextConfig } from 'next'
import { normalizeBasePath } from './src/lib/paths'

const staticExport = process.env.STATIC_EXPORT === 'true'

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  basePath: normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH),
  // Static hosts cannot serve redirects. Omit server-only routes and compile
  // the same choice into client links so exports never point at missing routes.
  pageExtensions: [
    'tsx',
    'ts',
    'jsx',
    'js',
    ...(staticExport ? [] : ['server.ts']),
  ],
  env: { NEXT_PUBLIC_LINKMASK_ENABLED: String(!staticExport) },
  ...(staticExport ? { output: 'export', trailingSlash: true } : {}),
  // Feed images must remain on the advertiser's host.
  images: { unoptimized: true },
  // Image validation uses dynamic paths. Include only public assets in server
  // deployments so revalidation can check them without tracing the whole repo.
  outputFileTracingIncludes: { '/*': ['./public/**/*'] },
}
export default config
