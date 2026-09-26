import { expect, test, type Page } from '@playwright/test'

async function useNecessaryOnly(page: Page) {
  await page
    .getByRole('button', { name: 'Kun nødvendige', exact: true })
    .click()
  await expect(
    page.getByRole('region', { name: 'Valg om reklamelinks' }),
  ).toHaveCount(0)
}

function productCards(page: Page) {
  return page.getByRole('article').filter({
    has: page.getByRole('button', {
      name: /^(Sammenlign|Tilføjet|Maks\. 4 produkter)$/,
    }),
  })
}

test('catalog filters combine correctly and no-results reset restores products', async ({
  page,
}) => {
  await page.goto('/produkter')
  await useNecessaryOnly(page)
  const initialCount = await productCards(page).count()
  expect(initialCount).toBeGreaterThan(4)

  await page
    .getByRole('searchbox', { name: 'Søg efter et produkt' })
    .fill('produkt-som-ikke-findes-92731')
  await expect(
    page.getByRole('heading', { name: 'Ingen produkter matcher' }),
  ).toBeVisible()
  await expect(productCards(page)).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Nulstil filtre', exact: true })
    .click()
  await expect(productCards(page)).toHaveCount(initialCount)

  const category = page
    .getByRole('group', { name: 'Kategorier' })
    .getByRole('radio')
    .nth(1)
  await category.check()
  const categoryCount = await productCards(page).count()
  expect(categoryCount).toBeGreaterThan(0)
  expect(categoryCount).toBeLessThan(initialCount)
  await page
    .getByRole('spinbutton', { name: 'Maks. produktpris (kr.)' })
    .fill('0')
  await expect(productCards(page)).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Nulstil filtre', exact: true })
    .click()
  await expect(productCards(page)).toHaveCount(initialCount)

  await page
    .getByRole('combobox', { name: 'Sortér produkter' })
    .selectOption('name')
  const names = await productCards(page)
    .getByRole('heading', { level: 3 })
    .allTextContents()
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'da')))
})

test('comparison limits selection to four, survives navigation and can be cleared', async ({
  page,
}) => {
  await page.goto('/sammenlign')
  await useNecessaryOnly(page)
  await expect(
    page.getByRole('heading', {
      name: 'Hvad står valget mellem?',
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.getByRole('table')).toHaveCount(0)
  await page.getByRole('link', { name: 'Find produkter', exact: true }).click()
  const names = await productCards(page)
    .getByRole('heading', { level: 3 })
    .allTextContents()
  for (let i = 0; i < 4; i++) {
    await productCards(page)
      .nth(i)
      .getByRole('button', { name: 'Sammenlign', exact: true })
      .click()
  }
  await expect(
    page.getByRole('button', { name: 'Tilføjet', exact: true }),
  ).toHaveCount(4)
  await expect(
    page
      .getByRole('button', { name: 'Maks. 4 produkter', exact: true })
      .first(),
  ).toBeDisabled()
  await page.getByRole('link', { name: 'Sammenlign', exact: true }).click()
  await expect(page).toHaveURL(/\/sammenlign$/)
  const table = page.getByRole('table')
  await expect(table).toBeVisible()
  for (const name of names.slice(0, 4))
    await expect(table.getByText(name, { exact: true })).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    ),
  ).toBe(false)

  await page.reload()
  await expect(page.getByRole('table')).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Hovednavigation' })
    .getByRole('link', { name: 'Produkter', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Tilføjet', exact: true }),
  ).toHaveCount(4)
  await page.getByRole('button', { name: 'Ryd valg', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Tilføjet', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Maks. 4 produkter', exact: true }),
  ).toHaveCount(0)
})

test('saved products persist and can be removed through the saved filter', async ({
  page,
}) => {
  await page.goto('/produkter')
  await useNecessaryOnly(page)
  const card = productCards(page).first()
  const name = (
    await card.getByRole('heading', { level: 3 }).innerText()
  ).trim()
  await card.getByRole('button', { name: `Gem ${name}`, exact: true }).click()
  await page
    .getByRole('checkbox', { name: 'Mine gemte produkter', exact: true })
    .check()
  await expect(productCards(page)).toHaveCount(1)
  await page.reload()
  await page
    .getByRole('checkbox', { name: 'Mine gemte produkter', exact: true })
    .check()
  await expect(productCards(page)).toHaveCount(1)
  await expect(
    productCards(page).getByRole('heading', { name, exact: true }),
  ).toBeVisible()
  await productCards(page)
    .getByRole('button', { name: `Fjern ${name}`, exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Ingen produkter matcher' }),
  ).toBeVisible()
})

test('demo offers cannot trigger affiliate navigation before or after consent', async ({
  page,
}) => {
  const trackingRequests: string[] = []
  page.on('request', (request) => {
    if (/partner-ads\.com\/.*(?:klikbanner|visbanner)/.test(request.url()))
      trackingRequests.push(request.url())
  })
  await page.goto('/produkter')
  const productLink = productCards(page)
    .first()
    .getByRole('heading', { level: 3 })
    .getByRole('link')
  const href = await productLink.getAttribute('href')
  expect(href).toBeTruthy()
  await page.goto(href!)
  await expect(
    page.getByText('Demo · ikke til salg', { exact: true }).first(),
  ).toBeVisible()
  await expect(page.locator('a[href*="klikbanner.php"]')).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Tillad affiliate-sporing', exact: true })
    .click()
  await expect(
    page.getByRole('region', { name: 'Valg om reklamelinks' }),
  ).toHaveCount(0)
  await expect(
    page.getByText('Demo · ikke til salg', { exact: true }).first(),
  ).toBeVisible()
  await expect(page.locator('a[href*="klikbanner.php"]')).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Privatlivsindstillinger', exact: true })
    .click()
  await useNecessaryOnly(page)
  expect(trackingRequests).toEqual([])
})

test('navigation and direct product/guide links work at desktop and mobile widths', async ({
  page,
}) => {
  await page.goto('/')
  await useNecessaryOnly(page)
  for (const [label, path] of [
    ['Produkter', '/produkter'],
    ['Købsguides', '/guides'],
    ['Tilbud', '/tilbud'],
    ['Om os', '/om'],
  ]) {
    await page
      .getByRole('navigation', { name: 'Hovednavigation' })
      .getByRole('link', { name: label, exact: true })
      .click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    )
    expect(overflows, `${path} should fit the viewport`).toBe(false)
  }
  await page.goto('/produkter')
  const href = await productCards(page)
    .first()
    .getByRole('heading', { level: 3 })
    .getByRole('link')
    .getAttribute('href')
  await page.goto(href!)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.goto('/guides')
  const guideHref = await page
    .getByRole('main')
    .getByRole('link')
    .filter({ has: page.getByRole('heading') })
    .first()
    .getAttribute('href')
  expect(guideHref).toMatch(/^\/guides\/[^/]+$/)
  await page.goto(guideHref!)
  await expect(page.getByRole('article')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.goto('/privatliv')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('product content and SEO metadata are present in server-rendered HTML', async ({
  page,
  request,
}) => {
  await page.goto('/produkter')
  const link = productCards(page)
    .first()
    .getByRole('heading', { level: 3 })
    .getByRole('link')
  const name = await link.innerText()
  const href = await link.getAttribute('href')
  const response = await request.get(href!)
  expect(response.ok()).toBe(true)
  const html = await response.text()
  expect(html).toContain(name)
  expect(html).toMatch(/<h1\b/)
  expect(html).toMatch(/<title>[^<]+<\/title>/)
  expect(html).toMatch(/<meta[^>]+name="description"/)
  expect(html).toMatch(/<link[^>]+rel="canonical"/)
  expect(html).toContain(href!)
})

test('unknown product and guide URLs return a real 404', async ({
  request,
}) => {
  for (const path of [
    '/produkter/findes-ikke-92731',
    '/guides/findes-ikke-92731',
    '/kategorier/findes-ikke-92731',
  ]) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(404)
  }
})

test('brand and combined filters survive reload and a shared URL', async ({
  page,
  context,
}) => {
  await page.goto('/produkter')
  await useNecessaryOnly(page)
  const brandSelect = page.getByRole('combobox', { name: 'Mærke', exact: true })
  const brand = (
    await brandSelect.getByRole('option').nth(1).innerText()
  ).trim()
  await brandSelect.selectOption({ label: brand })
  const brandCount = await productCards(page).count()
  expect(brandCount).toBeGreaterThan(0)
  const name = (
    await productCards(page)
      .first()
      .getByRole('heading', { level: 3 })
      .innerText()
  ).trim()
  await page.getByRole('searchbox', { name: 'Søg efter et produkt' }).fill(name)
  await page
    .getByRole('spinbutton', { name: 'Maks. produktpris (kr.)' })
    .fill('99999')
  await page
    .getByRole('checkbox', { name: 'Kun på lager', exact: true })
    .check()
  await page
    .getByRole('combobox', { name: 'Sortér produkter' })
    .selectOption('name')
  await expect(productCards(page)).toHaveCount(1)
  const sharedUrl = page.url()
  expect(Object.fromEntries(new URL(sharedUrl).searchParams)).toMatchObject({
    brand,
    q: name,
    max: '99999',
    stock: '1',
    sort: 'name',
  })
  for (const target of [page, await context.newPage()]) {
    await target.goto(sharedUrl)
    await expect(
      target.getByRole('combobox', { name: 'Mærke', exact: true }),
    ).toHaveValue(brand)
    await expect(
      target.getByRole('searchbox', { name: 'Søg efter et produkt' }),
    ).toHaveValue(name)
    await expect(
      target.getByRole('checkbox', { name: 'Kun på lager', exact: true }),
    ).toBeChecked()
    await expect(
      target.getByRole('spinbutton', { name: 'Maks. produktpris (kr.)' }),
    ).toHaveValue('99999')
    await expect(
      target.getByRole('combobox', { name: 'Sortér produkter' }),
    ).toHaveValue('name')
    await expect(productCards(target)).toHaveCount(1)
    await expect(
      productCards(target).getByRole('heading', { name, exact: true }),
    ).toBeVisible()
    if (target !== page) await target.close()
  }
  await page.getByRole('button', { name: 'Nulstil', exact: true }).click()
  expect(new URL(page.url()).search).toBe('')
  await expect(brandSelect).toHaveValue('')
  expect(await productCards(page).count()).toBeGreaterThan(brandCount)
})

test('merchant filters use that merchant’s price when rendering and limiting offers', async ({
  page,
}) => {
  await page.goto('/produkter?q=Morgen+filterkaffemaskine&merchant=Demobutik+A')
  await useNecessaryOnly(page)
  await expect(productCards(page)).toHaveCount(1)
  await expect(
    productCards(page).getByText('899,00 kr.', { exact: true }),
  ).toBeVisible()
  await page
    .getByRole('spinbutton', { name: 'Maks. produktpris (kr.)' })
    .fill('875')
  await expect(productCards(page)).toHaveCount(0)
  await page
    .getByRole('combobox', { name: 'Forhandler', exact: true })
    .selectOption('Demobutik B')
  await expect(productCards(page)).toHaveCount(1)
  await expect(
    productCards(page).getByText('849,00 kr.', { exact: true }),
  ).toBeVisible()
})

test('category entry, all-products override and reset retain the correct category context', async ({
  page,
}) => {
  await page.goto('/')
  await useNecessaryOnly(page)
  await page
    .getByRole('link')
    .filter({
      has: page.getByRole('heading', {
        level: 3,
        name: 'Kaffe & køkken',
        exact: true,
      }),
    })
    .click()
  await expect(page).toHaveURL(/\/kategorier\/kaffe-koekken$/)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Kaffe & køkken',
      exact: true,
    }),
  ).toBeVisible()
  const categoryRadio = page.getByRole('radio', { name: /^Kaffe & køkken/ })
  await expect(categoryRadio).toBeChecked()
  const categoryCount = await productCards(page).count()
  expect(categoryCount).toBeGreaterThan(0)
  await page.reload()
  await expect(categoryRadio).toBeChecked()
  await expect(productCards(page)).toHaveCount(categoryCount)
  await page.getByRole('radio', { name: /^Alle produkter/ }).check()
  expect(new URL(page.url()).searchParams.get('category')).toBe('')
  expect(await productCards(page).count()).toBeGreaterThan(categoryCount)
  await page.reload()
  await expect(
    page.getByRole('radio', { name: /^Alle produkter/ }),
  ).toBeChecked()
  await page
    .getByRole('searchbox', { name: 'Søg efter et produkt' })
    .fill('findes-ikke-92731')
  await page
    .getByRole('button', { name: 'Nulstil filtre', exact: true })
    .click()
  expect(new URL(page.url()).search).toBe('')
  await expect(categoryRadio).toBeChecked()
  await expect(productCards(page)).toHaveCount(categoryCount)
})
