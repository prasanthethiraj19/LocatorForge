# Live POM test — OrangeHRM demo

Source: https://opensource-demo.orangehrmlive.com · framework: playwright-ts · elements harvested from the real DOM with the panel's own `__qlcSerialize` + `generateCandidates` + `generatePom`.

Basket held **27** elements across **5** pages.

| Page | Class name | Fields in this class | File |
| --- | --- | --- | --- |
| `/web/index.php/admin/viewSystemUsers` | `AdminViewSystemUsersPage` | `headingAdmin`, `textboxTypeForHints`, `buttonSearch`, `rowgroup`, `row`, `select` | `output/admin-viewsystemusers.page.ts` |
| `/web/index.php/auth/login` | `LoginPage` | `textboxUsername`, `textboxPassword`, `buttonLogin`, `forgotYourPassword`, `imgCompanyBranding`, `link` | `output/auth-login.page.ts` |
| `/web/index.php/dashboard/index` | `DashboardPage` | `headingDashboard`, `textboxSearch`, `linkAdmin`, `mandaUser`, `imgClientBrandBanner` | `output/dashboard-index.page.ts` |
| `/web/index.php/leave/viewLeaveList` | `LeaveViewLeaveListPage` | `headingLeave`, `buttonSearch`, `rowgroup`, `textboxYyyyDdMm` | `output/leave-viewleavelist.page.ts` |
| `/web/index.php/pim/viewEmployeeList` | `PimViewEmployeeListPage` | `headingPim`, `textboxTypeForHints`, `textboxSearch`, `buttonSearch`, `rowgroup`, `row` | `output/pim-viewemployeelist.page.ts` |

## Checks

- distinct class names: **5/5** (PASS)
- distinct field sets: **5/5** (PASS)
- cross-page leakage into a page object: **0** (PASS = 0)

## Before / after

- BEFORE: every page produced `class LoginPage` with all 27 fields — see `output/_BEFORE-one-class-for-all.ts`.
- AFTER: one class per page, only that page's fields — see the per-page files above.
