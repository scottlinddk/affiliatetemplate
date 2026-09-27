import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { parse as parseYaml } from 'yaml'
import { isDirectMerchantUrl } from './affiliate'
import type { ContentType, Guide } from './types'

export type { Guide } from './types'

const guideDirectory = path.join(process.cwd(), 'content', 'guides')
const publicDirectory = path.join(process.cwd(), 'public')
const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const contentTypes = new Set<ContentType>([
  'guide',
  'review',
  'comparison',
  'post',
])
const fields = new Set([
  'title',
  'description',
  'category',
  'date',
  'image',
  'type',
  'updated',
  'author',
  'products',
  'verdict',
  'faq',
  'sources',
  'related',
  'pillar',
])

function fail(slug: string, message: string): never {
  throw new Error(`Content "${slug}": ${message}`)
}

function requiredString(value: unknown, field: string, slug: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    fail(slug, `${field} must be a non-empty string.`)
  }
  return value.trim()
}

function record(
  value: unknown,
  field: string,
  slug: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(slug, `${field} must be an object.`)
  }
  return value as Record<string, unknown>
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  allowed: Set<string>,
  field: string,
  slug: string,
): void {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key))
  if (unknown.length) {
    fail(
      slug,
      `unknown ${field} field${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}.`,
    )
  }
}

function dateString(value: unknown, field: string, slug: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(slug, `${field} must be a real date in YYYY-MM-DD format.`)
  }
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    fail(slug, `${field} must be a real date in YYYY-MM-DD format.`)
  }
  return value
}

function slugString(value: unknown, field: string, slug: string): string {
  const result = requiredString(value, field, slug)
  if (!validSlug.test(result)) {
    fail(slug, `${field} must use lowercase letters, numbers, and hyphens.`)
  }
  return result
}

function slugArray(value: unknown, field: string, slug: string): string[] {
  if (!Array.isArray(value)) fail(slug, `${field} must be an array of slugs.`)
  const result = value.map((item) => slugString(item, field, slug))
  if (new Set(result).size !== result.length)
    fail(slug, `${field} must not contain duplicate slugs.`)
  return result
}

function localImagePath(value: unknown, slug: string): string {
  const image = requiredString(value, 'image', slug)
  // Reject URL escapes and path normalization, including Windows separators.
  // An editorial image is a public file, never a remote or tracking URL.
  if (
    !image.startsWith('/') ||
    image.startsWith('//') ||
    /[\\%?#\u0000-\u001f\u007f]/.test(image) ||
    image
      .split('/')
      .some(
        (segment, index) =>
          index > 0 && (!segment || segment === '.' || segment === '..'),
      ) ||
    !/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(image)
  ) {
    fail(
      slug,
      'image must be a local image path beginning with /, without traversal, URL escapes, or query strings.',
    )
  }
  return image
}

/** Pure frontmatter validation. File and cross-document checks run in getGuides. */
export function parseGuide(slug: string, markdown: string): Guide {
  if (!validSlug.test(slug))
    fail(slug, 'invalid filename; use lowercase letters, numbers, and hyphens.')
  if (!/^---(?:yaml)?\s*\r?\n/.test(markdown))
    fail(slug, 'a YAML frontmatter block beginning with --- is required.')
  let parsed: ReturnType<typeof matter>
  try {
    // gray-matter strips the closing separator's LF but leaves its CR behind.
    // Normalize Windows line endings before passing the extracted YAML onward.
    parsed = matter(markdown.replace(/\r\n?/g, '\n'), {
      engines: {
        // YAML 1.2 preserves dates as strings; impossible unquoted dates must
        // never silently normalize, such as February 31 becoming March 3.
        yaml: (source) => parseYaml(source, { uniqueKeys: true }) as object,
      },
    })
  } catch (error) {
    fail(
      slug,
      `invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  const data = record(parsed.data, 'frontmatter', slug)
  rejectUnknownFields(data, fields, 'frontmatter', slug)
  const type = data.type === undefined ? 'guide' : data.type
  if (typeof type !== 'string' || !contentTypes.has(type as ContentType))
    fail(slug, 'type must be guide, review, comparison, or post.')
  const date = dateString(data.date, 'date', slug)
  const updated =
    data.updated === undefined
      ? undefined
      : dateString(data.updated, 'updated', slug)
  if (updated && updated < date) fail(slug, 'updated must be on or after date.')
  if (
    type !== 'review' &&
    type !== 'comparison' &&
    (data.products !== undefined || data.verdict !== undefined)
  ) {
    fail(
      slug,
      'products and verdict are only available for review and comparison content.',
    )
  }
  const products =
    data.products === undefined
      ? undefined
      : slugArray(data.products, 'products', slug)
  if (products?.length === 0)
    fail(slug, 'products must contain at least one product slug when provided.')
  const related =
    data.related === undefined
      ? undefined
      : slugArray(data.related, 'related', slug)
  if (related && related.length > 5)
    fail(slug, 'related must contain at most five slugs.')
  const pillar =
    data.pillar === undefined
      ? undefined
      : slugString(data.pillar, 'pillar', slug)
  if (related?.includes(slug) || pillar === slug)
    fail(slug, 'related and pillar must reference other content.')

  let faq: Guide['faq']
  if (data.faq !== undefined) {
    if (!Array.isArray(data.faq))
      fail(slug, 'faq must be an array of { q, a } objects.')
    faq = data.faq.map((item, index) => {
      const entry = record(item, `faq[${index}]`, slug)
      rejectUnknownFields(entry, new Set(['q', 'a']), `faq[${index}]`, slug)
      return {
        q: requiredString(entry.q, `faq[${index}].q`, slug),
        a: requiredString(entry.a, `faq[${index}].a`, slug),
      }
    })
  }
  let sources: Guide['sources']
  if (data.sources !== undefined) {
    if (!Array.isArray(data.sources))
      fail(slug, 'sources must be an array of { title, url } objects.')
    sources = data.sources.map((item, index) => {
      const entry = record(item, `sources[${index}]`, slug)
      rejectUnknownFields(
        entry,
        new Set(['title', 'url']),
        `sources[${index}]`,
        slug,
      )
      const url = requiredString(entry.url, `sources[${index}].url`, slug)
      if (!isDirectMerchantUrl(url) || new URL(url).protocol !== 'https:')
        fail(
          slug,
          `sources[${index}].url must be a safe HTTPS source URL without affiliate tracking.`,
        )
      return {
        title: requiredString(entry.title, `sources[${index}].title`, slug),
        url,
      }
    })
  }

  return {
    slug,
    type: type as ContentType,
    title: requiredString(data.title, 'title', slug),
    description: requiredString(data.description, 'description', slug),
    category: requiredString(data.category, 'category', slug),
    date,
    ...(updated !== undefined ? { updated } : {}),
    ...(data.author !== undefined
      ? { author: requiredString(data.author, 'author', slug) }
      : {}),
    image: localImagePath(data.image, slug),
    readingTime: Math.max(
      1,
      Math.ceil(parsed.content.trim().split(/\s+/).length / 200),
    ),
    content: parsed.content,
    ...(products !== undefined ? { products } : {}),
    ...(data.verdict !== undefined
      ? { verdict: requiredString(data.verdict, 'verdict', slug) }
      : {}),
    ...(faq !== undefined ? { faq } : {}),
    ...(sources !== undefined ? { sources } : {}),
    ...(related !== undefined ? { related } : {}),
    ...(pillar !== undefined ? { pillar } : {}),
  }
}

function isWithin(root: string, file: string): boolean {
  const relative = path.relative(root, file)
  return (
    relative !== '' &&
    !path.isAbsolute(relative) &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`)
  )
}

/** Confirm the local image is a real file inside public, including symlink checks. */
export function validateGuideImage(
  guide: Pick<Guide, 'slug' | 'image'>,
  directory = publicDirectory,
): void {
  const image = localImagePath(guide.image, guide.slug)
  const root = path.resolve(directory)
  const filename = path.resolve(root, `.${image}`)
  if (!isWithin(root, filename))
    fail(guide.slug, 'image must remain inside public/.')
  // next.config.ts includes public assets explicitly. These checks must keep
  // running at revalidation time, but dynamic test roots must not expand the
  // server deployment trace to the entire project.
  if (
    !fs.existsSync(/* turbopackIgnore: true */ filename) ||
    !fs.statSync(/* turbopackIgnore: true */ filename).isFile()
  ) {
    fail(
      guide.slug,
      `image file "${image}" is missing from public/. Add the image before building.`,
    )
  }
  if (
    !isWithin(
      fs.realpathSync(/* turbopackIgnore: true */ root),
      fs.realpathSync(/* turbopackIgnore: true */ filename),
    )
  ) {
    fail(
      guide.slug,
      'image must remain inside public/; symlinks to outside files are not allowed.',
    )
  }
}

/** Content links use stable filenames, irrespective of the destination's type. */
export function validateGuideReferences(guides: Guide[]): void {
  const slugs = new Set(guides.map((guide) => guide.slug))
  if (slugs.size !== guides.length)
    throw new Error('Content filenames must have globally unique slugs.')
  for (const guide of guides) {
    for (const reference of [
      ...(guide.related ?? []),
      ...(guide.pillar ? [guide.pillar] : []),
    ]) {
      if (reference === guide.slug)
        fail(guide.slug, 'related and pillar must reference other content.')
      if (!slugs.has(reference))
        fail(
          guide.slug,
          `related or pillar references unknown content "${reference}".`,
        )
    }
  }
}

export function getGuide(slug: string): Guide | undefined {
  if (!validSlug.test(slug)) return undefined
  const filename = path.join(guideDirectory, `${slug}.md`)
  if (!fs.existsSync(filename)) return undefined
  const guide = parseGuide(slug, fs.readFileSync(filename, 'utf8'))
  validateGuideImage(guide)
  return guide
}

export function getGuides(type?: ContentType): Guide[] {
  if (!fs.existsSync(guideDirectory)) return []
  const guides = fs
    .readdirSync(guideDirectory)
    .filter((filename) => filename.endsWith('.md'))
    .map((filename) => {
      const guide = getGuide(filename.slice(0, -3))
      if (!guide)
        throw new Error(
          `Invalid content filename: ${filename}. Use lowercase letters, numbers, and hyphens.`,
        )
      return guide
    })
    .sort(
      (first, second) =>
        second.date.localeCompare(first.date) ||
        first.title.localeCompare(second.title, 'da'),
    )
  validateGuideReferences(guides)
  return type ? guides.filter((guide) => guide.type === type) : guides
}

/** Manual order wins; otherwise shared products, category, and type rank links. */
export function getRelatedGuides(
  guide: Guide,
  allGuides = getGuides(),
  limit = 3,
): Guide[] {
  const candidates = allGuides.filter(
    (candidate) => candidate.slug !== guide.slug,
  )
  if (guide.related !== undefined) {
    return guide.related.map((slug) => {
      const match = candidates.find((candidate) => candidate.slug === slug)
      if (!match)
        fail(guide.slug, `related references unknown content "${slug}".`)
      return match
    })
  }
  const count = Number.isFinite(limit)
    ? Math.min(5, Math.max(2, Math.floor(limit)))
    : 3
  const score = (candidate: Guide): number =>
    (candidate.category.toLocaleLowerCase('da') ===
    guide.category.toLocaleLowerCase('da')
      ? 6
      : 0) +
    (candidate.type === guide.type ? 2 : 0) +
    (candidate.products?.filter((product) => guide.products?.includes(product))
      .length ?? 0) *
      10
  return candidates
    .filter((candidate) => candidate.slug !== guide.pillar)
    .sort(
      (first, second) =>
        score(second) - score(first) ||
        second.date.localeCompare(first.date) ||
        first.slug.localeCompare(second.slug),
    )
    .slice(0, count)
}
