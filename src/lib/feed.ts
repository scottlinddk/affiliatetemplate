import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { buildAffiliateUrl, isSafeHttpUrl } from './affiliate'
import type { Product, Offer } from './types'

export const MAX_FEED_BYTES = 8 * 1024 * 1024
export const MAX_FEED_ROWS = 5_000
export const MAX_FEEDS = 8

export type FeedConfig = {
  url: string
  programId: string
  merchant: string
  approved: true
  /** Banner ID is a separate identifier from the advertiser program ID. */
  bannerId?: string
}

export type FeedParseOptions = {
  updatedAt: string
  partnerId?: string
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

/** Feed URLs are administrator-supplied, but avoid accidentally fetching local services. */
function validFeedUrl(value: unknown): value is string {
  const normalized = safeHttpUrl(value)
  if (!normalized) return false
  const url = new URL(normalized)
  const host = url.hostname.toLowerCase()
  return (
    url.protocol === 'https:' &&
    !url.hash &&
    host.includes('.') &&
    !host.endsWith('.localhost') &&
    !host.endsWith('.local') &&
    !host.endsWith('.internal') &&
    !/^\d+\.\d+\.\d+\.\d+$/.test(host) &&
    !host.includes(':')
  )
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
    if (
      row.approved !== true ||
      !validFeedUrl(row.url) ||
      !isPositiveId(row.programId) ||
      typeof row.merchant !== 'string' ||
      !plainText(row.merchant, 100) ||
      row.merchant.length > 100 ||
      (row.bannerId !== undefined && !isPositiveId(row.bannerId))
    ) {
      throw new FeedError(
        'Et feed mangler en HTTPS-adresse, program-id, forhandler eller bekræftet godkendelse.',
      )
    }
    return {
      url: row.url.trim(),
      programId: row.programId,
      merchant: plainText(row.merchant, 100),
      approved: true as const,
      ...(row.bannerId ? { bannerId: row.bannerId } : {}),
    }
  })
  if (new Set(feeds.map((feed) => feed.url)).size !== feeds.length)
    throw new FeedError('Det samme feed er angivet flere gange.')
  return feeds
}

/** Supports Danish comma decimals and explicitly grouped thousands without guessing malformed values. */
export function parseDanishPrice(value: unknown): number | undefined {
  if (typeof value === 'number')
    return Number.isFinite(value) && value >= 0 && value <= 100_000_000
      ? value
      : undefined
  if (typeof value !== 'string') return undefined
  let input = value
    .trim()
    .replace(/^(?:DKK|kr\.?)\s*/i, '')
    .replace(/\s*(?:DKK|kr\.?)$/i, '')
    .trim()
  input = input.replace(/[\u00a0\u202f]/g, ' ')
  if (/^\d{1,3}(?: \d{3})+(?:[,.]\d{1,2})?$/.test(input))
    input = input.replace(/ /g, '').replace(',', '.')
  else if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(input))
    input = input.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(input))
    input = input.replace(/,/g, '')
  else if (/^\d+(?:[,.]\d{1,2})?$/.test(input)) input = input.replace(',', '.')
  else return undefined
  const price = Number(input)
  return Number.isFinite(price) && price >= 0 && price <= 100_000_000
    ? price
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

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'oe')
      .replace(/å/g, 'aa')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70) || 'produkt'
  )
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

function parseStock(value: string): boolean | undefined {
  const stock = value
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
  if (/^\d+$/.test(stock)) return Number(stock) > 0
  if (
    [
      'true',
      'yes',
      'ja',
      'available',
      'in stock',
      'instock',
      'på lager',
      'paa lager',
      'lager',
    ].includes(stock)
  )
    return true
  if (
    [
      'false',
      'no',
      'nej',
      'unavailable',
      'not available',
      'out of stock',
      'outofstock',
      'ikke på lager',
      'ikke paa lager',
      'udsolgt',
      'backorder',
      'preorder',
      'forudbestilling',
    ].includes(stock)
  )
    return false
  return undefined
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

function normalizeRow(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return undefined
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key.toLowerCase(), entry]),
  )
}

function parseProduct(
  value: unknown,
  config: FeedConfig,
  options: FeedParseOptions,
): Product | undefined {
  const row = normalizeRow(value)
  if (!row) return undefined
  const get = (...keys: string[]): string => {
    for (const key of keys) {
      const value = row[key]
      if (
        (typeof value === 'string' && value.trim()) ||
        typeof value === 'number'
      )
        return String(value).trim()
    }
    return ''
  }
  const name = plainText(
    get('produktnavn', 'productname', 'name', 'title'),
    180,
  )
  const price = parseDanishPrice(get('pris', 'nypris', 'price'))
  const currency = get('valuta', 'currency').toUpperCase() || 'DKK'
  const inStock = parseStock(
    get('lagerstatus', 'instock', 'stock', 'availability'),
  )
  const image = safeHttpUrl(get('billedurl', 'imageurl', 'image', 'imagelink'))
  const links = resolveProductLinks(
    get('vareurl', 'produktlink', 'producturl', 'url', 'link'),
    config,
    options.partnerId,
  )
  if (
    !name ||
    price === undefined ||
    price <= 0 ||
    currency !== 'DKK' ||
    inStock === undefined ||
    !image ||
    !links
  )
    return undefined
  const shippingValue = get('fragtomk', 'fragt', 'shipping', 'shippingcost')
  const shipping = /^(?:gratis|fri fragt|free)$/i.test(shippingValue)
    ? 0
    : parseDanishPrice(shippingValue)
  if (shippingValue && shipping === undefined) return undefined
  const sourceId = get('produktid', 'productid', 'sku', 'id')
  const gtin = canonicalGtin(get('ean', 'gtin', 'upc'))
  const id = gtin
    ? `gtin-${gtin}`
    : `product-${stableHash(`${config.programId}:${sourceId || links.url}`)}`
  const specs: Record<string, string> = {}
  if (gtin) specs.EAN = gtin.replace(/^0(?=\d{13}$)/, '')
  for (const [label, keys] of [
    ['Farve', ['color', 'farve']],
    ['Størrelse', ['size', 'stoerrelse', 'størrelse']],
    ['Materiale', ['material', 'materiale']],
    ['Vægt', ['weight', 'vaegt', 'vægt']],
  ] as const) {
    const text = plainText(get(...keys), 100)
    if (text) specs[label] = text
  }
  const delivery = plainText(get('leveringstid', 'deliverytime'), 100)
  const offer: Offer = {
    id: `offer-${stableHash(`${config.programId}:${sourceId || links.url}`)}`,
    merchant: config.merchant,
    price,
    currency,
    ...(shipping !== undefined ? { shipping } : {}),
    inStock,
    ...links,
    programId: config.programId,
    updatedAt: options.updatedAt,
  }
  return {
    id,
    slug: `${slugify(name)}-${gtin || stableHash(id)}`,
    name,
    brand:
      plainText(get('brand', 'maerke', 'mærke', 'manufacturer'), 100) ||
      'Ukendt mærke',
    category:
      plainText(get('kategorinavn', 'category', 'kategori'), 100) || 'Øvrigt',
    description:
      plainText(get('produktbeskrivelse', 'beskrivelse', 'description')) ||
      name,
    image,
    imageAlt: name,
    features: [],
    specs: { ...specs, ...(delivery ? { Leveringstid: delivery } : {}) },
    offers: [offer],
    demo: false,
  }
}

export function parsePartnerAdsFeed(
  xml: string,
  config: FeedConfig,
  options: FeedParseOptions,
): { products: Product[]; rejectedRows: number; totalRows: number } {
  if (!Number.isFinite(Date.parse(options.updatedAt)))
    throw new FeedError('Feedets opdateringstidspunkt er ugyldigt.')
  if (new TextEncoder().encode(xml).length > MAX_FEED_BYTES)
    throw new FeedError('Feedet overskrider størrelsesgrænsen.')
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new FeedError(
      'Feedet indeholder ikke-understøttede XML-definitioner.',
    )
  // Apply the row bound before allocating parsed objects. Skip comments and
  // CDATA so descriptions containing example XML do not count as real rows.
  const tokens = /<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<produkt(?=[\s/>])/g
  let rowCount = 0
  for (const token of xml.matchAll(tokens)) {
    if (token[0].startsWith('<produkt') && ++rowCount > MAX_FEED_ROWS)
      throw new FeedError('Feedet indeholder for mange produkter.')
  }
  if (XMLValidator.validate(xml) !== true)
    throw new FeedError('Feedet er ikke gyldigt XML.')
  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
    processEntities: true,
  })
  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(xml) as Record<string, unknown>
  } catch {
    throw new FeedError('Feedet kunne ikke læses.')
  }
  const container = normalizeRow(parsed.produkter)
  if (!container)
    throw new FeedError('Feedet skal indeholde produkter/produkt.')
  const items = container.produkt
  const rows: unknown[] =
    items === undefined || items === ''
      ? []
      : Array.isArray(items)
        ? items
        : [items]
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
