import { buildAffiliateUrl, isSafeHttpUrl } from './affiliate'
import type { Product, Offer } from './types'

export const MAX_FEED_BYTES = 8 * 1024 * 1024
export const MAX_FEED_ROWS = 5_000
export const MAX_FEEDS = 8

export type FeedConfig = {
  /** Partner-ads feed extract ID, separate from the advertiser program ID. */
  rid: string
  programId: string
  merchant: string
  approved: true
  /** The JSON API does not expose currency; explicitly confirm a DKK extract. */
  currency: 'DKK'
  /** Banner ID is a separate identifier from the advertiser program ID. */
  bannerId?: string
}

export type FeedParseOptions = {
  updatedAt: string
  partnerId?: string
}

export type FeedResult = {
  products: Product[]
  rejectedRows: number
  totalRows: number
}

export class FeedError extends Error {}

/** Absolute web URLs only. Never pass untrusted protocols into a link or image. */
export function safeHttpUrl(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    value.length > 8_192 ||
    !isSafeHttpUrl(value)
  )
    return undefined
  try {
    const url = new URL(value.trim())
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      !url.hostname
    )
      return undefined
    return url.href
  } catch {
    return undefined
  }
}

function isPositiveId(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value)
}

/** This administrator-controlled service may run on localhost or a private network. */
export function parseFeedApiUrl(value: string): string {
  const normalized = safeHttpUrl(value)
  if (!normalized)
    throw new FeedError('Angiv PARTNER_ADS_API_URL til JSON-feedets API.')
  const url = new URL(normalized)
  if (url.search || url.hash || /[?#]/.test(value))
    throw new FeedError('API-adressen må ikke indeholde query eller fragment.')
  return url.href.replace(/\/+$/, '')
}

export function parseFeedConfig(raw: string): FeedConfig[] {
  if (raw.length > 65_536)
    throw new FeedError('Feed-konfigurationen er for stor.')
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new FeedError('Feed-konfigurationen er ikke gyldig JSON.')
  }
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_FEEDS) {
    throw new FeedError(`Angiv mellem 1 og ${MAX_FEEDS} godkendte feeds.`)
  }
  const feeds = value.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      throw new FeedError('Et feed mangler gyldige indstillinger.')
    const row = entry as Record<string, unknown>
    if ('url' in row)
      throw new FeedError(
        'Erstat feedets url med rid og angiv PARTNER_ADS_API_URL til partner-ads-json-feed.',
      )
    if (
      row.approved !== true ||
      typeof row.rid !== 'string' ||
      !/^\d{1,100}$/.test(row.rid) ||
      !isPositiveId(row.programId) ||
      row.currency !== 'DKK' ||
      typeof row.merchant !== 'string' ||
      !plainText(row.merchant, 100) ||
      row.merchant.length > 100 ||
      (row.bannerId !== undefined && !isPositiveId(row.bannerId))
    ) {
      throw new FeedError(
        'Et feed mangler rid, program-id, forhandler, DKK-valuta eller bekræftet godkendelse.',
      )
    }
    return {
      rid: row.rid,
      programId: row.programId,
      merchant: plainText(row.merchant, 100),
      approved: true as const,
      currency: 'DKK' as const,
      ...(row.bannerId ? { bannerId: row.bannerId } : {}),
    }
  })
  if (new Set(feeds.map((feed) => feed.rid)).size !== feeds.length)
    throw new FeedError('Det samme feed er angivet flere gange.')
  return feeds
}

/** Normalization belongs to the API; never coerce null or text into a price. */
function jsonPrice(value: unknown): number | undefined {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100_000_000
    ? value
    : undefined
}

function plainText(value: unknown, maxLength = 1_800): string {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function stableHash(value: string): string {
  let a = 2166136261
  let b = 2246822519
  for (let index = 0; index < value.length; index += 1) {
    a = Math.imul(a ^ value.charCodeAt(index), 16777619)
    b = Math.imul(b ^ value.charCodeAt(index), 3266489917)
  }
  return (a >>> 0).toString(36) + (b >>> 0).toString(36)
}

/** GTIN check digits prevent accidentally grouping unrelated malformed EANs. */
function canonicalGtin(value: string): string | undefined {
  const code = value.replace(/[\s-]/g, '')
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code) || /^0+$/.test(code))
    return undefined
  const digits = code.slice(0, -1).split('').reverse()
  const sum = digits.reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1),
    0,
  )
  if ((10 - (sum % 10)) % 10 !== Number(code.at(-1))) return undefined
  return code.padStart(14, '0')
}

function partnerAdsHost(host: string): boolean {
  const canonical = host.toLowerCase().replace(/\.+$/, '')
  return (
    canonical === 'partner-ads.com' || canonical.endsWith('.partner-ads.com')
  )
}

/** Partner-ads may append htmlurl without encoding its embedded query string. */
export function resolveProductLinks(
  value: unknown,
  config: FeedConfig,
  partnerId?: string,
): { url: string; affiliateUrl?: string } | undefined {
  const normalized = safeHttpUrl(value)
  if (!normalized || (partnerId !== undefined && !isPositiveId(partnerId)))
    return undefined
  const parsed = new URL(normalized)
  if (partnerAdsHost(parsed.hostname)) {
    if (
      !['partner-ads.com', 'www.partner-ads.com'].includes(
        parsed.hostname.toLowerCase().replace(/\.+$/, ''),
      ) ||
      parsed.protocol !== 'https:' ||
      parsed.pathname !== '/dk/klikbanner.php'
    )
      return undefined
    const marker = /[?&]htmlurl=/i.exec(normalized)
    if (!marker || marker.index === undefined) return undefined
    if (
      normalized.indexOf('#') !== -1 &&
      normalized.indexOf('#') < marker.index
    )
      return undefined
    const tracking = new URL(normalized.slice(0, marker.index))
    const banner = tracking.searchParams.get('bannerid')
    const partner = tracking.searchParams.get('partnerid')
    if (
      !isPositiveId(banner) ||
      !isPositiveId(partner) ||
      (partnerId && partner !== partnerId) ||
      tracking.searchParams.getAll('bannerid').length !== 1 ||
      tracking.searchParams.getAll('partnerid').length !== 1
    )
      return undefined
    let destination = normalized.slice(marker.index + marker[0].length)
    if (/^https?%3a%2f%2f/i.test(destination)) {
      try {
        destination = decodeURIComponent(destination)
      } catch {
        return undefined
      }
    }
    const url = safeHttpUrl(destination)
    if (!url || partnerAdsHost(new URL(url).hostname)) return undefined
    return { url, affiliateUrl: normalized }
  }
  const affiliateUrl =
    partnerId && config.bannerId
      ? buildAffiliateUrl({
          partnerId,
          bannerId: config.bannerId,
          url: normalized,
        })
      : null
  return { url: normalized, ...(affiliateUrl ? { affiliateUrl } : {}) }
}

function jsonObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return undefined
  return value as Record<string, unknown>
}

function parseProduct(
  value: unknown,
  config: FeedConfig,
  options: FeedParseOptions,
): Product | undefined {
  const row = jsonObject(value)
  if (!row) return undefined
  const name = plainText(row.name, 180)
  const price = jsonPrice(row.price)
  const inStock = row.inStock
  const image = safeHttpUrl(row.imageUrl)
  const links = resolveProductLinks(row.productUrl, config, options.partnerId)
  if (
    !name ||
    price === undefined ||
    price <= 0 ||
    (row.currency !== undefined && row.currency !== config.currency) ||
    typeof inStock !== 'boolean' ||
    !image ||
    !links
  )
    return undefined
  const shipping = jsonPrice(row.shippingCost)
  if (row.shippingCost != null && shipping === undefined) return undefined
  // Keep source IDs as strings, including leading zeroes.
  if (typeof row.id !== 'string' || typeof row.ean !== 'string')
    return undefined
  const sourceId = row.id.trim()
  const gtin = canonicalGtin(row.ean)
  // Product URLs and display names can change; require a durable identity.
  if (!gtin && !sourceId) return undefined
  const id = gtin
    ? `gtin-${gtin}`
    : `product-${stableHash(`${config.programId}:${sourceId}`)}`
  const specs: Record<string, string> = {}
  if (gtin) specs.EAN = gtin.replace(/^0(?=\d{13}$)/, '')
  for (const [label, key] of [
    ['Farve', 'color'],
    ['Størrelse', 'size'],
    ['Køn', 'gender'],
  ] as const) {
    const text = plainText(row[key], 100)
    if (text) specs[label] = text
  }
  const delivery = plainText(row.deliveryTime, 100)
  const offer: Offer = {
    id: `offer-${stableHash(`${config.programId}:${sourceId || links.url}`)}`,
    merchant: config.merchant,
    price,
    currency: config.currency,
    ...(shipping !== undefined ? { shipping } : {}),
    inStock,
    ...links,
    programId: config.programId,
    updatedAt: options.updatedAt,
  }
  return {
    id,
    slug: id,
    name,
    brand: plainText(row.brand, 100) || 'Ukendt mærke',
    category: plainText(row.category, 100) || 'Øvrigt',
    description: plainText(row.description) || name,
    image,
    imageAlt: name,
    features: [],
    specs: { ...specs, ...(delivery ? { Leveringstid: delivery } : {}) },
    offers: [offer],
    demo: false,
  }
}

export function parsePartnerAdsFeed(
  rows: unknown[],
  config: FeedConfig,
  options: FeedParseOptions,
): FeedResult {
  if (!Number.isFinite(Date.parse(options.updatedAt)))
    throw new FeedError('Feedets opdateringstidspunkt er ugyldigt.')
  if (!Array.isArray(rows))
    throw new FeedError('JSON-feedet skal indeholde en produktliste.')
  if (rows.length > MAX_FEED_ROWS)
    throw new FeedError('Feedet indeholder for mange produkter.')
  const products: Product[] = []
  let rejectedRows = 0
  for (const row of rows) {
    const product = parseProduct(row, config, options)
    if (product) products.push(product)
    else rejectedRows += 1
  }
  return {
    products: mergeCatalogProducts(products),
    rejectedRows,
    totalRows: rows.length,
  }
}

/** Only validated matching GTINs or matching source product IDs are combined. */
export function mergeCatalogProducts(products: Product[]): Product[] {
  const groups = new Map<string, Product>()
  const ordered = [...products].sort(
    (a, b) =>
      a.id.localeCompare(b.id) ||
      a.name.localeCompare(b.name) ||
      a.offers[0].merchant.localeCompare(b.offers[0].merchant),
  )
  for (const product of ordered) {
    const existing = groups.get(product.id)
    if (!existing) {
      groups.set(product.id, { ...product, offers: [...product.offers] })
      continue
    }
    for (const offer of product.offers) {
      const duplicate = existing.offers.findIndex(
        (current) => current.id === offer.id,
      )
      if (duplicate === -1) existing.offers.push(offer)
      else if (
        Date.parse(offer.updatedAt) >
        Date.parse(existing.offers[duplicate].updatedAt)
      )
        existing.offers[duplicate] = offer
    }
  }
  return [...groups.values()].map((product) => ({
    ...product,
    offers: product.offers.sort(
      (a, b) =>
        Number(b.inStock) - Number(a.inStock) ||
        a.price + (a.shipping ?? 0) - (b.price + (b.shipping ?? 0)) ||
        a.merchant.localeCompare(b.merchant),
    ),
  }))
}
