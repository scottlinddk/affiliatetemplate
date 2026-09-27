import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // The suite must work offline. Real font delivery is a separate smoke check.
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({
      contentType: 'text/css',
      body: '/* mocked Google Fonts */',
    }),
  )
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort())
})

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
    typography: {
      ...original.typography,
      headingFont: "'Roboto Slab', Georgia, serif",
      googleFonts: [{ family: 'Roboto Slab', weights: [400, 700] }],
    },
    colors: {
      ...original.colors,
      light: { ...original.colors.light, background: '#fff1d6' },
    },
  }
  await source.fill(JSON.stringify(changed))
  await page.getByRole('button', { name: 'Anvend JSON', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
  await expect(preview).toHaveCSS('background-color', 'rgb(255, 241, 214)')
  await expect(page.locator('link[data-theme-font="preview"]')).toHaveAttribute(
    'href',
    'https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&display=swap',
  )
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
  await expect(page.locator('link[data-theme-font="preview"]')).toHaveCount(0)
})

test('Google Fonts load only selected families and keep fonts shared by multiple roles', async ({
  page,
}) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().startsWith('https://fonts.googleapis.com/'))
      requests.push(request.url())
  })
  await openDesign(page)
  await expect(page.locator('.studio-preset')).toHaveCount(10)
  expect(requests).toEqual([])

  const heading = page.getByLabel('Skrifttype til overskrifter', {
    exact: true,
  })
  const body = page.getByLabel('Skrifttype til brødtekst', { exact: true })
  const links = page.locator('link[data-theme-font="preview"]')
  const source = page.getByLabel('Design som JSON', { exact: true })
  await heading.selectOption({ label: 'Google · Inter' })
  await expect(links).toHaveCount(1)
  await expect(links).toHaveAttribute('href', /family=Inter:.*display=swap/)
  await expect(page.locator('#design-preview h2').first()).toHaveCSS(
    'font-family',
    /Inter/,
  )
  await expect.poll(() => requests.length).toBeGreaterThan(0)
  expect(
    requests.every((url) =>
      new URL(url).searchParams.get('family')?.startsWith('Inter:'),
    ),
  ).toBe(true)

  await body.selectOption({ label: 'Google · Inter' })
  const sharedFont = JSON.parse(await source.inputValue()).typography
    .googleFonts[0]
  await page.getByText('Tilføj en anden Google Font', { exact: true }).click()
  await page
    .getByLabel('Google Fonts familienavn', { exact: true })
    .fill('Inter')
  await page.getByLabel('Google Fonts vægte', { exact: true }).fill('400')
  await page
    .getByRole('button', { name: 'Anvend Google Font', exact: true })
    .click()
  // Editing one role must preserve the bold/italic variants used by the other.
  expect(JSON.parse(await source.inputValue()).typography.googleFonts).toEqual([
    sharedFont,
  ])
  expect(sharedFont.weights).toContain(700)
  expect(sharedFont.italic).toBe(true)
  await heading.selectOption("Georgia, 'Times New Roman', serif")
  await expect(links).toHaveCount(1)
  expect(
    JSON.parse(await source.inputValue()).typography.googleFonts.map(
      (font: { family: string }) => font.family,
    ),
  ).toEqual(['Inter'])

  await body.selectOption('Arial, Helvetica, sans-serif')
  await expect(links).toHaveCount(0)
  expect(
    JSON.parse(await source.inputValue()).typography.googleFonts,
  ).toBeUndefined()

  await page
    .getByLabel('Skrifttype til kode og tal', { exact: true })
    .selectOption({ label: 'Google · Space Mono' })
  await expect(links).toHaveAttribute('href', /family=Space\+Mono:/)
  const monoTheme = JSON.parse(await source.inputValue())
  expect(monoTheme.typography.monoFont).toContain('Space Mono')
  expect(monoTheme.typography.googleFonts[0].weights).toEqual([400, 700])
})

test('a custom Google font keeps its fallback usable when Google is unavailable', async ({
  page,
}) => {
  const errors: string[] = []
  const failedRequests: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('https://fonts.googleapis.com/**', (route) => {
    failedRequests.push(route.request().url())
    return route.abort('failed')
  })
  await openDesign(page)
  await page.getByText('Tilføj en anden Google Font', { exact: true }).click()
  await page
    .getByLabel('Google Fonts familienavn', { exact: true })
    .fill('Roboto Slab')
  await page.getByLabel('Reservefont', { exact: true }).selectOption('serif')
  await page.getByLabel('Google Fonts vægte', { exact: true }).fill('400, 700')
  await page
    .getByRole('button', { name: 'Anvend Google Font', exact: true })
    .click()
  await expect.poll(() => failedRequests.length).toBe(1)
  expect(failedRequests[0]).toBe(
    'https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&display=swap',
  )
  await expect(page.locator('#design-preview h2').first()).toHaveCSS(
    'font-family',
    '"Roboto Slab", serif',
  )
  await expect(
    page
      .locator('#design-preview')
      .getByRole('heading', { name: 'Udvalgte favoritter' }),
  ).toBeVisible()
  expect(
    await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      context.font = '400 30px "Roboto Slab", serif'
      const fallbackWidth = context.measureText(
        'Små valg. Din egen stil.',
      ).width
      context.font = '400 30px serif'
      return (
        fallbackWidth === context.measureText('Små valg. Din egen stil.').width
      )
    }),
  ).toBe(true)
  const source = page.getByLabel('Design som JSON', { exact: true })
  expect(JSON.parse(await source.inputValue()).typography.googleFonts).toEqual([
    { family: 'Roboto Slab', weights: [400, 700], italic: false },
  ])
  await page
    .getByLabel('Skrifttype til overskrifter', { exact: true })
    .selectOption('Arial, Helvetica, sans-serif')
  await expect(page.locator('link[data-theme-font="preview"]')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('new presets change palettes, fonts and shapes, including a dark design', async ({
  page,
}) => {
  await openDesign(page)
  const preview = page.locator('#design-preview')
  const source = page.getByLabel('Design som JSON', { exact: true })
  await page.getByRole('button', { name: /Midnight tech/ }).click()
  await expect(
    page.getByRole('radio', { name: 'Mørkt', exact: true }),
  ).toBeChecked()
  await expect(preview).toHaveCSS('color-scheme', 'dark')
  const midnight = JSON.parse(await source.inputValue())
  await expect(page.locator('.studio-preset-current')).toContainText(
    'Midnight tech',
  )

  await page.getByRole('button', { name: /Cherry pop/ }).click()
  await expect(
    page.getByRole('radio', { name: 'Lyst', exact: true }),
  ).toBeChecked()
  const cherry = JSON.parse(await source.inputValue())
  await expect(preview).toHaveCSS('color-scheme', 'light')
  expect(cherry.typography.headingFont).not.toBe(
    midnight.typography.headingFont,
  )
  expect(cherry.radius.card).not.toBe(midnight.radius.card)
  expect(cherry.colors.light.primary).not.toBe(midnight.colors.light.primary)

  await page.getByRole('button', { name: /Atelier luxe/ }).click()
  const atelier = JSON.parse(await source.inputValue())
  expect(atelier.typography.headingFont).toContain('Cormorant Garamond')
  expect(atelier.radius.card).not.toBe(cherry.radius.card)
  await expect(page.locator('link[data-theme-font="preview"]')).toHaveCount(2)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    ),
  ).toBe(false)
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
