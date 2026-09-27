import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function htmlFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name)
    return entry.isDirectory()
      ? htmlFiles(filename)
      : entry.name.endsWith('.html')
        ? [filename]
        : []
  })
}

/** Check the actual deployable files, including routes, images, CSS and JS. */
export function verifyStaticExport(
  directory: string,
  basePath: string,
  siteOrigin: string,
) {
  const origin = new URL(siteOrigin).origin
  const files = htmlFiles(directory)
  assert.ok(files.length > 0, 'Static export must contain HTML pages.')
  let references = 0

  for (const filename of files) {
    const html = fs.readFileSync(filename, 'utf8')
    const localUrls = [
      ...html.matchAll(/\b(?:src|href)="([^"<>]+)"/g),
      ...html.matchAll(/<meta\b[^>]*\bcontent="(https?:\/\/[^"<>]+)"/g),
    ]
    for (const [, rawUrl] of localUrls) {
      const value = rawUrl.replaceAll('&amp;', '&')
      const localPath = value.startsWith('/') && !value.startsWith('//')
      const absoluteLocalUrl = value.startsWith(`${origin}/`)
      if (!localPath && !absoluteLocalUrl) continue
      const url = new URL(value, origin)
      assert.ok(
        !basePath ||
          url.pathname === basePath ||
          url.pathname.startsWith(`${basePath}/`),
        `${filename} links outside the deployment path: ${value}`,
      )
      const relative = decodeURIComponent(
        url.pathname.slice(basePath.length),
      ).replace(/^\/+/, '')
      const target = path.resolve(directory, relative)
      assert.ok(
        target === path.resolve(directory) ||
          target.startsWith(`${path.resolve(directory)}${path.sep}`),
        `Export link escapes the output directory: ${value}`,
      )
      assert.ok(
        (fs.existsSync(target) && fs.statSync(target).isFile()) ||
          fs.existsSync(path.join(target, 'index.html')),
        `${filename} references a missing exported route or asset: ${value}`,
      )
      references += 1
    }

    if (
      !filename.endsWith(`${path.sep}404.html`) &&
      !filename.includes('_not-found')
    ) {
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)
      if (canonical) {
        assert.ok(
          canonical[1].startsWith(`${origin}${basePath}/`) ||
            canonical[1] === `${origin}${basePath}`,
          `${filename} has an incorrect canonical URL: ${canonical[1]}`,
        )
      }
    }
  }

  const robots = fs.readFileSync(path.join(directory, 'robots.txt'), 'utf8')
  assert.ok(
    robots.includes(`Sitemap: ${origin}${basePath}/sitemap.xml`),
    'robots.txt must point to the sitemap under the deployment path.',
  )
  console.log(
    `Verified ${files.length} exported pages and ${references} local references.`,
  )
}
