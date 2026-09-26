import assert from 'node:assert/strict'
import test from 'node:test'
import demoProducts from '../src/data/products.json'
import {
  MAX_FEED_BYTES,
  MAX_FEED_ROWS,
  mergeCatalogProducts,
  parseDanishPrice,
  parseFeedConfig,
  parsePartnerAdsFeed,
  resolveProductLinks,
  safeHttpUrl,
  type FeedConfig,
} from '../src/lib/feed'

const config: FeedConfig = {
  url: 'https://www.partner-ads.com/dk/feedudtraek.php?secret=private',
  programId: '123',
  merchant: 'Testforhandler',
  approved: true,
}
const options = { updatedAt: '2026-09-26T10:00:00.000Z', partnerId: '456' }

function xml(fields: Record<string, string> = {}): string {
  const row = {
    produktid: 'p-1',
    produktnavn: 'Kaffemaskine Ærø',
    brand: 'Test',
    kategorinavn: 'Kaffe',
    produktbeskrivelse: 'En kaffemaskine til hverdagen.',
    pris: '1.299,95',
    billedurl: 'https://merchant.example/coffee.jpg',
    vareurl: 'https://merchant.example/coffee?a=1&b=2',
    lagerstatus: 'på lager',
    fragtomk: '39,00',
    ...fields,
  }
  return `<produkter><produkt>${Object.entries(row)
    .map(([key, value]) => `<${key}><![CDATA[${value}]]></${key}>`)
    .join('')}</produkt></produkter>`
}

test('Danish prices preserve cents, grouped thousands, and zero shipping', () => {
  for (const [value, expected] of [
    ['1.299,95', 1299.95],
    ['1.299', 1299],
    ['1299.95', 1299.95],
    ['1,299.95', 1299.95],
    ['1 299,95 kr.', 1299.95],
    ['DKK 1\u00a0299,95', 1299.95],
    ['0,00', 0],
    ['12', 12],
  ] as const)
    assert.equal(parseDanishPrice(value), expected, value)
  for (const value of [
    '-1',
    '1,2,3',
    '1.299,999',
    '1 2',
    '1,299',
    'free',
    'NaN',
    'Infinity',
    '1e3',
    '',
    '1.2.3',
    '99999999999',
  ]) {
    assert.equal(parseDanishPrice(value), undefined, value)
  }
  assert.equal(parseDanishPrice(Number.NaN), undefined)
  assert.equal(parseDanishPrice(-1), undefined)
})

test('feed config requires explicit advertiser approval and public HTTPS URLs', () => {
  assert.deepEqual(parseFeedConfig(JSON.stringify([config])), [config])
  const withBanner = { ...config, bannerId: '999' }
  assert.deepEqual(parseFeedConfig(JSON.stringify([withBanner])), [withBanner])
  for (const changes of [
    { approved: false },
    { approved: undefined },
    { programId: 123 },
    { programId: '0' },
    { bannerId: 'program-123' },
    { url: 'javascript:alert(1)' },
    { url: 'http://merchant.example/feed' },
    { url: 'https://localhost/feed' },
    { url: 'https://127.0.0.1/feed' },
    { url: 'https://169.254.169.254/feed' },
    { url: 'https://[::1]/feed' },
    { url: 'https://user:password@merchant.example/feed' },
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

test('official Danish feed rows normalize into safe products and offers', () => {
  const result = parsePartnerAdsFeed(
    xml({ color: 'Grøn', leveringstid: '1–3 dage', ean: '5701234567899' }),
    config,
    options,
  )
  assert.equal(result.totalRows, 1)
  assert.equal(result.rejectedRows, 0)
  const product = result.products[0]
  assert.equal(product.name, 'Kaffemaskine Ærø')
  assert.match(product.slug, /^kaffemaskine-aeroe-/)
  assert.equal(product.demo, false)
  assert.equal(product.specs.Farve, 'Grøn')
  assert.equal(product.offers[0].price, 1299.95)
  assert.equal(product.offers[0].shipping, 39)
  assert.equal(product.offers[0].updatedAt, options.updatedAt)
  assert.equal(product.offers[0].url, 'https://merchant.example/coffee?a=1&b=2')
  assert.equal(product.offers[0].affiliateUrl, undefined)
})

test('merchant feed field aliases and case variations are supported', () => {
  const input =
    '<produkter><produkt><Produktnavn>Lampe</Produktnavn><Nypris>399,50</Nypris><Beskrivelse>Lys til bordet</Beskrivelse><Billedurl>https://merchant.example/lamp.jpg</Billedurl><Vareurl>https://merchant.example/lamp</Vareurl><Lagerstatus>1</Lagerstatus></produkt></produkter>'
  const product = parsePartnerAdsFeed(input, config, options).products[0]
  assert.equal(product.description, 'Lys til bordet')
  assert.equal(product.offers[0].price, 399.5)
  assert.equal(product.offers[0].shipping, undefined)
})

test('HTML description content is reduced to plain text', () => {
  const product = parsePartnerAdsFeed(
    xml({ produktbeskrivelse: '<p>God <strong>kaffe</strong>.</p>' }),
    config,
    options,
  ).products[0]
  assert.equal(product.description.includes('<'), false)
  assert.match(product.description, /God kaffe/)
})

test('out of stock is explicit; malformed or missing essential data is omitted', () => {
  assert.equal(
    parsePartnerAdsFeed(xml({ lagerstatus: 'udsolgt' }), config, options)
      .products[0].offers[0].inStock,
    false,
  )
  const invalidRows: Record<string, string>[] = [
    { pris: '-1' },
    { pris: '0' },
    { pris: 'not a price' },
    { fragtomk: '-2' },
    { fragtomk: 'fra 29 kr.' },
    { lagerstatus: '' },
    { lagerstatus: 'måske' },
    { produktnavn: '' },
    { billedurl: 'javascript:alert(1)' },
    { vareurl: 'file:///c:/private' },
    { currency: 'EUR' },
  ]
  for (const changes of invalidRows) {
    const result = parsePartnerAdsFeed(xml(changes), config, options)
    assert.equal(result.products.length, 0, JSON.stringify(changes))
    assert.equal(result.rejectedRows, 1)
  }
  assert.equal(
    parsePartnerAdsFeed(xml({ fragtomk: 'gratis' }), config, options)
      .products[0].offers[0].shipping,
    0,
  )
})

test('XML entities in merchant query strings are decoded exactly once', () => {
  const source = xml().replace(
    '<![CDATA[https://merchant.example/coffee?a=1&b=2]]>',
    'https://merchant.example/coffee?a=1&amp;b=2',
  )
  assert.equal(
    parsePartnerAdsFeed(source, config, options).products[0].offers[0].url,
    'https://merchant.example/coffee?a=1&b=2',
  )
})

test('malformed XML, entity declarations, large feeds, and row overflow fail closed', () => {
  for (const source of [
    '{"products": []}',
    '<produkter><produkt></produkter>',
    '<html><body>Login required</body></html>',
    '<!DOCTYPE produkter [<!ENTITY xxe SYSTEM "file:///secret">]><produkter><produkt>&xxe;</produkt></produkter>',
    '<!DOCTYPE produkter><produkter/>',
  ])
    assert.throws(() => parsePartnerAdsFeed(source, config, options))
  assert.throws(
    () => parsePartnerAdsFeed(' '.repeat(MAX_FEED_BYTES + 1), config, options),
    /størrelsesgrænsen/,
  )
  assert.throws(
    () =>
      parsePartnerAdsFeed(
        `<produkter>${'<produkt/>'.repeat(MAX_FEED_ROWS + 1)}</produkter>`,
        config,
        options,
      ),
    /for mange/,
  )
  assert.throws(
    () => parsePartnerAdsFeed(xml(), config, { updatedAt: 'bad-date' }),
    /opdateringstidspunkt/,
  )
})

test('validated matching GTINs group merchant offers with deterministic output', () => {
  // This is a known valid test GTIN, used only as an identifier in a synthetic fixture.
  const a = parsePartnerAdsFeed(xml({ ean: '4006381333931' }), config, options)
    .products[0]
  const b = parsePartnerAdsFeed(
    xml({ ean: '04006381333931', produktnavn: 'Andet navn', pris: '1199,00' }),
    { ...config, programId: '124', merchant: 'Anden forhandler' },
    options,
  ).products[0]
  const merged = mergeCatalogProducts([a, b])
  assert.equal(merged.length, 1)
  assert.equal(merged[0].offers.length, 2)
  assert.equal(merged[0].offers[0].merchant, 'Anden forhandler')
  assert.deepEqual(mergeCatalogProducts([a, b]), mergeCatalogProducts([b, a]))
  assert.equal(mergeCatalogProducts([a, a]).length, 1)
  assert.equal(mergeCatalogProducts([a, a])[0].offers.length, 1)
  assert.equal(a.offers.length, 1, 'merging must not mutate an input product')
})

test('invalid EANs and same names never combine unrelated merchants', () => {
  const a = parsePartnerAdsFeed(xml({ ean: '4006381333930' }), config, options)
    .products[0]
  const b = parsePartnerAdsFeed(
    xml({ ean: '4006381333930' }),
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
