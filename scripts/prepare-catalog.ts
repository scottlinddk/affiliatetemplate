import { getOfferStatus } from '../src/lib/affiliate'
import { fetchPartnerAdsFeed } from '../src/lib/feed-client'
import {
  mergeCatalogProducts,
  parseFeedApiUrl,
  parseFeedConfig,
} from '../src/lib/feed'
import type { Catalog } from '../src/lib/types'

/** Fetch once before static generation; every route must see the same complete catalog. */
export async function prepareCatalog(
  settings: { feeds: string; apiUrl: string; partnerId?: string },
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<Catalog> {
  const configs = parseFeedConfig(settings.feeds)
  const apiUrl = parseFeedApiUrl(settings.apiUrl)
  const partnerId = settings.partnerId?.trim()
  if (partnerId && !/^[1-9]\d{0,19}$/.test(partnerId))
    throw new Error('Invalid partner ID for the catalog export.')
  const results = await Promise.all(
    configs.map((config) =>
      fetchPartnerAdsFeed(
        apiUrl,
        config,
        { ...(partnerId ? { partnerId } : {}) },
        fetcher,
      ),
    ),
  )
  for (const result of results) {
    if (!result.products.length)
      throw new Error(
        'A configured feed has no valid products. Keeping the previously published site.',
      )
    // A fresh out-of-stock update is valid and must replace the old stock status.
    // Check timestamp freshness independently of availability.
    if (
      result.products.some((product) =>
        product.offers.some(
          (offer) =>
            getOfferStatus({ ...offer, inStock: true }, now) !== 'current',
        ),
      )
    )
      throw new Error(
        'A configured feed has stale or invalid timestamps. Keeping the previously published site.',
      )
  }
  const rejectedRows = results.reduce(
    (total, result) => total + result.rejectedRows,
    0,
  )
  return {
    products: mergeCatalogProducts(
      results.flatMap((result) => result.products),
    ),
    mode: 'live',
    warnings: rejectedRows
      ? [
          'Nogle produkter kunne ikke vises, fordi oplysningerne var ufuldstændige.',
        ]
      : [],
  }
}
