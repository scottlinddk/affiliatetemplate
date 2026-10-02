import { build } from 'esbuild'
import { expect, test } from '@playwright/test'

const directUrl = 'https://shop.example/product?colour=green'
const affiliateUrl =
  'https://shop.example/product?paid=12345&pacid=example&utm_source=partnerads'
for (const { basePath, enabled } of [
  { basePath: '/affiliatetemplate', enabled: true },
  { basePath: '/link', enabled: true },
  { basePath: '/affiliatetemplate', enabled: false },
]) {
  test.describe(`deployment prefix ${basePath}, masking ${enabled ? 'enabled' : 'disabled for static export'}`, () => {
    const maskedPath = `${basePath}/link/offer/i-garden-stones/i-shop`
    const consentHref = enabled ? maskedPath : affiliateUrl
    let html: string

    test.beforeAll(async () => {
      // Bundle the real template components. No advertiser is contacted and no test
      // page or destination needs to be added to the production application.
      const result = await build({
        absWorkingDir: process.cwd(),
        stdin: {
          resolveDir: process.cwd(),
          loader: 'tsx',
          contents: `
        import { createRoot } from 'react-dom/client';
        import { AffiliateLink } from './src/components/affiliate-link';
        import { Deals } from './src/components/deals';
        import { maskSlug } from './src/lib/linkmask-paths';
        import { ConsentSettings, PreferencesProvider, PreferenceButton } from './src/components/preferences';
        createRoot(document.getElementById('fixture')).render(
          <PreferencesProvider>
            <AffiliateLink url={${JSON.stringify(directUrl)}} affiliateUrl={${JSON.stringify(affiliateUrl)}} maskedSlug={maskSlug('offer', 'garden-stones', 'shop')}>Hent tilbud</AffiliateLink>
            <AffiliateLink url={${JSON.stringify(directUrl)}} affiliateUrl={${JSON.stringify(affiliateUrl)}}>Existing link</AffiliateLink>
            <AffiliateLink url={${JSON.stringify(directUrl)}} affiliateUrl="http://shop.example/tracking" maskedSlug={maskSlug('offer', 'unsafe', 'shop')}>Unsafe tracking</AffiliateLink>
            <AffiliateLink url={${JSON.stringify(directUrl)}} affiliateUrl={${JSON.stringify(affiliateUrl)}} maskedSlug={maskSlug('offer', 'demo', 'shop')} demo>Demo offer</AffiliateLink>
            <Deals deals={[${JSON.stringify({
              id: 'garden-discount',
              title: 'Havekampagne',
              merchant: 'Havebutikken',
              description: 'Et aktivt tilbud',
              startsAt: '2000-01-01T00:00:00Z',
              expiresAt: '2999-01-01T00:00:00Z',
              terms: 'Gælder kun testvarer',
              url: directUrl,
              affiliateUrl,
            })}]} />
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
          'process.env.NEXT_PUBLIC_BASE_PATH': JSON.stringify(basePath),
          'process.env.NEXT_PUBLIC_LINKMASK_ENABLED': JSON.stringify(
            String(enabled),
          ),
          'process.env.__NEXT_ROUTER_BASEPATH': JSON.stringify(basePath),
        },
      })
      const script = result.outputFiles[0].text.replace(
        /<\/script/gi,
        '<\\/script',
      )
      html = `<!doctype html><html lang="da"><head><meta charset="utf-8"><title>LinkMask integration check</title></head><body><main id="fixture"></main><script>${script}</script></body></html>`
    })

    test('offer and deal targets follow consent, deployment mode and withdrawal', async ({
      page,
    }) => {
      const externalRequests: string[] = []
      await page.route('**/*', async (route) => {
        if (new URL(route.request().url()).pathname === '/__linkmask-fixture') {
          await route.fulfill({
            contentType: 'text/html; charset=utf-8',
            body: html,
          })
        } else {
          externalRequests.push(route.request().url())
          await route.abort()
        }
      })
      await page.goto('/__linkmask-fixture')
      const link = page.getByRole('link', { name: /Hent tilbud/ })
      const deal = page.getByRole('link', { name: /Se tilbud hos butik/ })
      await expect(link).toHaveAttribute('href', directUrl)
      await expect(deal).toHaveAttribute('href', directUrl)
      await expect(link).toHaveAttribute(
        'rel',
        'sponsored nofollow noopener noreferrer',
      )
      await expect(link).toHaveAttribute('target', '_blank')
      await page
        .getByRole('button', { name: 'Tillad affiliate-sporing', exact: true })
        .click()
      await expect(link).toHaveAttribute('href', consentHref)
      await expect(deal).toHaveAttribute(
        'href',
        enabled ? `${basePath}/link/deal/i-garden-discount` : affiliateUrl,
      )
      await link.hover()
      expect(
        await link.evaluate((element: HTMLAnchorElement) =>
          element.getAttribute('href'),
        ),
      ).toBe(consentHref)
      await expect(
        page.getByRole('link', { name: /Existing link/ }),
      ).toHaveAttribute('href', affiliateUrl)
      await expect(
        page.getByRole('link', { name: /Unsafe tracking/ }),
      ).toHaveAttribute('href', directUrl)
      await expect(
        page.getByText('Demo · ikke til salg', { exact: true }),
      ).toHaveAttribute('aria-disabled', 'true')
      await page.reload()
      await expect(link).toHaveAttribute('href', consentHref)
      await expect(deal).toHaveAttribute(
        'href',
        enabled ? `${basePath}/link/deal/i-garden-discount` : affiliateUrl,
      )
      await page
        .getByRole('button', { name: 'Privatlivsindstillinger', exact: true })
        .click()
      await expect(link).toHaveAttribute('href', directUrl)
      await expect(deal).toHaveAttribute('href', directUrl)
      await page
        .getByRole('button', { name: 'Kun nødvendige', exact: true })
        .click()
      await page.reload()
      await expect(link).toHaveAttribute('href', directUrl)
      await expect(deal).toHaveAttribute('href', directUrl)
      expect(externalRequests).toEqual([])
    })
  })
}
