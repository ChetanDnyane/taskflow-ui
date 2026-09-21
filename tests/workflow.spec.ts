import { expect, test, type Page } from '@playwright/test';

// #region End-to-end proof against Spring Boot, its security filters and H2
// These accounts/tasks are disposable. No network routes are mocked. Tests cover
// backend validation, persistence after reload, ownership, expired/rejected tokens,
// destructive confirmation and narrow-screen navigation through the actual UI.
// #endregion
const password = 'TaskflowStudy123!';
async function registerAndLogin(page: Page, email: string) {
  await page.goto('/register');
  await page.getByLabel('Your name').fill('UI Test');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Account created. Sign in to start planning.')).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'All tasks.' })).toBeVisible();
}
test('registration, login, task lifecycle, filters, reload and sign-out', async ({ page }) => {
  const email = `ui-${Date.now()}@example.com`;
  await registerAndLogin(page, email);
  await expect(page.getByText('A clear space. A fresh start.')).toBeVisible();
  await page.getByRole('link', { name: 'New task', exact: true }).click();
  await page.getByLabel('Task title').fill('Read Spring Security');
  await page
    .getByLabel('Description', { exact: false })
    .fill('Follow the authentication provider.');
  await page.getByLabel('Priority', { exact: true }).selectOption('HIGH');
  await page.getByLabel('Due date', { exact: false }).fill('2030-01-15');
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await page.getByRole('link', { name: 'Open task: Read Spring Security' }).click();
  await expect(page.getByLabel('Task title')).toHaveValue('Read Spring Security');
  const taskUrl = page.url();
  await page.getByLabel('Status', { exact: true }).selectOption('IN_PROGRESS');
  await page.getByLabel('Description', { exact: false }).fill('');
  await page.getByLabel('Due date', { exact: false }).fill('');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page
      .getByRole('region', { name: 'In progress', exact: true })
      .getByText('Read Spring Security'),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await page.getByLabel('Search tasks').fill('no matching task');
  await expect(page.getByText('Nothing here just yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('link', { name: 'Open task: Read Spring Security' }).click();
  await expect(page.getByLabel('Description', { exact: false })).toHaveValue('');
  await expect(page.getByLabel('Due date', { exact: false })).toHaveValue('');
  await page.getByLabel('Status', { exact: true }).selectOption('COMPLETED');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('button', { name: /^Completed/ }).click();
  await page.getByRole('link', { name: 'Open task: Read Spring Security' }).click();
  await page.getByRole('button', { name: 'Delete task', exact: true }).click();
  await page.getByRole('button', { name: 'Keep task' }).click();
  await page.getByRole('button', { name: 'Delete task', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.getByText('A clear space. A fresh start.')).toBeVisible();
  await page.goto(taskUrl);
  await expect(page.getByRole('heading', { name: 'Task unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/tasks');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid email or password');
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Duplicate');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Email is already registered');
});
test('private tasks remain isolated between accounts and mobile layout fits', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await registerAndLogin(page, `owner-${Date.now()}@example.com`);
  await page.getByRole('link', { name: 'New task', exact: true }).click();
  await page.getByLabel('Task title').fill('Private owner task');
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await page.getByRole('link', { name: 'Open task: Private owner task' }).click();
  const privateUrl = page.url();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('body')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Sign out' }).click();
  await registerAndLogin(page, `other-${Date.now()}@example.com`);
  await expect(page.getByText('A clear space. A fresh start.')).toBeVisible();
  await page.goto(privateUrl);
  await expect(page.getByRole('heading', { name: 'Task unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  const payload = btoa(
    JSON.stringify({ sub: 'fake@example.com', exp: Math.floor(Date.now() / 1000) + 3600 }),
  );
  await page.evaluate(
    (token) => sessionStorage.setItem('taskflow.session', token),
    `header.${payload}.fake-signature`,
  );
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Your session has ended. Please sign in again.')).toBeVisible();
});

test('failed saves retain input, retry succeeds, and Escape closes an idle editor', async ({
  page,
  context,
}) => {
  await registerAndLogin(page, `recovery-${Date.now()}@example.com`);
  await page.getByRole('link', { name: 'New task', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page).toHaveURL(/\/tasks$/);
  await page.getByRole('link', { name: 'New task', exact: true }).click();
  await page.getByLabel('Task title').fill('Keep my unsaved work');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Could not connect');
  await expect(page.getByLabel('Task title')).toHaveValue('Keep my unsaved work');
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open task: Keep my unsaved work' })).toBeVisible();
  await page.getByLabel('Filter by priority').selectOption('HIGH');
  await expect(page.getByText('Nothing here just yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('link', { name: 'Open task: Keep my unsaved work' })).toBeVisible();
});
