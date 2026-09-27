import remarkDirective from 'remark-directive'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import type { Root } from 'mdast'
import type { Node } from 'unist'
import { isPartnerAdsHostname } from './affiliate'
import { getPrograms, parsePrograms, type ApprovedProgram } from './programs'
import type { Product } from './types'

export type ContentDirective =
  | { type: 'product'; slug: string }
  | { type: 'offer-table'; slug: string }
  | { type: 'cta'; program: string; label: string }

type DirectiveNode = Node & {
  name: string
  attributes?: Record<string, string | null>
  children?: Node[]
  data?: {
    hName?: string
    hProperties?: Record<string, string | number>
  }
}

export type ArticleValidationOptions = {
  programs?: ApprovedProgram[]
  /** Product references from frontmatter are checked against the same catalog. */
  productSlugs?: readonly string[]
  source?: string
}

export type ValidatedArticleContent = {
  directives: ContentDirective[]
  /** Conservative count; page policy must also reserve banner fallback links. */
  affiliateTextLinks: number
}

function walk(node: Node, callback: (node: Node) => void) {
  callback(node)
  const children = (node as Node & { children?: Node[] }).children
  children?.forEach((child) => walk(child, callback))
}

function isDirective(node: Node): node is DirectiveNode {
  return ['leafDirective', 'containerDirective', 'textDirective'].includes(
    node.type,
  )
}

/** Source links may be local or untracked HTTPS; browser URL normalization matters. */
export function isSafeEditorialLink(value: string): boolean {
  if (
    !value ||
    value.length > 8_192 ||
    value.trim() !== value ||
    value.includes('\\') ||
    value.startsWith('//') ||
    Array.from(value).some((character) => {
      const code = character.charCodeAt(0)
      return code <= 32 || code === 127
    })
  )
    return false
  try {
    const base = new URL('https://article.invalid/')
    const url = new URL(value, base)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      isPartnerAdsHostname(url.hostname)
    )
      return false
    // Reject scheme-like relative spellings such as https:example.com.
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return /^https:\/\//i.test(value)
    return url.origin === base.origin
  } catch {
    return false
  }
}

function validateTree(
  tree: Root,
  products: Product[],
  options: ArticleValidationOptions,
): ValidatedArticleContent {
  const programs = options.programs
    ? parsePrograms(options.programs)
    : getPrograms()
  const productBySlug = new Map(
    products.map((product) => [product.slug, product]),
  )
  const programIds = new Set(programs.map((program) => program.id))
  const directives: ContentDirective[] = []
  let affiliateTextLinks = 0
  const fail = (message: string, node?: Node): never => {
    const location = node?.position?.start.line
    throw new Error(
      `${options.source ?? 'Article Markdown'}${location ? `:${location}` : ''}: ${message}`,
    )
  }
  for (const slug of options.productSlugs ?? []) {
    if (!productBySlug.has(slug))
      fail(`unknown frontmatter product slug "${slug}"`)
  }

  walk(tree, (node) => {
    if (node.type === 'link' || node.type === 'definition') {
      const url = (node as Node & { url: string }).url
      if (!isSafeEditorialLink(url))
        fail(
          'unsafe Markdown link; use a product, offer-table or approved cta directive for affiliate links, and HTTPS for sources',
          node,
        )
    }
    if (!isDirective(node)) return
    if (!['product', 'offer-table', 'cta'].includes(node.name))
      fail(`unknown directive "${node.name}"`, node)
    if (node.type !== 'leafDirective')
      fail(
        `"${node.name}" must be a ::${node.name}{...} block on its own line`,
        node,
      )
    if (node.children?.length)
      fail(
        `"${node.name}" does not accept inline content; use its attributes`,
        node,
      )
    const attributes = node.attributes ?? {}
    const allowed = node.name === 'cta' ? ['program', 'label'] : ['slug']
    const unknown = Object.keys(attributes).filter(
      (key) => !allowed.includes(key),
    )
    if (unknown.length)
      fail(`unknown ${node.name} attribute: ${unknown.join(', ')}`, node)
    const required = (key: string, maximum: number): string => {
      const value = attributes[key]
      if (
        typeof value !== 'string' ||
        !value.trim() ||
        value.length > maximum ||
        Array.from(value).some((character) => character.charCodeAt(0) < 32)
      )
        return fail(
          `"${node.name}" requires ${key} (maximum ${maximum} characters)`,
          node,
        )
      return value.trim()
    }
    let directive: ContentDirective
    if (node.name === 'cta') {
      const program = required('program', 100)
      const label = required('label', 160)
      if (!programIds.has(program))
        fail(`unknown or unapproved program "${program}"`, node)
      directive = { type: 'cta', program, label }
      affiliateTextLinks += 1
    } else {
      const slug = required('slug', 200)
      const product = productBySlug.get(slug)
      if (!product) return fail(`unknown product slug "${slug}"`, node)
      directive = { type: node.name as 'product' | 'offer-table', slug }
      // Reserve a product CTA even when prices are stale or offers currently empty.
      affiliateTextLinks += node.name === 'product' ? 1 : product.offers.length
    }
    node.data = {
      ...node.data,
      hName: 'div',
      hProperties: { dataDirectiveIndex: directives.length },
    }
    directives.push(directive)
  })
  return { directives, affiliateTextLinks }
}

export function validateArticleContent(
  content: string,
  products: Product[],
  options: ArticleValidationOptions = {},
): ValidatedArticleContent {
  const tree = unified().use(remarkParse).use(remarkDirective).parse(content)
  return validateTree(tree, products, options)
}

/** ReactMarkdown uses the same AST validation and annotation as the build. */
export function remarkArticleDirectives(
  products: Product[],
  options: ArticleValidationOptions = {},
) {
  return () => (tree: Root) => {
    validateTree(tree, products, options)
  }
}
