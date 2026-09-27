import configuredPrograms from '../data/programs.json'
import { isDirectMerchantUrl, isSafeAffiliateUrl } from './affiliate'

export type ApprovedProgram = {
  id: string
  name: string
  url: string
  affiliateUrl: string
  approved: true
}

const fields = new Set(['id', 'name', 'url', 'affiliateUrl', 'approved'])

function text(value: unknown, maximum: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maximum &&
    !Array.from(value).some((character) => {
      const code = character.charCodeAt(0)
      return code < 32 || code === 127
    })
  )
}

/** Fail closed: a configured CTA must refer to a complete, approved program. */
export function parsePrograms(value: unknown): ApprovedProgram[] {
  if (!Array.isArray(value) || value.length > 100)
    throw new Error(
      'programs.json must contain an array of at most 100 approved programs',
    )

  const ids = new Set<string>()
  return value.map((item, index) => {
    const fail = (reason: string): never => {
      throw new Error(`programs.json entry ${index + 1}: ${reason}`)
    }
    if (!item || typeof item !== 'object' || Array.isArray(item))
      return fail('expected an approved program object')
    const row = item as Record<string, unknown>
    const unknown = Object.keys(row).filter((key) => !fields.has(key))
    if (unknown.length) return fail(`unknown field: ${unknown.join(', ')}`)
    if (!text(row.id, 100) || !/^[a-zA-Z0-9_-]+$/.test(row.id))
      return fail('id must use letters, numbers, hyphens or underscores')
    if (ids.has(row.id)) return fail(`duplicate program id "${row.id}"`)
    if (!text(row.name, 160))
      return fail('name is required (maximum 160 characters)')
    if (row.approved !== true) return fail('approved must be true')
    if (
      !text(row.url, 8_192) ||
      !isDirectMerchantUrl(row.url) ||
      new URL(row.url).protocol !== 'https:'
    )
      return fail('url must be an HTTPS direct merchant URL without tracking')
    if (!text(row.affiliateUrl, 8_192) || !isSafeAffiliateUrl(row.affiliateUrl))
      return fail('affiliateUrl must be a safe HTTPS URL')
    ids.add(row.id)
    return {
      id: row.id,
      name: row.name.trim(),
      url: row.url.trim(),
      affiliateUrl: row.affiliateUrl.trim(),
      approved: true,
    }
  })
}

export function getPrograms(): ApprovedProgram[] {
  return parsePrograms(configuredPrograms)
}
