/**
 * Test Data Generators
 *
 * Pure functions that produce three columns of synthetic fixtures:
 *   - realistic: values that pass typical validation
 *   - edge:      legal-but-stress-test values (long, unicode, boundary)
 *   - invalid:   values that should be rejected by typical validation
 *
 * All data is obviously synthetic. No real PII, no real card numbers.
 */

export type TestDataType =
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'number'
  | 'password'
  | 'url'
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'address'
  | 'city'
  | 'zipCode'
  | 'country'
  | 'creditCard'
  | 'longText'
  | 'genericText'
  | 'select'
  | 'unknown';

export interface TestDataColumns {
  realistic: string[];
  edge: string[];
  invalid: string[];
}

const ROWS = 8;

function pad(arr: string[], n: number = ROWS): string[] {
  // Always emit exactly N rows. If we're short, pad with empty strings to keep
  // the table grid aligned. If we're over, truncate.
  if (arr.length === n) return arr;
  if (arr.length > n) return arr.slice(0, n);
  return [...arr, ...Array(n - arr.length).fill('')];
}

// ─── EMAIL ───────────────────────────────────────────────────────
const EMAIL: TestDataColumns = {
  realistic: pad([
    'jane.doe@example.com',
    'j.smith@gmail.com',
    'kumar+test@yahoo.in',
    'alex_q@protonmail.ch',
    'a.b@domain.co.uk',
    'dev.tester@company.io',
    'user1234@outlook.com',
    'priya@example.org',
  ]),
  edge: pad([
    'a@b.co',
    'verylongemailaddressfortesting@example.com',
    'tag+filter@example.com',
    '用户@example.com',
    'quoted."local"@example.com',
    'dashes-and_underscores@sub.example.com',
    '1234@5678.com',
    'a.very.long.path.with.many.dots@subdomain.example.museum',
  ]),
  invalid: pad([
    'not-an-email',
    '@nodomain.com',
    'missing-at-domain.com',
    'spaces in@email.com',
    'double@@dots.com',
    'trailing@dot.',
    '',
    '   ',
  ]),
};

// ─── PHONE ───────────────────────────────────────────────────────
const PHONE: TestDataColumns = {
  realistic: pad([
    '+1 555 234 5678',
    '+44 20 7946 0958',
    '+91 98765 43210',
    '(555) 123-4567',
    '+1-202-555-0136',
    '+81 3 1234 5678',
    '+33 1 70 18 70 00',
    '+61 2 9374 4000',
  ]),
  edge: pad([
    '+1 555 234 5678 x12345',
    '+12345678901234567890',
    '+1 (000) 000-0000',
    '0000000000',
    '+1.555.234.5678',
    '٠١٢٣٤٥٦٧٨٩',
    '+1 555 234 5678',
    '0x123456',
  ]),
  invalid: pad([
    'abc',
    '12',
    '+',
    '+++',
    '',
    '   ',
    'phone-number',
    '(((',
  ]),
};

// ─── DATE ────────────────────────────────────────────────────────
const DATE: TestDataColumns = {
  realistic: pad([
    '2024-03-15',
    '2023-12-31',
    '2025-01-01',
    '2024-07-04',
    '2024-11-28',
    '2025-06-21',
    '2024-08-15',
    '2024-09-30',
  ]),
  edge: pad([
    '2024-02-29',
    '0001-01-01',
    '9999-12-31',
    '1970-01-01',
    '2038-01-19',
    '2000-02-29',
    '1900-01-01',
    '2099-12-31',
  ]),
  invalid: pad([
    'not-a-date',
    '2024-13-32',
    '2024/03/15',
    '15-03-2024',
    '2023-02-29',
    'Tomorrow',
    '',
    '0000-00-00',
  ]),
};

// ─── TIME ────────────────────────────────────────────────────────
const TIME: TestDataColumns = {
  realistic: pad([
    '09:30',
    '14:15',
    '00:00',
    '23:59',
    '12:00',
    '06:45',
    '17:20',
    '21:05',
  ]),
  edge: pad([
    '00:00:00',
    '23:59:59',
    '12:00:00.000',
    '09:30:15.999',
    '00:00:01',
    '23:59:58',
    '01:00:00',
    '12:30:00.500',
  ]),
  invalid: pad([
    '25:00',
    '12:60',
    'noon',
    '9-30',
    '24:00:00',
    '-01:00',
    '',
    '   ',
  ]),
};

// ─── NUMBER ──────────────────────────────────────────────────────
const NUMBER: TestDataColumns = {
  realistic: pad([
    '0',
    '1',
    '42',
    '100',
    '999',
    '12345',
    '3.14',
    '1000000',
  ]),
  edge: pad([
    '-1',
    String(Number.MAX_SAFE_INTEGER),
    String(Number.MIN_SAFE_INTEGER),
    '0.000001',
    '-1234567890.12345',
    '1e10',
    '1e-10',
    '99999999999999999999',
  ]),
  invalid: pad([
    'NaN',
    'Infinity',
    '-Infinity',
    'abc',
    '1,000',
    '$100',
    '',
    '1.2.3',
  ]),
};

// ─── PASSWORD ────────────────────────────────────────────────────
const PASSWORD: TestDataColumns = {
  realistic: pad([
    'P@ssw0rd!',
    'Secret123$',
    'Tr0ub4dor&3',
    'CorrectHorse9!',
    'M0nday-Tuesday',
    'qaTester#2024',
    'Locator!Forge7',
    'h@rdT0Gu3ss',
  ]),
  edge: pad([
    'aA1!aA1!aA1!aA1!aA1!aA1!aA1!aA1!aA1!aA1!aA1!aA1!aA1!aA1!aA1!aA1!',
    '🔒P@ss🔑',
    'ñéçPa55!',
    '   spaces leading and trailing   ',
    'Pàsswörd123',
    '中文Password1!',
    '"quoted\'password"`',
    'a'.repeat(128),
  ]),
  invalid: pad([
    'a',
    '',
    '   ',
    '12',
    'abc',
    '\n',
    '\t',
    ' ',
  ]),
};

// ─── URL ─────────────────────────────────────────────────────────
const URL_DATA: TestDataColumns = {
  realistic: pad([
    'https://example.com',
    'https://www.example.com/path',
    'https://sub.example.org/a/b/c',
    'http://example.com:8080',
    'https://example.com/path?q=1&r=2',
    'https://example.com/page#section',
    'https://locatorforge.com',
    'https://example.co.uk/contact',
  ]),
  edge: pad([
    'https://example.com/' + 'a'.repeat(200),
    'https://user:pass@example.com',
    'https://例.com',
    'ftp://example.com',
    'file:///tmp/test.txt',
    'https://example.com/?q=' + encodeURIComponent('中文'),
    'http://127.0.0.1:3000',
    'https://[::1]:8080/path',
  ]),
  invalid: pad([
    'not a url',
    'http://',
    '://example.com',
    'example.com',
    'javascript:alert(1)',
    'https://',
    '',
    '   ',
  ]),
};

// ─── NAMES ───────────────────────────────────────────────────────
const FIRST_NAME: TestDataColumns = {
  realistic: pad([
    'Maria',
    'Kenji',
    'Priya',
    'Olufemi',
    'Chen',
    'Aisha',
    'James',
    'Sven',
  ]),
  edge: pad([
    "Mary-Ann",
    "O'Brien",
    "José",
    "Björn",
    "Aleksandrowicz-Witkiewicz",
    "李",
    "Åsa",
    "Nguyễn",
  ]),
  invalid: pad([
    '',
    '   ',
    '1234',
    '!!!',
    '\n',
    '@@@',
    '<script>',
    '...',
  ]),
};

const LAST_NAME: TestDataColumns = {
  realistic: pad([
    'Garcia',
    'Tanaka',
    'Patel',
    'Adeyemi',
    'Wang',
    'Khan',
    'Smith',
    'Johansson',
  ]),
  edge: pad([
    "Van der Berg",
    "O'Connor",
    "García-López",
    "Müller",
    "de la Cruz",
    "鈴木",
    "Saint-Pierre",
    "MacKenzie-Smith",
  ]),
  invalid: pad([
    '',
    '   ',
    '99',
    '###',
    '\t',
    '???',
    '<>',
    '---',
  ]),
};

const FULL_NAME: TestDataColumns = {
  realistic: pad([
    'Maria Garcia',
    'Kenji Tanaka',
    'Priya Patel',
    'Olufemi Adeyemi',
    'Chen Wang',
    'Aisha Khan',
    'James Smith',
    'Sven Johansson',
  ]),
  edge: pad([
    "Mary-Ann O'Brien",
    "José García-López",
    "Björn Müller",
    "中村 太郎",
    "Dr. Anne-Marie Saint-Pierre, PhD",
    "Aleksandrowicz-Witkiewicz Smith",
    "Åsa Ørsted",
    "Nguyễn Văn A",
  ]),
  invalid: pad([
    '',
    '   ',
    'X',
    '1234567890',
    '!!!',
    'name name name name name name name name',
    '<script>alert(1)</script>',
    '\n\t\n',
  ]),
};

// ─── ADDRESS / CITY / ZIP / COUNTRY ──────────────────────────────
const ADDRESS: TestDataColumns = {
  realistic: pad([
    '742 Evergreen Terrace',
    '221B Baker Street',
    '10 Downing Lane',
    '1600 Mockingbird Rd',
    '500 Sample Blvd, Apt 4B',
    '88 Test Drive',
    'Flat 9, 30 Demo Court',
    '1 Synthetic Plaza',
  ]),
  edge: pad([
    'Suite #1234, 9876 Very Long Street Name Avenue, Building C, Floor 12',
    'P.O. Box 42',
    "台北市中山區中山北路二段 1 號",
    'c/o Test Recipient, 5 Care Of St',
    'Apt. 7B, Bé Plaza, 100 Test Rd',
    'Lot 5, Block 12, Phase 3',
    'No. 1, Cul-de-sac de Test',
    '1ª Calle Sintetíca, #45',
  ]),
  invalid: pad([
    '',
    '   ',
    '???',
    '12',
    '\n',
    '...',
    '<address>',
    '****',
  ]),
};

const CITY: TestDataColumns = {
  realistic: pad([
    'Springfield',
    'Tokyo',
    'Mumbai',
    'Lagos',
    'Shanghai',
    'Cairo',
    'London',
    'Stockholm',
  ]),
  edge: pad([
    'New York City',
    "St. John's",
    'São Paulo',
    'Zürich',
    "Xining-Lhasa Junction",
    '東京',
    'Llanfairpwllgwyngyll',
    "Saint-Étienne-de-Test",
  ]),
  invalid: pad([
    '',
    '   ',
    '404',
    '!!',
    '<>',
    '\t',
    'a',
    '...',
  ]),
};

const ZIP_CODE: TestDataColumns = {
  realistic: pad([
    '12345',
    '90210',
    '10001',
    '94103',
    '60601',
    '02101',
    '30301',
    '85001',
  ]),
  edge: pad([
    '12345-6789',
    'SW1A 1AA',
    'M1 1AE',
    'K1A 0B1',
    '100-0001',
    '110001',
    '00000',
    '99999-9999',
  ]),
  invalid: pad([
    'abcde',
    '',
    '1',
    '999999999999',
    '!@#$%',
    '   ',
    '00',
    '-----',
  ]),
};

const COUNTRY: TestDataColumns = {
  realistic: pad([
    'United States',
    'India',
    'Japan',
    'United Kingdom',
    'Brazil',
    'Germany',
    'Australia',
    'South Africa',
  ]),
  edge: pad([
    'Saint Vincent and the Grenadines',
    'Côte d’Ivoire',
    'D.R. Congo',
    'Bosnia and Herzegovina',
    'United Arab Emirates',
    '日本',
    'USA',
    'UK',
  ]),
  invalid: pad([
    '',
    '   ',
    'Zz',
    '12345',
    'Atlantis',
    '<country>',
    '!!!',
    'a',
  ]),
};

// ─── CREDIT CARD ─────────────────────────────────────────────────
// All values are well-known test/sandbox numbers published by
// Visa / Mastercard / Amex / Stripe / Adyen. They DO NOT belong to
// any real account.
const CREDIT_CARD: TestDataColumns = {
  realistic: pad([
    '4111111111111111',
    '4242424242424242',
    '5555555555554444',
    '5105105105105100',
    '378282246310005',
    '371449635398431',
    '6011111111111117',
    '30569309025904',
  ]),
  edge: pad([
    '4111 1111 1111 1111',
    '4111-1111-1111-1111',
    '4111  1111  1111  1111',
    '4000000000000002',
    '4000000000009995',
    '4000002500003155',
    ' 4111111111111111 ',
    '4111111111111111000',
  ]),
  invalid: pad([
    '1234',
    'abcdefghijklmnop',
    '',
    '0000000000000000',
    '4111-1111-1111',
    '!!!!-!!!!-!!!!-!!!!',
    '   ',
    '4111\n1111\n1111\n1111',
  ]),
};

// ─── LONG TEXT ───────────────────────────────────────────────────
const LONG_TEXT: TestDataColumns = {
  realistic: pad([
    'This is a short comment that fits in one line.',
    'A multi-sentence paragraph for testing. It contains punctuation, commas, and periods. Each sentence is reasonable in length.',
    'Bug report: the submit button does not respond on the second click. Expected the form to submit and redirect.',
    'Feedback: love the new dashboard layout, but please add a dark mode toggle for late-night sessions.',
    'Question: how do I export my data as CSV? I checked the settings page but did not find an option.',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    'Step 1: open the app. Step 2: navigate to the profile page. Step 3: click edit. Step 4: save.',
    'Hi team, just wanted to flag a small typo on the landing page hero copy. The word "occurred" is misspelled. Thanks!',
  ]),
  edge: pad([
    'A '.repeat(500).trim(),
    '中文 English العربية हिन्दी 🚀🌍',
    'Line 1\nLine 2\nLine 3\n\nLine 5 with blank above',
    'Markdown? **bold** _italic_ `code` [link](https://example.com)',
    'HTML-ish: <p>hello</p> <script>alert(1)</script> &amp; &lt; &gt;',
    'Quotes "double" “curly” \'single\' ‘curly’ `back`',
    'Tabs\tand\tcolumns\tin\tone\tline',
    'Mix of émotions and characters: àèìòù ÅÄÖ ßñç 🎉',
  ]),
  invalid: pad([
    '',
    '   ',
    '\n\n\n',
    '\t\t\t',
    ' ',
    '\r\n\r\n',
    '\b\b\b',
    '',
  ]),
};

// ─── GENERIC TEXT ────────────────────────────────────────────────
const GENERIC_TEXT: TestDataColumns = {
  realistic: pad([
    'Hello world',
    'Sample value',
    'Test input',
    'QA tester',
    'Locator forge',
    'Acme Co',
    'Lorem ipsum',
    'Demo entry',
  ]),
  edge: pad([
    'a',
    'a'.repeat(255),
    'a'.repeat(1000),
    '中文 text',
    "It's a \"quoted\" value",
    'spaces      everywhere',
    '🚀 with emoji',
    '<tag attr="val">node</tag>',
  ]),
  invalid: pad([
    '',
    '   ',
    '\n',
    '\t',
    ' ',
    '\b',
    '\r',
    '',
  ]),
};

// ─── SELECT (placeholder; real options come from inspectedWindow.eval) ──
const SELECT_FALLBACK: TestDataColumns = {
  realistic: pad([
    'Option 1',
    'Option 2',
    'Option 3',
    'Yes',
    'No',
    'Active',
    'Inactive',
    'Pending',
  ]),
  edge: pad([
    '',
    ' ',
    '中文 option',
    'A very long option label that may be truncated in some browsers and renderers',
    '0',
    'true',
    'null',
    'undefined',
  ]),
  invalid: pad([
    'not-a-real-option',
    'NOT_PRESENT',
    '12345',
    '!!!',
    '\n',
    '   ',
    '<value>',
    '---',
  ]),
};

// ─── UNKNOWN ─────────────────────────────────────────────────────
const UNKNOWN: TestDataColumns = GENERIC_TEXT;

const TABLE: Record<TestDataType, TestDataColumns> = {
  email: EMAIL,
  phone: PHONE,
  date: DATE,
  time: TIME,
  number: NUMBER,
  password: PASSWORD,
  url: URL_DATA,
  firstName: FIRST_NAME,
  lastName: LAST_NAME,
  fullName: FULL_NAME,
  address: ADDRESS,
  city: CITY,
  zipCode: ZIP_CODE,
  country: COUNTRY,
  creditCard: CREDIT_CARD,
  longText: LONG_TEXT,
  genericText: GENERIC_TEXT,
  select: SELECT_FALLBACK,
  unknown: UNKNOWN,
};

export const TEST_DATA_TYPES: TestDataType[] = [
  'email',
  'phone',
  'date',
  'time',
  'number',
  'password',
  'url',
  'firstName',
  'lastName',
  'fullName',
  'address',
  'city',
  'zipCode',
  'country',
  'creditCard',
  'longText',
  'genericText',
  'select',
  'unknown',
];

export const TEST_DATA_LABELS: Record<TestDataType, string> = {
  email: 'Email',
  phone: 'Phone',
  date: 'Date',
  time: 'Time',
  number: 'Number',
  password: 'Password',
  url: 'URL',
  firstName: 'First name',
  lastName: 'Last name',
  fullName: 'Full name',
  address: 'Address',
  city: 'City',
  zipCode: 'Zip / Postal',
  country: 'Country',
  creditCard: 'Credit card',
  longText: 'Long text',
  genericText: 'Generic text',
  select: 'Select options',
  unknown: 'Unknown',
};

export function generate(type: TestDataType): TestDataColumns {
  const t = TABLE[type] ?? UNKNOWN;
  return {
    realistic: [...t.realistic],
    edge: [...t.edge],
    invalid: [...t.invalid],
  };
}

/**
 * Build a `select` column set from the actual `<option>` values found on
 * the page. We use the page options as the "realistic" column, then synthesize
 * edge cases (extreme whitespace, duplicates, mixed casing) and invalid cases
 * (values that aren't in the list at all).
 */
export function generateSelectFromOptions(options: string[]): TestDataColumns {
  const real = options.filter((o) => o !== '').slice(0, ROWS);
  const realistic = pad(real.length ? real : SELECT_FALLBACK.realistic);

  const sample = real[0] ?? 'option';
  const edge = pad([
    '',
    ' ',
    sample.toUpperCase(),
    sample.toLowerCase(),
    ` ${sample} `,
    sample + sample,
    '中文',
    'A very long option label for stress-testing select rendering and layout',
  ]);

  const invalid = pad([
    '__not_in_list__',
    'NOT_PRESENT',
    '12345',
    '!!!',
    '\n',
    '   ',
    '<value>',
    '---',
  ]);

  return { realistic, edge, invalid };
}
