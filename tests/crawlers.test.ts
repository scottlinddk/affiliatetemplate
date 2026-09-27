import assert from 'node:assert/strict'
import test from 'node:test'
import { site } from '../src/config/site'
import {
  buildLlmsText,
  buildRobots,
  type CrawlerPolicy,
} from '../src/lib/crawlers'

type RobotRule = Extract<
  ReturnType<typeof buildRobots>['rules'],
  unknown[]
>[number]

test('live crawl defaults separate search discovery from training', () => {
  const robots = buildRobots(true, 'https://example.com', site.crawlers)
  assert.equal(robots.sitemap, 'https://example.com/sitemap.xml')
  assert.ok(Array.isArray(robots.rules))
  for (const agent of ['*', 'OAI-SearchBot', 'PerplexityBot']) {
    const rule: RobotRule = robots.rules.find(
      (entry) => entry.userAgent === agent,
    )!
    assert.equal(rule.allow, '/')
    assert.deepEqual(rule.disallow, [
      '/sammenlign$',
      '/sammenlign?',
      '/sammenlign/',
    ])
  }
  for (const agent of ['GPTBot', 'Google-Extended']) {
    const rule: RobotRule = robots.rules.find(
      (entry) => entry.userAgent === agent,
    )!
    assert.equal(rule.disallow, '/')
    assert.equal(rule.allow, undefined)
  }
})

test('each bot is configurable independently and preserves interactive-tool exclusions', () => {
  for (const agent of Object.keys(site.crawlers) as (keyof CrawlerPolicy)[]) {
    const robots = buildRobots(true, 'https://example.com', {
      ...site.crawlers,
      [agent]: !site.crawlers[agent],
    })
    assert.ok(Array.isArray(robots.rules))
    for (const rule of robots.rules.filter(
      (entry) => entry.userAgent !== '*',
    )) {
      const name = rule.userAgent as keyof CrawlerPolicy
      const allowed =
        name === agent ? !site.crawlers[name] : site.crawlers[name]
      assert.equal(rule.allow, allowed ? '/' : undefined)
      if (allowed) assert.notEqual(rule.disallow, '/')
      else assert.equal(rule.disallow, '/')
    }
  }
})

test('demo blocks wildcard and every explicit agent even if configured to allow them', () => {
  const robots = buildRobots(false, 'https://example.com', {
    'OAI-SearchBot': true,
    PerplexityBot: true,
    GPTBot: true,
    'Google-Extended': true,
  })
  assert.equal(robots.sitemap, undefined)
  assert.ok(Array.isArray(robots.rules))
  assert.equal(robots.rules.length, 5)
  for (const rule of robots.rules) {
    assert.equal(rule.disallow, '/')
    assert.equal(rule.allow, undefined)
  }
})

test('llms index contains canonical local article links and disclosure', () => {
  const text = buildLlmsText({ ...site, url: 'https://example.com' }, [
    {
      title: 'En [anmeldelse]',
      description: 'Kort\nbeskrivelse',
      path: '/anmeldelser/test',
    },
    {
      title: 'Sammenligning',
      description: 'To produkter',
      path: '/sammenligninger/test',
    },
  ])
  assert.match(text, /https:\/\/example\.com\/anmeldelser\/test/)
  assert.match(text, /https:\/\/example\.com\/sammenligninger\/test/)
  assert.match(text, /https:\/\/example\.com\/sitemap\.xml/)
  assert.ok(text.includes('En \\[anmeldelse\\]'))
  assert.ok(text.includes('Kort beskrivelse'))
  assert.ok(text.includes(site.affiliateDisclosure))
})
