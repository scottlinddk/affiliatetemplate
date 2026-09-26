import type { MetadataRoute } from 'next'
import { site } from '@/config/site'
export const dynamic = 'force-static'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      ...(process.env.PARTNER_ADS_FEEDS?.trim()
        ? { allow: '/', disallow: '/sammenlign' }
        : { disallow: '/' }),
    },
    sitemap: new URL('/sitemap.xml', site.url).href,
  }
}
