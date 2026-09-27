/** Next's basePath is compiled into links and client code at build time. */
export function normalizeBasePath(value: string | undefined): string {
  const path = (value || '').trim().replace(/\/+$/, '')
  if (!path) return ''
  if (
    !/^\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/.test(path) ||
    path.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error(
      'NEXT_PUBLIC_BASE_PATH must be empty or a path such as /affiliatetemplate, without a query or fragment.',
    )
  }
  return path
}

export const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH)

/** Use for public assets and plain anchors; next/link already adds basePath. */
export function withBasePath(value: string, prefix = basePath): string {
  if (!value.startsWith('/') || value.startsWith('//') || !prefix) return value
  if (
    value === prefix ||
    value.startsWith(`${prefix}/`) ||
    value.startsWith(`${prefix}?`) ||
    value.startsWith(`${prefix}#`)
  ) {
    return value
  }
  return `${prefix}${value}`
}

/** Preserve the deployment subdirectory when producing sitemap/schema URLs. */
export function absoluteSiteUrl(
  value: string,
  origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  prefix = basePath,
): string {
  return new URL(withBasePath(value, prefix), origin).href
}
