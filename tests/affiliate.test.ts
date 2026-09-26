import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AffiliateLink } from '../src/components/affiliate-link'
import {
  bestOffer,
  buildAffiliateUrl,
  formatPrice,
  getOfferStatus,
  isDirectMerchantUrl,
  isSafeAffiliateUrl,
  isSafeHttpUrl,
} from '../src/lib/affiliate'
import type { Offer, Product } from '../src/lib/types'

const now = Date.parse('2026-09-26T12:00:00.000Z')
const day = 24 * 60 * 60 * 1000
const offer = (overrides: Partial<Offer> = {}): Offer => ({
  id: 'one',
  merchant: 'Example',
  price: 100,
  currency: 'DKK',
  shipping: 0,
  inStock: true,
  url: 'https://shop.example/product',
  updatedAt: new Date(now).toISOString(),
  ...overrides,
})
const product = (offers: Offer[]): Product => ({
  id: 'product',
  slug: 'product',
  name: 'Product',
  brand: 'Example',
  category: 'Home',
  description: '',
  image: '',
  imageAlt: '',
  features: [],
  specs: {},
  offers,
})

test('merchant destinations reject executable, relative and credential-bearing URLs', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,hello',
    '/product',
    '//shop.example',
    '',
    'https://user:secret@shop.example',
    'https://shop.example/\nproduct',
  ]) {
    assert.equal(isSafeHttpUrl(url), false, url)
  }
  assert.equal(
    isSafeHttpUrl('https://shop.example/a?colour=blue#details'),
    true,
  )
  assert.equal(isSafeHttpUrl('http://shop.example/product'), true)
})

test('deeplinks keep merchant query parameters and fragments intact and uid before htmlurl', () => {
  const destination =
    'https://shop.example/products/æble?size=large&colour=blue#details'
  const link = buildAffiliateUrl({
    partnerId: '123',
    bannerId: '456',
    url: destination,
    uid: 'home & products',
  })
  assert.ok(link)
  const parsed = new URL(link)
  assert.equal(parsed.origin, 'https://www.partner-ads.com')
  assert.equal(parsed.pathname, '/dk/klikbanner.php')
  assert.equal(parsed.searchParams.get('partnerid'), '123')
  assert.equal(parsed.searchParams.get('bannerid'), '456')
  assert.equal(parsed.searchParams.get('uid'), 'home & products')
  assert.equal(parsed.searchParams.get('htmlurl'), new URL(destination).href)
  assert.ok(link.indexOf('&uid=') < link.indexOf('&htmlurl='))
  assert.equal(parsed.hash, '')
})

test('deeplinks fail closed for missing account, invalid IDs, unsafe destination or uid', () => {
  const options = {
    partnerId: '123',
    bannerId: '456',
    url: 'https://shop.example/product',
  }
  for (const id of ['', '0', '-1', '1.5', ' 123', '123&uid=bad']) {
    assert.equal(buildAffiliateUrl({ ...options, partnerId: id }), null)
    assert.equal(buildAffiliateUrl({ ...options, bannerId: id }), null)
  }
  assert.equal(
    buildAffiliateUrl({ ...options, url: 'javascript:alert(1)' }),
    null,
  )
  assert.equal(buildAffiliateUrl({ ...options, uid: 'bad\nvalue' }), null)
  assert.equal(
    new URL(buildAffiliateUrl(options)!).searchParams.has('uid'),
    false,
  )
})

test('price freshness expires after seven days and rejects invalid or implausible future dates', () => {
  assert.equal(
    getOfferStatus(
      offer({ updatedAt: new Date(now - 7 * day).toISOString() }),
      now,
    ),
    'current',
  )
  assert.equal(
    getOfferStatus(
      offer({ updatedAt: new Date(now - 7 * day - 1).toISOString() }),
      now,
    ),
    'stale',
  )
  assert.equal(getOfferStatus(offer({ updatedAt: 'invalid' }), now), 'stale')
  assert.equal(
    getOfferStatus(
      offer({ updatedAt: new Date(now + day + 1).toISOString() }),
      now,
    ),
    'stale',
  )
  assert.equal(
    getOfferStatus(offer({ inStock: false, updatedAt: 'invalid' }), now),
    'unavailable',
  )
})

test('best offer includes shipping and excludes stale, unavailable and invalid prices without mutating catalog', () => {
  const offers = [
    offer({ id: 'costly-shipping', price: 80, shipping: 50 }),
    offer({ id: 'best', price: 100, shipping: 10 }),
    offer({
      id: 'stale',
      price: 5,
      updatedAt: new Date(now - 8 * day).toISOString(),
    }),
    offer({ id: 'unavailable', price: 1, inStock: false }),
    offer({ id: 'invalid', price: -1 }),
    offer({ id: 'invalid-shipping', price: 10, shipping: Number.NaN }),
  ]
  assert.equal(bestOffer(product(offers), now)?.id, 'best')
  assert.equal(offers[0].id, 'costly-shipping')
  assert.equal(bestOffer(product([]), now), undefined)
  assert.equal(bestOffer(product([offer({ inStock: false })]), now), undefined)
})

test('currency formatting handles Danish amounts and invalid values', () => {
  assert.match(formatPrice(1299.5), /1\.299,50/)
  assert.match(formatPrice(12, 'EUR'), /12,00/)
  assert.equal(formatPrice(Number.NaN), '—')
})

test('direct destinations reject Partner-ads tracking hosts including DNS aliases', () => {
  for (const host of [
    'partner-ads.com',
    'www.partner-ads.com',
    'TRACK.partner-ads.com',
    'WWW.PARTNER-ADS.COM.',
    'partner-ads.com.',
  ]) {
    const url = `https://${host}/dk/klikbanner.php?partnerid=123&bannerid=456&htmlurl=https%3A%2F%2Fshop.example`
    assert.equal(isDirectMerchantUrl(url), false, host)
    assert.equal(
      buildAffiliateUrl({ partnerId: '123', bannerId: '456', url }),
      null,
      host,
    )
  }
  assert.equal(
    isDirectMerchantUrl('https://shop.example/products?source=partner-ads.com'),
    true,
  )
  assert.equal(
    isDirectMerchantUrl('https://partner-ads.com.shop.example/product'),
    true,
  )
  assert.equal(isDirectMerchantUrl('http://shop.example/product'), true)
  assert.equal(isDirectMerchantUrl('javascript:alert(1)'), false)
})

test('optional affiliate links must use HTTPS without embedded credentials', () => {
  assert.equal(
    isSafeAffiliateUrl(
      'https://www.partner-ads.com/dk/klikbanner.php?partnerid=1&bannerid=2',
    ),
    true,
  )
  assert.equal(
    isSafeAffiliateUrl('https://another-network.example/click'),
    true,
  )
  assert.equal(
    isSafeAffiliateUrl('http://www.partner-ads.com/dk/klikbanner.php'),
    false,
  )
  assert.equal(
    isSafeAffiliateUrl('https://secret@another-network.example/click'),
    false,
  )
})

test('initial affiliate link markup uses a direct fallback and refuses a tracking fallback', () => {
  const destination = 'https://shop.example/product'
  const tracked = buildAffiliateUrl({
    partnerId: '123',
    bannerId: '456',
    url: destination,
  })!
  const valid = renderToStaticMarkup(
    // eslint-disable-next-line react/no-children-prop -- createElement's TypeScript overload requires this component's mandatory children prop.
    createElement(AffiliateLink, {
      url: destination,
      affiliateUrl: tracked,
      children: 'Besøg butik',
    }),
  )
  assert.match(valid, /href="https:\/\/shop\.example\/product"/)
  assert.doesNotMatch(valid, /klikbanner|partner-ads\.com/)
  const unsafe = renderToStaticMarkup(
    // eslint-disable-next-line react/no-children-prop -- Keep the component's required children type intact in this non-JSX test.
    createElement(AffiliateLink, {
      url: tracked,
      affiliateUrl: tracked,
      children: 'Besøg butik',
    }),
  )
  assert.doesNotMatch(unsafe, /<a\b|href=/)
  assert.match(unsafe, /aria-disabled="true"/)
  assert.match(unsafe, /Linket er ikke tilgængeligt/)
})
