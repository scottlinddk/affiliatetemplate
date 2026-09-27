import type { MetadataRoute } from 'next'
import { absoluteSiteUrl, withBasePath } from './paths'

export type CrawlerPolicy = {
  'OAI-SearchBot': boolean
  PerplexityBot: boolean
  GPTBot: boolean
  'Google-Extended': boolean
}

// The interactive comparison tool is excluded; /sammenligninger is editorial.
const excludedPaths = ['/sammenlign$', '/sammenlign?', '/sammenlign/']

export function buildRobots(
  live: boolean,
  url: string,
  policy: CrawlerPolicy,
): MetadataRoute.Robots {
  const prefix = new URL(url).pathname.replace(/\/+$/, '')
  const rule = (userAgent: string, allowed: boolean) => ({
    userAgent,
    ...(live && allowed
      ? {
          allow: withBasePath('/', prefix),
          disallow: excludedPaths.map((path) => withBasePath(path, prefix)),
        }
      : { disallow: '/' }),
  })
  return {
    rules: [
      rule('*', true),
      ...Object.entries(policy).map(([agent, allowed]) => rule(agent, allowed)),
    ],
    sitemap: absoluteSiteUrl('/sitemap.xml', url, prefix),
  }
}

type IndexSite = {
  name: string
  description: string
  url: string
  affiliateDisclosure: string
}

function markdownText(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/[\\[\]<>]/g, '\\$&')
}

/** A small optional content index, with no tracking links or copied feed data. */
export function buildLlmsText(
  site: IndexSite,
  articles: { title: string; description: string; path: string }[],
): string {
  const prefix = new URL(site.url).pathname.replace(/\/+$/, '')
  const link = (title: string, pathname: string) =>
    `[${markdownText(title)}](${absoluteSiteUrl(pathname, site.url, prefix)})`
  return [
    `# ${markdownText(site.name)}`,
    '',
    `> ${markdownText(site.description)}`,
    '',
    markdownText(site.affiliateDisclosure),
    '',
    '## Sider',
    '',
    `- ${link('Produkter', '/produkter')}`,
    `- ${link('Om os', '/om')}`,
    `- ${link('Privatliv', '/privatliv')}`,
    `- ${link('Sitemap', '/sitemap.xml')}`,
    '',
    '## Artikler',
    '',
    ...articles.map(
      (article) =>
        `- ${link(article.title, article.path)}: ${markdownText(article.description)}`,
    ),
    '',
  ].join('\n')
}
