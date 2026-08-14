import { useState } from 'react';

const SAMPLES: { id: string; label: string; code: string }[] = [
  {
    id: 'pw-ts',
    label: 'Playwright · TS',
    code: `import { test, expect } from '@playwright/test';

test('login', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
});`,
  },
  {
    id: 'pw-py',
    label: 'Playwright · Py',
    code: `from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    page = p.chromium.launch().new_page()
    page.goto("https://example.com/login")
    page.get_by_label("Email").fill("user@example.com")
    page.get_by_label("Password").fill("secret")
    page.get_by_role("button", name="Sign in").click()
    expect(page.get_by_role("heading", name="Welcome")).to_be_visible()`,
  },
  {
    id: 'se-java',
    label: 'Selenium · Java',
    code: `WebDriver driver = new ChromeDriver();
driver.get("https://example.com/login");

WebElement email = driver.findElement(By.cssSelector("[name=\\"email\\"]"));
WebElement password = driver.findElement(By.id("password"));
WebElement signIn = driver.findElement(By.xpath("//button[normalize-space()='Sign in']"));

email.sendKeys("user@example.com");
password.sendKeys("secret");
signIn.click();`,
  },
  {
    id: 'cy',
    label: 'Cypress',
    code: `describe('login', () => {
  it('signs the user in', () => {
    cy.visit('/login');
    cy.findByLabelText('Email').type('user@example.com');
    cy.findByLabelText('Password').type('secret');
    cy.findByRole('button', { name: 'Sign in' }).click();
    cy.findByRole('heading', { name: 'Welcome' }).should('be.visible');
  });
});`,
  },
];

export function CodeSample() {
  const [active, setActive] = useState(SAMPLES[0].id);
  const sample = SAMPLES.find((s) => s.id === active) || SAMPLES[0];

  return (
    <section className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Copy-paste ready.</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-3">
            Switch framework with one click. Output uses idiomatic patterns for the stack you picked.
          </p>
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 px-2 py-1.5 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  active === s.id
                    ? 'bg-white dark:bg-zinc-950 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <pre className="bg-zinc-950 text-zinc-100 p-6 overflow-x-auto text-sm leading-relaxed">
            <code>{sample.code}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
