import type { ContentType, Guide } from './types'

const sections = {
  guide: { path: '/guides', label: 'Købsguides' },
  review: { path: '/anmeldelser', label: 'Anmeldelser' },
  comparison: { path: '/sammenligninger', label: 'Sammenligninger' },
  post: { path: '/artikler', label: 'Artikler' },
} as const satisfies Record<ContentType, { path: string; label: string }>

/** One routing contract for cards, breadcrumbs, metadata, and the sitemap. */
export function contentSection(type: ContentType) {
  return sections[type]
}

export function contentPath(guide: Pick<Guide, 'type' | 'slug'>): string {
  return `${contentSection(guide.type).path}/${guide.slug}`
}

export function contentTypeFromSection(
  section: string,
): ContentType | undefined {
  return (Object.keys(sections) as ContentType[]).find(
    (type) => sections[type].path === `/${section}`,
  )
}
