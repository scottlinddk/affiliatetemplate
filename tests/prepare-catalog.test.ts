import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareCatalog } from '../scripts/prepare-catalog'
import type { FeedConfig } from '../src/lib/feed'
import { getOfferStatus, lowestPriceOffer } from '../src/lib/affiliate'

const now = Date.parse('2026-09-27T12:00:00.000Z')
const cachedAt = '2026-09-27T09:00:00.000Z'
const configs: FeedConfig[] = [
  { rid: '1001', merchant: 'Første butik', approved: true, currency: 'DKK' },
  { rid: '1002', merchant: 'Anden butik', approved: true, currency: 'DKK' },
]
const settings = {
  feeds: JSON.stringify(configs),
  apiUrl: 'https://feeds.example',
  partnerId: '456',
}

function product(id: number, fields: Record<string, unknown> = {}) {
  return {
    id: `p${id}`,
    name: `Produkt ${id}`,
    category: 'Bolig',
    brand: 'Test',
    ean: '',
    description: 'Produkt fra forhandleren.',
    price: 199,
    shippingCost: null,
    inStock: true,
    imageUrl: `https://merchant.example/p${id}.jpg`,
    productUrl: `https://merchant.example/p${id}`,
    ...fields,
  }
}

function pageResponse(
  rid: string,
  rows: unknown[],
  page: number,
  timestamp = cachedAt,
) {
  const totalPages = Math.max(1, Math.ceil(rows.length / 100))
  return Response.json({
    data: rows.slice((page - 1) * 100, page * 100),
    pagination: {
      page,
      limit: 100,
      total: rows.length,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    meta: { rid, cachedAt: timestamp, fromCache: true },
  })
}

function request(input: Parameters<typeof fetch>[0]) {
  const url = new URL(String(input))
  return {
    rid: url.pathname.split('/').at(-1)!,
    page: Number(url.searchParams.get('page')),
  }
}

test('static preparation includes every page and feed, merges shared products and retains source timestamps', async () => {
  const firstRows = Array.from({ length: 101 }, (_, id) => product(id))
  firstRows[100].ean = '4006381333931'
  const secondRows = [product(0, { ean: '4006381333931', price: 179 })]
  const secondCachedAt = '2026-09-27T10:00:00.000Z'
  const requests: string[] = []
  const result = await prepareCatalog(
    settings,
    async (input) => {
      const { rid, page } = request(input)
      requests.push(`${rid}:${page}`)
      return pageResponse(
        rid,
        rid === '1001' ? firstRows : secondRows,
        page,
        rid === '1001' ? cachedAt : secondCachedAt,
      )
    },
    now,
  )

  assert.deepEqual(requests.sort(), ['1001:1', '1001:2', '1002:1'])
  assert.equal(result.mode, 'live')
  assert.equal(result.products.length, 101)
  assert.deepEqual(result.warnings, [])
  const shared = result.products.find(
    (item) => item.slug === 'gtin-04006381333931',
  )!
  assert.ok(shared)
  assert.equal(shared.offers.length, 2)
  for (const item of result.products) {
    assert.equal(item.demo, false)
    for (const offer of item.offers) {
      assert.equal(
        offer.updatedAt,
        offer.merchant === 'Første butik' ? cachedAt : secondCachedAt,
      )
    }
  }
  assert.ok(shared.offers.some((offer) => offer.url.endsWith('/p100')))
})

test('a failed later page in any required feed rejects instead of publishing a partial snapshot', async () => {
  for (const failingRid of ['1001', '1002']) {
    const requests: string[] = []
    await assert.rejects(
      prepareCatalog(
        settings,
        async (input) => {
          const { rid, page } = request(input)
          requests.push(`${rid}:${page}`)
          if (rid === failingRid && page === 2)
            throw new Error(
              'Private upstream URL and credentials must stay hidden',
            )
          return pageResponse(
            rid,
            rid === failingRid
              ? Array.from({ length: 101 }, (_, id) => product(id))
              : [product(0)],
            page,
          )
        },
        now,
      ),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.doesNotMatch(error.message, /Private|credentials/)
        return true
      },
    )
    assert.ok(requests.includes(`${failingRid}:2`))
    assert.ok(requests.includes(`${failingRid === '1001' ? '1002' : '1001'}:1`))
  }
})

test('every required feed must have valid products with fresh timestamps', async () => {
  const cases = [
    { label: 'empty', rows: [] },
    { label: 'all rows rejected', rows: [product(0, { price: null })] },
    {
      label: 'stale',
      rows: [product(0)],
      timestamp: '2026-09-19T12:00:00.000Z',
    },
    {
      label: 'future',
      rows: [product(0)],
      timestamp: '2026-09-29T12:00:00.000Z',
    },
    {
      label: 'stale and out of stock',
      rows: [product(0, { inStock: false })],
      timestamp: '2026-09-19T12:00:00.000Z',
    },
  ]
  for (const scenario of cases) {
    await assert.rejects(
      prepareCatalog(
        settings,
        async (input) => {
          const { rid, page } = request(input)
          return pageResponse(
            rid,
            rid === '1001' ? [product(0)] : scenario.rows,
            page,
            rid === '1001' ? cachedAt : scenario.timestamp,
          )
        },
        now,
      ),
      /A configured feed has no valid products|stale or invalid timestamps/,
      scenario.label,
    )
  }
})

test('fresh feeds with every product out of stock publish unavailable statuses', async () => {
  const result = await prepareCatalog(
    settings,
    async (input) => {
      const { rid, page } = request(input)
      return pageResponse(rid, [product(0, { inStock: false })], page)
    },
    now,
  )
  assert.equal(result.mode, 'live')
  assert.equal(result.products.length, 2)
  assert.deepEqual(result.warnings, [])
  for (const item of result.products) {
    assert.equal(lowestPriceOffer(item, now), undefined)
    for (const offer of item.offers) {
      assert.equal(offer.inStock, false)
      assert.equal(offer.updatedAt, cachedAt)
      assert.equal(getOfferStatus(offer, now), 'unavailable')
    }
  }
})

test('malformed partner IDs stop static preparation before any upstream request', async () => {
  let calls = 0
  for (const partnerId of [
    '0',
    '-1',
    'partner-456',
    '456&other=1',
    '1'.repeat(21),
  ]) {
    await assert.rejects(
      prepareCatalog(
        { ...settings, partnerId },
        async () => {
          calls += 1
          return pageResponse('1001', [product(0)], 1)
        },
        now,
      ),
      /Invalid partner ID/,
    )
  }
  assert.equal(calls, 0)
})

test('partially invalid rows produce one warning while retaining all valid products', async () => {
  const result = await prepareCatalog(
    settings,
    async (input) => {
      const { rid, page } = request(input)
      return pageResponse(
        rid,
        [product(0), product(1, { price: null }), null],
        page,
      )
    },
    now,
  )
  assert.equal(result.products.length, 2)
  assert.equal(result.warnings.length, 1)
  assert.match(result.warnings[0], /ufuldstændige/)
  assert.deepEqual(
    result.products.flatMap((item) =>
      item.offers.map((offer) => offer.updatedAt),
    ),
    [cachedAt, cachedAt],
  )
})
