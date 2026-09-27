import assert from 'node:assert/strict'
import test from 'node:test'
import demoProducts from '../src/data/products.json'
import {
  MAX_FEED_ROWS,
  mergeCatalogProducts,
  parseFeedApiUrl,
  parseFeedConfig,
  parsePartnerAdsFeed,
  resolveProductLinks,
  safeHttpUrl,
  type FeedConfig,
} from '../src/lib/feed'

const config: FeedConfig = {
  rid: '001234',
  programId: '123',
  merchant: 'Testforhandler',
  approved: true,
  currency: 'DKK',
}
const options = { updatedAt: '2026-09-26T10:00:00.000Z', partnerId: '456' }

function rows(fields: Record<string, unknown> = {}): unknown[] {
  return [
    {
      id: '000123',
      retailer: 'Upstream retailer',
      name: 'Kaffemaskine Ærø',
      brand: 'Test',
      category: 'Kaffe',
      description: 'En kaffemaskine til hverdagen.',
      price: 1299.95,
      originalPrice: 1499,
      imageUrl: 'https://merchant.example/coffee.jpg',
      productUrl: 'https://merchant.example/coffee?a=1&b=2',
      stock: 'på lager',
      inStock: true,
      shippingCost: 39,
      ean: '',
      ...fields,
    },
  ]
}

test('feed config requires extract IDs, DKK and explicit advertiser approval', () => {
  assert.deepEqual(parseFeedConfig(JSON.stringify([config])), [config])
  const withBanner = { ...config, bannerId: '999' }
  assert.deepEqual(parseFeedConfig(JSON.stringify([withBanner])), [withBanner])
  for (const changes of [
    { approved: false },
    { approved: undefined },
    { rid: 1234 },
    { rid: '' },
    { rid: '../1234' },
    { rid: '1?secret=private' },
    { rid: '1'.repeat(101) },
    { programId: 123 },
    { programId: '0' },
    { currency: undefined },
    { currency: 'EUR' },
    { bannerId: 'program-123' },
    { merchant: '' },
    { merchant: '<b></b>' },
  ])
    assert.throws(() =>
      parseFeedConfig(JSON.stringify([{ ...config, ...changes }])),
    )
  assert.throws(() => parseFeedConfig('[]'))
  assert.throws(() => parseFeedConfig('{}'))
  assert.throws(
    () => parseFeedConfig('{secret=do-not-print}'),
    /ikke gyldig JSON/,
  )
  assert.throws(
    () => parseFeedConfig(JSON.stringify([config, config])),
    /flere gange/,
  )
  assert.throws(
    () =>
      parseFeedConfig(
        JSON.stringify(
          Array.from({ length: 9 }, (_, i) => ({ ...config, rid: String(i) })),
        ),
      ),
    /mellem 1 og 8/,
  )
  assert.throws(
    () =>
      parseFeedConfig(
        JSON.stringify([{ ...config, url: 'https://example.com/private' }]),
      ),
    /rid.*PARTNER_ADS_API_URL/,
  )
})

test('service base supports localhost and path prefixes without credentials or query strings', () => {
  assert.equal(
    parseFeedApiUrl('http://localhost:1337/'),
    'http://localhost:1337',
  )
  assert.equal(
    parseFeedApiUrl('http://feed-service:1337'),
    'http://feed-service:1337',
  )
  assert.equal(
    parseFeedApiUrl('https://feeds.example.com/proxy/'),
    'https://feeds.example.com/proxy',
  )
  for (const value of [
    '',
    '/relative',
    'javascript:alert(1)',
    'ftp://example.com',
    'https://u:p@feeds.example.com',
    'https://feeds.example.com/?secret=private',
    'https://feeds.example.com/#fragment',
    'https://feeds.example.com/?',
    'https://feeds.example.com/#',
    'http://localhost:1337/\napi',
  ]) {
    assert.throws(() => parseFeedApiUrl(value), Error, value)
  }
})

test('safe URLs reject executable schemes, credentials, and embedded controls', () => {
  for (const value of [
    'javascript:alert(1)',
    'data:image/svg+xml,<svg/>',
    '//merchant.example/x',
    'https://u:p@merchant.example/x',
    'https://merchant.example/\nfoo',
    'file:///c:/secret',
  ]) {
    assert.equal(safeHttpUrl(value), undefined)
  }
  assert.equal(
    safeHttpUrl('https://merchant.example/x?a=1&b=2'),
    'https://merchant.example/x?a=1&b=2',
  )
})

test('a direct merchant URL remains direct without an actual banner ID', () => {
  const url = 'https://merchant.example/product?a=1&b=2'
  assert.deepEqual(resolveProductLinks(url, config, '456'), { url })
  const result = resolveProductLinks(url, { ...config, bannerId: '789' }, '456')
  assert.equal(result?.url, url)
  assert.equal(
    new URL(result!.affiliateUrl!).searchParams.get('bannerid'),
    '789',
  )
  assert.equal(new URL(result!.affiliateUrl!).searchParams.get('htmlurl'), url)
})

test('existing Partner-ads links preserve an unencoded destination query and validate attribution', () => {
  const destination = 'https://merchant.example/product?a=1&b=2'
  const tracked = `https://www.partner-ads.com/dk/klikbanner.php?bannerid=789&partnerid=456&uid=guide&htmlurl=${destination}`
  assert.deepEqual(resolveProductLinks(tracked, config, '456'), {
    url: destination,
    affiliateUrl: tracked,
  })
  assert.equal(resolveProductLinks(tracked, config, '999'), undefined)
  const encoded =
    tracked.slice(0, tracked.indexOf('htmlurl=') + 8) +
    encodeURIComponent(destination)
  assert.equal(resolveProductLinks(encoded, config, '456')?.url, destination)
  assert.equal(
    resolveProductLinks(
      tracked.replace(destination, 'javascript:alert(1)'),
      config,
      '456',
    ),
    undefined,
  )
  assert.equal(
    resolveProductLinks(
      tracked.replace('bannerid=789', 'bannerid=wrong'),
      config,
      '456',
    ),
    undefined,
  )
  assert.equal(
    resolveProductLinks(
      tracked.replace('https://www.partner-ads', 'http://www.partner-ads'),
      config,
      '456',
    ),
    undefined,
  )
  assert.equal(
    resolveProductLinks(
      tracked.replace('partnerid=456', 'partnerid=456&partnerid=999'),
      config,
      '456',
    ),
    undefined,
  )
  assert.equal(
    resolveProductLinks(
      tracked.replace('&htmlurl=', '#&htmlurl='),
      config,
      '456',
    ),
    undefined,
  )
  assert.equal(
    resolveProductLinks(
      tracked.replace('www.partner-ads.com', 'www.partner-ads.com.'),
      config,
      '456',
    )?.url,
    destination,
  )
  assert.equal(
    resolveProductLinks(
      tracked.replace('www.partner-ads.com', 'unknown.partner-ads.com'),
      config,
      '456',
    ),
    undefined,
  )
})

test('API JSON maps product fields and preserves cache freshness and publisher attribution', () => {
  const result = parsePartnerAdsFeed(
    rows({
      color: 'Grøn',
      size: 'S|M',
      gender: 'U',
      deliveryTime: '1–3 dage',
      ean: '4006381333931',
    }),
    config,
    options,
  )
  assert.equal(result.totalRows, 1)
  assert.equal(result.rejectedRows, 0)
  const product = result.products[0]
  assert.equal(product.name, 'Kaffemaskine Ærø')
  assert.equal(product.slug, 'gtin-04006381333931')
  assert.equal(product.demo, false)
  assert.equal(product.specs.Farve, 'Grøn')
  assert.equal(product.specs.Størrelse, 'S|M')
  assert.equal(product.specs.Køn, 'U')
  assert.equal(product.specs.Leveringstid, '1–3 dage')
  assert.equal(product.offers[0].price, 1299.95)
  assert.equal(product.offers[0].shipping, 39)
  assert.equal(product.offers[0].currency, 'DKK')
  assert.equal(product.offers[0].updatedAt, options.updatedAt)
  assert.equal(product.offers[0].merchant, config.merchant)
  assert.equal(product.offers[0].programId, config.programId)
  assert.equal(product.offers[0].url, 'https://merchant.example/coffee?a=1&b=2')
  assert.equal(product.offers[0].affiliateUrl, undefined)
})

test('nullable shipping stays unknown, zero stays free, and stock is never inferred from raw text', () => {
  for (const value of [null, undefined]) {
    assert.equal(
      parsePartnerAdsFeed(rows({ shippingCost: value }), config, options)
        .products[0].offers[0].shipping,
      undefined,
    )
  }
  assert.equal(
    parsePartnerAdsFeed(rows({ shippingCost: 0 }), config, options).products[0]
      .offers[0].shipping,
    0,
  )
  assert.equal(
    parsePartnerAdsFeed(rows({ inStock: false }), config, options).products[0]
      .offers[0].inStock,
    false,
  )
  for (const value of [null, undefined, 1, 'true']) {
    assert.equal(
      parsePartnerAdsFeed(
        rows({ inStock: value, stock: 'instock' }),
        config,
        options,
      ).rejectedRows,
      1,
    )
  }
})

test('HTML is stripped from display text and absent optional attributes have safe defaults', () => {
  const product = parsePartnerAdsFeed(
    rows({
      description: '<p>God <strong>kaffe</strong>.</p>',
      brand: '',
      category: '',
      color: undefined,
    }),
    config,
    options,
  ).products[0]
  assert.equal(product.description.includes('<'), false)
  assert.match(product.description, /God kaffe/)
  assert.equal(product.brand, 'Ukendt mærke')
  assert.equal(product.category, 'Øvrigt')
  assert.equal(product.specs.Farve, undefined)
})

test('malformed essential data is rejected without coercing API nulls or strings into prices', () => {
  for (const changes of [
    { price: null },
    { price: undefined },
    { price: '1299.95' },
    { price: -1 },
    { price: 0 },
    { price: Infinity },
    { price: NaN },
    { price: 100_000_001 },
    { shippingCost: -1 },
    { shippingCost: '0' },
    { shippingCost: Infinity },
    { name: '' },
    { imageUrl: 'javascript:alert(1)' },
    { productUrl: 'file:///private' },
    { currency: 'EUR' },
    { id: 123 },
    { ean: 4006381333931 },
  ]) {
    const result = parsePartnerAdsFeed(rows(changes), config, options)
    assert.equal(result.products.length, 0, JSON.stringify(changes))
    assert.equal(result.rejectedRows, 1)
  }
  assert.equal(
    parsePartnerAdsFeed([null, [], false], config, options).rejectedRows,
    3,
  )
  assert.throws(
    () =>
      parsePartnerAdsFeed(Array(MAX_FEED_ROWS + 1).fill(null), config, options),
    /for mange/,
  )
  assert.throws(
    () => parsePartnerAdsFeed(rows(), config, { updatedAt: 'bad-date' }),
    /opdateringstidspunkt/,
  )
  assert.deepEqual(parsePartnerAdsFeed([], config, options), {
    products: [],
    rejectedRows: 0,
    totalRows: 0,
  })
})

test('API tracking links remain available only with a safe direct destination and correct affiliate ID', () => {
  const destination = 'https://merchant.example/coffee?a=1&b=2'
  const tracked =
    'https://www.partner-ads.com/dk/klikbanner.php?bannerid=789&partnerid=456&uid=guide&htmlurl=' +
    destination
  const offer = parsePartnerAdsFeed(
    rows({ productUrl: tracked }),
    config,
    options,
  ).products[0].offers[0]
  assert.equal(offer.affiliateUrl, tracked)
  assert.equal(offer.url, destination)
  assert.equal(
    parsePartnerAdsFeed(rows({ productUrl: tracked }), config, {
      ...options,
      partnerId: '999',
    }).rejectedRows,
    1,
  )
})

test('validated GTINs group merchants deterministically and source IDs retain leading zeroes', () => {
  const a = parsePartnerAdsFeed(rows({ ean: '4006381333931' }), config, options)
    .products[0]
  const b = parsePartnerAdsFeed(
    rows({ ean: '04006381333931', name: 'Andet navn', price: 1199 }),
    { ...config, rid: '5678', programId: '124', merchant: 'Anden forhandler' },
    options,
  ).products[0]
  const merged = mergeCatalogProducts([a, b])
  assert.equal(merged.length, 1)
  assert.equal(merged[0].offers.length, 2)
  assert.equal(merged[0].offers[0].merchant, 'Anden forhandler')
  assert.deepEqual(merged, mergeCatalogProducts([b, a]))
  assert.equal(mergeCatalogProducts([a, a])[0].offers.length, 1)
  assert.equal(a.offers.length, 1)
  assert.equal(a.slug, b.slug)
  assert.equal(merged[0].slug, a.slug)
  const separate = parsePartnerAdsFeed(
    [...rows({ id: '000123' }), ...rows({ id: '123' })],
    config,
    options,
  )
  assert.equal(separate.products.length, 2)
})

test('product slugs survive product and merchant renames, URL changes, and merchant removal', () => {
  for (const ean of ['', '4006381333931']) {
    const original = parsePartnerAdsFeed(rows({ ean }), config, options)
      .products[0]
    const renamed = parsePartnerAdsFeed(
      rows({
        ean,
        name: 'Et helt nyt navn',
        productUrl: 'https://merchant.example/new-url',
      }),
      { ...config, merchant: 'Nyt butiksnavn' },
      options,
    ).products[0]
    assert.equal(original.slug, original.id)
    assert.equal(renamed.slug, original.slug)
  }
  const firstMerchant = parsePartnerAdsFeed(
    rows({ ean: '4006381333931', name: 'A' }),
    config,
    options,
  ).products[0]
  const otherMerchant = parsePartnerAdsFeed(
    rows({ ean: '04006381333931', name: 'Z' }),
    { ...config, programId: '987', merchant: 'Anden butik' },
    options,
  ).products[0]
  assert.equal(
    mergeCatalogProducts([firstMerchant, otherMerchant])[0].slug,
    mergeCatalogProducts([otherMerchant])[0].slug,
  )
})

test('a product requires either a valid GTIN or a nonempty source ID for a stable slug', () => {
  for (const id of ['', '   ']) {
    assert.equal(
      parsePartnerAdsFeed(rows({ id }), config, options).rejectedRows,
      1,
    )
    assert.equal(
      parsePartnerAdsFeed(rows({ id, ean: '4006381333931' }), config, options)
        .products[0].slug,
      'gtin-04006381333931',
    )
  }
})

test('invalid EANs and same names never combine unrelated merchants', () => {
  const a = parsePartnerAdsFeed(rows({ ean: '4006381333930' }), config, options)
    .products[0]
  const b = parsePartnerAdsFeed(
    rows({ ean: '4006381333930' }),
    { ...config, programId: '124' },
    options,
  ).products[0]
  assert.equal(mergeCatalogProducts([a, b]).length, 2)
  assert.equal(a.specs.EAN, undefined)
})

test('demo catalogue is explicitly synthetic, self contained, and has no real merchant links or ratings', () => {
  assert.equal(demoProducts.length, 8)
  assert.equal(
    new Set(demoProducts.map((product) => product.slug)).size,
    demoProducts.length,
  )
  for (const product of demoProducts) {
    assert.equal(product.demo, true)
    assert.match(product.image, /^\/images\/[a-z]+\.svg$/)
    assert.equal('rating' in product, false)
    for (const offer of product.offers) {
      assert.equal(new URL(offer.url).hostname, 'example.com')
      assert.equal(offer.updatedAt, '2026-09-26T00:00:00.000Z')
      assert.equal(offer.price > 0, true)
      assert.equal(offer.shipping === undefined || offer.shipping >= 0, true)
    }
  }
})
