# Partner-ads setup

## Before connecting a feed

1. Create and obtain approval for your Partner-ads affiliate account and website.
2. Apply to the advertiser programs you want to feature. Wait for individual approvals and read each program's conditions.
3. Obtain feed URLs and approved link material from your account. Do not publish feed access URLs in the repository or browser code.
4. Replace the template's branding, contact information, demo content and privacy details.

The `approved: true` setting records your confirmation of those steps. It does not verify or grant approval through the Partner-ads service.

## Environment example

Copy `.env.example` to `.env.local` and add your actual values. These IDs and URLs are placeholders, not working credentials:

```dotenv
NEXT_PUBLIC_SITE_URL=https://your-site.example
NEXT_PUBLIC_PUBLISHER_NAME="Your publishing business"
NEXT_PUBLIC_CONTACT_EMAIL=hello@your-site.example
PARTNER_ADS_PARTNER_ID=123456
PARTNER_ADS_FEEDS='[{"url":"https://www.partner-ads.com/dk/YOUR-PRIVATE-FEED","programId":"12345","merchant":"Your merchant","approved":true,"bannerId":"98765"}]'
```

In a hosting dashboard, paste the JSON array as the value of `PARTNER_ADS_FEEDS` without the enclosing shell-style single quotes. Do not prefix this variable or your partner ID with `NEXT_PUBLIC_`.

Run `npm run check:config`, then `npm run build`. Check actual merchant destinations and program attribution before launching.

### Three different identifiers

| Identifier | Meaning                                                                          |
| ---------- | -------------------------------------------------------------------------------- |
| Partner ID | Your affiliate account.                                                          |
| Program ID | The advertiser program, used here to keep product and offer identities separate. |
| Banner ID  | A specific Partner-ads link/creative identifier, used to construct a deeplink.   |

**A program ID is not a banner ID.** Copy the real deeplink banner ID from the material made available for the approved program. Leave `bannerId` unset if you do not have one. The template does not invent it.

If the feed supplies an existing Partner-ads tracking link, the importer validates its shape and extracts a direct destination. If `PARTNER_ADS_PARTNER_ID` is configured, the tracking link must match that partner ID. For a plain merchant URL, the template constructs a tracking URL only when both your partner ID and that feed's explicit banner ID are present; otherwise it remains a direct link.

The helper supports an optional campaign `uid`, placed before `htmlurl` as required by Partner-ads. No visitor identifier is added automatically. Never place personal data in campaign identifiers.

## Feed scope

The importer supports Partner-ads XML under `<produkter><produkt>…</produkt></produkter>`, including the published Danish field names and common alternatives. Required usable values are a product name, positive DKK price, recognizable stock status, image URL and product URL. It reads optional brand, category, EAN/GTIN, description, delivery, shipping and selected specifications.

- Danish decimal and grouped price formats are normalized.
- Recognized out-of-stock products remain in the catalog but are not current purchase offers.
- Unrecognized stock, malformed prices, missing required fields and unsupported currencies reject the row.
- Unknown shipping remains unknown. Comparisons use the product price plus known shipping and show the limitation.
- A valid matching GTIN allows offers from different merchants to be grouped. Without one, products stay separate by program and source ID or URL. Similar names alone do not prove that products are identical.
- Imported HTML is stripped from text fields. Product and image links must be absolute HTTP(S) URLs.
- Feeds are limited to eight sources, 8 MiB per feed, 5,000 rows per feed and a 15-second fetch timeout. Use narrower advertiser feeds or deliberately adapt and test these limits for a larger catalog.
- Feed requests require public HTTPS URLs and reject redirects; request the final feed URL. XML entity/doctype definitions are rejected. UTF-8, ISO-8859-1 and Windows-1252 are supported.

An empty feed setting enables the demo. A configured live feed that fails does **not** fall back to fictional offers. The interface displays the available catalog and warnings; if all configured feeds fail, the live catalog is empty. Error messages deliberately omit private feed URLs.

The displayed update time records when this template fetched the feed, not when the advertiser last changed a price. Check source quality and freshness in your account as part of normal operations.

## Advertising and visitor choice

Pages disclose the commercial relationship. Outbound purchase links carry `sponsored nofollow noopener noreferrer`. Before consent, the template uses the direct merchant destination; after the visitor allows affiliate tracking, it may use the tracking link. Footer privacy settings let the visitor revoke that choice for future clicks.

Product images are requested from the advertiser's own host, without image proxying or caching on this site's server. The browser may therefore contact that host before a visitor clicks an offer. Explain this in your actual privacy notice and assess all integrations you add.

Only use product content and creative you are authorized to use. The template installs no third-party tracking scripts. Optional banner placements load advertiser-hosted images only after the visitor allows affiliate tracking. See [content editing](content.md#optional-approved-banners) for configuration; no banners are configured by default.

## Coupons and campaigns

Offers are maintained in `src/data/deals.json`; the template does not promise an undocumented coupon API or scrape private program materials. Enter the real code, merchant, conditions, approved destination and start/end dates. Expired real entries are removed from the current offers view; labelled demo cards remain as illustrative examples.

Some Partner-ads programs support unique-code attribution by agreement with the advertiser. Listing a coupon here does **not** establish that agreement or guarantee commission. Verify campaign-specific conditions in your account.

## Refresh and maintenance

The Next.js server caches normalized feeds for one hour and revalidates when requested after that interval. This reduces repeated requests from different pages, but it is not a scheduled refresh. Newly added products may require a rebuild to produce their static detail routes. Guides, curated offers and site settings require a rebuild after edits.

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
