import deals from '@/data/deals.json'
import { isDirectMerchantUrl, isSafeAffiliateUrl } from './affiliate'
import type { Deal } from './types'
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
export function getDeals(): Deal[] {
  return deals as Deal[]
}
