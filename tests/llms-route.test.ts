import assert from 'node:assert/strict'
import test from 'node:test'
import { GET } from '../src/app/llms.txt/route'
import { site } from '../src/config/site'
import { getGuides } from '../src/lib/guides'
import { contentPath } from '../src/lib/content-paths'

test('llms endpoint exposes canonical articles only for enabled live sites', async () => {
  const feeds = process.env.PARTNER_ADS_FEEDS
  const enabled = site.llmsTxt
  const showcase = site.showcase
  const originalUrl = site.url
  try {
    site.showcase = false
    delete process.env.PARTNER_ADS_FEEDS
    assert.equal(GET().status, 404)
    process.env.PARTNER_ADS_FEEDS = 'configured'
    site.llmsTxt = false
    assert.equal(GET().status, 404)
    site.llmsTxt = true
    site.showcase = true
    const showcaseResponse = GET()
    assert.equal(showcaseResponse.status, 404)
    assert.equal(await showcaseResponse.text(), 'Not found\n')
    site.showcase = false
    site.url = 'https://example.com/affiliatetemplate/'
    const response = GET()
    assert.equal(response.status, 200)
    assert.equal(
      response.headers.get('Content-Type'),
      'text/plain; charset=utf-8',
    )
    const body = await response.text()
    for (const article of getGuides()) {
      assert.ok(
        body.includes(
          `https://example.com/affiliatetemplate${contentPath(article)}`,
        ),
      )
    }
  } finally {
    if (feeds === undefined) delete process.env.PARTNER_ADS_FEEDS
    else process.env.PARTNER_ADS_FEEDS = feeds
    site.llmsTxt = enabled
    site.showcase = showcase
    site.url = originalUrl
  }
})
