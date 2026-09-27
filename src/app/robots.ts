import type { MetadataRoute } from 'next'
import { site } from '@/config/site'
import { buildRobots } from '@/lib/crawlers'
export const dynamic = 'force-static'
export default function robots(): MetadataRoute.Robots {
  return buildRobots(
    Boolean(process.env.PARTNER_ADS_FEEDS?.trim()) && !site.showcase,
    site.url,
    site.crawlers,
  )
}
