import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BannerContent } from '../src/components/banner'
import {
  getBannerForPlacement,
  parseBanners,
  type Banner,
} from '../src/lib/banners'

const banner: Banner = {
  id: 'approved-home',
  title: 'Annonce fra testforhandler',
  image: 'https://merchant.example/original-banner.jpg',
  alt: 'Annonce med en kaffemaskine fra testforhandler',
  url: 'https://merchant.example/coffee',
  affiliateUrl:
    'https://www.partner-ads.com/dk/klikbanner.php?bannerid=123&partnerid=456',
  width: 728,
  height: 90,
  approved: true,
  placement: 'home',
}

test('banner config requires advertiser approval, dimensions, accessible text, and safe URLs', () => {
  assert.deepEqual(parseBanners([banner]), [banner])
  for (const patch of [
    { approved: false },
    { approved: 'true' },
    { approved: undefined },
    { width: 0 },
    { height: 1.5 },
    { width: 5000 },
    { alt: '' },
    { title: ' ' },
    { placement: 'unknown' },
    { id: '<script>' },
    { image: 'http://merchant.example/banner.jpg' },
    { image: 'data:image/svg+xml,<svg/>' },
    { image: 'https://user:password@merchant.example/banner.jpg' },
    { image: '/cached-advertiser-banner.jpg' },
    { url: 'javascript:alert(1)' },
    { url: 'https://www.partner-ads.com/dk/klikbanner.php?bannerid=123' },
    { url: 'https://www.partner-ads.com./dk/klikbanner.php?bannerid=123' },
    { url: 'https://track.partner-ads.com/link' },
    { affiliateUrl: 'javascript:alert(1)' },
    { affiliateUrl: 'https://merchant.example/\nlink' },
  ])
    assert.deepEqual(
      parseBanners([{ ...banner, ...patch }]),
      [],
      JSON.stringify(patch),
    )
  assert.deepEqual(parseBanners(null), [])
  assert.deepEqual(parseBanners({ banner }), [])
  assert.equal(parseBanners([banner, banner]).length, 1)
})

test('each placement selects only its first valid approved creative', () => {
  const product: Banner = { ...banner, id: 'product', placement: 'product' }
  const second: Banner = { ...banner, id: 'second-home' }
  const configuration = [
    { ...banner, approved: false },
    banner,
    second,
    product,
  ]
  assert.deepEqual(getBannerForPlacement('home', configuration), banner)
  assert.deepEqual(getBannerForPlacement('product', configuration), product)
  assert.equal(getBannerForPlacement('home', []), undefined)
  assert.equal(
    getBannerForPlacement('home'),
    undefined,
    'the distributed template has no live advertisers',
  )
})

test('without marketing consent banner markup has no image, preload, or tracking destination', () => {
  const html = renderToStaticMarkup(
    createElement(BannerContent, { banner, marketing: false }),
  )
  assert.match(html, /Reklame/)
  assert.match(html, /https:\/\/merchant\.example\/coffee/)
  assert.doesNotMatch(html, /<img|<link|src=|partner-ads|original-banner/)
})

test('with consent the original advertiser image and approved affiliate link are used', () => {
  const html = renderToStaticMarkup(
    createElement(BannerContent, { banner, marketing: true }),
  )
  assert.match(html, /src="https:\/\/merchant\.example\/original-banner\.jpg"/)
  assert.match(html, /partner-ads\.com/)
  assert.match(html, /rel="sponsored nofollow noopener noreferrer"/)
  assert.match(html, /loading="lazy"/)
  assert.match(html, /Reklame/)
  assert.doesNotMatch(html, /_next\/image/)
})
