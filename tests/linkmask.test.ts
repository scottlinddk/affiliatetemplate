import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'esbuild'
import { maskedHref, maskSlug } from '../src/lib/linkmask-paths'
import { basePath } from '../src/lib/paths'
import type { Catalog, Deal, Offer, Product } from '../src/lib/types'

test('mask identifiers are stable, namespaced and safe for template IDs', () => {
  assert.equal(
    maskSlug('offer', 'garden-stones', 'shop'),
    'offer/i-garden-stones/i-shop',
  )
  assert.equal(maskSlug('program', '_shop'), 'program/i-_shop')
  assert.notEqual(maskSlug('deal', 'shop'), maskSlug('banner', 'shop'))
  for (const id of ['', '..', 'a/b', 'a b', 'a?b', 'https://shop.example'])
    assert.equal(maskSlug('program', id), undefined)
  assert.equal(maskSlug('program'), undefined)
})

test('masking only accepts paths and destinations supported by the redirect registry', () => {
  const slug = maskSlug('program', 'shop')
  const destination = 'https://shop.example/offer?paid=12345&pacid=example'
  assert.equal(maskedHref(slug, destination), `${basePath}/link/program/i-shop`)
  assert.equal(maskedHref(undefined, destination), undefined)
  for (const target of [
    undefined,
    '',
    'javascript:alert(1)',
    'http://shop.example',
    'https:shop.example',
    'https:/shop.example',
    'https://secret@shop.example',
    'https://shop.example/æble',
    'https://shop.example/a b',
    'https://shop.example/\\item',
  ])
    assert.equal(maskedHref(slug, target), undefined)
  for (const path of [
    '//evil.example',
    'https://evil.example',
    '../shop',
    'program/a?url=evil',
  ])
    assert.equal(maskedHref(path, destination), undefined)
})

const destination =
  'https://Shop.example/Offer?paid=123&uid=a%2fb&uid=two+words&htmlurl=https%3A%2F%2Fshop.example%2Fitem%3Fa%3D1#details'
const offer: Offer = {
  id: 'shop',
  merchant: 'Test shop',
  price: 100,
  currency: 'DKK',
  inStock: true,
  url: 'https://shop.example/item',
  affiliateUrl: destination,
  updatedAt: new Date().toISOString(),
}
const product: Product = {
  id: 'garden-stones',
  slug: 'garden-stones',
  name: 'Garden stones',
  brand: 'Test',
  category: 'Garden',
  description: 'Test product',
  image: '/images/garden.svg',
  imageAlt: 'Garden stones',
  features: [],
  specs: {},
  offers: [
    offer,
    { ...offer, id: 'unsupported/id' },
    { ...offer, id: 'no-affiliate', affiliateUrl: undefined },
    { ...offer, id: 'unsafe', affiliateUrl: 'http://shop.example/tracking' },
    { ...offer, id: 'unicode', affiliateUrl: 'https://shop.example/æble' },
    {
      ...offer,
      id: 'tracking-direct',
      url: 'https://www.partner-ads.com/link',
    },
  ],
}
const deal: Deal = {
  id: 'discount',
  title: 'Test discount',
  merchant: 'Test shop',
  description: 'Test campaign',
  startsAt: '2000-01-01T00:00:00Z',
  expiresAt: '2999-01-01T00:00:00Z',
  terms: 'Test terms',
  url: offer.url,
  affiliateUrl: destination,
}

async function routeFixture() {
  const catalog: Catalog = {
    mode: 'live',
    warnings: [],
    products: [product, { ...product, slug: 'demo-product', demo: true }],
  }
  const banner = {
    id: 'approved',
    title: 'Test banner',
    alt: 'Test creative',
    image: 'https://shop.example/banner.gif',
    width: 300,
    height: 100,
    approved: true,
    placement: 'home',
    url: offer.url,
    affiliateUrl: destination,
  }
  const configurations: Record<string, unknown> = {
    'deals.json': [
      deal,
      { ...deal, id: 'expired', expiresAt: '2000-01-02T00:00:00Z' },
      { ...deal, id: 'future', startsAt: '2998-01-01T00:00:00Z' },
      { ...deal, id: 'demo', demo: true },
    ],
    'programs.json': [
      {
        id: '_shop',
        name: 'Test shop',
        url: offer.url,
        affiliateUrl: destination,
        approved: true,
      },
    ],
    'banners.json': [banner, { ...banner, id: 'unapproved', approved: false }],
  }
  // Keep the real parsers, registry, package and handler. Only data sources and
  // Next's server-only marker are replaced; no live catalog or advertiser is used.
  const result = await build({
    absWorkingDir: process.cwd(),
    stdin: {
      resolveDir: process.cwd(),
      contents: `
        export * from './src/app/link/[...slug]/route.server';
        export { getLinkMask } from './src/lib/linkmask-registry';
        export { catalog } from './src/lib/catalog';
      `,
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    define: {
      'process.env.NEXT_PUBLIC_BASE_PATH': '"/affiliatetemplate"',
      'process.env.NEXT_PUBLIC_LINKMASK_ENABLED': '"true"',
    },
    plugins: [
      {
        name: 'linkmask-test-data',
        setup(builder) {
          builder.onResolve({ filter: /^server-only$/ }, () => ({
            path: 'server-only',
            namespace: 'test',
          }))
          builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
            contents: '',
          }))
          builder.onLoad(
            { filter: /[\\/]src[\\/]lib[\\/]catalog\.ts$/ },
            () => ({
              contents: `export const catalog = ${JSON.stringify(catalog)}; export async function getCatalog() { return catalog; }`,
              loader: 'js',
            }),
          )
          builder.onLoad(
            { filter: /[\\/]src[\\/]data[\\/](deals|programs|banners)\.json$/ },
            ({ path }) => ({
              contents: JSON.stringify(
                configurations[path.split(/[\\/]/).at(-1)!],
              ),
              loader: 'json',
            }),
          )
        },
      },
    ],
  })
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
  ) as Promise<
    typeof import('../src/app/link/[...slug]/route.server') & {
      catalog: Catalog
      getLinkMask: typeof import('../src/lib/linkmask-registry').getLinkMask
    }
  >
}

test('actual registry and handler redirect only configured eligible links without changing the destination', async () => {
  const route = await routeFixture()
  for (const base of ['', '/affiliatetemplate', '/link']) {
    for (const slug of [
      ['offer', 'i-garden-stones', 'i-shop'],
      ['deal', 'i-discount'],
      ['program', 'i-_shop'],
      ['banner', 'i-approved'],
    ]) {
      for (const method of ['GET', 'HEAD'] as const) {
        const response = await route[method](
          new Request(
            `https://site.example${base}/link/${slug.join('/')}?url=https://evil.example&paid=attacker&uid=overwritten`,
            { method },
          ),
          { params: Promise.resolve({ slug }) },
        )
        assert.equal(response.status, 302)
        assert.equal(response.headers.get('Location'), destination)
        assert.equal(response.headers.get('Cache-Control'), 'no-store')
        assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow')
        assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer')
        assert.equal(await response.text(), '')
      }
    }
  }

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const) {
    const response = await route[method](
      new Request('https://site.example/link/program/i-_shop', { method }),
      {
        params: Promise.resolve({ slug: ['program', 'i-_shop'] }),
      },
    )
    assert.equal(response.status, 405)
    assert.equal(response.headers.get('Allow'), 'GET, HEAD')
    assert.equal(response.headers.get('Location'), null)
  }

  for (const slug of [
    ['program', 'missing'],
    ['offer', 'i-demo-product', 'i-shop'],
    ...['no-affiliate', 'unsafe', 'unicode', 'tracking-direct'].map((id) => [
      'offer',
      'i-garden-stones',
      `i-${id}`,
    ]),
    ...['expired', 'future', 'demo'].map((id) => ['deal', `i-${id}`]),
    ['banner', 'i-unapproved'],
    ['offer', 'i-garden-stones', 'i-unsupported', 'id'],
    // Next decodes each route segment once. Encoded slashes must not become
    // registered segments, and double encoding must not bypass the restriction.
    ['offer/i-garden-stones', 'i-shop'],
    ['offer%2Fi-garden-stones', 'i-shop'],
    ['offer', 'i-garden-stones', 'i-shop?url=evil'],
    ['..', 'program', 'i-_shop'],
    [],
  ]) {
    const response = await route.GET(
      new Request('https://site.example/link/anything'),
      {
        params: Promise.resolve({ slug }),
      },
    )
    assert.equal(response.status, 404, slug.join('/'))
    assert.equal(response.headers.get('Location'), null)
    assert.equal(response.headers.get('Cache-Control'), 'no-store')
  }

  route.catalog.mode = 'demo'
  const demoResponse = await route.GET(
    new Request('https://site.example/link/offer/i-garden-stones/i-shop'),
    {
      params: Promise.resolve({ slug: ['offer', 'i-garden-stones', 'i-shop'] }),
    },
  )
  assert.equal(demoResponse.status, 404)
  route.catalog.mode = 'live'
  route.catalog.products.push({
    ...product,
    offers: [{ ...offer, affiliateUrl: 'https://other.example/tracking' }],
  })
  await assert.rejects(route.getLinkMask, /Conflicting LinkMask destinations/)
})

test('static export leaves destinations to the existing consent-controlled links', () => {
  const previous = process.env.NEXT_PUBLIC_LINKMASK_ENABLED
  try {
    process.env.NEXT_PUBLIC_LINKMASK_ENABLED = 'false'
    assert.equal(
      maskedHref(maskSlug('program', 'shop'), destination),
      undefined,
    )
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_LINKMASK_ENABLED
    else process.env.NEXT_PUBLIC_LINKMASK_ENABLED = previous
  }
})
