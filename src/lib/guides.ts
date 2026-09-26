import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

export type Guide = {
  slug: string
  title: string
  description: string
  category: string
  date: string
  readingTime: number
  content: string
  image: string
}

const guideDirectory = path.join(process.cwd(), 'content', 'guides')
const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function requiredString(value: unknown, field: string, slug: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(
      `Guide "${slug}" requires a non-empty ${field} in its frontmatter.`,
    )
  }
  return value.trim()
}

export function getGuide(slug: string): Guide | undefined {
  if (!validSlug.test(slug)) return undefined
  const filename = path.join(guideDirectory, `${slug}.md`)
  if (!fs.existsSync(filename)) return undefined

  const { data, content } = matter(fs.readFileSync(filename, 'utf8'))
  const date =
    data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(date))
  ) {
    throw new Error(`Guide "${slug}" requires a date in YYYY-MM-DD format.`)
  }
  const image = requiredString(data.image, 'image', slug)
  if (!image.startsWith('/') || image.startsWith('//')) {
    throw new Error(
      `Guide "${slug}" must use a local image path beginning with /.`,
    )
  }

  return {
    slug,
    title: requiredString(data.title, 'title', slug),
    description: requiredString(data.description, 'description', slug),
    category: requiredString(data.category, 'category', slug),
    date,
    readingTime: Math.max(
      1,
      Math.ceil(content.trim().split(/\s+/).length / 200),
    ),
    content,
    image,
  }
}

export function getGuides(): Guide[] {
  if (!fs.existsSync(guideDirectory)) return []
  return fs
    .readdirSync(guideDirectory)
    .filter((filename) => filename.endsWith('.md'))
    .map((filename) => {
      const slug = filename.slice(0, -3)
      const guide = getGuide(slug)
      if (!guide)
        throw new Error(
          `Invalid guide filename: ${filename}. Use lowercase letters, numbers, and hyphens.`,
        )
      return guide
    })
    .sort(
      (first, second) =>
        second.date.localeCompare(first.date) ||
        first.title.localeCompare(second.title, 'da'),
    )
}
