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
    <section className="border-y border-stone-200 bg-white py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 text-center">
          <p className="kicker">One click per framework</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900 md:text-4xl">
            Copy-paste ready.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-stone-600">
            Switch framework with one click. Output uses idiomatic patterns for the stack you
            picked.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-stone-800 shadow-panel">
          <div className="flex items-center justify-between border-b border-white/5 bg-forge-950 px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-ember-400" />
            </div>
            <div className="flex min-w-0 gap-1 overflow-x-auto">
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                    active === s.id
                      ? 'bg-white/10 font-semibold text-ember-300'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <span className="hidden font-mono text-[10px] text-stone-500 sm:block">main.spec</span>
          </div>
          <pre className="overflow-x-auto bg-forge-950 p-6 font-mono text-sm leading-relaxed text-stone-200">
            <code>{sample.code}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
