import fs from 'node:fs'
import path from 'node:path'

/**
 * Next.js 16 can export nested __next.* payload paths on Windows while the
 * browser requests dot-separated filenames. Preserve the originals and add
 * the expected files. Already-flat Linux exports require no changes.
 * Upstream: https://github.com/vercel/next.js/issues/92339
 */
export function normalizeExportedSegments(directory: string): number {
  let copied = 0

  function copyPayloads(
    sourceDirectory: string,
    destinationDirectory: string,
    prefix: string,
  ) {
    for (const entry of fs.readdirSync(sourceDirectory, {
      withFileTypes: true,
    })) {
      const source = path.join(sourceDirectory, entry.name)
      const filename = `${prefix}.${entry.name}`
      if (entry.isDirectory()) {
        copyPayloads(source, destinationDirectory, filename)
      } else if (entry.isFile() && entry.name.endsWith('.txt')) {
        const destination = path.join(destinationDirectory, filename)
        if (fs.existsSync(destination)) {
          if (!fs.readFileSync(source).equals(fs.readFileSync(destination))) {
            throw new Error(
              `Conflicting static segment payload: ${destination}`,
            )
          }
          continue
        }
        fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL)
        copied += 1
      }
    }
  }

  function visit(parent: string) {
    for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const child = path.join(parent, entry.name)
      if (entry.name.startsWith('__next.')) {
        copyPayloads(child, parent, entry.name)
      } else {
        visit(child)
      }
    }
  }

  visit(directory)
  return copied
}
