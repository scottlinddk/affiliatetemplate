import 'server-only'
import { unstable_cache } from 'next/cache'
import demoProducts from '../data/products.json'
import {
  FeedError,
  mergeCatalogProducts,
  parseFeedConfig,
  parseFeedApiUrl,
} from './feed'
import { fetchPartnerAdsFeed } from './feed-client'
import type { Catalog, Product } from './types'

const demoCatalog: Product[] = demoProducts.map((product) => ({
  ...product,
  specs: Object.fromEntries(
    Object.entries(product.specs).filter(
      (entry) => typeof entry[1] === 'string',
    ),
  ),
}))

// Cache normalized products with the API cache timestamp, never the request time.
const getLiveCatalog = unstable_cache(
  async (
    apiUrl: string,
    rawConfig: string,
    partnerId: string,
  ): Promise<Catalog> => {
    const configs = parseFeedConfig(rawConfig)
    const results = await Promise.allSettled(
      configs.map((config) =>
        fetchPartnerAdsFeed(apiUrl, config, {
          ...(partnerId ? { partnerId } : {}),
        }),
      ),
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
  ['partner-ads-json-catalog-v2'],
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
    const apiUrl = parseFeedApiUrl(process.env.PARTNER_ADS_API_URL || '')
    if (partnerId && !/^[1-9]\d{0,19}$/.test(partnerId))
      throw new FeedError('Ugyldigt partner-id.')
    return await getLiveCatalog(apiUrl, rawConfig, partnerId)
  } catch {
    // Deliberately avoid logging feed URLs or credentials, and never substitute demo offers.
    return {
      products: [],
      mode: 'live',
      warnings: ['Produktkataloget kunne ikke indlæses. Prøv igen senere.'],
    }
  }
}
