import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { loadEnvConfig } from '@next/env'
import { normalizeBasePath } from '../src/lib/paths'
import { verifyStaticExport } from './verify-export'
import { normalizeExportedSegments } from './normalize-exported-segments'
import { prepareCatalog } from './prepare-catalog'

loadEnvConfig(process.cwd())

async function main() {
  let snapshot: string | undefined
  try {
    const feeds = process.env.PARTNER_ADS_FEEDS?.trim()
    if (feeds) {
      const catalog = await prepareCatalog({
        feeds,
        apiUrl: process.env.PARTNER_ADS_API_URL || '',
        partnerId: process.env.PARTNER_ADS_PARTNER_ID,
      })
      fs.mkdirSync('.cache', { recursive: true })
      snapshot = path.resolve('.cache', `catalog-${randomUUID()}.json`)
      fs.writeFileSync(snapshot, JSON.stringify(catalog))
      console.log(
        `Prepared ${catalog.products.length} real products for static export.`,
      )
    }
    const result = spawnSync(
      process.execPath,
      ['node_modules/next/dist/bin/next', 'build'],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          STATIC_EXPORT: 'true',
          STATIC_CATALOG_SNAPSHOT: snapshot || '',
        },
      },
    )
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1
      return
    }

    const normalizedSegments = normalizeExportedSegments('out')
    if (normalizedSegments > 0)
      console.log(
        `Normalized ${normalizedSegments} static segment payload paths.`,
      )

    verifyStaticExport(
      'out',
      normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH),
      process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    )
    // Also support publishing the export using a branch-based static host.
    fs.writeFileSync('out/.nojekyll', '')
  } finally {
    if (snapshot) fs.unlinkSync(snapshot)
  }
}

main().catch(() => {
  // Keep upstream identifiers and server details out of CI logs.
  console.error(
    'Static export failed. Check feed configuration, availability and freshness; the existing Pages deployment is unchanged.',
  )
  process.exitCode = 1
})
