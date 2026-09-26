import { loadEnvConfig } from '@next/env'
import { parseFeedApiUrl, parseFeedConfig } from '../src/lib/feed'

loadEnvConfig(process.cwd())

const problems: string[] = []
const notes: string[] = []
const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim()
try {
  const url = new URL(origin || '')
  const hostname = url.hostname.toLowerCase().replace(/\.+$/, '')
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    !hostname.includes('.') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
    /(?:^|\.)(?:localhost|local|internal|example\.(?:com|net|org))$/.test(
      hostname,
    )
  ) {
    throw new Error('Invalid production origin')
  }
} catch {
  problems.push(
    'Set NEXT_PUBLIC_SITE_URL to your real HTTPS origin, without a path, query, or fragment.',
  )
}

const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || ''
if (
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  /@example\.(?:com|org|net)$/i.test(email)
) {
  problems.push(
    'Set NEXT_PUBLIC_CONTACT_EMAIL to a working publisher email address.',
  )
}
const publisher = process.env.NEXT_PUBLIC_PUBLISHER_NAME?.trim() || ''
if (!publisher || /demo|example|eksempel/i.test(publisher)) {
  problems.push(
    'Set NEXT_PUBLIC_PUBLISHER_NAME to the real person or business responsible for the website.',
  )
}

const rawFeeds = process.env.PARTNER_ADS_FEEDS
const partnerId = process.env.PARTNER_ADS_PARTNER_ID?.trim()
if (partnerId && !/^[1-9]\d{0,19}$/.test(partnerId))
  problems.push(
    'PARTNER_ADS_PARTNER_ID must be your positive numeric partner ID.',
  )
if (!rawFeeds?.trim()) {
  problems.push(
    'Add PARTNER_ADS_FEEDS with at least one advertiser program that has approved your website.',
  )
  notes.push(
    'Demo mode is available for local development without any feed credentials. It is not ready for a production affiliate launch.',
  )
} else {
  try {
    parseFeedApiUrl(process.env.PARTNER_ADS_API_URL || '')
  } catch {
    problems.push(
      'Set PARTNER_ADS_API_URL to the server-only HTTP(S) base URL of your partner-ads-json-feed service, without credentials, query, or fragment.',
    )
  }
  try {
    const feeds = parseFeedConfig(rawFeeds)
    notes.push(
      `${feeds.length} approved DKK feed extract configuration(s) validated. Service availability and live responses have not been checked.`,
    )
    if (!partnerId)
      notes.push(
        'No PARTNER_ADS_PARTNER_ID: existing feed tracking links are retained, but ownership of their partner ID cannot be verified. Set your ID to validate attribution.',
      )
    if (feeds.some((feed) => !feed.bannerId))
      notes.push(
        'Some feeds have no bannerId. Their direct merchant links remain untracked unless the feed already contains a Partner-ads tracking link. A banner ID is not a program ID.',
      )
  } catch {
    problems.push(
      'PARTNER_ADS_FEEDS must be a JSON array of unique extracts with string rid, programId, merchant, currency: "DKK", approved: true, and optional string bannerId. Replace legacy url entries with the extract rid and set PARTNER_ADS_API_URL; rid is not the program, partner, or banner ID.',
    )
  }
}

console.log('Production configuration check')
for (const note of notes) console.log(`• ${note}`)
for (const problem of problems) console.error(`✗ ${problem}`)
if (problems.length > 0) {
  console.error(
    '\nConfiguration is incomplete. Local demo development can continue with npm run dev.',
  )
  process.exitCode = 1
} else {
  console.log(
    '\nConfiguration structure is ready. Ensure the feed API is reachable during builds and at runtime, then confirm live feed results, advertiser approval, contact details, and your privacy text before launch.',
  )
}
