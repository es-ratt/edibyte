// Critical user flows in a real browser (demo build: same engine and data files as the API).
import { expect, test, type Page } from '@playwright/test'

const year = new Date().getFullYear()

async function onboard(page: Page, age = 15) {
  await page.goto('/welcome')
  await page.getByRole('button', { name: 'English' }).first().click()
  await page.getByRole('button', { name: "Let's start" }).click()
  await page.getByLabel('Birth year').selectOption(String(year - age))
  await page.getByLabel('Birth month').selectOption('1')
  if (age < 18) await expect(page.getByText('Teen mode is on')).toBeVisible()
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByRole('heading', { name: 'Hello!' })).toBeVisible()
}

test('onboarding as a teen: no weight-loss goal, teen mode on', async ({ page }) => {
  await page.goto('/welcome')
  await page.getByRole('button', { name: 'English' }).first().click()
  await page.getByRole('button', { name: "Let's start" }).click()
  await page.getByLabel('Birth year').selectOption(String(year - 15))
  await page.getByLabel('Birth month').selectOption('1')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('radio')).toHaveCount(4 + 3) // 4 goals + 3 diets
  await expect(page.getByText(/lose weight/i)).toHaveCount(0)
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByText('Teen mode', { exact: true })).toBeVisible()
})

test('photo -> confirm -> result -> add to my day -> progress', async ({ page }) => {
  await onboard(page)
  await page.getByRole('link', { name: 'Check with a photo' }).click()
  // A tiny valid PNG: the demo always recognises its sample meal; the photo is resized, never stored.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  await page.getByLabel('Choose from gallery').setInputFiles({ name: 'meal.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByRole('heading', { name: 'Check the foods' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Not sure, please check')).toBeVisible()
  await page.getByRole('radio', { name: 'Lunch' }).check()
  await page.getByRole('button', { name: 'Check my meal' }).click()
  await expect(page.getByRole('heading', { name: 'Mostly fits' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Energy (calories)' })).toHaveCount(0) // teen: no calorie headline
  await expect(page.getByText('I cannot verify whether a meal is allergy-safe')).toBeVisible()
  await page.getByRole('button', { name: 'Add to my day' }).click()
  await expect(page.getByText('Added to your day.')).toBeVisible()
  await page.getByRole('link', { name: 'Progress' }).click()
  await expect(page.getByText(/Based on 1 of about 21 meals logged/)).toBeVisible()
})

test('typed meal and coach follow-up with sources', async ({ page }) => {
  await onboard(page)
  await page.goto('/capture')
  await page.getByLabel('What are you eating?').fill('bhat dal shak')
  await page.getByRole('button', { name: 'Find the foods' }).click()
  await page.getByRole('button', { name: 'Check my meal' }).click()
  await expect(page.getByText('Plate balance')).toBeVisible()
  await page.getByRole('button', { name: 'Ask the coach' }).click()
  await expect(page.getByText(/About your meal/)).toBeVisible()
  await page.getByRole('button', { name: 'How much sugar is okay in a day?' }).click()
  await expect(page.getByText('WHO guidance:')).toBeVisible()
  await page.getByLabel('Type your question…').fill('what should I eat for diabetes')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('Safe answer')).toBeVisible()
})

test('plans: day pre-check and week goals', async ({ page }) => {
  await onboard(page)
  await page.goto('/plans')
  await page.getByRole('button', { name: 'Add food to Lunch' }).click()
  await page.getByLabel('Type a food name').fill('bhat')
  await page.getByRole('button', { name: /^Cooked white rice/ }).click()
  await page.getByRole('button', { name: 'Check this plan' }).click()
  await expect(page.getByText('The whole day')).toBeVisible()
  await page.getByRole('tab', { name: 'Week' }).click()
  await page.getByRole('checkbox', { name: 'Breakfast every day' }).check()
  await expect(page.getByText('Planned and actual')).toBeVisible()
})

test('delete all my data returns to welcome', async ({ page }) => {
  await onboard(page)
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Delete all my data' }).click()
  await page.getByRole('button', { name: 'Yes, delete everything' }).click()
  await expect(page).toHaveURL(/\/welcome$/)
  await page.goto('/')
  await expect(page).toHaveURL(/\/welcome$/)
})
