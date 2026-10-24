import { test, expect } from "@playwright/test";

test.describe("HandCricketOmegle E2E Smoke Tests", () => {
  test("Landing screen loads and displays essential elements", async ({ page }) => {
    await page.goto("/");

    // 1. Verify title and brand
    await expect(page).toHaveTitle(/HandCricketOmegle/i);
    await expect(page.locator("h1")).toContainText(/HAND CRICKET/i);

    // 2. Verify identity card
    await expect(page.getByText(/Your Anonymous Identity/i)).toBeVisible();
    await expect(page.getByText(/Ready to play/i)).toBeVisible();

    // 3. Verify match mode selector
    await expect(page.getByText(/Sudden Death/i)).toBeVisible();
    await expect(page.getByText(/Classic Match/i)).toBeVisible();

    // 4. Verify main CTA button
    const findMatchBtn = page.getByRole("button", { name: /FIND STRANGER MATCH/i });
    await expect(findMatchBtn).toBeVisible();

    // 5. Verify footer
    await expect(page.locator("footer")).toContainText(new Date().getFullYear().toString());
  });

  test("Opens and closes How to Play modal", async ({ page }) => {
    await page.goto("/");

    // Click how to play
    await page.getByText(/View rules/i).click();

    // Verify modal is open
    await expect(page.getByRole("heading", { name: /How to Play Hand Cricket/i })).toBeVisible();
    await expect(page.getByText(/1. The Core Duel/i)).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: /Got It, Let's Play!/i }).click();
    await expect(page.getByRole("heading", { name: /How to Play Hand Cricket/i })).not.toBeVisible();
  });

  test("Switches match modes", async ({ page }) => {
    await page.goto("/");

    // Select Classic Mode
    await page.getByRole("button", { name: /Classic Match/i }).click();
    await expect(page.getByText(/2 WKTS • 2 OVERS/i)).toBeVisible();

    // Select Sudden Death
    await page.getByRole("button", { name: /Sudden Death/i }).click();
    await expect(page.getByText(/1 WICKET/i)).toBeVisible();
  });

  test("Launches bot match directly into coin toss", async ({ page }) => {
    await page.goto("/");

    // Click practice vs bot
    await page.getByRole("button", { name: /Practice vs Server Bot/i }).click();

    // Should transition to Coin Toss screen
    await expect(page.getByRole("heading", { name: /Authoritative Coin Toss/i })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByRole("button", { name: "ODD" })).toBeVisible();
    await expect(page.getByRole("button", { name: "EVEN" })).toBeVisible();
  });

  test("Landing bot match toss call advances to the throw step", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Practice vs Server Bot/i }).click();

    await expect(page.getByRole("heading", { name: /Authoritative Coin Toss/i })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "EVEN", exact: true }).click();

    await expect(page.getByText(/Throw a number for the toss/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Pick 1 for coin toss" })).toBeVisible();
  });

  test("Bot toss waits for the guest session before creating the match", async ({ page }) => {
    await page.route("**/api/session", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto("/");
    await page.getByRole("button", { name: /Practice vs Server Bot/i }).click();

    await expect(page.getByRole("heading", { name: /Authoritative Coin Toss/i })).toBeVisible({
      timeout: 20000,
    });
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "ODD", exact: true }).click();

    await expect(page.getByText(/Throw a number for the toss/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Pick 1 for coin toss" })).toBeVisible();
  });

  test("Bot toss call advances even when audio is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).AudioContext = class {
        constructor() {
          throw new Error("Audio unavailable");
        }
      };
      (window as any).webkitAudioContext = (window as any).AudioContext;
    });

    await page.goto("/play/bot");
    await page.getByRole("button", { name: /START MATCH & TOSS/i }).click();
    await page.getByRole("button", { name: "ODD", exact: true }).click();

    await expect(page.getByText(/Throw a number for the toss/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Pick 1 for coin toss" })).toBeVisible();
  });

  test("Mobile navigation drawer opens and closes", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Click hamburger button
    const menuToggle = page.getByRole("button", { name: /Open navigation menu/i });
    await expect(menuToggle).toBeVisible();
    await menuToggle.click();

    // Verify navigation drawer is visible
    const drawer = page.locator("#mobile-nav-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: /VS Bot/i })).toBeVisible();
    await expect(drawer.getByRole("link", { name: /Guidelines/i })).toBeVisible();
    await expect(drawer.getByRole("link", { name: /Privacy/i })).toBeVisible();

    // Close with Escape key
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
  });

  test("Custom 404 page renders branded content and navigation", async ({ page }) => {
    const response = await page.goto("/non-existent-pitch-slug-12345");
    expect(response?.status()).toBe(404);

    await expect(page.getByRole("heading", { name: /PITCH NOT FOUND/i })).toBeVisible();
    await expect(page.locator("span").filter({ hasText: /CLEAN BOWLED/i })).toBeVisible();

    const returnBtn = page.getByRole("link", { name: /Enter 1v1 Arena/i });
    await expect(returnBtn).toBeVisible();
  });

  test("Play with Friend modal opens, switches tabs, and validates code input", async ({ page }) => {
    await page.goto("/");

    // Click Play with Friend button on homepage
    const friendBtn = page.getByRole("button", { name: /Play with Friend/i });
    await expect(friendBtn).toBeVisible();
    await friendBtn.click();

    // Verify modal is visible
    const modalHeading = page.getByRole("heading", { name: /Play with Friend/i });
    await expect(modalHeading).toBeVisible();

    // Switch to Join Room tab
    await page.getByRole("button", { name: "Join Room", exact: true }).click();
    await expect(page.getByText(/Enter Friend's Room Code/i)).toBeVisible();

    // Validation: Click Join with empty input
    const joinSubmitBtn = page.locator("form button[type='submit']");
    await expect(joinSubmitBtn).toBeDisabled();

    // Type invalid code (too short)
    const codeInput = page.locator("#friend-room-code-input");
    await codeInput.fill("12");
    await joinSubmitBtn.click();
    await expect(page.getByText(/Room codes are 6 characters long/i)).toBeVisible();

    // Switch back to Create Room tab
    await page.getByRole("button", { name: "Create Room", exact: true }).click();
    await expect(page.getByText(/Format Preset/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /GENERATE PRIVATE ROOM/i })).toBeVisible();

    // Close modal
    await page.getByLabel("Close modal").click();
    await expect(modalHeading).not.toBeVisible();
  });
});

