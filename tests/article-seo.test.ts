import assert from 'node:assert/strict'
import test from 'node:test'
import {
  articleMetadata,
  articleStructuredData,
  serializeStructuredData,
} from '../src/lib/article-seo'
import type { Guide } from '../src/lib/types'

const article: Guide = {
  slug: 'a-review',
  type: 'review',
  title: 'A useful review',
  description: 'Description',
  category: 'Coffee',
  date: '2026-09-01',
  updated: '2026-09-27',
  author: 'Example Author',
  image: '/images/coffee.svg',
  content: 'Body',
  readingTime: 1,
  faq: [{ q: 'A question?', a: 'The visible answer.' }],
}

test('article metadata uses type routes, explicit author and genuine modified date', () => {
  const metadata = articleMetadata(article)
  assert.equal(metadata.alternates?.canonical, '/anmeldelser/a-review')
  assert.deepEqual(metadata.authors, [{ name: 'Example Author' }])
  assert.equal(
    (metadata.openGraph as { modifiedTime: string }).modifiedTime,
    '2026-09-27',
  )
  assert.equal(
    (
      articleMetadata({ ...article, updated: undefined }).openGraph as {
        modifiedTime?: string
      }
    ).modifiedTime,
    undefined,
  )
})

test('Article, BreadcrumbList and FAQPage reflect the same visible content', () => {
  const structured = articleStructuredData(article)
  const parsed = JSON.parse(JSON.stringify(structured))
  assert.deepEqual(
    parsed.map((entry: { '@type': string }) => entry['@type']),
    ['Article', 'BreadcrumbList', 'FAQPage'],
  )
  assert.equal(parsed[0].author.name, article.author)
  assert.equal(parsed[0].dateModified, article.updated)
  assert.equal(parsed[1].itemListElement[2].name, article.title)
  assert.match(parsed[1].itemListElement[1].item, /\/anmeldelser$/)
  assert.deepEqual(parsed[2].mainEntity, [
    {
      '@type': 'Question',
      name: article.faq![0].q,
      acceptedAnswer: { '@type': 'Answer', text: article.faq![0].a },
    },
  ])
  const minimal = JSON.parse(
    JSON.stringify(
      articleStructuredData({
        ...article,
        author: undefined,
        updated: undefined,
        faq: undefined,
      }),
    ),
  )
  assert.equal(minimal.length, 2)
  assert.equal(minimal[0].author, undefined)
  assert.equal(minimal[0].dateModified, undefined)
})

test('structured data serialization cannot terminate the script element', () => {
  const payload = { title: '</script><script>alert(1)</script>' }
  const serialized = serializeStructuredData(payload)
  assert.ok(!serialized.includes('<'))
  assert.deepEqual(JSON.parse(serialized), payload)
})
