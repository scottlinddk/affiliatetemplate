import assert from 'node:assert/strict'
import test from 'node:test'
import { bestOffer, lowestPriceOffer } from '../src/lib/affiliate'
import type { Offer, Product } from '../src/lib/types'

const now = Date.parse('2026-09-26T12:00:00.000Z')
const offer = (patch: Partial<Offer> = {}): Offer => ({
  id: 'offer',
  merchant: 'Testforhandler',
  price: 100,
  currency: 'DKK',
  shipping: 0,
  inStock: true,
  url: 'https://merchant.example/product',
  updatedAt: new Date(now).toISOString(),
  ...patch,
})
const product = (offers: Offer[], demo = false): Product => ({
  id: 'product',
  slug: 'product',
  name: 'Testprodukt',
  brand: 'Test',
  category: 'Test',
  description: '',
  image: '',
  imageAlt: '',
  features: [],
  specs: {},
  offers,
  demo,
})

test('the lowest base price and lowest delivered price can belong to different merchants', () => {
  const offers = [
    offer({ id: 'lowest-delivered', price: 100, shipping: 0 }),
    offer({ id: 'lowest-base', price: 80, shipping: 50 }),
  ]
  const item = product(offers)
  assert.equal(lowestPriceOffer(item, now)?.id, 'lowest-base')
  assert.equal(bestOffer(item, now)?.id, 'lowest-delivered')
  assert.deepEqual(
    offers.map((entry) => entry.id),
    ['lowest-delivered', 'lowest-base'],
  )
})

test('demo base prices remain visible when the fixed sample date ages, while live offers expire', () => {
  const oldOffer = offer({ updatedAt: '2026-01-01T00:00:00.000Z' })
  assert.equal(lowestPriceOffer(product([oldOffer], true), now), oldOffer)
  assert.equal(lowestPriceOffer(product([oldOffer]), now), undefined)
  assert.equal(
    lowestPriceOffer(product([{ ...oldOffer, inStock: false }], true), now),
    undefined,
  )
})

test('lowest displayed prices ignore unsafe links, unavailable offers, and invalid amounts', () => {
  const item = product([
    offer({ id: 'good', price: 100 }),
    offer({ id: 'unsafe', price: 1, url: 'javascript:alert(1)' }),
    offer({ id: 'unavailable', price: 1, inStock: false }),
    offer({ id: 'negative', price: -1 }),
    offer({ id: 'nan', price: Number.NaN }),
    offer({ id: 'negative-delivery', price: 1, shipping: -1 }),
    offer({ id: 'invalid-date', price: 1, updatedAt: 'invalid' }),
  ])
  assert.equal(lowestPriceOffer(item, now)?.id, 'good')
  assert.equal(lowestPriceOffer(product([]), now), undefined)
})
