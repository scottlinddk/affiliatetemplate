# Affiliate website template

A Danish affiliate website built with **React, Next.js App Router and TypeScript**. This version replaces the original Vue/Nuxt application. It runs without a database and starts with a clearly labelled, fictional demo catalog.

The included brand, **Velvalgt**, is a starting point: replace the identity, editorial content and demo data with your own before launching.

## Start in a few minutes

Requirements: Node.js 22 or newer and npm. To create your own repository with GitHub CLI:

```sh
gh repo create my-affiliate-site --template scottlinddk/affiliatetemplate --private --clone
cd my-affiliate-site
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). No API key, database, Partner-ads account or environment file is needed for the demo.

For an existing clone, start at `npm ci`. Copy `.env.example` to `.env.local` when you are ready to configure a live site. Never commit private feed URLs or credentials.

## What is included

- Responsive Danish storefront, product details and category navigation.
- Search, category/brand/price filters and sorting, with shareable catalog URLs.
- Multiple offers per product, known delivery charges, stock indicators and freshness checks.
- Up to four products in a comparison and browser-local favorites.
- Partner-ads XML feed import on the server, matching validated product identifiers across merchants and rejection of invalid data.
- Affiliate links that respect the visitor's saved choice; direct merchant links without affiliate consent.
- Optional approved banner placements, loaded only after the visitor allows affiliate tracking.
- A manually maintained offers/coupon page with validity dates and clear conditions.
- Markdown buying guides, article metadata, sitemap and robots output.
- Visible advertising disclosure, an about page, an editable privacy page and persistent privacy settings.
- Local demo illustrations, accessible labels, empty/error states and automated checks.

This is a storefront and publishing template. It does not include a checkout, order management, login, newsletter service, analytics dashboard or a Partner-ads account. Those are separate services. The template makes no claim of automatic legal compliance or verified demo offers.

## Configure your site

| Setting                      | Purpose                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`       | Your public HTTPS origin; used for canonical URLs and search metadata.                                |
| `NEXT_PUBLIC_PUBLISHER_NAME` | The actual person or business publishing the website.                                                 |
| `NEXT_PUBLIC_CONTACT_EMAIL`  | A real contact address shown on information pages.                                                    |
| `PARTNER_ADS_PARTNER_ID`     | Your affiliate ID; required when constructing tracking links from direct product URLs.                |
| `PARTNER_ADS_FEEDS`          | Server-only JSON configuration for individually approved advertiser feeds. Leave unset for demo mode. |

Edit the brand name, description, language and other site defaults in `src/config/site.ts`. Details and an example feed configuration are in [Partner-ads setup](docs/partner-ads.md).

The template does not infer advertiser approval. You need an approved affiliate account, an approved website and approval for each program you use. `approved: true` records your confirmation; it does not make an approval request.

## Commands

| Command                | Result                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm ci`               | Install exactly the locked dependencies.                                                               |
| `npm run dev`          | Start local development.                                                                               |
| `npm run build`        | Create a production Next.js build.                                                                     |
| `npm start`            | Serve that production build.                                                                           |
| `npm run generate`     | Export a static website to `out/`.                                                                     |
| `npm run check`        | Run lint, TypeScript checks and unit tests.                                                            |
| `npm run check:config` | Check production launch settings and feed configuration; intentionally fails for an unconfigured demo. |
| `npm run test:e2e`     | Run browser tests; install Playwright Chromium first.                                                  |

Install the browser needed for end-to-end tests with `npx playwright install chromium`.

## Content and data

- `src/data/products.json`: illustrative demo products. Demo merchant links are disabled.
- `src/data/deals.json`: editorial offers, codes, validity dates and terms. Keep example offers labelled as demo.
- `src/data/banners.json`: optional approved advertiser creative; empty by default.
- `content/guides/*.md`: buying guides with frontmatter; no CMS required.
- `src/app/om/page.tsx` and `src/app/privatliv/page.tsx`: public information pages to adapt to your business and hosting.
- `public/images/`: bundled illustrations; live product images remain on the advertiser's host.

See [editing content](docs/content.md) for guide and offer examples. The included guides are original general buying advice, not product tests or independent reviews.

## Deployment and keeping prices current

For a Node-compatible host, run `npm ci`, `npm run check`, `npm run check:config` and `npm run build`, then serve with `npm start`. Set the same environment values in your host. Set public environment variables **before the build**, because Next.js embeds them in the frontend.

The server caches a successfully processed feed result and its fetch timestamp for one hour. Revalidation is request-driven; it is not a background scheduler or a promise that a supplier updates its source every hour. New product routes and changed guide content should be picked up with a fresh deployment.

For static hosting, run `npm run generate` and publish **`out/`**, with directory-index support. There is no server-side revalidation in an exported site. Schedule a fresh build and deploy at least daily, check its success, and rebuild immediately after content or feed changes. A normal server build is the better fit for a catalog that changes often.

Partner-ads' feed guide calls for prices to be refreshed at least weekly. The template excludes offers older than seven days from current price selection. Static HTML, search-engine caches and an already-open browser tab can still lag behind: a regular successful rebuild remains necessary. The merchant always confirms the final price, stock and delivery charge.

Read the [launch checklist](docs/launch-checklist.md) before making the site public.

## Implementation notes

The migration removes Nuxt, Vuex and Vue components in favor of React server-rendered pages and small client components for search, preferences and comparison. Feed credentials remain on the server. Markdown is rendered through `react-markdown` with raw HTML disabled and a restricted element list. Product data is validated before display; feed failures are surfaced instead of silently substituting demo products into a live catalog.

The implementation is informed by the [Partner-ads overview](https://www.partner-ads.com/dk/guide-affiliate-annoncoer.php), [product-feed guide](https://www.partner-ads.com/dk/guide-til-affiliate-hele-produktfeeds.php), [XML specification](https://www.partner-ads.com/dk/feed_advinfo.htm) and [affiliate terms](https://www.partner-ads.com/dk/affiliatebetingelser.php). [Partner-ads setup](docs/partner-ads.md) documents the supported scope and links to the relevant primary sources.
