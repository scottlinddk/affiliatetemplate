import { linkPath } from '@scttlnd/linkmask/path'
import { getLinkMask } from '@/lib/linkmask-registry'

export const dynamic = 'force-dynamic'

async function handle(
  request: Request,
  context: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await context.params
  let path: string
  try {
    // Next has already decoded params. Re-encoding each segment rejects encoded
    // separators and unsafe characters instead of turning them into another slug.
    path = linkPath(slug.map(encodeURIComponent).join('/'))
  } catch {
    return new Response(null, {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        'Referrer-Policy': 'no-referrer',
      },
    })
  }
  // Route params exclude Next's basePath. Resolve an internal /link path so the
  // registry works at both a domain root and a deployment subdirectory.
  const url = new URL(path, request.url)
  const mask = await getLinkMask()
  return mask.handle(new Request(url, { method: request.method }))
}

export {
  handle as GET,
  handle as HEAD,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
  handle as OPTIONS,
}
