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

test.describe("Mode Distinction & Switcher Tests", () => {
  test("Landing screen mode switch and explanations", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Check mode selector presence on Landing Screen
    const gestureBtn = page.getByRole("button", { name: "Gesture Mode" });
    const tapBtn = page.getByRole("button", { name: "Tap Mode" });
    await expect(gestureBtn).toBeVisible();
    await expect(tapBtn).toBeVisible();

    // Default is Gesture Mode: check description
    await expect(page.locator("text=Show 1–6 fingers to your webcam")).toBeVisible();

    // Switch to Tap Mode
    await tapBtn.click();
    await expect(page.locator("text=Play by clicking 1–6 buttons on-screen or using keyboard keys 1–6")).toBeVisible();

    // Take screenshot of Landing Screen in Tap Mode
    await page.screenshot({ path: "public/landing-tap-mode.png" });

    // Switch back to Gesture Mode
    await gestureBtn.click();
    await expect(page.locator("text=Show 1–6 fingers to your webcam")).toBeVisible();
    await page.screenshot({ path: "public/landing-gesture-mode.png" });
  });

  test("Camera Check Modal shows mode distinction and descriptions", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Open Camera Check Modal
    const cameraCheckBtn = page.getByRole("button", { name: /Camera and Gesture Check/i });
    await cameraCheckBtn.click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // Check Modal header mode options
    const modalGesture = modal.getByRole("button", { name: /Gesture Mode/i });
    const modalTap = modal.getByRole("button", { name: /Tap Mode/i });
    await expect(modalGesture).toBeVisible();
    await expect(modalTap).toBeVisible();

    // Gesture Mode description in modal
    await expect(modal.getByText(/Gesture Mode \(Camera\):/i)).toBeVisible();
    await page.screenshot({ path: "public/modal-gesture-mode.png" });

    // Switch to Tap Mode in modal
    await modalTap.click();
    await expect(modal.getByText(/Tap Mode \(Buttons\):/i)).toBeVisible();
    await expect(modal.getByText(/Tap Mode Active/i)).toBeVisible();
    await expect(modal.getByText(/Test Number Pad/i)).toBeVisible();
    await page.screenshot({ path: "public/modal-tap-mode.png" });
  });

  test("Live Match delivery panel shows mode switcher and descriptions", async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("http://localhost:3000");
    await page.waitForLoadState("networkidle");

    // Start practice bot match
    await page.getByRole("button", { name: /Practice vs Server Bot/i }).click();

    const botArenaBtn = page.getByRole("button", { name: /Play vs Bot Arena/i });
    if (await botArenaBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await botArenaBtn.click();
    }

    // Pass coin toss
    await expect(page.getByRole("heading", { name: /Authoritative Coin Toss/i })).toBeVisible({
      timeout: 35000,
    });
    try {
      const evenBtn = page.getByRole("button", { name: "EVEN", exact: true });
      await evenBtn.waitFor({ state: "visible", timeout: 10000 });
      await evenBtn.click();
    } catch {}

    // Pick 1 for toss
    const tossPickBtn = page.getByRole("button", { name: "Pick 1 for coin toss" });
    await expect(tossPickBtn).toBeVisible({ timeout: 10000 });
    await tossPickBtn.click();

    // If user won toss, wait for BAT FIRST and click it
    try {
      const batBtn = page.getByRole("button", { name: /BAT FIRST/i });
      await batBtn.waitFor({ state: "visible", timeout: 10000 });
      await batBtn.click();
    } catch {}

    // Wait for match screen scoreboard and delivery panel
    await expect(page.getByRole("region", { name: /Match Scoreboard/i })).toBeVisible({
      timeout: 15000,
    });

    const deliveryPanel = page.locator(".match-delivery-panel");
    await expect(deliveryPanel).toBeVisible({ timeout: 15000 });

    // Check segmented mode controls inside delivery panel
    const matchGestureBtn = deliveryPanel.getByRole("button", { name: "Gesture", exact: true });
    const matchTapBtn = deliveryPanel.getByRole("button", { name: "Tap", exact: true });
    await expect(matchGestureBtn).toBeVisible();
    await expect(matchTapBtn).toBeVisible();

    // Check initial description (starts in default Gesture Mode)
    await expect(deliveryPanel.getByText(/Gesture Mode: Show 1–6 fingers/i)).toBeVisible();
    await expect(page.getByTitle(/Turn camera/i)).toBeVisible();

    // Switch to Tap Mode inside delivery panel
    await matchTapBtn.click();
    await expect(deliveryPanel.getByText(/Tap Mode: Tap buttons below/i)).toBeVisible();

    // Verify Tap Mode has NO camera options and NO camera view
    await expect(page.getByTitle(/Turn camera/i)).not.toBeVisible();
    await expect(page.getByTitle(/Flip Camera/i)).not.toBeVisible();
    await expect(page.locator("text=Find hand")).not.toBeVisible();
    await expect(page.locator("text=Hand to camera")).not.toBeVisible();
    await expect(page.locator("text=Tap Mode · Camera Off")).toBeVisible();
    await page.screenshot({ path: "public/match-delivery-tap-mode.png" });

    // Switch back to Gesture Mode
    await matchGestureBtn.click();
    await expect(deliveryPanel.getByText(/Gesture Mode: Show 1–6 fingers/i)).toBeVisible();
    await expect(page.getByTitle(/Turn camera/i)).toBeVisible();
    await expect(page.locator("text=Live feed · P2P encrypted")).toBeVisible();
    await page.screenshot({ path: "public/match-delivery-gesture-mode.png" });
  });
});
