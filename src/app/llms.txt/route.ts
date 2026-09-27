import { site } from '@/config/site'
import { getGuides } from '@/lib/guides'
import { contentPath } from '@/lib/content-paths'
import { buildLlmsText } from '@/lib/crawlers'

export const dynamic = 'force-static'

export function GET() {
  if (!site.llmsTxt || !process.env.PARTNER_ADS_FEEDS?.trim()) {
    return new Response('Not found\n', { status: 404 })
  }
  return new Response(
    buildLlmsText(
      site,
      getGuides().map((article) => ({
        title: article.title,
        description: article.description,
        path: contentPath(article),
      })),
    ),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  )
}
