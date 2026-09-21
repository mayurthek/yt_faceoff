import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:5173";
const CONSENT_RE = /https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/;

type ConsentAction = "allow" | "cancel";

async function setScenario(page: Page, name: string): Promise<void> {
  const res = await page.request.get(`${BASE}/e2e/scenario?name=${name}`);
  expect(await res.json()).toEqual({ ok: true, scenario: name });
}

async function installConsent(page: Page, action: ConsentAction): Promise<void> {
  await page.route(CONSENT_RE, async (route) => {
    const url = new URL(route.request().url());
    const state = url.searchParams.get("state");
    expect(state).toBeTruthy();
    const target =
      action === "allow"
        ? `${BASE}/api/auth/callback?code=e2ecode&state=${state}`
        : `${BASE}/api/auth/callback?error=access_denied&state=${state}`;
    await route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body>
        <button id="proceed" onclick="location.href='${target}'">Proceed</button>
      </body></html>`,
    });
  });
}

async function connectWithConsent(
  page: Page,
  action: ConsentAction = "allow",
) {
  await installConsent(page, action);
  await page.goto(BASE);
  await page.getByRole("button", { name: "Connect YouTube" }).click();
  await page.waitForURL(CONSENT_RE);
  await page.locator("#proceed").click();
}

async function pressChoice(page: Page, key: "ArrowLeft" | "ArrowRight") {
  await page.waitForTimeout(100);
  await page.keyboard.press(key);
}

test("loads the landing screen in real mode (status endpoint is hit)", async ({
  page,
}) => {
  let statusHit = false;
  page.on("request", (req) => {
    if (req.url().endsWith("/api/auth/status")) statusHit = true;
  });
  await page.goto(BASE);
  await expect(
    page.getByRole("heading", { name: "Find Your Favorite YouTube Channel" }),
  ).toBeVisible();
  expect(statusHit).toBe(true);
});

test("connects (paginated), plays through with arrow keys, plays again, starts over", async ({
  page,
}) => {
  await setScenario(page, "success");
  await connectWithConsent(page);

  await expect(
    page.getByRole("heading", { name: "You have 3 subscribed channels." }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Start Face-Off" }).click();
  await expect(page.getByText("Match 1 of 2")).toBeVisible();

  await pressChoice(page, "ArrowLeft");
  await expect(page.getByText("Match 2 of 2")).toBeVisible();

  await pressChoice(page, "ArrowRight");
  await expect(
    page.getByRole("heading", { name: "Your Favorite Channel" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Play Again" }).click();
  await expect(page.getByText("Match 1 of 2")).toBeVisible();

  await pressChoice(page, "ArrowLeft");
  await expect(page.getByText("Match 2 of 2")).toBeVisible();

  await pressChoice(page, "ArrowRight");
  await expect(
    page.getByRole("heading", { name: "Your Favorite Channel" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Start Over with Updated Subscriptions" })
    .click();
  await expect(
    page.getByRole("heading", { name: "You have 3 subscribed channels." }),
  ).toBeVisible();
});

test("supports mouse clicks on the choice buttons", async ({ page }) => {
  await setScenario(page, "success");
  await connectWithConsent(page);

  await page.getByRole("button", { name: "Start Face-Off" }).click();
  await expect(page.getByText("Match 1 of 2")).toBeVisible();

  await page.getByRole("button", { name: /^Choose / }).first().click();
  await expect(page.getByText("Match 2 of 2")).toBeVisible();

  await page.getByRole("button", { name: /^Choose / }).first().click();
  await expect(
    page.getByRole("heading", { name: "Your Favorite Channel" }),
  ).toBeVisible();
});

test("shows the cancelled error when the user denies access", async ({ page }) => {
  await setScenario(page, "success");
  await connectWithConsent(page, "cancel");

  await expect(
    page.getByRole("heading", { name: "YouTube access was cancelled." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try Again" })).toBeVisible();
});

test("shows the single-channel state and refreshes to a fuller list", async ({
  page,
}) => {
  await setScenario(page, "one");
  await connectWithConsent(page);

  await expect(
    page.getByRole("heading", {
      name: "You need at least two subscribed channels to start a face-off.",
    }),
  ).toBeVisible();

  await setScenario(page, "success");
  await page.getByRole("button", { name: "Refresh" }).click();
  await page.waitForURL(CONSENT_RE);
  await page.locator("#proceed").click();
  await expect(
    page.getByRole("heading", { name: "You have 3 subscribed channels." }),
  ).toBeVisible();
});

test("shows the empty state when there are no subscriptions", async ({ page }) => {
  await setScenario(page, "empty");
  await connectWithConsent(page);

  await expect(
    page.getByRole("heading", {
      name: "We could not find any subscribed channels.",
    }),
  ).toBeVisible();

  await setScenario(page, "success");
  await page.getByRole("button", { name: "Refresh" }).click();
  await page.waitForURL(CONSENT_RE);
  await page.locator("#proceed").click();
  await expect(
    page.getByRole("heading", { name: "You have 3 subscribed channels." }),
  ).toBeVisible();
});

test("recovers from an API failure by retrying", async ({ page }) => {
  await setScenario(page, "api_failure");
  await connectWithConsent(page);

  await expect(
    page.getByRole("heading", { name: "We could not load your subscriptions right now." }),
  ).toBeVisible();

  await setScenario(page, "success");
  await page.getByRole("button", { name: "Try Again" }).click();
  await expect(
    page.getByRole("heading", { name: "You have 3 subscribed channels." }),
  ).toBeVisible();
});

test("reconnects via OAuth when the session has expired", async ({ page }) => {
  await setScenario(page, "session_expired");
  await connectWithConsent(page);

  await expect(
    page.getByRole("heading", { name: "Your YouTube connection expired." }),
  ).toBeVisible();

  await setScenario(page, "success");
  await page
    .getByRole("button", { name: "Reconnect YouTube" })
    .click();
  await page.waitForURL(CONSENT_RE);
  await page.locator("#proceed").click();
  await expect(
    page.getByRole("heading", { name: "You have 3 subscribed channels." }),
  ).toBeVisible();
});

test("silently refreshes an expired access token", async ({ page }) => {
  await setScenario(page, "refresh_once");
  await connectWithConsent(page);

  await expect(
    page.getByRole("heading", { name: "You have 3 subscribed channels." }),
  ).toBeVisible();
});