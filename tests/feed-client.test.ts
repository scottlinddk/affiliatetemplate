import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchPartnerAdsFeed } from '../src/lib/feed-client'
import { FeedError, MAX_FEED_BYTES, type FeedConfig } from '../src/lib/feed'

const apiUrl = 'https://feeds.example/services/partner-ads/'
const cachedAt = '2026-09-25T10:00:00.000Z'
const config: FeedConfig = {
  rid: '001234',
  programId: '123',
  merchant: 'Testforhandler',
  approved: true,
  currency: 'DKK',
}

function product(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `p${id}`,
    name: `Kaffemaskine ${id}`,
    retailer: 'Testforhandler',
    category: 'Kaffe',
    brand: 'Test',
    ean: '',
    description: 'En kaffemaskine til hverdagen.',
    price: 1299.95,
    originalPrice: null,
    shippingCost: null,
    stock: 'instock',
    inStock: true,
    imageUrl: `https://merchant.example/p${id}.jpg`,
    productUrl: `https://merchant.example/p${id}`,
    deliveryTime: '1-3 dage',
    ...overrides,
  }
}

function envelope(
  rows: unknown[],
  page = 1,
  overrides: {
    pagination?: Record<string, unknown>
    meta?: Record<string, unknown>
  } = {},
) {
  const totalPages = Math.max(1, Math.ceil(rows.length / 100))
  return {
    data: rows.slice((page - 1) * 100, page * 100),
    pagination: {
      page,
      limit: 100,
      total: rows.length,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      ...overrides.pagination,
    },
    meta: {
      rid: config.rid,
      cachedAt,
      cacheExpiresAt: '2026-09-25T11:00:00.000Z',
      fromCache: true,
      ...overrides.meta,
    },
  }
}

function json(value: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  })
}

test('loads all pages, merges a second-page match, and retains API price age and unknown shipping', async () => {
  const rows = Array.from({ length: 102 }, (_, index) => product(index))
  rows[0].ean = '4006381333931'
  rows[100].ean = '4006381333931'
  rows[101] = product(101, { price: null })
  const requests: { url: URL; options?: RequestInit }[] = []
  const fetcher: typeof fetch = async (input, options) => {
    const url = new URL(String(input))
    requests.push({ url, options })
    return json(envelope(rows, Number(url.searchParams.get('page'))))
  }

  const result = await fetchPartnerAdsFeed(apiUrl, config, {}, fetcher)

  assert.equal(result.totalRows, 102)
  assert.equal(result.rejectedRows, 1)
  assert.equal(result.products.length, 100)
  const combined = result.products.find((entry) => entry.offers.length === 2)
  assert.ok(combined)
  assert.ok(combined.offers.some((offer) => offer.url.endsWith('/p100')))
  for (const item of result.products) {
    for (const offer of item.offers) {
      assert.equal(offer.updatedAt, cachedAt)
      assert.equal(offer.shipping, undefined)
    }
  }
  assert.deepEqual(
    requests.map(({ url }) => [url.pathname, url.search]),
    [
      ['/services/partner-ads/api/feed/001234', '?page=1&limit=100'],
      ['/services/partner-ads/api/feed/001234', '?page=2&limit=100'],
    ],
  )
  for (const { options } of requests) {
    assert.equal(options?.redirect, 'error')
    assert.equal(options?.cache, 'no-store')
    assert.equal(
      new Headers(options?.headers).get('accept'),
      'application/json',
    )
    assert.ok(options?.signal instanceof AbortSignal)
  }
  assert.equal(requests[0].options?.signal, requests[1].options?.signal)
})

test('a valid empty feed is read once and yields no rejected rows', async () => {
  let calls = 0
  const result = await fetchPartnerAdsFeed(apiUrl, config, {}, async () => {
    calls += 1
    return json(envelope([]))
  })
  assert.deepEqual(result, { products: [], rejectedRows: 0, totalRows: 0 })
  assert.equal(calls, 1)
})

test('accepts all 50 pages at the row limit and reads the final product', async () => {
  const rows: unknown[] = Array.from({ length: 5000 }, () => null)
  rows[4999] = product(4999)
  let calls = 0
  const result = await fetchPartnerAdsFeed(
    apiUrl,
    config,
    {},
    async (input) => {
      calls += 1
      const page = Number(new URL(String(input)).searchParams.get('page'))
      return json(envelope(rows, page))
    },
  )
  assert.equal(calls, 50)
  assert.equal(result.totalRows, 5000)
  assert.equal(result.rejectedRows, 4999)
  assert.equal(result.products.length, 1)
  assert.ok(result.products[0].offers[0].url.endsWith('/p4999'))
})

test('a failed last page rejects the whole feed without exposing upstream details', async () => {
  const rows = Array.from({ length: 101 }, (_, index) => product(index))
  let calls = 0
  await assert.rejects(
    fetchPartnerAdsFeed(apiUrl, config, {}, async () => {
      if (++calls === 1) return json(envelope(rows))
      throw new Error('Failed https://feeds.example/private?token=secret')
    }),
    (error: unknown) => {
      assert.ok(error instanceof FeedError)
      assert.doesNotMatch(error.message, /secret|https:|token/)
      return true
    },
  )
  assert.equal(calls, 2)
})

test('rejects clamped, incomplete, malformed and oversized pagination', async () => {
  const rows = [product(0)]
  const cases = [
    { page: 0 },
    { page: 2 },
    { limit: 20 },
    { total: -1 },
    { total: 0.5 },
    { total: '1' },
    { total: 2 },
    { total: 5001, totalPages: 51, hasNext: true },
    { totalPages: 0 },
    { totalPages: 2 },
    { hasNext: true },
    { hasPrev: true },
  ]
  for (const pagination of cases) {
    await assert.rejects(
      fetchPartnerAdsFeed(apiUrl, config, {}, async () =>
        json(envelope(rows, 1, { pagination })),
      ),
      FeedError,
      JSON.stringify(pagination),
    )
  }
  const malformed = [
    null,
    [],
    {},
    { data: rows },
    { ...envelope(rows), data: {} },
  ]
  for (const value of malformed)
    await assert.rejects(
      fetchPartnerAdsFeed(apiUrl, config, {}, async () => json(value)),
      FeedError,
    )
})

test('rejects invalid cache metadata instead of inventing a fresh timestamp', async () => {
  for (const meta of [
    { rid: '1234' },
    { rid: 1234 },
    { cachedAt: null },
    { cachedAt: '' },
    { cachedAt: 'not-a-date' },
    { cachedAt: '2026-02-30T10:00:00.000Z' },
    { fromCache: 'true' },
  ]) {
    await assert.rejects(
      fetchPartnerAdsFeed(apiUrl, config, {}, async () =>
        json(envelope([product(0)], 1, { meta })),
      ),
      FeedError,
      JSON.stringify(meta),
    )
  }
})

test('rejects repeated pages and changed totals or cache generations between pages', async () => {
  const rows = Array.from({ length: 101 }, (_, index) => product(index))
  const secondPages = [
    envelope(rows, 1),
    envelope(rows, 2, { meta: { cachedAt: '2026-09-25T10:00:01.000Z' } }),
    envelope([...rows, product(101)], 2),
    { ...envelope(rows, 2), data: [] },
  ]
  for (const secondPage of secondPages) {
    let calls = 0
    await assert.rejects(
      fetchPartnerAdsFeed(apiUrl, config, {}, async () =>
        json(++calls === 1 ? envelope(rows) : secondPage),
      ),
      FeedError,
    )
    assert.equal(calls, 2)
  }
})

test('rejects HTTP errors, redirects, non-JSON and broken JSON', async () => {
  for (const response of [
    new Response('denied', { status: 403 }),
    new Response(null, {
      status: 302,
      headers: { Location: 'https://other.example' },
    }),
    new Response('<html>error</html>', {
      headers: { 'Content-Type': 'text/html' },
    }),
    new Response('{broken', {
      headers: { 'Content-Type': 'application/json' },
    }),
    new Response(null, { status: 204 }),
  ])
    await assert.rejects(
      fetchPartnerAdsFeed(apiUrl, config, {}, async () => response),
      FeedError,
    )
})

test('limits streamed bytes even without Content-Length and cancels oversized bodies', async () => {
  let cancelled = false
  let chunks = 0
  const response = new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        chunks += 1
        controller.enqueue(new Uint8Array(1024 * 1024))
      },
      cancel() {
        cancelled = true
      },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
  await assert.rejects(
    fetchPartnerAdsFeed(apiUrl, config, {}, async () => response),
    FeedError,
  )
  assert.equal(cancelled, true)
  assert.ok(chunks <= 10)
})

test('applies the byte limit across pages, including declared and streamed lengths', async () => {
  const rows = Array.from({ length: 101 }, (_, index) => product(index))
  const firstPage = envelope(rows)
  const firstText = JSON.stringify(firstPage)
  const firstBytes = new TextEncoder().encode(firstText).byteLength
  const remaining = MAX_FEED_BYTES - firstBytes
  const secondPage = { ...envelope(rows, 2), padding: ' '.repeat(remaining) }
  for (const declared of [false, true]) {
    let calls = 0
    await assert.rejects(
      fetchPartnerAdsFeed(apiUrl, config, {}, async () => {
        if (++calls === 1) return json(firstPage)
        return json(
          secondPage,
          declared ? { 'Content-Length': String(remaining + 1) } : {},
        )
      }),
      FeedError,
    )
    assert.equal(calls, 2)
  }
})

test('uses one 60-second deadline and cancels a stalled body when it expires', async (context) => {
  const controller = new AbortController()
  const durations: number[] = []
  context.mock.method(AbortSignal, 'timeout', (duration: number) => {
    durations.push(duration)
    return controller.signal
  })
  let cancelled = false
  const response = new Response(
    new ReadableStream<Uint8Array>({
      pull() {
        queueMicrotask(() => controller.abort())
      },
      cancel() {
        cancelled = true
      },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
  await assert.rejects(
    fetchPartnerAdsFeed(apiUrl, config, {}, async () => response),
    FeedError,
  )
  assert.deepEqual(durations, [60_000])
  assert.equal(cancelled, true)
})
