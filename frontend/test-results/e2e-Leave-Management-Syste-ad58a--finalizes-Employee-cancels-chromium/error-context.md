# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.ts >> Leave Management System E2E >> Employee can apply, Manager approves, Escalation happens, HR finalizes, Employee cancels
- Location: tests/e2e.spec.ts:5:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://localhost:5173/dashboard"
Received: "http://localhost:5173/"
Timeout:  5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    5 × locator resolved to <html lang="en">…</html>
      - unexpected value "http://localhost:5173/login"
    9 × locator resolved to <html lang="en">…</html>
      - unexpected value "http://localhost:5173/"

```

```yaml
- complementary:
  - text: ✦ LeaveFlow Leave Management System
  - navigation:
    - link "◈ Dashboard":
      - /url: /
    - link "✦ Apply for Leave":
      - /url: /apply
    - link "☰ My Requests":
      - /url: /requests
    - link "◎ My Balance":
      - /url: /balance
  - text: Charlie Dev EMPLOYEE • Engineering
  - button "Sign out"
- main:
  - heading "Dashboard" [level=1]
  - button "✦ Apply for Leave"
  - text: 0 Pending Requests 0 Approved This Year 4 Days Used 37 Days Available
  - heading "Leave Balance" [level=3]
  - heading "Annual Leave" [level=4]
  - text: 2026 24 Entitled 3 Used 0 Pending 21 Available
  - heading "Sick Leave" [level=4]
  - text: 2026 12 Entitled 1 Used 0 Pending 11 Available
  - heading "Personal Leave" [level=4]
  - text: 2026 5 Entitled 0 Used 0 Pending 5 Available
  - heading "Recent Requests" [level=3]
  - paragraph: No leave requests yet. Click "Apply for Leave" to get started.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Leave Management System E2E', () => {
  4  | 
  5  |   test('Employee can apply, Manager approves, Escalation happens, HR finalizes, Employee cancels', async ({ page }) => {
  6  |     
  7  |     // a. Arun logs in, dashboard shows 12 pro-rated days.
  8  |     await page.goto('/login');
  9  |     await page.fill('input[type="email"]', 'charlie@company.com');
  10 |     await page.fill('input[type="password"]', 'password123');
  11 |     await page.click('button[type="submit"]');
  12 | 
  13 |     // Wait for dashboard to load
> 14 |     await expect(page).toHaveURL('/');
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  15 |     // We expect to see 24 days for Charlie, but the story says Arun sees 12 days.
  16 |     // In our seed, Frank is the one with 12 days pro-rated (joined Jul 2026).
  17 |     // Let's test with Frank (frank@company.com)
  18 |     
  19 |     await page.click('text=Logout'); // Wait, let's just log in as Frank directly
  20 |     await page.goto('/login');
  21 |     await page.fill('input[type="email"]', 'frank@company.com');
  22 |     await page.fill('input[type="password"]', 'password123');
  23 |     await page.click('button[type="submit"]');
  24 |     await expect(page).toHaveURL('/');
  25 | 
  26 |     // Ensure Balance shows 12
  27 |     await expect(page.locator('text=Annual Leave')).toBeVisible();
  28 |     await expect(page.locator('text=12.0')).toBeVisible();
  29 | 
  30 |     // b. Apply for the busy week -> soft notice
  31 |     await page.click('text=Apply Leave');
  32 |     await expect(page).toHaveURL('/apply');
  33 |     await page.selectOption('select', { label: 'Annual Leave' });
  34 |     await page.fill('input[type="date"]:nth-of-type(1)', '2026-10-12');
  35 |     await page.fill('input[type="date"]:nth-of-type(2)', '2026-10-16');
  36 |     await page.fill('textarea', 'Family vacation');
  37 |     
  38 |     // The soft notice should appear since the team is busy (assume seeded)
  39 |     // For now we just click submit
  40 |     await page.click('button[type="submit"]');
  41 |     await expect(page.locator('text=Leave request submitted successfully')).toBeVisible();
  42 | 
  43 |     // c. Maya sees flagged request, approves
  44 |     await page.click('text=Logout');
  45 |     await page.fill('input[type="email"]', 'alice.manager@company.com'); // Maya equivalent
  46 |     await page.fill('input[type="password"]', 'password123');
  47 |     await page.click('button[type="submit"]');
  48 | 
  49 |     await expect(page).toHaveURL('/manager/queue');
  50 |     await page.click('text=Frank Dev');
  51 |     // In drawer, approve with comment
  52 |     await page.fill('textarea', 'Approved despite flag, enjoy');
  53 |     await page.click('button:has-text("Approve")');
  54 |     await expect(page.locator('text=Request approved and moved to HR')).toBeVisible();
  55 | 
  56 |     // d. Escalation (Time travel via demo panel)
  57 |     await page.click('text=Logout');
  58 |     await page.fill('input[type="email"]', 'hr.helen@company.com');
  59 |     await page.fill('input[type="password"]', 'password123');
  60 |     await page.click('button[type="submit"]');
  61 | 
  62 |     await page.click('text=Demo Panel'); // HR has Demo Panel
  63 |     await page.click('text=Advance time +49h');
  64 |     await page.click('text=Run escalation now');
  65 | 
  66 |     // e. HR gives final approval
  67 |     await page.click('text=HR Queue');
  68 |     await page.click('text=Flagged'); // Filter by Flagged
  69 |     await page.click('text=Frank Dev');
  70 |     await page.fill('textarea', 'HR Final Approval');
  71 |     await page.click('button:has-text("Final Approve")');
  72 |     await expect(page.locator('text=Request fully approved')).toBeVisible();
  73 | 
  74 |     // f. Frank refreshes and sees Approved state
  75 |     await page.click('text=Logout');
  76 |     await page.fill('input[type="email"]', 'frank@company.com');
  77 |     await page.fill('input[type="password"]', 'password123');
  78 |     await page.click('button[type="submit"]');
  79 | 
  80 |     await page.click('text=My Requests');
  81 |     await expect(page.locator('text=Approved')).toBeVisible();
  82 | 
  83 |     // g. Cancel an approved request
  84 |     await page.click('text=Cancel Leave');
  85 |     await page.click('button:has-text("Confirm Cancel")');
  86 |     await expect(page.locator('text=Leave cancelled and balance restored')).toBeVisible();
  87 |   });
  88 | });
  89 | 
```