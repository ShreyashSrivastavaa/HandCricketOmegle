import { test, expect } from "@playwright/test";

test.use({
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  },
  permissions: ["camera", "microphone"],
});

test.describe("Play Again E2E Test", () => {
  test("Plays a match until result screen, clicks Play Again, and plays in match 2", async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Launch Bot Match
    await page.getByRole("button", { name: /Practice vs Server Bot/i }).click();

    const botArenaBtn = page.getByRole("button", { name: /Play vs Bot Arena/i });
    if (await botArenaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await botArenaBtn.click();
    }

    // Toss 1
    await expect(page.getByRole("heading", { name: /Authoritative Coin Toss/i })).toBeVisible({
      timeout: 35000,
    });
    try {
      const evenBtn = page.getByRole("button", { name: "EVEN", exact: true });
      await evenBtn.waitFor({ state: "visible", timeout: 10000 });
      await evenBtn.click();
    } catch {}

    const tossPickBtn = page.getByRole("button", { name: "Pick 1 for coin toss" });
    await expect(tossPickBtn).toBeVisible({ timeout: 10000 });
    await tossPickBtn.click();

    try {
      const batBtn = page.getByRole("button", { name: /BAT FIRST/i });
      await batBtn.waitFor({ state: "visible", timeout: 8000 });
      await batBtn.click();
    } catch {}

    // Match 1 Scoreboard
    await expect(page.getByRole("region", { name: /Match Scoreboard/i })).toBeVisible({
      timeout: 15000,
    });

    console.log("Match 1 active: playing deliveries until match ends...");

    // Play deliveries repeatedly until ResultBanner is visible
    let ballCount = 0;
    while (ballCount < 25) {
      // Check if ResultBanner is visible
      const playAgainBtn = page.getByRole("button", { name: /Play Again/i });
      if (await playAgainBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        console.log("Result banner reached!");
        break;
      }

      // Check if Innings Break is visible
      const startInnings2Btn = page.getByRole("button", { name: /Begin 2nd Innings|Start 2nd Innings|Ready for Chase/i });
      if (await startInnings2Btn.isVisible({ timeout: 500 }).catch(() => false)) {
        console.log("Innings break reached, starting 2nd innings...");
        await startInnings2Btn.click();
        await page.waitForTimeout(2000);
        continue;
      }

      // Pick a number on the delivery pad (cycling numbers 1 to 6)
      const numToPick = (ballCount % 6) + 1;
      const pickBtn = page.getByRole("button", { name: `Pick number ${numToPick}`, exact: false }).first();
      if (await pickBtn.isVisible({ timeout: 800 }).catch(() => false)) {
        if (await pickBtn.isEnabled().catch(() => false)) {
          await pickBtn.click();
          ballCount++;
          console.log(`Played ball ${ballCount} (picked ${numToPick})`);
          await page.waitForTimeout(2200); // Wait for resolution animation
          continue;
        }
      }
      await page.waitForTimeout(1000);
    }

    // Result banner should now be visible
    const playAgainBtn = page.getByRole("button", { name: /Play Again/i });
    await expect(playAgainBtn).toBeVisible({ timeout: 15000 });
    await expect(playAgainBtn).toBeEnabled();
    await page.screenshot({ path: "public/test-result-screen.png" });

    console.log("Clicking Play Again button...");
    await playAgainBtn.click();

    // In Match 2: Complete Toss
    console.log("Waiting for Toss 2 or Match 2...");
    await expect(page.getByRole("heading", { name: /Authoritative Coin Toss/i })).toBeVisible({
      timeout: 20000,
    });
    try {
      const evenBtn = page.getByRole("button", { name: "EVEN", exact: true });
      await evenBtn.waitFor({ state: "visible", timeout: 3000 });
      await evenBtn.click();
    } catch {}

    const tossPickBtn2 = page.getByRole("button", { name: "Pick 1 for coin toss" });
    await expect(tossPickBtn2).toBeVisible({ timeout: 10000 });
    await tossPickBtn2.click();

    try {
      const batBtn = page.getByRole("button", { name: /BAT FIRST/i });
      await batBtn.waitFor({ state: "visible", timeout: 6000 });
      await batBtn.click();
    } catch {}

    // Wait for match 2 scoreboard
    console.log("Waiting for Match 2 Scoreboard...");
    await expect(page.getByRole("region", { name: /Match Scoreboard/i })).toBeVisible({
      timeout: 15000,
    });

    // Verify delivery panel in Match 2 is fresh and playable!
    const deliveryPanel = page.locator(".match-delivery-panel");
    await expect(deliveryPanel).toBeVisible({ timeout: 10000 });

    // Pick button 1 in Match 2 MUST be enabled and not locked!
    const pickBtnMatch2 = page.getByRole("button", { name: "Pick number 1", exact: false }).first();
    await expect(pickBtnMatch2).toBeVisible();
    await expect(pickBtnMatch2).toBeEnabled({ timeout: 5000 });

    console.log("Submitting delivery in Match 2...");
    await pickBtnMatch2.click();

    // Verify delivery is locked in Match 2
    await expect(deliveryPanel.getByText(/Pick locked/i)).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: "public/test-match2-played.png" });
    console.log("SUCCESS: Match 2 delivery successfully locked and played!");
  });
});
