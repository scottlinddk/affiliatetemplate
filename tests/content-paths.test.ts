import assert from 'node:assert/strict'
import test from 'node:test'
import {
  contentPath,
  contentSection,
  contentTypeFromSection,
} from '../src/lib/content-paths'
import type { ContentType } from '../src/lib/types'

test('each editorial type has a permanent section used by all article links', () => {
  const sections: [ContentType, string, string][] = [
    ['guide', '/guides', 'Købsguides'],
    ['review', '/anmeldelser', 'Anmeldelser'],
    ['comparison', '/sammenligninger', 'Sammenligninger'],
    ['post', '/artikler', 'Artikler'],
  ]
  for (const [type, path, label] of sections) {
    assert.deepEqual(contentSection(type), { path, label })
    assert.equal(contentPath({ type, slug: 'god-kaffe' }), `${path}/god-kaffe`)
    assert.equal(contentTypeFromSection(path.slice(1)), type)
  }
  for (const section of [
    'unknown',
    'produkter',
    'kategorier',
    'sammenlign',
    'toString',
    '../guides',
  ])
    assert.equal(contentTypeFromSection(section), undefined)
})
