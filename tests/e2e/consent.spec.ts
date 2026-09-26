import { build } from 'esbuild'
import { expect, test, type Page } from '@playwright/test'

const directUrl = 'https://shop.example/product?colour=green'
const affiliateUrl =
  'https://www.partner-ads.com/dk/klikbanner.php?partnerid=123&bannerid=456&htmlurl=https%3A%2F%2Fshop.example%2Fproduct%3Fcolour%3Dgreen'
let fixtureHtml: string

test.beforeAll(async () => {
  // Exercise the actual components in an isolated browser document. The fixture
  // is intercepted by Playwright and creates no test route in the application.
  const result = await build({
    absWorkingDir: process.cwd(),
    stdin: {
      resolveDir: process.cwd(),
      loader: 'tsx',
      contents: `
        import { createRoot } from 'react-dom/client';
        import { AffiliateLink } from './src/components/affiliate-link';
        import { ConsentSettings, PreferencesProvider, PreferenceButton } from './src/components/preferences';
        createRoot(document.getElementById('fixture')).render(
          <PreferencesProvider>
            <AffiliateLink url={${JSON.stringify(directUrl)}} affiliateUrl={${JSON.stringify(affiliateUrl)}}>Besøg butikken</AffiliateLink>
            <AffiliateLink url={${JSON.stringify(directUrl)}} affiliateUrl="http://www.partner-ads.com/dk/klikbanner.php?partnerid=123&bannerid=456">Usikker sporing</AffiliateLink>
            <section aria-label="Afviste links">
              {${JSON.stringify([affiliateUrl, 'https://www.partner-ads.com./dk/klikbanner.php', 'https://track.partner-ads.com/redirect', 'javascript:alert(1)', 'https://user:secret@shop.example/product'])}.map((url) => <AffiliateLink key={url} url={url}>Ugyldigt butikslink</AffiliateLink>)}
            </section>
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
    define: { 'process.env.NODE_ENV': '"test"' },
  })
  const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')
  fixtureHtml = `<!doctype html><html lang="da"><head><meta charset="utf-8"><title>Consent component test</title></head><body><main id="fixture"></main><script>${script}</script></body></html>`
})

async function openFixture(page: Page) {
  await page.route('**/__consent-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: fixtureHtml,
    }),
  )
  await page.goto('/__consent-fixture')
}

test('affiliate links require consent, persist the decision, and revert immediately when withdrawn', async ({
  page,
}) => {
  const trackingRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).hostname.endsWith('partner-ads.com'))
      trackingRequests.push(request.url())
  })
  await openFixture(page)
  const link = page.getByRole('link', { name: /Besøg butikken/ })
  await expect(link).toHaveAttribute('href', directUrl)
  await expect(link).toHaveAttribute('rel', /sponsored/)
  await expect(link).toHaveAttribute('target', '_blank')
  await page
    .getByRole('button', { name: 'Tillad affiliate-sporing', exact: true })
    .click()
  await expect(link).toHaveAttribute('href', affiliateUrl)
  await page.reload()
  await expect(link).toHaveAttribute('href', affiliateUrl)
  await expect(
    page.getByRole('region', { name: 'Valg om reklamelinks' }),
  ).toHaveCount(0)

  await page
    .getByRole('button', { name: 'Privatlivsindstillinger', exact: true })
    .click()
  await expect(link).toHaveAttribute('href', directUrl)
  await page
    .getByRole('button', { name: 'Kun nødvendige', exact: true })
    .click()
  await page.reload()
  await expect(link).toHaveAttribute('href', directUrl)
  await expect(
    page.getByRole('region', { name: 'Valg om reklamelinks' }),
  ).toHaveCount(0)
  expect(trackingRequests).toEqual([])
})

test('consent remains usable in memory when browser storage is unavailable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException('Storage blocked', 'SecurityError')
    }
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage blocked', 'SecurityError')
    }
  })
  await openFixture(page)
  const link = page.getByRole('link', { name: /Besøg butikken/ })
  await expect(link).toHaveAttribute('href', directUrl)
  await page
    .getByRole('button', { name: 'Tillad affiliate-sporing', exact: true })
    .click()
  await expect(link).toHaveAttribute('href', affiliateUrl)
  await page
    .getByRole('button', { name: 'Privatlivsindstillinger', exact: true })
    .click()
  await expect(link).toHaveAttribute('href', directUrl)
  await page.reload()
  await expect(link).toHaveAttribute('href', directUrl)
  await expect(
    page.getByRole('region', { name: 'Valg om reklamelinks' }),
  ).toBeVisible()
})

test('consent changes synchronize between tabs through storage events', async ({
  page,
  context,
}) => {
  await openFixture(page)
  const other = await context.newPage()
  await openFixture(other)
  await page
    .getByRole('button', { name: 'Tillad affiliate-sporing', exact: true })
    .click()
  await expect(
    other.getByRole('link', { name: /Besøg butikken/ }),
  ).toHaveAttribute('href', affiliateUrl)
  await other
    .getByRole('button', { name: 'Privatlivsindstillinger', exact: true })
    .click()
  await expect(
    page.getByRole('link', { name: /Besøg butikken/ }),
  ).toHaveAttribute('href', directUrl)
  await expect(
    page.getByRole('region', { name: 'Valg om reklamelinks' }),
  ).toBeVisible()
  await other.close()
})

test('invalid direct destinations cannot bypass consent and insecure tracking falls back to the merchant', async ({
  page,
}) => {
  await openFixture(page)
  const rejected = page.getByRole('region', {
    name: 'Afviste links',
    exact: true,
  })
  await expect(rejected.getByRole('link')).toHaveCount(0)
  await expect(rejected.locator('[aria-disabled="true"]')).toHaveCount(5)
  await expect(
    page.getByRole('link', { name: /Usikker sporing/ }),
  ).toHaveAttribute('href', directUrl)
  await page
    .getByRole('button', { name: 'Tillad affiliate-sporing', exact: true })
    .click()
  await expect(rejected.getByRole('link')).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: /Usikker sporing/ }),
  ).toHaveAttribute('href', directUrl)
})
