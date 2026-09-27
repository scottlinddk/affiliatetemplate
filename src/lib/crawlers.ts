import type { MetadataRoute } from 'next'

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
  const rule = (userAgent: string, allowed: boolean) => ({
    userAgent,
    ...(live && allowed
      ? { allow: '/', disallow: [...excludedPaths] }
      : { disallow: '/' }),
  })
  return {
    rules: [
      rule('*', true),
      ...Object.entries(policy).map(([agent, allowed]) => rule(agent, allowed)),
    ],
    ...(live ? { sitemap: new URL('/sitemap.xml', url).href } : {}),
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
  const link = (title: string, pathname: string) =>
    `[${markdownText(title)}](${new URL(pathname, site.url).href})`
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
