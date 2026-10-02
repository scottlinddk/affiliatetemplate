import { linkPath } from '@scttlnd/linkmask/path'
import { isSafeAffiliateUrl } from './affiliate'
import { basePath } from './paths'

/** Shared by rendering and the registry; IDs are never derived from a URL. */
export function maskSlug(
  kind: 'offer' | 'deal' | 'program' | 'banner',
  ...ids: string[]
): string | undefined {
  if (
    !ids.length ||
    ids.some((id) => typeof id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(id))
  )
    return undefined
  // Prefix each ID so template IDs beginning with '-' or '_' remain valid.
  return [kind, ...ids.map((id) => `i-${id}`)].join('/')
}

/** Unsupported legacy IDs/URLs retain the template's original link behavior. */
export function maskedHref(
  slug: string | undefined,
  destination: string | undefined,
): string | undefined {
  if (
    process.env.NEXT_PUBLIC_LINKMASK_ENABLED === 'false' ||
    !slug ||
    !destination ||
    !/^https:\/\//i.test(destination) ||
    !isSafeAffiliateUrl(destination) ||
    /[^\x21-\x7e]|\\/.test(destination)
  )
    return undefined
  try {
    // linkPath is always unprefixed, even when basePath itself starts /link.
    return `${basePath}${linkPath(slug)}`
  } catch {
    return undefined
  }
}
