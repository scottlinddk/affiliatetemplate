import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { loadEnvConfig } from '@next/env'
import { normalizeBasePath } from '../src/lib/paths'
import { verifyStaticExport } from './verify-export'
import { normalizeExportedSegments } from './normalize-exported-segments'

loadEnvConfig(process.cwd())

const result = spawnSync(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'build'],
  {
    stdio: 'inherit',
    env: { ...process.env, STATIC_EXPORT: 'true' },
  },
)
if (result.status !== 0) process.exit(result.status ?? 1)

const normalizedSegments = normalizeExportedSegments('out')
if (normalizedSegments > 0)
  console.log(`Normalized ${normalizedSegments} static segment payload paths.`)

verifyStaticExport(
  'out',
  normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH),
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
)
// Also support publishing the export using a branch-based static host.
fs.writeFileSync('out/.nojekyll', '')
