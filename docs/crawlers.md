# Crawlers and content discovery

Edit `crawlers` in `src/config/site.ts` for each published site. All four tokens
are independent booleans. The defaults allow `OAI-SearchBot` and `PerplexityBot`
and disallow `GPTBot` and `Google-Extended`. Rebuild and deploy after changes.

| Token             | Purpose                           | Default on a live site |
| ----------------- | --------------------------------- | ---------------------- |
| `OAI-SearchBot`   | ChatGPT search discovery          | Allow                  |
| `PerplexityBot`   | Perplexity search discovery       | Allow                  |
| `GPTBot`          | OpenAI foundation-model training  | Disallow               |
| `Google-Extended` | Gemini training **and grounding** | Disallow               |

Names and purposes were checked against the vendors' documentation on 2026-09-27:
[OpenAI](https://developers.openai.com/api/docs/bots),
[Perplexity](https://docs.perplexity.ai/docs/resources/perplexity-crawlers), and
[Google](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-extended).
Google-Extended is a robots.txt product token, not a separate HTTP user agent;
blocking it does not affect Google Search inclusion or ranking. Its grounding
control means it cannot be treated as a training-only switch.

With no `PARTNER_ADS_FEEDS`, demo mode disallows `/` for the wildcard **and every
explicit bot**. In live mode, allowed bots receive the same interactive
`/sammenlign` exclusions as the wildcard. The distinct editorial
`/sammenligninger/` routes remain crawlable. A specific bot rule does not inherit
the wildcard group's exclusions, which is why the rules repeat them.

These are crawler preferences, not access controls. User-requested fetchers such
as `ChatGPT-User` and `Perplexity-User` may not follow robots.txt; those are
different from the automatic search crawlers configured here. Recheck the vendor
references before a new launch or a policy change.

## Optional llms.txt

`site.llmsTxt` enables `/llms.txt`, a small text index of editorial URLs, the
product listing, publisher information, privacy page, and sitemap. Article links
use the same content-type paths as the pages. It contains an affiliate disclosure
and no tracking links or replicated merchant feed descriptions. Set it to `false`
to disable it; disabled and demo sites return a 404 response with no content
index. A static host may serve the exported `Not found` placeholder with status
200 unless it honors Next's route metadata; configure the host's 404 behavior
if that distinction matters. It is an optional discovery aid with unproven
benefits, not a ranking guarantee, and does not replace
robots.txt, a sitemap, or visible source citations.
