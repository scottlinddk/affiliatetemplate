import 'server-only'
import { createLinkMask } from '@scttlnd/linkmask'
import configuredBanners from '@/data/banners.json'
import { isDirectMerchantUrl } from './affiliate'
import { parseBanners } from './banners'
import { getCatalog } from './catalog'
import { getDeals, isActiveDeal } from './deals'
import { maskedHref, maskSlug } from './linkmask-paths'
import { getPrograms } from './programs'

export async function getLinkMask() {
  const catalog = await getCatalog()
  const links: Record<string, string> = {}
  function add(
    slug: string | undefined,
    item: { url: string; affiliateUrl?: string },
  ) {
    if (
      !slug ||
      !isDirectMerchantUrl(item.url) ||
      !item.affiliateUrl ||
      !maskedHref(slug, item.affiliateUrl)
    )
      return
    if (links[slug] && links[slug] !== item.affiliateUrl)
      throw new Error(`Conflicting LinkMask destinations for slug: ${slug}`)
    links[slug] = item.affiliateUrl
  }

  for (const product of catalog.products) {
    if (catalog.mode === 'demo' || product.demo) continue
    for (const offer of product.offers)
      add(maskSlug('offer', product.slug, offer.id), offer)
  }
  for (const deal of getDeals(catalog.mode))
    if (!deal.demo && isActiveDeal(deal)) add(maskSlug('deal', deal.id), deal)
  for (const program of getPrograms())
    add(maskSlug('program', program.id), program)
  for (const banner of parseBanners(configuredBanners))
    add(maskSlug('banner', banner.id), banner)

  // ponytail: rebuild this map per request; cache with catalog refresh if traffic requires it.
  return createLinkMask(links)
}
