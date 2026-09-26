# Partner-ads setup

## Before connecting a feed

1. Create and obtain approval for your Partner-ads affiliate account and website.
2. Apply to the advertiser programs you want to feature. Wait for individual approvals and read each program's conditions.
3. Obtain a DKK feed extract for each approved advertiser and the program's approved link material. Extract IDs come from `rid` in Partner-ads feed-extract URLs. Keep feed access details out of the repository and browser code.
4. Replace the template's branding, contact information, demo content and privacy details.

The `approved: true` setting records your confirmation of those steps. It does not verify or grant approval through the Partner-ads service.

The template reads JSON from a separately running [partner-ads-json-feed](https://github.com/scottlinddk/partner-ads-json-feed) service. That service handles the upstream XML download, parsing and cache. It accepts numeric extract IDs; it does not discover programs, authenticate to your affiliate account or accept arbitrary full merchant-feed URLs. Configure one advertiser per extract because the template assigns the entry's `programId` and `merchant` to every imported offer. Only DKK extracts are supported: the API does not report or convert currency, so `currency: "DKK"` is your explicit confirmation of the source currency.

## Environment example

Copy `.env.example` to `.env.local` and add your actual values. These IDs and URLs are placeholders, not working credentials:

```dotenv
NEXT_PUBLIC_SITE_URL=https://your-site.example
NEXT_PUBLIC_PUBLISHER_NAME="Your publishing business"
NEXT_PUBLIC_CONTACT_EMAIL=hello@your-site.example
PARTNER_ADS_PARTNER_ID=123456
PARTNER_ADS_API_URL=https://feeds.example.com
PARTNER_ADS_FEEDS='[{"rid":"1234","programId":"12345","merchant":"Your merchant","approved":true,"currency":"DKK","bannerId":"98765"}]'
```

In a hosting dashboard, paste the JSON array as the value of `PARTNER_ADS_FEEDS` without the enclosing shell-style single quotes. Keep all `PARTNER_ADS_*` variables server-only; do not prefix them with `NEXT_PUBLIC_`.

`PARTNER_ADS_API_URL` is the service's HTTP(S) base URL, optionally including a hosting path prefix such as `https://feeds.example.com/partner-ads`. Do not include `/api/feed/:rid`, credentials, query parameters or a fragment. Local development can use `http://localhost:1337`. Requests append `/api/feed/:rid?page=1&limit=100` and follow all result pages. Redirects are rejected, so use the final service URL.

Run `npm run check:config`, then `npm run build`. The configuration check validates structure without contacting the service. Check actual merchant destinations and program attribution before launching.

## Local development with live data

Start the service in a separate terminal:

```sh
git clone https://github.com/scottlinddk/partner-ads-json-feed.git
cd partner-ads-json-feed
npm ci
npm run dev
```

In the template repository, copy `.env.example` to `.env.local`, keep `PARTNER_ADS_API_URL=http://localhost:1337`, and set your approved extract configuration and partner ID. Start the storefront in a second terminal:

```sh
npm ci
npm run dev
```

The storefront runs on [localhost:3000](http://localhost:3000); the feed service uses port `1337` by default. Both processes must run for live data. Restart the storefront after editing its environment settings. The service's README explains its separate environment handling; it does not automatically load a `.env` file.

For deployment, build and run the service separately using its own instructions. Its URL must be reachable from the storefront's build worker and, for server hosting, its running server. A build worker's `localhost` generally refers to the worker itself, so use the deployed service address outside a shared local environment. The service has no built-in authentication; configure access controls at your hosting layer as appropriate. No browser access or CORS integration is required because feed requests run on the server.

## Migrating from the direct XML importer

1. Deploy or start `partner-ads-json-feed` and set `PARTNER_ADS_API_URL`.
2. Replace each legacy `url` in `PARTNER_ADS_FEEDS` with the numeric string `rid` from an existing Partner-ads extract URL. If you only have a merchant's full-feed URL, obtain an advertiser-specific extract first; a program ID is not an extract ID.
3. Retain the real `programId`, `merchant`, `approved: true` and optional `bannerId`, and add `currency: "DKK"` after verifying the extract's currency.
4. Run `npm run check:config`, rebuild, and inspect the live catalog, source timestamps and merchant attribution. Legacy `url` entries are rejected with a migration error; they are never fetched directly.

XML handling and its dependency have been removed from this template. Text and numeric normalization now come from the service's JSON contract; the storefront still validates every row before display.

### Four different identifiers

| Identifier         | Meaning                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| Partner ID         | Your affiliate account.                                                          |
| Extract ID (`rid`) | A saved Partner-ads feed extract, used in the JSON API endpoint.                 |
| Program ID         | The advertiser program, used here to keep product and offer identities separate. |
| Banner ID          | A specific Partner-ads link/creative identifier, used to construct a deeplink.   |

**A program ID is not a banner ID.** Copy the real deeplink banner ID from the material made available for the approved program. Leave `bannerId` unset if you do not have one. The template does not invent it.

If the feed supplies an existing Partner-ads tracking link, the importer validates its shape and extracts a direct destination. If `PARTNER_ADS_PARTNER_ID` is configured, the tracking link must match that partner ID. For a plain merchant URL, the template constructs a tracking URL only when both your partner ID and that feed's explicit banner ID are present; otherwise it remains a direct link.

The helper supports an optional campaign `uid`, placed before `htmlurl` as required by Partner-ads. No visitor identifier is added automatically. Never place personal data in campaign identifiers.

## JSON mapping and feed scope

The template consumes `data`, `pagination` and `meta` from `GET /api/feed/:rid`. It requests pages of 100 and loads every page before accepting an extract. A failed or inconsistent later page rejects that extract; it does not publish a truncated catalog as complete.

| API field                                  | Storefront behavior                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `ean`                                | Preserve source IDs and validate GTIN check digits before combining offers.                                                                                   |
| `name`, `description`, `brand`, `category` | Populate product copy; strip HTML from text fields.                                                                                                           |
| `price`                                    | Require a finite positive numeric price; a `null` or invalid price rejects the row. Currency comes from the verified DKK configuration.                       |
| `shippingCost`                             | Preserve a valid zero as free delivery; `null` remains unknown, not zero.                                                                                     |
| `inStock`                                  | Require `true` or `false`; `null` means unknown availability and rejects the row. Known unavailable products remain visible without a current purchase offer. |
| `imageUrl`, `productUrl`                   | Require safe absolute HTTP(S) URLs. Validate tracking links and extract the direct merchant destination.                                                      |
| `size`, `color`, `gender`, `deliveryTime`  | Populate available product specifications and delivery information.                                                                                           |
| `meta.cachedAt`                            | Preserve the service's source-download time as the offer update time.                                                                                         |

The configured `merchant` and `programId` are authoritative for attribution; the API's retailer text does not change them. Optional `originalPrice`, `onSale` and `discountPercentage` do not create advertised savings in the storefront.

- A valid matching GTIN allows offers from different merchants to be grouped. Without one, products stay separate by program and source ID or URL. Similar names alone do not prove that products are identical.
- Unknown shipping stays unknown. Comparisons use the product price plus known shipping and show the limitation.
- Imports are limited to eight extracts, 5,000 rows and 8 MiB of JSON responses in total per extract, with a 60-second timeout across all pages. This allows for the service's default 30-second cold XML download. Use narrower extracts for a larger source catalog.
- The service separately enforces its own upstream XML download, encoding and cache limits. See its [README](https://github.com/scottlinddk/partner-ads-json-feed#configuration-and-operation) for configuration.

An empty feed setting enables the demo. A configured live feed that fails does **not** fall back to fictional offers. The interface displays the available catalog and warnings; if all configured feeds fail, the live catalog is empty. Error messages deliberately omit private feed URLs.

The displayed update time comes from the API's `meta.cachedAt`, recording when the service downloaded the source. Reading it again does not make old data newer, and it does not establish when the advertiser last changed a price. Check source quality and freshness in your account as part of normal operations.

## Advertising and visitor choice

Pages disclose the commercial relationship. Outbound purchase links carry `sponsored nofollow noopener noreferrer`. Before consent, the template uses the direct merchant destination; after the visitor allows affiliate tracking, it may use the tracking link. Footer privacy settings let the visitor revoke that choice for future clicks.

Product images are requested from the advertiser's own host, without image proxying or caching on this site's server. The browser may therefore contact that host before a visitor clicks an offer. Explain this in your actual privacy notice and assess all integrations you add.

Only use product content and creative you are authorized to use. The template installs no third-party tracking scripts. Optional banner placements load advertiser-hosted images only after the visitor allows affiliate tracking. See [content editing](content.md#optional-approved-banners) for configuration; no banners are configured by default.

## Coupons and campaigns

Offers are maintained in `src/data/deals.json`; the template does not promise an undocumented coupon API or scrape private program materials. Enter the real code, merchant, conditions, approved destination and start/end dates. Expired real entries are removed from the current offers view; labelled demo cards remain as illustrative examples.

Some Partner-ads programs support unique-code attribution by agreement with the advertiser. Listing a coupon here does **not** establish that agreement or guarantee commission. Verify campaign-specific conditions in your account.

## Refresh and maintenance

The service caches downloaded feeds in memory for one hour by default. Separately, the Next.js server caches the processed catalog for one hour and revalidates when requested after that interval. These caches reduce repeated requests, but they are not a scheduled refresh. The original `meta.cachedAt` is retained through both layers. The service cache is lost on restart and is not shared across instances.

Ensure the service is running and reachable before a build or revalidation. Newly added products may require a rebuild to produce their static detail routes. Feed configuration, guides, curated offers and site settings require a rebuild after edits. An API failure can produce an empty live catalog with warnings, so inspect live results as part of deployment instead of treating a successful build as proof of feed availability.

On static hosting, schedule `npm ci && npm run check && npm run check:config && npm run generate` in your deployment system at least daily. Publish `out/` only after a successful build. Monitor failures and review a real product page after deployment. Do not reset timestamps on old data to make it appear current.

The included seven-day price limit is a last-resort display guard. The Partner-ads feed guide's minimum weekly refresh remains an operational responsibility. Merchant confirmation takes precedence over displayed price and stock.

## Primary sources

Reviewed for this template on 26 September 2026; recheck the current conditions when launching:

- [Affiliate and advertiser overview](https://www.partner-ads.com/dk/guide-affiliate-annoncoer.php)
- [Affiliate guide to complete product feeds](https://www.partner-ads.com/dk/guide-til-affiliate-hele-produktfeeds.php)
- [Advertiser XML feed format](https://www.partner-ads.com/dk/feed_advinfo.htm)
- [Deeplinking FAQ](https://www.partner-ads.com/dk/affiliate-svar.php?faqid=65)
- [UID campaign tracking FAQ](https://www.partner-ads.com/dk/affiliate-svar.php?faqid=60)
- [Affiliate terms](https://www.partner-ads.com/dk/affiliatebetingelser.php)
- [Partner-ads privacy text for affiliates](https://www.partner-ads.com/dk/persondatapolitik_txt_aff.php)
- [Advertising material formats](https://www.partner-ads.com/dk/reklamemateriale.php)
