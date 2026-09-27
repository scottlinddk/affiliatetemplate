import { expect, test, type Page } from '@playwright/test'
import { build } from 'esbuild'
import type { Product } from '../../src/lib/types'

// Exercise the real catalog with enough products to span batches, without
// depending on a live affiliate service or adding a fixture route to the app.
const products: Product[] = Array.from({ length: 60 }, (_, index) => {
  const number = String(index + 1).padStart(3, '0')
  return {
    id: `product-${number}`,
    slug: `product-${number}`,
    name: `Product ${number}`,
    brand: `Brand ${index % 3}`,
    category: index < 30 ? 'Category A' : 'Category B',
    description: 'Catalog pagination fixture',
    image:
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    imageAlt: '',
    features: [],
    specs: {},
    offers: [
      {
        id: `offer-${number}`,
        merchant: index < 30 ? 'Merchant A' : 'Merchant B',
        price: index + 1,
        currency: 'DKK',
        inStock: true,
        url: `https://example.com/products/${number}`,
        updatedAt: new Date().toISOString(),
      },
    ],
  }
})

let script: string
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `
        import { createRoot } from 'react-dom/client'
        import { Catalog } from './src/components/catalog'
        import { PreferencesProvider } from './src/components/preferences'
        createRoot(document.getElementById('root')).render(
          <PreferencesProvider><Catalog products={${JSON.stringify(products)}} /></PreferencesProvider>
        )
      `,
      loader: 'tsx',
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.NEXT_PUBLIC_BASE_PATH': '""',
    },
    plugins: [
      {
        name: 'plain-links',
        setup(builder) {
          builder.onResolve({ filter: /^next\/link$/ }, () => ({
            path: 'next/link',
            namespace: 'fixture',
          }))
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
            contents:
              'export default function Link(props) { return <a {...props} /> }',
            loader: 'tsx',
            resolveDir: process.cwd(),
          }))
        },
      },
    ],
  })
  script = result.outputFiles[0].text
})

async function openCatalog(page: Page, query = '') {
  await page.route('**/__catalog-fixture*', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>img{width:32px;height:32px}svg{width:16px;height:16px}</style></head><body><main id="root"></main></body></html>',
    }),
  )
  await page.goto(`/__catalog-fixture${query}`)
  await page.addScriptTag({ content: script })
}

test('large catalogs reveal batches while preserving saved and comparison selections', async ({
  page,
}) => {
  await openCatalog(page)
  const cards = page.locator('.product-card')
  const more = page.getByRole('button', { name: 'Vis flere produkter' })
  await expect(cards).toHaveCount(24)
  await expect(page.locator('.results-bar [role="status"]')).toHaveText(
    '60 produkter',
  )
  await expect(page.locator('.catalog-pagination [role="status"]')).toHaveText(
    'Viser 24 af 60 produkter',
  )
  await more.click()
  await expect(cards).toHaveCount(48)
  await cards
    .nth(30)
    .getByRole('button', { name: 'Sammenlign', exact: true })
    .click()
  await expect(cards).toHaveCount(48)
  await expect(
    cards.nth(30).getByRole('button', { name: 'Tilføjet' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await more.click()
  await expect(cards).toHaveCount(60)
  await expect(more).toHaveCount(0)
  await expect(page.locator('.catalog-pagination [role="status"]')).toHaveText(
    'Viser 60 af 60 produkter',
  )
  await expect(
    cards.last().getByRole('heading').getByRole('link'),
  ).toHaveAttribute('href', '/produkter/product-060')
  await cards
    .last()
    .getByRole('button', { name: 'Gem Product 060', exact: true })
    .click()
  await expect(cards).toHaveCount(60)
  await page.getByRole('checkbox', { name: 'Mine gemte produkter' }).check()
  await expect(cards).toHaveCount(1)
  await expect(cards.getByRole('heading')).toHaveText('Product 060')
  await page.getByRole('checkbox', { name: 'Mine gemte produkter' }).uncheck()
  await expect(cards).toHaveCount(24)
  await expect(page.locator('.compare-tray')).toContainText('1 af 4')
})

test('filtering and sorting use the full catalog and reset the visible batch', async ({
  page,
}) => {
  await openCatalog(page)
  const cards = page.locator('.product-card')
  const more = page.getByRole('button', { name: 'Vis flere produkter' })
  await more.click()
  await expect(cards).toHaveCount(48)
  await page
    .getByRole('combobox', { name: 'Sortér produkter' })
    .selectOption('price-desc')
  await expect(cards).toHaveCount(24)
  await expect(cards.first().getByRole('heading')).toHaveText('Product 060')
  await page
    .getByRole('searchbox', { name: 'Søg efter et produkt' })
    .fill('Product 060')
  await expect(cards).toHaveCount(1)
  await expect(cards.getByRole('heading')).toHaveText('Product 060')
  expect(new URL(page.url()).searchParams.get('q')).toBe('Product 060')
  await page.getByRole('button', { name: 'Nulstil', exact: true }).click()
  await expect(cards).toHaveCount(24)
  await page
    .getByRole('combobox', { name: 'Forhandler', exact: true })
    .selectOption('Merchant B')
  await expect(page.locator('.results-bar [role="status"]')).toHaveText(
    '30 produkter',
  )
  await expect(cards.first().getByRole('heading')).toHaveText('Product 031')
  await more.click()
  await expect(cards).toHaveCount(30)
  await page
    .getByRole('combobox', { name: 'Mærke', exact: true })
    .selectOption('Brand 2')
  await expect(cards).toHaveCount(10)
  await expect(cards.last().getByRole('heading')).toHaveText('Product 060')
  await expect(more).toHaveCount(0)
})

test('shared queries and browser history changes reset batches without truncating results', async ({
  page,
}) => {
  await openCatalog(page, '?category=Category+B')
  const cards = page.locator('.product-card')
  await expect(cards).toHaveCount(24)
  await expect(cards.first().getByRole('heading')).toHaveText('Product 031')
  await page.getByRole('button', { name: 'Vis flere produkter' }).click()
  await expect(cards).toHaveCount(30)
  await page.evaluate(() => {
    window.history.pushState(null, '', '?stock=1')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(cards).toHaveCount(24)
  await expect(page.locator('.results-bar [role="status"]')).toHaveText(
    '60 produkter',
  )
  await page.getByRole('button', { name: 'Vis flere produkter' }).click()
  await expect(cards).toHaveCount(48)
  await page.goBack()
  await expect(cards).toHaveCount(24)
  await expect(page.getByRole('radio', { name: /^Category B/ })).toBeChecked()
  await expect(page.locator('.results-bar [role="status"]')).toHaveText(
    '30 produkter',
  )
})
