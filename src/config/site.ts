import type { CrawlerPolicy } from '../lib/crawlers'
import { absoluteSiteUrl } from '@/lib/paths'

export const site = {
  // A template showcase can use real products while remaining outside search indexes.
  showcase: process.env.NEXT_PUBLIC_TEMPLATE_SHOWCASE === 'true',
  name: 'Velvalgt',
  tagline: 'Gode valg. Mere hverdagsglæde.',
  description:
    'Find produkter til en bedre hverdag. Sammenlign priser, udforsk vores købsguides, og find det, der passer til dig.',
  url: absoluteSiteUrl('/'),
  locale: 'da-DK',
  language: 'da',
  currency: 'DKK',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
  publisher: process.env.NEXT_PUBLIC_PUBLISHER_NAME || 'Velvalgt (demo)',
  affiliateDisclosure:
    'Reklame: Siden indeholder reklamelinks. Vi kan modtage provision, når du handler via et link.',
  priceDisclaimer:
    'Priser og lagerstatus kan ændre sig. Den aktuelle pris og eventuelle leveringsomkostninger fremgår hos forhandleren.',
  maxPriceAgeDays: 7,
  // Per-site crawl choices; demo mode always blocks every crawler.
  crawlers: {
    'OAI-SearchBot': true,
    PerplexityBot: true,
    GPTBot: false,
    // This token controls Gemini grounding as well as training.
    'Google-Extended': false,
  } satisfies CrawlerPolicy,
  llmsTxt: true,
}
