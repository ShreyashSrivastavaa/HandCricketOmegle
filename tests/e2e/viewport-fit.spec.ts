import { test, expect } from "@playwright/test";

test.describe("Match Screen Viewport Fit", () => {
  test("Fits entirely within 1366x768 without vertical scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 600 }); // Compact laptop display (e.g. 1366x768 with taskbar + browser tabs/address bar)
    await page.goto("/");

    // Launch bot match
    await page.getByRole("button", { name: /Practice vs Server Bot/i }).click();

    // In Coin Toss: pick EVEN if caller
    await expect(page.getByRole("heading", { name: /Authoritative Coin Toss/i })).toBeVisible({
      timeout: 15000,
    });
    try {
      const evenBtn = page.getByRole("button", { name: "EVEN", exact: true });
      if (await evenBtn.isVisible({ timeout: 2500 })) {
        await evenBtn.click();
      }
    } catch {}

    // Pick 1 for toss
    const tossPickBtn = page.getByRole("button", { name: "Pick 1 for coin toss" });
    await expect(tossPickBtn).toBeVisible({ timeout: 10000 });
    await tossPickBtn.click();

    // If user won toss, click BAT FIRST; if bot won toss, wait for auto-transition
    try {
      const batBtn = page.getByRole("button", { name: /BAT FIRST/i });
      await batBtn.click({ timeout: 4000 });
    } catch {}

    // Verify match screen is loaded
    await expect(page.getByRole("region", { name: /Match Scoreboard/i })).toBeVisible({
      timeout: 15000,
    });

    // Verify all 6 buttons are visible and inside the viewport
    for (let i = 1; i <= 6; i++) {
      const btn = page.getByRole("button", { name: `Pick number ${i}` });
      await expect(btn).toBeVisible();
      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.y + box.height).toBeLessThanOrEqual(600);
        expect(box.y).toBeGreaterThanOrEqual(0);
      }
    }

    // Also check if confirm button or delivery panel fits
    const deliveryPanel = page.locator(".match-delivery-panel");
    const dpBox = await deliveryPanel.boundingBox();
    console.log("Delivery panel box (tapToLock=true):", dpBox);
    if (dpBox) {
      expect(dpBox.y + dpBox.height).toBeLessThanOrEqual(600);
    }

    // Now toggle tapToLock off to see Confirm button mode
    const toggleBtn = page.getByRole("button", { name: /Toggle Tap to Lock/i }).first();
    await toggleBtn.click();
    await page.waitForTimeout(300);

    const dpBoxConfirmMode = await deliveryPanel.boundingBox();
    console.log("Delivery panel box (tapToLock=false):", dpBoxConfirmMode);
    if (dpBoxConfirmMode) {
      expect(dpBoxConfirmMode.y + dpBoxConfirmMode.height).toBeLessThanOrEqual(600);
    }
    const scrollHeightConfirm = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeightConfirm = await page.evaluate(() => document.documentElement.clientHeight);
    console.log("ScrollHeight vs ClientHeight in Confirm mode:", { scrollHeightConfirm, clientHeightConfirm });
    expect(scrollHeightConfirm).toBeLessThanOrEqual(clientHeightConfirm + 1);

    // Verify video arena controls (camera toggle) are fully inside viewport
    const cameraToggleBtn = page.getByRole("button", { name: /Turn camera/i });
    await expect(cameraToggleBtn).toBeVisible();
    const camBox = await cameraToggleBtn.boundingBox();
    expect(camBox).not.toBeNull();
    if (camBox) {
      expect(camBox.y + camBox.height).toBeLessThanOrEqual(600);
      expect(camBox.y).toBeGreaterThanOrEqual(0);
    }

    // Check that document does not require scrolling
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 1); // allow 1px rounding

    await page.screenshot({ path: "public/match-viewport-fit.png" });
  });

  test("Fits within 1280x580 (scaled/zoomed laptop display without vertical scroll)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 580 });
    await page.goto("/");

    await page.getByRole("button", { name: /Practice vs Server Bot/i }).click();

    await expect(page.getByRole("heading", { name: /Authoritative Coin Toss/i })).toBeVisible({
      timeout: 15000,
    });
    try {
      const oddBtn = page.getByRole("button", { name: "ODD", exact: true });
      if (await oddBtn.isVisible({ timeout: 2500 })) {
        await oddBtn.click();
      }
    } catch {}
    const tossPickBtn2 = page.getByRole("button", { name: "Pick 2 for coin toss" });
    await expect(tossPickBtn2).toBeVisible({ timeout: 10000 });
    await tossPickBtn2.click();

    try {
      const batBtn = page.getByRole("button", { name: /BAT FIRST/i });
      await batBtn.click({ timeout: 4000 });
    } catch {}

    await expect(page.getByRole("region", { name: /Match Scoreboard/i })).toBeVisible({
      timeout: 15000,
    });

    // Verify all 6 buttons are visible and inside 580px height
    for (let i = 1; i <= 6; i++) {
      const btn = page.getByRole("button", { name: `Pick number ${i}` });
      await expect(btn).toBeVisible();
      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.y + box.height).toBeLessThanOrEqual(580);
      }
    }

    // Verify delivery panel fits inside 580px
    const dp = page.locator(".match-delivery-panel");
    const dpBox = await dp.boundingBox();
    if (dpBox) {
      expect(dpBox.y + dpBox.height).toBeLessThanOrEqual(580);
    }

    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 1);
  });
});
