# Editing content

## Brand and page copy

Start with `src/config/site.ts`, the site environment values and the homepage. Replace the demo identity and review the about and privacy pages. Those pages describe shipped behavior, but hosting, new analytics or external services may change what you need to disclose.

Local SVG illustrations are included in `public/images/`. Replace them with media you have permission to use. Live merchant images remain external to respect the feed usage model.

## Publish a guide

Add a file in `content/guides/` with a lowercase, hyphen-separated filename. `choosing-your-topic.md` becomes `/guides/choosing-your-topic`.

```markdown
---
title: 'A clear, useful guide title'
description: 'A short description for the card and search results.'
category: 'Your topic'
date: '2026-09-26'
image: '/images/coffee.svg'
---

An introduction that explains who the guide is for.

## A useful question to start with

Original, practical advice based on your knowledge and sources.

- A concrete thing to check
- Another useful comparison

[Explore the catalog](/produkter)
```

All frontmatter fields are required; images must use local paths. Reading time is calculated automatically. Guides appear on the listing and get a static detail route with a canonical URL and article sharing metadata after a build. Rebuild when you add, remove or edit a guide.

Write headings from `##` down because the page already renders the title as its main heading. Supported Markdown includes paragraphs, links, headings, lists, emphasis, quotes and code. Raw HTML and embedded scripts are disabled; the renderer restricts element types and uses safe URL handling. Inline images are intentionally excluded from the Markdown body; use the frontmatter image for the article illustration.

Do not claim a product was tested if it was not. Distinguish your own experience, manufacturer information and general buying advice. Use dates that match publication or a genuine revision, and link to relevant original sources where needed.

## Maintain offers and coupons

Edit the array in `src/data/deals.json`. A deal has the following shape:

```json
{
  "id": "your-campaign",
  "title": "A factual description of the offer",
  "merchant": "Approved merchant",
  "description": "Explain what the visitor can save or receive.",
  "code": "REAL-APPROVED-CODE",
  "startsAt": "2026-10-01T00:00:00+02:00",
  "expiresAt": "2026-10-31T23:59:59+01:00",
  "url": "https://merchant.example/campaign",
  "terms": "Minimum order, exclusions and other material conditions.",
  "demo": true
}
```

This is a **non-working example**. Replace the details with an authorized, verified campaign and use `demo: false` only when it is real. `code` is optional for offers that need no code. `affiliateUrl` is optional and should contain the actual approved tracking URL for the direct `url` destination. A demo entry's outbound purchase action is disabled.

Use complete timestamps with a time-zone offset. Start and end times are interpreted as specific instants. Expired or future real campaigns are omitted from the active listing; labelled demo cards stay visible as examples. Also remove old entries during routine editorial maintenance. Rebuild the site after changes, especially on static hosting.

The template cannot verify that a code is accepted in a merchant's checkout. Test it according to the program's permitted process and describe conditions accurately. Do not invent discount percentages, original prices, countdown scarcity or attribution promises.

## Optional approved banners

`src/data/banners.json` is an empty array by default. You can add approved advertiser creative for the homepage or product detail pages:

```json
[
  {
    "id": "your-approved-campaign",
    "title": "Merchant campaign",
    "image": "https://merchant.example/approved-banner.jpg",
    "alt": "Describe the advertised offer and merchant",
    "url": "https://merchant.example/campaign",
    "width": 728,
    "height": 90,
    "approved": true,
    "placement": "home"
  }
]
```

The example is illustrative. Use the original advertiser-hosted HTTPS image and approved dimensions; do not download or proxy the creative. `affiliateUrl` can contain the actual approved tracking URL. The direct `url` must remain valid. `placement` is either `home` or `product`; the first valid approved entry for a placement is used.

The placement displays a “Reklame” label and does not load its remote creative before the visitor allows affiliate tracking. `approved: true` is your confirmation of permission to use this specific creative, not a request for approval. Rebuild after changes and remove expired campaigns.

## Demo versus live data

`src/data/products.json` provides a working UI before you have approved feeds. The demo's names, merchants, prices and specifications are fictional examples, and its purchase links are disabled. It should not be presented as a real comparison service.

To switch to imported live data, run a separate [partner-ads-json-feed](https://github.com/scottlinddk/partner-ads-json-feed) service, set its server-only `PARTNER_ADS_API_URL`, and configure `PARTNER_ADS_FEEDS` with approved advertiser-specific extract IDs (`rid`) and `currency: "DKK"`. There is no need to copy private feed responses into source control. The service must be reachable while building and serving the storefront. Rebuild after feed configuration or product-route changes.

Invalid live configuration remains in live mode and displays an error rather than substituting demo products. Missing shipping remains unknown; products with unknown availability or invalid prices are omitted. Offer update times preserve the service's `meta.cachedAt` instead of the storefront's fetch time. See [Partner-ads setup](partner-ads.md) for the complete mapping and migration from legacy XML feed URLs.

The product and deal TypeScript definitions are in `src/lib/types.ts`. If you extend them, update validation, the relevant interface, tests and these docs together.
