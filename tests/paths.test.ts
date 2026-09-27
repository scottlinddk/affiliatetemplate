import assert from 'node:assert/strict'
import test from 'node:test'
import {
  absoluteSiteUrl,
  normalizeBasePath,
  withBasePath,
} from '../src/lib/paths'

test('deployment paths support a domain root or nested project path', () => {
  assert.equal(normalizeBasePath(undefined), '')
  assert.equal(normalizeBasePath('/'), '')
  assert.equal(normalizeBasePath('/affiliatetemplate/'), '/affiliatetemplate')
  assert.equal(normalizeBasePath('/sites/my-template'), '/sites/my-template')
  assert.equal(normalizeBasePath('/my.template'), '/my.template')
  for (const value of [
    'project',
    '//project',
    '/project?x=1',
    '/project#top',
    '/a/../b',
    '/a/./b',
  ]) {
    assert.throws(() => normalizeBasePath(value), /NEXT_PUBLIC_BASE_PATH/)
  }
})

test('public assets receive the prefix once while external URLs are untouched', () => {
  const prefix = '/affiliatetemplate'
  assert.equal(
    withBasePath('/images/chair.svg', prefix),
    `${prefix}/images/chair.svg`,
  )
  assert.equal(
    withBasePath('/images/placeholder.svg', prefix),
    `${prefix}/images/placeholder.svg`,
  )
  assert.equal(
    withBasePath(`${prefix}/images/chair.svg`, prefix),
    `${prefix}/images/chair.svg`,
  )
  assert.equal(
    withBasePath('/affiliatetemplate-more', prefix),
    `${prefix}/affiliatetemplate-more`,
  )
  for (const value of [
    'https://merchant.example/image.jpg',
    '//merchant.example/image.jpg',
    '#priser',
    'mailto:hello@example.com',
  ]) {
    assert.equal(withBasePath(value, prefix), value)
  }
  assert.equal(withBasePath('/images/chair.svg', ''), '/images/chair.svg')
})

test('absolute URLs preserve the deployment prefix for metadata, sitemap and schema', () => {
  const origin = 'https://scottlinddk.github.io'
  const prefix = '/affiliatetemplate'
  assert.equal(absoluteSiteUrl('/', origin, prefix), `${origin}${prefix}/`)
  assert.equal(
    absoluteSiteUrl('/sitemap.xml', origin, prefix),
    `${origin}${prefix}/sitemap.xml`,
  )
  assert.equal(
    absoluteSiteUrl('/produkter/kaffe', origin, prefix),
    `${origin}${prefix}/produkter/kaffe`,
  )
  assert.equal(
    absoluteSiteUrl('/images/coffee.svg', origin, ''),
    `${origin}/images/coffee.svg`,
  )
  assert.equal(
    absoluteSiteUrl('https://merchant.example/image.jpg', origin, prefix),
    'https://merchant.example/image.jpg',
  )
})
