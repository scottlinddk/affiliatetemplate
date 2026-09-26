import type { Offer, Product } from './types'

const DAY = 24 * 60 * 60 * 1000
const MAX_PRICE_AGE = 7 * DAY
const POSITIVE_ID = /^[1-9]\d*$/

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some(
    (character) =>
      character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
  )
}

/** Only absolute web URLs may be used in merchant links or remote images. */
export function isSafeHttpUrl(value: string): boolean {
  if (!value || hasControlCharacters(value)) return false
  try {
    const url = new URL(value)
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

/** DNS hostnames are case-insensitive and may carry a trailing root dot. */
export function isPartnerAdsHostname(hostname: string): boolean {
  const canonical = hostname.toLowerCase().replace(/\.+$/, '')
  return (
    canonical === 'partner-ads.com' || canonical.endsWith('.partner-ads.com')
  )
}

/** A consent-free destination must not itself be a Partner-ads tracking hop. */
export function isDirectMerchantUrl(value: string): boolean {
  return isSafeHttpUrl(value) && !isPartnerAdsHostname(new URL(value).hostname)
}

/** Affiliate destinations are optional, but must use an encrypted web URL. */
export function isSafeAffiliateUrl(value: string): boolean {
  return isSafeHttpUrl(value) && new URL(value).protocol === 'https:'
}

type AffiliateLinkOptions = {
  partnerId: string
  /** The deeplink banner ID supplied by Partner-ads, not the program ID. */
  bannerId: string
  url: string
  uid?: string
}

/** Generate links only for approved programs, and use them only after consent. */
export function buildAffiliateUrl({
  partnerId,
  bannerId,
  url,
  uid,
}: AffiliateLinkOptions): string | null {
  if (
    !POSITIVE_ID.test(partnerId) ||
    !POSITIVE_ID.test(bannerId) ||
    !isDirectMerchantUrl(url)
  )
    return null
  if (uid && hasControlCharacters(uid)) return null

  const params = new URLSearchParams({
    partnerid: partnerId,
    bannerid: bannerId,
  })
  if (uid?.trim()) params.set('uid', uid.trim())
  // Partner-ads requires uid/uid2 before htmlurl. Encoding also preserves the
  // merchant's query string and fragment as one complete destination value.
  params.set('htmlurl', new URL(url).href)
  return `https://www.partner-ads.com/dk/klikbanner.php?${params.toString()}`
}

export function getOfferStatus(
  offer: Offer,
  now = Date.now(),
): 'current' | 'stale' | 'unavailable' {
  if (!offer.inStock) return 'unavailable'
  const updatedAt = Date.parse(offer.updatedAt)
  if (
    !Number.isFinite(updatedAt) ||
    !Number.isFinite(now) ||
    updatedAt > now + DAY ||
    now - updatedAt > MAX_PRICE_AGE
  ) {
    return 'stale'
  }
  return 'current'
}

/** Compare known charges; callers must disclose when a shipping cost is absent. */
export function bestOffer(
  product: Product,
  now = Date.now(),
): Offer | undefined {
  return product.offers
    .filter(
      (offer) =>
        getOfferStatus(offer, now) === 'current' &&
        Number.isFinite(offer.price) &&
        offer.price >= 0 &&
        (offer.shipping === undefined ||
          (Number.isFinite(offer.shipping) && offer.shipping >= 0)),
    )
    .sort(
      (a, b) => a.price + (a.shipping ?? 0) - (b.price + (b.shipping ?? 0)),
    )[0]
}

/** A “Fra” price and base-price sorting must compare item prices, excluding delivery. */
export function lowestPriceOffer(
  product: Product,
  now = Date.now(),
): Offer | undefined {
  return product.offers
    .filter(
      (offer) =>
        offer.inStock &&
        (product.demo || getOfferStatus(offer, now) === 'current') &&
        Number.isFinite(offer.price) &&
        offer.price >= 0 &&
        isSafeHttpUrl(offer.url) &&
        (offer.shipping === undefined ||
          (Number.isFinite(offer.shipping) && offer.shipping >= 0)),
    )
    .sort((a, b) => a.price - b.price || a.id.localeCompare(b.id))[0]
}

export function formatPrice(value: number, currency = 'DKK'): string {
  if (!Number.isFinite(value)) return '—'
  try {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${new Intl.NumberFormat('da-DK', { maximumFractionDigits: 2 }).format(value)} ${currency}`
  }
}
