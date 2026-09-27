import assert from 'node:assert/strict'
import test from 'node:test'
import { schemaAvailability } from '../src/lib/product-schema'

test('schema availability reflects a real boolean and omits unknown stock', () => {
  assert.equal(schemaAvailability(true), 'https://schema.org/InStock')
  assert.equal(schemaAvailability(false), 'https://schema.org/OutOfStock')
  for (const value of [undefined, null, 0, 1, 'true', 'false', 'in stock']) {
    assert.equal(schemaAvailability(value), undefined)
    assert.equal(
      JSON.stringify({ availability: schemaAvailability(value) }),
      '{}',
    )
  }
})
