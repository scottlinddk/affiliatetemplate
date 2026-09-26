import {
  FeedError,
  MAX_FEED_BYTES,
  MAX_FEED_ROWS,
  parseFeedApiUrl,
  parsePartnerAdsFeed,
  type FeedConfig,
  type FeedResult,
} from './feed'

const PAGE_SIZE = 100
const FEED_TIMEOUT_MS = 60_000

type FeedPage = {
  data: unknown[]
  total: number
  totalPages: number
  cachedAt: string
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function timestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString() === value
}

function parsePage(value: unknown, rid: string, page: number): FeedPage {
  if (
    !record(value) ||
    !Array.isArray(value.data) ||
    !record(value.pagination) ||
    !record(value.meta)
  )
    throw new FeedError('API-svaret indeholder ikke et produktfeed.')

  const { pagination, meta, data } = value
  const { total, totalPages } = pagination
  if (
    typeof total !== 'number' ||
    !Number.isSafeInteger(total) ||
    total < 0 ||
    total > MAX_FEED_ROWS ||
    typeof totalPages !== 'number' ||
    totalPages !== Math.max(1, Math.ceil(total / PAGE_SIZE)) ||
    pagination.page !== page ||
    pagination.limit !== PAGE_SIZE ||
    page > totalPages ||
    pagination.hasNext !== page < totalPages ||
    pagination.hasPrev !== page > 1 ||
    data.length !== Math.min(PAGE_SIZE, total - (page - 1) * PAGE_SIZE)
  )
    throw new FeedError('Produktfeedets sideinddeling er ugyldig.')
  if (
    meta.rid !== rid ||
    typeof meta.fromCache !== 'boolean' ||
    !timestamp(meta.cachedAt)
  )
    throw new FeedError('Produktfeedets cacheoplysninger er ugyldige.')

  return { data, total, totalPages, cachedAt: meta.cachedAt }
}

async function readPage(
  response: Response,
  budget: { bytes: number },
  signal: AbortSignal,
): Promise<unknown> {
  const mediaType = response.headers
    .get('content-type')
    ?.split(';')[0]
    .trim()
    .toLowerCase()
  const contentLength = response.headers.get('content-length')
  if (
    signal.aborted ||
    !response.ok ||
    response.redirected ||
    !response.body ||
    mediaType !== 'application/json' ||
    (contentLength !== null &&
      /^\d+$/.test(contentLength) &&
      Number(contentLength) > MAX_FEED_BYTES - budget.bytes)
  ) {
    await response.body?.cancel()
    throw new FeedError('Produktfeedet kunne ikke hentes som JSON.')
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let pageBytes = 0
  const cancelOnAbort = () => {
    void reader.cancel().catch(() => {})
  }
  signal.addEventListener('abort', cancelOnAbort, { once: true })
  try {
    while (true) {
      signal.throwIfAborted()
      const { done, value } = await reader.read()
      signal.throwIfAborted()
      if (done) break
      budget.bytes += value.byteLength
      pageBytes += value.byteLength
      if (budget.bytes > MAX_FEED_BYTES) {
        await reader.cancel()
        throw new FeedError('Produktfeedet overskrider størrelsesgrænsen.')
      }
      chunks.push(value)
    }
  } finally {
    signal.removeEventListener('abort', cancelOnAbort)
    reader.releaseLock()
  }

  const bytes = new Uint8Array(pageBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

/** A feed is accepted only after every page from the same API cache entry succeeds. */
export async function fetchPartnerAdsFeed(
  apiUrl: string,
  config: FeedConfig,
  options: { partnerId?: string } = {},
  fetcher: typeof fetch = fetch,
): Promise<FeedResult> {
  try {
    const base = parseFeedApiUrl(apiUrl).replace(/\/$/, '')
    const signal = AbortSignal.timeout(FEED_TIMEOUT_MS)
    const budget = { bytes: 0 }
    const rows: unknown[] = []
    let firstPage: FeedPage | undefined
    for (let page = 1; page <= (firstPage?.totalPages ?? 1); page += 1) {
      signal.throwIfAborted()
      const url = new URL(`${base}/api/feed/${encodeURIComponent(config.rid)}`)
      url.searchParams.set('page', String(page))
      url.searchParams.set('limit', String(PAGE_SIZE))
      const response = await fetcher(url, {
        headers: { Accept: 'application/json' },
        signal,
        redirect: 'error',
        cache: 'no-store',
      })
      const current = parsePage(
        await readPage(response, budget, signal),
        config.rid,
        page,
      )
      if (
        firstPage &&
        (current.total !== firstPage.total ||
          current.cachedAt !== firstPage.cachedAt)
      )
        throw new FeedError('Produktfeedet ændrede sig under indlæsningen.')
      firstPage ??= current
      rows.push(...current.data)
    }
    if (!firstPage || rows.length !== firstPage.total)
      throw new FeedError('Produktfeedet kunne ikke indlæses fuldstændigt.')
    signal.throwIfAborted()
    return parsePartnerAdsFeed(rows, config, {
      ...options,
      updatedAt: firstPage.cachedAt,
    })
  } catch {
    // Upstream errors may contain feed URLs or hosting credentials.
    throw new FeedError('Produktfeedet kunne ikke hentes eller valideres.')
  }
}
