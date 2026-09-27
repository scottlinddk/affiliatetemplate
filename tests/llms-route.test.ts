import assert from 'node:assert/strict'
import test from 'node:test'
import { GET } from '../src/app/llms.txt/route'
import { site } from '../src/config/site'
import { getGuides } from '../src/lib/guides'
import { contentPath } from '../src/lib/content-paths'

test('llms endpoint exposes canonical articles only for enabled live sites', async () => {
  const feeds = process.env.PARTNER_ADS_FEEDS
  const enabled = site.llmsTxt
  try {
    delete process.env.PARTNER_ADS_FEEDS
    assert.equal(GET().status, 404)
    process.env.PARTNER_ADS_FEEDS = 'configured'
    site.llmsTxt = false
    assert.equal(GET().status, 404)
    site.llmsTxt = true
    const response = GET()
    assert.equal(response.status, 200)
    assert.equal(
      response.headers.get('Content-Type'),
      'text/plain; charset=utf-8',
    )
    const body = await response.text()
    for (const article of getGuides()) {
      assert.ok(body.includes(new URL(contentPath(article), site.url).href))
    }
  } finally {
    if (feeds === undefined) delete process.env.PARTNER_ADS_FEEDS
    else process.env.PARTNER_ADS_FEEDS = feeds
    site.llmsTxt = enabled
  }
})
