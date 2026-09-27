import { build } from 'esbuild'
import { expect, test } from '@playwright/test'

const directUrl = 'https://shop.example/article-product'
const affiliateUrl =
  'https://www.partner-ads.com/dk/klikbanner.php?partnerid=123&bannerid=456'
const bannerImage = 'https://advertiser.example/original-article-banner.gif'
let fixtureHtml: string

test.beforeAll(async () => {
  const product = {
    id: 'article-product',
    slug: 'article-product',
    name: 'Artikelprodukt',
    brand: 'Eksempel',
    category: 'Kaffe',
    description: 'Et produkt til artiklens tilbud.',
    image: '/images/coffee.svg',
    imageAlt: 'En kaffemaskine',
    features: [],
    specs: {},
    offers: [
      {
        id: 'article-offer',
        merchant: 'Artikelbutikken',
        price: 199,
        currency: 'DKK',
        shipping: 0,
        inStock: true,
        url: directUrl,
        affiliateUrl,
        updatedAt: new Date().toISOString(),
      },
    ],
  }
  const program = {
    id: 'article-shop',
    name: 'Artikelbutikken',
    url: directUrl,
    affiliateUrl,
    approved: true,
  }
  const banners = ['article-inline', 'article-end'].map((placement) => ({
    id: placement,
    title: `Artikelannonce ${placement}`,
    alt: `Original annonce ${placement}`,
    image: bannerImage,
    url: directUrl,
    affiliateUrl,
    width: 300,
    height: 100,
    approved: true,
    placement,
  }))
  const content = [
    '## Artikel med tilbud',
    '::product{slug="article-product"}',
    '::offer-table{slug="article-product"}',
    '::cta{program="article-shop" label="Udforsk butikken"}',
    '<img src="https://tracker.example/html-pixel.gif">',
    '![Pixel](https://tracker.example/markdown-pixel.gif)',
  ].join('\n\n')
  const result = await build({
    absWorkingDir: process.cwd(),
    stdin: {
      resolveDir: process.cwd(),
      loader: 'tsx',
      contents: `
        import { createRoot } from 'react-dom/client';
        import { ArticleMarkdown } from './src/components/article-markdown';
        import { BannerPlacement } from './src/components/banner';
        import { ConsentSettings, PreferencesProvider, PreferenceButton } from './src/components/preferences';
        createRoot(document.getElementById('fixture')).render(
          <PreferencesProvider>
            <BannerPlacement placement="article-inline" />
            <ArticleMarkdown content={${JSON.stringify(content)}} products={[${JSON.stringify(product)}]} programs={[${JSON.stringify(program)}]} />
            <BannerPlacement placement="article-end" />
            <ConsentSettings />
            <PreferenceButton />
          </PreferencesProvider>
        );
      `,
    },
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    define: {
      'process.env': '{}',
      'process.env.NODE_ENV': '"test"',
    },
    // Exercise both real placements without adding advertisers to the template.
    plugins: [
      {
        name: 'article-test-banners',
        setup(builder) {
          builder.onLoad(
            { filter: /[\\/]src[\\/]data[\\/]banners\.json$/ },
            () => ({
              contents: JSON.stringify(banners),
              loader: 'json',
            }),
          )
        },
      },
    ],
  })
  const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')
  fixtureHtml = `<!doctype html><html lang="da"><head><meta charset="utf-8"><title>Article directives consent test</title></head><body><main id="fixture"></main><script>${script}</script></body></html>`
})

test('article product, offers, CTA and banners follow consent and withdrawal', async ({
  page,
}) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (
      /partner-ads\.com|advertiser\.example|tracker\.example/.test(
        request.url(),
      )
    )
      requests.push(request.url())
  })
  await page.route('https://advertiser.example/**', (route) =>
    route.fulfill({
      contentType: 'image/gif',
      body: Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64',
      ),
    }),
  )
  await page.route('**/__article-directives-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: fixtureHtml,
    }),
  )
  await page.goto('/__article-directives-fixture')

  const sponsored = page.locator(
    'a[rel="sponsored nofollow noopener noreferrer"]',
  )
  const banners = page.locator('.advertiser-banner')
  await expect(
    page.getByRole('heading', { name: 'Priser hos forhandlerne' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Udforsk butikken/ }),
  ).toBeVisible()
  await expect(sponsored).toHaveCount(5)
  await expect(banners).toHaveCount(2)
  await expect(banners.locator('img')).toHaveCount(0)
  for (const link of await sponsored.all())
    await expect(link).toHaveAttribute('href', directUrl)
  expect(requests).toEqual([])

  await page
    .getByRole('button', { name: 'Tillad affiliate-sporing', exact: true })
    .click()
  for (const link of await sponsored.all())
    await expect(link).toHaveAttribute('href', affiliateUrl)
  await expect(banners.locator('img')).toHaveCount(2)
  for (const image of await banners.locator('img').all())
    await expect(image).toHaveAttribute('src', bannerImage)
  await banners.last().scrollIntoViewIfNeeded()
  await expect.poll(() => requests.includes(bannerImage)).toBe(true)
  expect(requests.every((url) => url === bannerImage)).toBe(true)

  await page
    .getByRole('button', { name: 'Privatlivsindstillinger', exact: true })
    .click()
  await expect(banners.locator('img')).toHaveCount(0)
  for (const link of await sponsored.all())
    await expect(link).toHaveAttribute('href', directUrl)
  await page
    .getByRole('button', { name: 'Kun nødvendige', exact: true })
    .click()
  requests.length = 0
  await page.reload()
  await expect(sponsored).toHaveCount(5)
  await expect(banners.locator('img')).toHaveCount(0)
  for (const link of await sponsored.all())
    await expect(link).toHaveAttribute('href', directUrl)
  expect(requests).toEqual([])
})
