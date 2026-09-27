import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test, { type TestContext } from 'node:test'
import { normalizeExportedSegments } from '../scripts/normalize-exported-segments'

function fixture(t: TestContext) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'affiliate-export-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  return {
    directory,
    write(filename: string, value: string) {
      const target = path.join(directory, filename)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, value)
    },
    read(filename: string) {
      return fs.readFileSync(path.join(directory, filename), 'utf8')
    },
  }
}

test('Windows-exported segment payloads gain flat router paths without deleting originals', (t) => {
  const files = fixture(t)
  const cases = [
    ['om/__next.om/__PAGE__.txt', 'om/__next.om.__PAGE__.txt'],
    [
      'produkter/kaffe/__next.produkter/$d$slug/__PAGE__.txt',
      'produkter/kaffe/__next.produkter.$d$slug.__PAGE__.txt',
    ],
  ]
  cases.forEach(([source], index) => files.write(source, `payload-${index}`))
  assert.equal(normalizeExportedSegments(files.directory), cases.length)
  cases.forEach(([source, target], index) => {
    assert.equal(files.read(source), `payload-${index}`)
    assert.equal(files.read(target), `payload-${index}`)
  })
  assert.equal(normalizeExportedSegments(files.directory), 0)
})

test('already-flat exports and unrelated assets remain unchanged', (t) => {
  const files = fixture(t)
  files.write('om/__next.om.__PAGE__.txt', 'linux-payload')
  files.write('om/__next._tree.txt', 'tree-payload')
  files.write('images/nested/image.svg', '<svg/>')
  assert.equal(normalizeExportedSegments(files.directory), 0)
  assert.equal(files.read('om/__next.om.__PAGE__.txt'), 'linux-payload')
  assert.equal(files.read('om/__next._tree.txt'), 'tree-payload')
  assert.equal(files.read('images/nested/image.svg'), '<svg/>')
})

test('normalization fails safely if an existing flat payload has different contents', (t) => {
  const files = fixture(t)
  files.write('om/__next.om/__PAGE__.txt', 'nested')
  files.write('om/__next.om.__PAGE__.txt', 'existing')
  assert.throws(
    () => normalizeExportedSegments(files.directory),
    /Conflicting static segment payload/,
  )
  assert.equal(files.read('om/__next.om.__PAGE__.txt'), 'existing')
  assert.equal(files.read('om/__next.om/__PAGE__.txt'), 'nested')
})
