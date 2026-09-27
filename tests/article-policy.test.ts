import assert from 'node:assert/strict'
import test from 'node:test'
import { validateArticlePolicy } from '../src/lib/article-policy'

const banner = {
  id: 'inline',
  title: 'An approved banner',
  alt: 'Banner',
  image: 'https://shop.example/banner.jpg',
  url: 'https://shop.example/',
  width: 728,
  height: 90,
  approved: true,
  placement: 'article-inline',
}

test('article budget counts both configured banner fallback links across slots', () => {
  const banners = [banner, { ...banner, id: 'end', placement: 'article-end' }]
  assert.doesNotThrow(() => validateArticlePolicy(3, 'test-post', banners))
  assert.throws(
    () => validateArticlePolicy(4, 'test-post', banners),
    /test-post.*5-banner\/5-text-link/,
  )
  assert.doesNotThrow(() => validateArticlePolicy(5, 'test-post', []))
  assert.throws(() => validateArticlePolicy(6, 'test-post', []), /exceeds/)
})

test('unused creatives and other page slots do not inflate the article budget', () => {
  assert.doesNotThrow(() =>
    validateArticlePolicy(4, 'test', [
      banner,
      { ...banner, id: 'second' },
      { ...banner, id: 'home', placement: 'home' },
      {
        ...banner,
        id: 'unapproved',
        placement: 'article-end',
        approved: false,
      },
    ]),
  )
})
