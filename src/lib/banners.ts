import configuredBanners from '../data/banners.json'
import { isDirectMerchantUrl, isSafeHttpUrl } from './affiliate'

export type Banner = {
  id: string
  title: string
  image: string
  alt: string
  url: string
  affiliateUrl?: string
  width: number
  height: number
  approved: true
  placement: 'home' | 'product' | 'article-inline' | 'article-end'
}

function safeHttps(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 8_192 &&
    isSafeHttpUrl(value) &&
    new URL(value).protocol === 'https:'
  )
}

function safeDirectLink(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 8_192 &&
    isDirectMerchantUrl(value)
  )
}

function text(value: unknown, maximum: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maximum
  )
}

/** Unapproved or incomplete configuration is omitted instead of rendered. */
export function parseBanners(value: unknown): Banner[] {
  if (!Array.isArray(value) || value.length > 100) return []
  const banners: Banner[] = []
  const ids = new Set<string>()
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const row = item as Record<string, unknown>
    if (
      row.approved !== true ||
      !text(row.id, 100) ||
      !/^[a-zA-Z0-9_-]+$/.test(row.id) ||
      ids.has(row.id) ||
      !text(row.title, 160) ||
      !text(row.alt, 500) ||
      !safeHttps(row.image) ||
      !safeDirectLink(row.url) ||
      (row.affiliateUrl !== undefined && !safeHttps(row.affiliateUrl)) ||
      (row.placement !== 'home' &&
        row.placement !== 'product' &&
        row.placement !== 'article-inline' &&
        row.placement !== 'article-end') ||
      typeof row.width !== 'number' ||
      !Number.isInteger(row.width) ||
      row.width < 1 ||
      row.width > 4_096 ||
      typeof row.height !== 'number' ||
      !Number.isInteger(row.height) ||
      row.height < 1 ||
      row.height > 4_096
    )
      continue
    ids.add(row.id)
    banners.push({
      id: row.id,
      title: row.title.trim(),
      alt: row.alt.trim(),
      image: row.image.trim(),
      url: row.url.trim(),
      ...(row.affiliateUrl ? { affiliateUrl: row.affiliateUrl } : {}),
      width: row.width,
      height: row.height,
      approved: true,
      placement: row.placement,
    })
  }
  return banners
}

export function getBannerForPlacement(
  placement: Banner['placement'],
  configuration: unknown = configuredBanners,
): Banner | undefined {
  return parseBanners(configuration).find(
    (banner) => banner.placement === placement,
  )
}
