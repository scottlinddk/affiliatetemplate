import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { stringify } from 'yaml'
import {
  getGuide,
  getGuides,
  getRelatedGuides,
  parseGuide,
  validateGuideImage,
  validateGuideReferences,
} from '../src/lib/guides'
import type { Guide } from '../src/lib/types'

const base = {
  title: 'God kaffe',
  description: 'Vælg kaffe til din hverdag.',
  category: 'Kaffe',
  date: '2026-09-24',
  image: '/images/coffee.svg',
}

function markdown(
  patch: Record<string, unknown> = {},
  body = 'En praktisk guide.',
): string {
  return `---\n${stringify({ ...base, ...patch })}---\n\n${body}\n`
}

function guide(slug: string, patch: Record<string, unknown> = {}): Guide {
  return parseGuide(slug, markdown(patch))
}

test('existing documents default to guide and preserve their stable filenames', () => {
  const parsed = guide('god-kaffe')
  assert.equal(parsed.type, 'guide')
  assert.equal(parsed.slug, 'god-kaffe')
  assert.equal(parsed.date, base.date)
  assert.equal(parsed.readingTime, 1)
  assert.match(parsed.content, /En praktisk guide\./)
  assert.equal(parsed.updated, undefined)
  assert.equal(parsed.author, undefined)
  assert.deepEqual(
    parseGuide('god-kaffe', markdown().replace(/\n/g, '\r\n')),
    parsed,
  )
  assert.equal(
    parseGuide('long-read', markdown({}, 'ord '.repeat(401))).readingTime,
    3,
  )
  assert.equal(getGuide('../package'), undefined)
  assert.equal(getGuide('no-such-content-file'), undefined)
  assert.ok(getGuides().length >= 3)
  assert.ok(getGuides('guide').every((item) => item.type === 'guide'))
  for (const item of getGuides()) assert.ok(getGuide(item.slug))
})

test('review and comparison frontmatter preserves rendered editorial fields', () => {
  const fields = {
    updated: '2026-09-25',
    author: 'Anna Hansen',
    products: ['kaffemaskine-et', 'kaffemaskine-to'],
    verdict: 'Et godt valg til det lille køkken.',
    faq: [{ q: 'Hvor meget kaffe?', a: 'Vælg ud fra dit daglige behov.' }],
    sources: [
      {
        title: 'Producentens vejledning',
        url: 'https://manufacturer.example/manual',
      },
    ],
    related: ['kaffe-guide'],
    pillar: 'kaffe-guide',
  }
  for (const type of ['review', 'comparison'] as const) {
    const parsed = guide('kaffe-test', { type, ...fields })
    for (const key of Object.keys(fields) as (keyof typeof fields)[])
      assert.deepEqual(parsed[key], fields[key])
    assert.equal(parsed.type, type)
  }
  for (const type of ['guide', 'post']) {
    const parsed = guide('kaffe-artikel', {
      type,
      faq: fields.faq,
      sources: fields.sources,
    })
    assert.deepEqual(parsed.faq, fields.faq)
    assert.deepEqual(parsed.sources, fields.sources)
    assert.throws(
      () => guide('kaffe-artikel', { type, products: fields.products }),
      /only available for review and comparison/,
    )
    assert.throws(
      () => guide('kaffe-artikel', { type, verdict: fields.verdict }),
      /only available for review and comparison/,
    )
  }
})

test('unknown keys and malformed shared or nested fields fail with the content slug', () => {
  for (const patch of [
    { udpated: '2026-09-25' },
    { type: 'news' },
    { type: null },
    { title: ' ' },
    { description: false },
    { category: [] },
    { author: { name: 'Anna' } },
    { author: '' },
    { faq: {} },
    { faq: [{ q: 'Question?', a: '' }] },
    { faq: [{ question: 'Question?', a: 'Answer.' }] },
    { faq: [null] },
    { sources: 'https://example.com' },
    { sources: [{ title: '', url: 'https://example.com' }] },
    { sources: [{ title: 'Title', url: 'https://example.com', link: 'typo' }] },
    { type: 'review', products: 'kaffe' },
    { type: 'review', products: [] },
    { type: 'review', products: ['kaffe', 'kaffe'] },
    { type: 'review', products: ['../kaffe'] },
    { type: 'review', verdict: '' },
    { related: ['kaffe', 'kaffe'] },
    { related: ['a', 'b', 'c', 'd', 'e', 'f'] },
    { related: ['invalid slug'] },
    { related: ['bad-document'] },
    { pillar: 'bad-document' },
  ]) {
    assert.throws(
      () => guide('bad-document', patch),
      /Content "bad-document":/,
      JSON.stringify(patch),
    )
  }
})

test('quoted and unquoted dates must be real calendar dates with honest modified dates', () => {
  for (const date of [
    '2026-02-29',
    '2024-02-30',
    '2026-04-31',
    '2026-13-01',
    '2026-00-12',
    '2026-09-00',
    '2026-9-2',
    '2026-09-24T12:00:00Z',
  ]) {
    assert.throws(() => guide('bad-date', { date }), /real date/, date)
    const raw = markdown().replace(/date:.*\n/, `date: ${date}\n`)
    assert.throws(
      () => parseGuide('bad-date', raw),
      /real date/,
      `unquoted ${date}`,
    )
  }
  assert.equal(guide('leap-day', { date: '2024-02-29' }).date, '2024-02-29')
  assert.equal(
    parseGuide(
      'unquoted-date',
      markdown().replace(/date:.*\n/, 'date: 2026-09-24\n'),
    ).date,
    base.date,
  )
  assert.throws(
    () => guide('bad-update', { updated: '2026-09-23' }),
    /on or after date/,
  )
  assert.throws(
    () => guide('bad-update', { updated: '2026-09-31' }),
    /real date/,
  )
  assert.equal(
    guide('same-day-update', { updated: base.date }).updated,
    base.date,
  )
})

test('only YAML frontmatter is accepted and duplicate keys are rejected', () => {
  assert.throws(
    () => parseGuide('no-frontmatter', '# Title'),
    /YAML frontmatter/,
  )
  assert.throws(
    () => parseGuide('script', '---js\n({title: "bad"})\n---'),
    /YAML frontmatter/,
  )
  assert.throws(
    () =>
      parseGuide(
        'duplicate',
        markdown().replace('---\n', '---\ntitle: Duplicate\n'),
      ),
    /invalid YAML frontmatter/,
  )
  assert.throws(
    () => parseGuide('bad-yaml', '---\ntitle: [\n---'),
    /invalid YAML frontmatter/,
  )
  assert.throws(
    () => parseGuide('list-yaml', '---\n- title\n---'),
    /frontmatter must be an object/,
  )
})

test('source URLs reject unsafe schemes, credentials, and Partner-ads tracking variants', () => {
  for (const url of [
    'javascript:alert(1)',
    'http://example.com/source',
    'data:text/html,hello',
    '//example.com/source',
    '/a-relative-source',
    'https://user:pass@example.com/',
    'https://example.com/a\nb',
    'https://partner-ads.com/dk/klikbanner.php?bannerid=1',
    'https://WWW.PARTNER-ADS.COM./dk/klikbanner.php?bannerid=1',
    'https://track.partner-ads.com/link',
  ])
    assert.throws(
      () => guide('unsafe-source', { sources: [{ title: 'Source', url }] }),
      /safe HTTPS source URL/,
      url,
    )
})

test('hero images reject remote URLs, encoded or Windows traversal, and invalid file paths', () => {
  for (const image of [
    'https://example.com/image.jpg',
    '//example.com/image.jpg',
    'images/image.jpg',
    '/../outside.jpg',
    '/images/../../outside.jpg',
    '/images/./image.jpg',
    '/images\\..\\outside.jpg',
    '/images/%2e%2e/outside.jpg',
    '/images/%252e%252e/outside.jpg',
    '/images//image.jpg',
    '/images/image.jpg?width=100',
    '/images/image.jpg#hash',
    '/images/image.txt',
    '/images/im\nage.jpg',
  ])
    assert.throws(
      () => guide('unsafe-image', { image }),
      /image must be a local image path/,
      image,
    )
})

test('missing image files and directories fail, while a real public image passes', () => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), 'affiliate-guide-images-'),
  )
  try {
    fs.mkdirSync(path.join(temporary, 'images'))
    fs.writeFileSync(
      path.join(temporary, 'images', 'coffee.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg"/>',
    )
    fs.mkdirSync(path.join(temporary, 'images', 'directory.svg'))
    assert.doesNotThrow(() =>
      validateGuideImage(guide('existing-image'), temporary),
    )
    assert.throws(
      () =>
        validateGuideImage(
          guide('missing-image', { image: '/images/missing.svg' }),
          temporary,
        ),
      /Content "missing-image": image file "\/images\/missing.svg" is missing from public/,
    )
    assert.throws(
      () =>
        validateGuideImage(
          guide('directory-image', { image: '/images/directory.svg' }),
          temporary,
        ),
      /missing from public/,
    )
  } finally {
    assert.equal(
      path.dirname(path.resolve(temporary)),
      path.resolve(os.tmpdir()),
    )
    assert.ok(path.basename(temporary).startsWith('affiliate-guide-images-'))
    fs.rmSync(temporary, { recursive: true, force: true })
  }
})

test('related and pillar references resolve across content types and fail when missing', () => {
  const first = guide('first', { related: ['second'], pillar: 'second' })
  const second = guide('second', { type: 'post' })
  assert.doesNotThrow(() => validateGuideReferences([first, second]))
  assert.throws(
    () => validateGuideReferences([first]),
    /unknown content "second"/,
  )
  assert.throws(
    () =>
      validateGuideReferences([guide('first', { pillar: 'missing' }), second]),
    /unknown content "missing"/,
  )
  assert.throws(
    () => validateGuideReferences([first, first]),
    /globally unique slugs/,
  )
})

test('image symlinks cannot escape public even when the target exists', () => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), 'affiliate-guide-links-'),
  )
  try {
    const publicRoot = path.join(temporary, 'public')
    const outside = path.join(temporary, 'outside')
    fs.mkdirSync(publicRoot)
    fs.mkdirSync(outside)
    fs.writeFileSync(path.join(outside, 'coffee.svg'), '<svg/>')
    fs.symlinkSync(
      outside,
      path.join(publicRoot, 'images'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )
    assert.throws(
      () => validateGuideImage(guide('escaped-image'), publicRoot),
      /symlinks to outside files are not allowed/,
    )
  } finally {
    assert.equal(
      path.dirname(path.resolve(temporary)),
      path.resolve(os.tmpdir()),
    )
    assert.ok(path.basename(temporary).startsWith('affiliate-guide-links-'))
    fs.rmSync(temporary, { recursive: true, force: true })
  }
})

test('related suggestions prioritize shared products, category, and type with stable tie-breaks', () => {
  const current = guide('current', { type: 'review', products: ['coffee-one'] })
  const product = guide('product', {
    type: 'comparison',
    products: ['coffee-one'],
    category: 'Other',
  })
  const category = guide('category', { type: 'guide' })
  const sameType = guide('same-type', { type: 'review', category: 'Other' })
  const fallback = guide('fallback', { type: 'post', category: 'Other' })
  const all = [fallback, sameType, current, category, product]
  assert.deepEqual(
    getRelatedGuides(current, all).map((item) => item.slug),
    ['product', 'category', 'same-type'],
  )
  assert.deepEqual(getRelatedGuides(current, [current]), [])
  assert.deepEqual(getRelatedGuides(current, [current, product]), [product])
  assert.deepEqual(
    getRelatedGuides({ ...current, pillar: 'product' }, all).map(
      (item) => item.slug,
    ),
    ['category', 'same-type', 'fallback'],
  )
  assert.equal(getRelatedGuides(current, all, 1).length, 2)
  assert.equal(
    getRelatedGuides(current, [...all, guide('fifth'), guide('sixth')], 100)
      .length,
    5,
  )
  assert.deepEqual(
    all.map((item) => item.slug),
    ['fallback', 'same-type', 'current', 'category', 'product'],
  )
})

test('manual related links override suggestions in order and an empty list disables them', () => {
  const current = guide('current', { related: ['second', 'first'] })
  const first = guide('first')
  const second = guide('second')
  assert.deepEqual(getRelatedGuides(current, [current, first, second]), [
    second,
    first,
  ])
  assert.deepEqual(
    getRelatedGuides({ ...current, related: [] }, [current, first, second]),
    [],
  )
  assert.throws(
    () => getRelatedGuides(current, [current, first]),
    /unknown content "second"/,
  )
})
