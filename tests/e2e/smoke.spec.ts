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
      timeout: 10000,
    });
    await expect(page.getByText(/ODD/i)).toBeVisible();
    await expect(page.getByText(/EVEN/i)).toBeVisible();
  });
});
