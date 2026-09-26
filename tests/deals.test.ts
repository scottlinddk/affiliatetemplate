import test from 'node:test'
import assert from 'node:assert/strict'
import { isActiveDeal } from '../src/lib/deals'
import type { Deal } from '../src/lib/types'
const deal: Deal = {
  id: 'offer',
  title: 'Campaign',
  merchant: 'Merchant',
  description: 'A real campaign',
  startsAt: '2026-09-01T00:00:00Z',
  expiresAt: '2026-10-01T00:00:00Z',
  url: 'https://example.com',
  terms: 'Terms',
}
test('deals are only active between their inclusive start and exclusive expiry', () => {
  assert.equal(isActiveDeal(deal, Date.parse(deal.startsAt)), true)
  assert.equal(isActiveDeal(deal, Date.parse(deal.expiresAt)), false)
  assert.equal(isActiveDeal(deal, Date.parse(deal.startsAt) - 1), false)
  assert.equal(isActiveDeal({ ...deal, expiresAt: 'bad-date' }), false)
})
test('campaign links reject script schemes and embedded credentials', () => {
  const now = Date.parse('2026-09-26T00:00:00Z')
  assert.equal(
    isActiveDeal({ ...deal, url: 'javascript:alert(1)' }, now),
    false,
  )
  assert.equal(
    isActiveDeal({ ...deal, affiliateUrl: 'https://secret@example.com' }, now),
    false,
  )
})

test('a campaign cannot use an affiliate tracking hop as its direct fallback', () => {
  const now = Date.parse('2026-09-26T00:00:00Z')
  for (const host of [
    'partner-ads.com',
    'www.partner-ads.com',
    'WWW.PARTNER-ADS.COM.',
    'tracking.partner-ads.com',
  ]) {
    const tracking = `https://${host}/dk/klikbanner.php?partnerid=1&bannerid=2&htmlurl=https%3A%2F%2Fshop.example`
    assert.equal(isActiveDeal({ ...deal, url: tracking }, now), false, host)
    assert.equal(
      isActiveDeal({ ...deal, affiliateUrl: tracking }, now),
      true,
      host,
    )
  }
  assert.equal(
    isActiveDeal(
      { ...deal, affiliateUrl: 'http://network.example/click' },
      now,
    ),
    false,
  )
})
