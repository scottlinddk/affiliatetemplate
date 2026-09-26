import 'server-only'
import { unstable_cache } from 'next/cache'
import demoProducts from '../data/products.json'
import {
  FeedError,
  MAX_FEED_BYTES,
  mergeCatalogProducts,
  parseFeedConfig,
  parsePartnerAdsFeed,
} from './feed'
import type { Catalog, Product } from './types'

const FEED_TIMEOUT_MS = 15_000
const demoCatalog: Product[] = demoProducts.map((product) => ({
  ...product,
  specs: Object.fromEntries(
    Object.entries(product.specs).filter(
      (entry) => typeof entry[1] === 'string',
    ),
  ),
}))

async function readFeed(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: 'application/xml, text/xml;q=0.9, text/plain;q=0.5' },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    redirect: 'error',
    cache: 'no-store',
  })
  if (!response.ok || !response.body)
    throw new FeedError('Feedet kunne ikke hentes.')
  const length = Number(response.headers.get('content-length'))
  if (Number.isFinite(length) && length > MAX_FEED_BYTES) {
    await response.body.cancel()
    throw new FeedError('Feedet overskrider størrelsesgrænsen.')
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_FEED_BYTES) {
        await reader.cancel()
        throw new FeedError('Feedet overskrider størrelsesgrænsen.')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  const prefix = new TextDecoder().decode(bytes.slice(0, 200))
  const declaredEncoding =
    response.headers
      .get('content-type')
      ?.match(/charset=["']?([a-z0-9-]+)/i)?.[1] ||
    prefix.match(/encoding=["']([^"']+)["']/i)?.[1] ||
    'utf-8'
  if (!/^(?:utf-8|utf8|iso-8859-1|windows-1252)$/i.test(declaredEncoding))
    throw new FeedError('Feedets tegnsæt understøttes ikke.')
  return new TextDecoder(declaredEncoding, { fatal: true }).decode(bytes)
}

// Cache the parsed result and its original fetch timestamp together. Repeated page
// requests must never make a stale price appear newly updated.
const getLiveCatalog = unstable_cache(
  async (rawConfig: string, partnerId: string): Promise<Catalog> => {
    const configs = parseFeedConfig(rawConfig)
    const results = await Promise.allSettled(
      configs.map(async (config) => {
        const xml = await readFeed(config.url)
        return parsePartnerAdsFeed(xml, config, {
          updatedAt: new Date().toISOString(),
          ...(partnerId ? { partnerId } : {}),
        })
      }),
    )
    const products: Product[] = []
    const warnings: string[] = []
    results.forEach((result) => {
      if (result.status === 'rejected') {
        warnings.push(
          `En forhandlers produkter kunne ikke indlæses. Prøv igen senere.`,
        )
        return
      }
      products.push(...result.value.products)
      if (result.value.rejectedRows > 0)
        warnings.push(
          `Nogle produkter kunne ikke vises, fordi oplysningerne var ufuldstændige.`,
        )
      if (result.value.products.length === 0)
        warnings.push(`En forhandler har ingen produkter tilgængelige lige nu.`)
    })
    return { products: mergeCatalogProducts(products), mode: 'live', warnings }
  },
  ['partner-ads-catalog-v1'],
  { revalidate: 3_600 },
)

export async function getCatalog(): Promise<Catalog> {
  const rawConfig = process.env.PARTNER_ADS_FEEDS
  if (rawConfig === undefined || rawConfig.trim() === '') {
    return { products: demoCatalog, mode: 'demo', warnings: [] }
  }
  const partnerId = process.env.PARTNER_ADS_PARTNER_ID?.trim() || ''
  try {
    parseFeedConfig(rawConfig)
    if (partnerId && !/^[1-9]\d{0,19}$/.test(partnerId))
      throw new FeedError('Ugyldigt partner-id.')
    return await getLiveCatalog(rawConfig, partnerId)
  } catch {
    // Deliberately avoid logging feed URLs or credentials, and never substitute demo offers.
    return {
      products: [],
      mode: 'live',
      warnings: ['Produktkataloget kunne ikke indlæses. Prøv igen senere.'],
    }
  }
}
