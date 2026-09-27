# Article monetisation directives

Articles keep Markdown as their source format. Raw HTML and inline Markdown
images remain disabled. Editors may place a self-closing block on its own line:

```md
::product{slug="stable-product-slug"}
::offer-table{slug="stable-product-slug"}
::cta{program="approved-program-id" label="Se hos forhandleren"}
```

`remark-directive` parses the blocks. Only these three leaf directives are
supported; unknown names, attributes, inline/container forms, missing values,
unknown product slugs and unapproved programs are errors. Labels are plain text.
There is no arbitrary URL attribute and no HTML interpolation.

`product` reuses `ProductCard` (including its lowest current base price) and adds
a separate CTA for `bestOffer`, selected by item price plus known delivery.
`offer-table` reuses `OfferTable` so every merchant has the existing consent-aware
link. `cta` resolves a registry entry from `src/data/programs.json`, whose strict
schema requires `id`, `name`, an HTTPS direct `url`, an HTTPS `affiliateUrl`, and
explicit `approved: true`. The distributed registry is empty. Approval records
are an editorial responsibility; adding an entry does not obtain advertiser
approval.

All monetised outbound links use `AffiliateLink`. Before marketing consent its
destination is the direct merchant URL; after consent it can use the approved
tracking URL. Sponsored/nofollow attributes and advertisement labels remain
visible independently of consent.

Plain Markdown links and reference definitions are validated from the same
Markdown AST used by rendering. Only safe local links and untracked HTTPS source
links are accepted. Partner-ads hosts (including subdomains, case differences,
trailing DNS dots and host spellings normalized by browsers) are rejected with an
instruction to use a directive. Protocol-relative URLs, credentials, control
characters, unsafe schemes and backslash forms are rejected. Raw HTML is skipped
and inline images are excluded from the renderer rather than fetched.

`validateArticleContent` validates the AST, any frontmatter product references,
and the registry. The build calls it for every article with the current catalog;
the renderer repeats validation on its actual catalog. Diagnostics include the
article identifier and Markdown line when available. It returns typed directives
and a conservative potential affiliate text-link count: every offer-table row,
one potential CTA for every product block, and one approved program CTA.
Counting potential product links avoids compliance changing when offer freshness
changes. Page-level policy adds banner fallback links before enforcing the
configured limit. The template conservatively caps every article type even where
current program terms describe exemptions.

Unit tests cover syntax and configuration errors, product references, link
normalization and references, safe source links, link counting, and output with
consent initially absent. Rendering tests verify that raw HTML and Markdown
images cannot introduce network requests or bypass affiliate link handling.
