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

test.describe("Camera & Hand Detection Tests", () => {

  test("Opens Camera Check Modal from Navbar and tests live preview & gesture practice", async ({ page }) => {
    await page.goto("http://localhost:3000/");

    // Check that Camera Check button exists in the Navbar
    const cameraCheckBtn = page.getByRole("button", { name: /Camera and Gesture Check/i });
    await expect(cameraCheckBtn).toBeVisible();
    await cameraCheckBtn.click();

    const modal = page.getByRole("dialog");
    // Verify Camera Check modal is open
    await expect(modal.getByRole("heading", { name: /Camera & Mic Check/i })).toBeVisible();

    // Verify Live preview tag
    await expect(modal.getByText(/Live preview/i)).toBeVisible({ timeout: 10000 });

    // Verify Gesture Practice section
    await expect(modal.getByText(/Gesture practice/i)).toBeVisible();
    await expect(modal.getByText(/Locks at 1s • Change freely/i)).toBeVisible();

    // Verify 1-6 Gestures Legend
    await expect(modal.getByText(/Index Only/i)).toBeVisible();
    await expect(modal.getByText(/Index \+ Middle/i)).toBeVisible();
    await expect(modal.getByText(/Three Fingers/i)).toBeVisible();
    await expect(modal.getByText(/Four Fingers/i)).toBeVisible();
    await expect(modal.getByText(/Open Palm/i)).toBeVisible();
    await expect(modal.getByText(/Thumb Only/i)).toBeVisible();

    // Screenshot the Camera Check modal
    await page.screenshot({ path: "public/camera-check-modal.png" });

    // Close the modal
    const closeBtn = modal.getByRole("button", { name: /Cancel/i });
    await closeBtn.click();

    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("Camera and Detection in Live Match vs Bot", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("http://localhost:3000/");

    // Launch bot match
    await page.getByRole("button", { name: /Practice vs Server Bot/i }).click();

    // If searching overlay appears, click Play vs Bot Arena to immediately start
    const botArenaBtn = page.getByRole("button", { name: /Play vs Bot Arena/i });
    if (await botArenaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await botArenaBtn.click();
    }

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

    // In match screen
    await expect(page.getByRole("region", { name: /Match Scoreboard/i })).toBeVisible({
      timeout: 15000,
    });

    // Verify local video PiP is present
    const pipVideo = page.locator("video");
    await expect(pipVideo.first()).toBeVisible({ timeout: 8000 });

    // Verify camera controls
    const cameraToggleBtn = page.getByTitle(/Turn camera off|Turn camera on/i);
    await expect(cameraToggleBtn).toBeVisible();

    // Verify Tap/Gesture mode switch
    const gestureToggleBtn = page.getByTitle(/Switch to tap mode|Switch to gesture mode/i);
    await expect(gestureToggleBtn).toBeVisible();

    await page.screenshot({ path: "public/match-camera-detection.png" });
  });
});
