import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkDirective from 'remark-directive'
import { bestOffer, formatPrice } from '@/lib/affiliate'
import { maskSlug } from '@/lib/linkmask-paths'
import {
  remarkArticleDirectives,
  validateArticleContent,
  type ContentDirective,
} from '@/lib/content-directives'
import { getPrograms, type ApprovedProgram } from '@/lib/programs'
import type { Product } from '@/lib/types'
import { AffiliateLink } from './affiliate-link'
import { OfferTable } from './offer-table'
import { ProductCard } from './product-card'

export function ArticleMarkdown({
  content,
  products,
  programs = getPrograms(),
  source,
}: {
  content: string
  products: Product[]
  programs?: ApprovedProgram[]
  source?: string
}) {
  const options = { programs, source }
  const { directives } = validateArticleContent(content, products, options)
  const productBySlug = new Map(
    products.map((product) => [product.slug, product]),
  )
  const programById = new Map(programs.map((program) => [program.id, program]))

  function renderDirective(directive: ContentDirective) {
    if (directive.type === 'cta') {
      const program = programById.get(directive.program)!
      return (
        <aside className="info-panel article-cta">
          <p className="overline">Reklame · {program.name}</p>
          <AffiliateLink
            url={program.url}
            affiliateUrl={program.affiliateUrl}
            maskedSlug={maskSlug('program', program.id)}
          >
            {directive.label}
          </AffiliateLink>
        </aside>
      )
    }
    const product = productBySlug.get(directive.slug)!
    if (directive.type === 'offer-table')
      return (
        <section
          className="article-offers"
          aria-label={`Tilbud på ${product.name}`}
        >
          <p className="overline">Reklamelinks · {product.name}</p>
          <OfferTable product={product} />
        </section>
      )
    const offer = bestOffer(product)
    return (
      <aside className="article-product" aria-label={product.name}>
        <p className="overline">Reklamelinks</p>
        <ProductCard product={product} />
        {offer ? (
          <div className="info-panel">
            <p>
              Bedste aktuelle tilbud med kendt fragt: {offer.merchant} ·{' '}
              {formatPrice(offer.price + (offer.shipping ?? 0), offer.currency)}
              {offer.shipping === undefined
                ? ' · fragt oplyses hos butikken'
                : ''}
            </p>
            <AffiliateLink
              url={offer.url}
              affiliateUrl={offer.affiliateUrl}
              maskedSlug={maskSlug('offer', product.slug, offer.id)}
              demo={product.demo}
            >
              Se hos {offer.merchant}
            </AffiliateLink>
          </div>
        ) : null}
      </aside>
    )
  }

  return (
    <ReactMarkdown
      skipHtml
      remarkPlugins={[
        remarkDirective,
        remarkArticleDirectives(products, options),
      ]}
      allowedElements={[
        'h2',
        'h3',
        'h4',
        'p',
        'a',
        'strong',
        'em',
        'ul',
        'ol',
        'li',
        'blockquote',
        'br',
        'hr',
        'code',
        'pre',
        'div',
      ]}
      components={{
        div: ({ node }) => {
          const index = Number(node?.properties.dataDirectiveIndex)
          const directive = directives[index]
          return directive ? renderDirective(directive) : null
        },
        a: ({ href, children }) =>
          href && !/^https:\/\//i.test(href) ? (
            <Link href={href}>{children}</Link>
          ) : (
            <a href={href} rel="noopener noreferrer">
              {children}
            </a>
          ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
