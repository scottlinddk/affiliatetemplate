import type { MetadataRoute } from 'next'
import { absoluteSiteUrl, withBasePath } from '@/lib/paths'
export const dynamic = 'force-static'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      ...(process.env.PARTNER_ADS_FEEDS?.trim()
        ? { allow: withBasePath('/'), disallow: withBasePath('/sammenlign') }
        : { disallow: '/' }),
    },
    sitemap: absoluteSiteUrl('/sitemap.xml'),
  }
}
