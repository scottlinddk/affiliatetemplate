# Launch checklist

## Identity and content

- [ ] Set a real public HTTPS URL, publisher name and contact email.
- [ ] Replace the demo branding, illustrative catalog and placeholder campaigns.
- [ ] Review every public page on desktop and mobile, including an empty search and an unavailable product.
- [ ] Review original guide copy and any sources; remove unsupported test, review or lowest-price claims.
- [ ] Confirm permission to use all product descriptions, images and creative.
- [ ] Customize the privacy page for your actual host, log retention, recipients, contact details and integrations.

## Affiliate configuration

- [ ] Confirm approval of the affiliate account, website and each advertiser program.
- [ ] Store private feed URLs and identifiers only in your local environment or hosting settings.
- [ ] Run `npm run check:config` and resolve launch warnings.
- [ ] Confirm each deeplink's banner ID is the actual supplied ID, not an advertiser program ID.
- [ ] Check imported products, exact variants, currency, stock, known delivery charges and destinations.
- [ ] Verify a tracking link uses your correct partner ID and opens the intended merchant page after opt-in.
- [ ] Verify a visitor who has not opted in gets a direct merchant link.
- [ ] Verify footer privacy settings revoke future tracking-link use.
- [ ] Verify each live coupon, its dates and material conditions; remove all fictitious offers.

## Technical checks

```sh
npm ci
npm run check
npm run check:config
npm run build
npx playwright install chromium
npm run test:e2e
```

- [ ] Use the supported Node.js version and commit the dependency lockfile.
- [ ] Review a production build, not just the development server.
- [ ] Check favorites and comparison, keyboard navigation, visible focus, mobile navigation and consent controls.
- [ ] Inspect page titles, canonical URLs, sharing previews, `sitemap.xml` and `robots.txt` using your live origin.
- [ ] Confirm product images load from their expected merchant hosts; do not introduce an image proxy for feed images without permission.
- [ ] Test failed feed behavior and confirm live data is never silently replaced with demo offers.
- [ ] Ensure environment secrets and complete private feed URLs do not appear in browser output, logs or source control.

## Deployment and operations

- [ ] Choose a Next.js-compatible server host for request-driven hourly feed revalidation, or explicitly choose static hosting.
- [ ] For static hosting, use `npm run generate`, publish `out/` and confirm direct navigation to nested routes works.
- [ ] Schedule successful rebuilds at least daily on static hosting and rebuild after guide, deal or product-route changes.
- [ ] Monitor failed builds, empty feeds, missing images and expired campaigns; confirm a real page after deployment.
- [ ] Check prices against merchants and meet Partner-ads' current refresh requirements; the seven-day display limit is a fallback, not a maintenance schedule.
- [ ] Re-read program conditions and disclosure/privacy requirements whenever you add services or change the site's behavior.

The template provides a working implementation and editable information pages. Approval of advertiser programs, permission to use content, feed accuracy, a working deployment and business-specific notices remain launch responsibilities.
