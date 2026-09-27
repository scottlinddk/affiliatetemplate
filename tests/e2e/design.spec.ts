import { expect, test, type Page } from '@playwright/test'

async function openDesign(page: Page) {
  await page.goto('/design')
  await page
    .getByRole('button', { name: 'Kun nødvendige', exact: true })
    .click()
}

test('design controls update real storefront components only in the preview', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await openDesign(page)
  const preview = page.locator('#design-preview')
  const bodyColor = await page
    .locator('body')
    .evaluate((node) => getComputedStyle(node).backgroundColor)
  await page.getByRole('button', { name: /Ocean minimal/ }).click()
  await expect(
    page.getByRole('button', { name: /Ocean minimal/ }),
  ).toHaveAttribute('aria-pressed', 'true')
  const color = page.getByLabel('Primær farve (lys)', { exact: true })
  await color.fill('#9f214b')
  await expect(
    preview.getByRole('link', { name: 'Gå på opdagelse' }),
  ).toHaveCSS('background-color', 'rgb(159, 33, 75)')
  expect(
    await page
      .locator('body')
      .evaluate((node) => getComputedStyle(node).backgroundColor),
  ).toBe(bodyColor)

  await page
    .getByLabel('Skrifttype til overskrifter')
    .selectOption("Georgia, 'Times New Roman', serif")
  await expect(
    preview.getByRole('heading', { name: 'Udvalgte favoritter' }),
  ).toHaveCSS('font-family', 'Georgia, "Times New Roman", serif')
  await page.getByText('04 / Former & luft', { exact: true }).click()
  await page
    .getByRole('slider', { name: 'Hjørner på kort', exact: true })
    .focus()
  await page.keyboard.press('End')
  await expect(preview.locator('.product-card').first()).toHaveCSS(
    'border-radius',
    '48px',
  )
  await page.getByRole('checkbox', { name: 'Helt runde knapper' }).check()
  await expect(
    preview.getByRole('link', { name: 'Gå på opdagelse' }),
  ).toHaveCSS('border-radius', '1000px')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    ),
  ).toBe(false)
  expect(errors).toEqual([])
})

test('invalid JSON preserves the preview and valid import exports a reusable design file', async ({
  page,
}) => {
  await openDesign(page)
  await page.getByText('Rediger eller importér JSON', { exact: true }).click()
  const source = page.getByLabel('Design som JSON', { exact: true })
  const original = JSON.parse(await source.inputValue())
  const preview = page.locator('#design-preview')
  const originalColor = await preview.evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  )
  await source.fill('{ broken')
  await page.getByRole('button', { name: 'Anvend JSON', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Det senest gyldige design vises stadig',
  )
  await expect(preview).toHaveCSS('background-color', originalColor)
  await source.fill(JSON.stringify({ ...original, typo: true }))
  await page.getByRole('button', { name: 'Anvend JSON', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'unknown field typo',
  )

  const changed = {
    ...original,
    name: 'Mit testdesign',
    colors: {
      ...original.colors,
      light: { ...original.colors.light, background: '#fff1d6' },
    },
  }
  await source.fill(JSON.stringify(changed))
  await page.getByRole('button', { name: 'Anvend JSON', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 241, 214)')
  const downloaded = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Hent design.json', exact: true })
    .first()
    .click()
  const download = await downloaded
  expect(download.suggestedFilename()).toBe('design.json')
  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()
  let contents = ''
  for await (const chunk of stream!) contents += chunk.toString()
  expect(JSON.parse(contents)).toEqual(changed)
  expect(JSON.parse(contents).$schema).toBe('./design.schema.json')
  await page.reload()
  await expect(preview).toHaveCSS('background-color', originalColor)
})

test('dark and system modes use the matching palette without hydration errors', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await openDesign(page)
  await page.getByRole('radio', { name: 'Mørkt', exact: true }).check()
  const darkBackground = await page
    .getByLabel('Sidebaggrund (mørk)', { exact: true })
    .inputValue()
  const expectedDark = darkBackground
    .match(/[a-f\d]{2}/gi)!
    .map((part) => Number.parseInt(part, 16))
    .join(', ')
  await expect(page.locator('#design-preview')).toHaveCSS(
    'background-color',
    `rgb(${expectedDark})`,
  )
  await page.getByRole('radio', { name: 'System', exact: true }).check()
  await expect(page.locator('#design-preview')).toHaveCSS(
    'color-scheme',
    'light',
  )
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('#design-preview')).toHaveCSS(
    'background-color',
    `rgb(${expectedDark})`,
  )
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow',
  )
})
