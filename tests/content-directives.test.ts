import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ArticleMarkdown } from '../src/components/article-markdown'
import {
  isSafeEditorialLink,
  validateArticleContent,
} from '../src/lib/content-directives'
import {
  getPrograms,
  parsePrograms,
  type ApprovedProgram,
} from '../src/lib/programs'
import type { Product } from '../src/lib/types'

const program: ApprovedProgram = {
  id: 'shop',
  name: 'Testbutikken',
  url: 'https://shop.example/direct',
  affiliateUrl:
    'https://www.partner-ads.com/dk/klikbanner.php?bannerid=123&partnerid=456',
  approved: true,
}
const product: Product = {
  id: 'stable-id',
  slug: 'stable-product',
  name: 'Testprodukt',
  brand: 'Testmærke',
  category: 'Køkken',
  description: 'Et produkt til testen.',
  image: '/images/coffee.svg',
  imageAlt: 'En kaffemaskine',
  features: [],
  specs: {},
  offers: [
    {
      id: 'offer-1',
      merchant: 'Testbutikken',
      price: 99,
      shipping: 0,
      currency: 'DKK',
      inStock: true,
      url: 'https://shop.example/product',
      affiliateUrl: program.affiliateUrl,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'offer-2',
      merchant: 'Anden butik',
      price: 89,
      shipping: 20,
      currency: 'DKK',
      inStock: true,
      url: 'https://other-shop.example/product',
      affiliateUrl: program.affiliateUrl,
      updatedAt: new Date().toISOString(),
    },
  ],
}

function validate(content: string, products = [product]) {
  return validateArticleContent(content, products, {
    programs: [program],
    source: 'content/example.md',
  })
}

test('directives resolve typed approved data and count every possible sponsored link', () => {
  const content = [
    '::product{slug="stable-product"}',
    '::offer-table{slug="stable-product"}',
    '::cta{program="shop" label="Se udvalget"}',
  ].join('\n\n')
  assert.deepEqual(validate(content), {
    directives: [
      { type: 'product', slug: 'stable-product' },
      { type: 'offer-table', slug: 'stable-product' },
      { type: 'cta', program: 'shop', label: 'Se udvalget' },
    ],
    affiliateTextLinks: 4,
  })
  const unavailable = {
    ...product,
    offers: product.offers.map((offer) => ({ ...offer, inStock: false })),
  }
  assert.equal(validate(content, [unavailable]).affiliateTextLinks, 4)
  assert.equal(
    validate('::product{slug="stable-product"}', [{ ...product, offers: [] }])
      .affiliateTextLinks,
    1,
  )
})

test('unknown and malformed directives fail with article and line diagnostics', () => {
  for (const [content, message] of [
    ['::mystery{slug="stable-product"}', /unknown directive/],
    ['::product{slug="missing"}', /unknown product slug/],
    ['::product{}', /requires slug/],
    ['::product{slug=""}', /requires slug/],
    [
      '::product{slug="stable-product" url="https://shop.example"}',
      /unknown product attribute/,
    ],
    [
      '::offer-table{slug="stable-product" class="wide"}',
      /unknown offer-table attribute/,
    ],
    ['::cta{program="missing" label="Shop"}', /unknown or unapproved program/],
    ['::cta{program="shop"}', /requires label/],
    ['::cta{program="shop" label=" "}', /requires label/],
    [
      '::cta{program="shop" label="Shop" url="https://shop.example"}',
      /unknown cta attribute/,
    ],
    [':product[Inline]{slug="stable-product"}', /must be a ::product/],
    [':::product{slug="stable-product"}\nContent\n:::', /must be a ::product/],
    [
      '::product[Label]{slug="stable-product"}',
      /does not accept inline content/,
    ],
  ] as const) {
    assert.throws(() => validate(`Paragraph.\n\n${content}`), message, content)
    assert.throws(
      () => validate(`Paragraph.\n\n${content}`),
      /content\/example\.md:3/,
    )
  }
})

test('frontmatter product references use the same catalog and fail before rendering', () => {
  assert.throws(
    () =>
      validateArticleContent('Text.', [product], { productSlugs: ['missing'] }),
    /unknown frontmatter product slug "missing"/,
  )
  assert.equal(
    validateArticleContent('Text.', [product], { productSlugs: [product.slug] })
      .affiliateTextLinks,
    0,
  )
})

test('Markdown tracking links are rejected, including references and browser-normalized hosts', () => {
  const tracking = [
    'https://www.partner-ads.com/dk/klikbanner.php?bannerid=123',
    'https://WWW.PARTNER-ADS.COM./dk/klikbanner.php',
    'https://tracking.partner-ads.com/redirect',
    '//www.partner-ads.com/dk/klikbanner.php',
    'https://%70artner-ads.com/redirect',
    'https://www%2epartner-ads%2ecom/redirect',
    'https://ｐａｒｔｎｅｒ-ａｄｓ.com/redirect',
    'https://partner-ads。com/redirect',
    'https://partner-ads.com:443/redirect',
    'https://source.example@partner-ads.com/redirect',
  ]
  for (const url of tracking) {
    assert.equal(isSafeEditorialLink(url), false, url)
    for (const content of [
      `[Butik](${url})`,
      `[Butik][shop]\n\n[shop]: ${url}`,
      `<${url}>`,
    ]) {
      // Protocol-relative autolinks are not links in CommonMark; the first two are.
      if (content.startsWith('<//')) continue
      assert.throws(() => validate(content), /unsafe Markdown link/, content)
    }
  }
  assert.throws(
    () => validate('[Unused]: https://partner-ads.com/redirect'),
    /unsafe Markdown link/,
  )
  assert.throws(
    () => validate('[Butik](https://partner&#45;ads.com/link)'),
    /unsafe Markdown link/,
  )
})

test('source link safety accepts local links and HTTPS while rejecting unsafe URL forms', () => {
  for (const url of [
    '/',
    '/guides/good-guide',
    './guide',
    '../guides',
    '#sources',
    '?page=2',
    'https://source.example/report?query=two%20words#results',
    'https://partner-ads.com.example/report',
  ]) {
    assert.equal(isSafeEditorialLink(url), true, url)
    assert.doesNotThrow(() => validate(`[Kilde](${url})`))
  }
  for (const url of [
    'http://source.example',
    '//source.example',
    'javascript:alert(1)',
    'data:text/html,test',
    'mailto:user@example.com',
    'https:source.example',
    'https://name:password@source.example',
    'https://source.example/\nredirect',
    'https:\\partner-ads.com\\redirect',
    '/\\partner-ads.com/redirect',
    ' https://source.example',
    'https://source.example ',
  ])
    assert.equal(isSafeEditorialLink(url), false, url)
})

test('the approved program registry fails closed on incomplete or unsafe configuration', () => {
  assert.deepEqual(
    getPrograms(),
    [],
    'the template must not ship approved advertisers',
  )
  assert.deepEqual(parsePrograms([program]), [program])
  for (const patch of [
    { id: '' },
    { name: '' },
    { approved: false },
    { approved: 'true' },
    { approved: undefined },
    { url: 'https://partner-ads.com/link' },
    { url: 'https://PARTNER-ADS.COM./link' },
    { url: 'https://%70artner-ads.com/link' },
    { url: 'http://shop.example/link' },
    { url: 'https://user:pass@shop.example/link' },
    { affiliateUrl: undefined },
    { affiliateUrl: 'javascript:alert(1)' },
    { affiliateUrl: 'http://partner-ads.com/link' },
    { typo: 'ignored?' },
  ])
    assert.throws(
      () => parsePrograms([{ ...program, ...patch }]),
      /programs.json/,
      JSON.stringify(patch),
    )
  assert.throws(() => parsePrograms([program, program]), /duplicate program id/)
  assert.throws(() => parsePrograms({}), /array/)
})

test('server-rendered monetisation uses direct sponsored links before consent', () => {
  const html = renderToStaticMarkup(
    createElement(ArticleMarkdown, {
      content:
        '::product{slug="stable-product"}\n\n::offer-table{slug="stable-product"}\n\n::cta{program="shop" label="Se udvalget"}',
      products: [product],
      programs: [program],
    }),
  )
  assert.match(html, /Testprodukt/)
  assert.match(html, /Priser hos forhandlerne/)
  assert.match(html, /Se udvalget/)
  assert.match(html, /Reklame/)
  assert.match(html, /href="https:\/\/shop.example\/direct"/)
  assert.match(html, /href="https:\/\/shop.example\/product"/)
  assert.equal(
    (html.match(/rel="sponsored nofollow noopener noreferrer"/g) ?? []).length,
    4,
  )
  assert.doesNotMatch(html, /partner-ads/)
})

test('article rendering keeps raw HTML disabled and excludes Markdown images', () => {
  const html = renderToStaticMarkup(
    createElement(ArticleMarkdown, {
      content: [
        '<script src="https://tracker.example/script.js"></script>',
        '<img src="https://tracker.example/pixel.png">',
        '<a href="https://partner-ads.com/redirect">unsafe HTML</a>',
        '![Tracking pixel](https://tracker.example/image.jpg)',
        '[Kilde](https://source.example/report)',
        '[Guide](/guides/example)',
      ].join('\n\n'),
      products: [],
    }),
  )
  assert.doesNotMatch(html, /<script|<img|tracker.example|partner-ads/)
  assert.match(
    html,
    /href="https:\/\/source.example\/report" rel="noopener noreferrer"/,
  )
  assert.match(html, /href="\/guides\/example"/)
})

test('renderer repeats validation so an unchecked runtime caller cannot emit tracking links', () => {
  assert.throws(
    () =>
      renderToStaticMarkup(
        createElement(ArticleMarkdown, {
          content: '[Butik](https://partner-ads.com/redirect)',
          products: [],
        }),
      ),
    /unsafe Markdown link/,
  )
})
