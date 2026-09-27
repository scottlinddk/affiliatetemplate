import deals from '@/data/deals.json'
import { isDirectMerchantUrl, isSafeAffiliateUrl } from './affiliate'
import type { Catalog, Deal } from './types'
export function isActiveDeal(deal: Deal, now = Date.now()): boolean {
  const start = Date.parse(deal.startsAt),
    end = Date.parse(deal.expiresAt)
  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start <= now &&
    end > now &&
    isDirectMerchantUrl(deal.url) &&
    (!deal.affiliateUrl || isSafeAffiliateUrl(deal.affiliateUrl))
  )
}
export function getDeals(mode: Catalog['mode']): Deal[] {
  return (deals as Deal[]).filter((deal) => mode === 'demo' || !deal.demo)
}
