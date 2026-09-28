import { expect, test } from "@playwright/test";

test.describe("Explore worlds", () => {
  test("opens each playable world from Explore", async ({ page }) => {
    await page.goto("/discover");

    await expect(page.getByRole("heading", { name: "Pick a world. Mess with it." })).toBeVisible();
    await expect(page.getByRole("button", { name: /Launch lab/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Creature lab/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Block lab/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Word invaders/i })).toBeVisible();
  });

  test("Word Invaders lets letters move into and around the rack", async ({ page }) => {
    await page.goto("/discover");
    await page.getByRole("button", { name: /Word invaders/i }).click();

    await expect(page.getByRole("heading", { name: "Word invaders" })).toBeVisible();
    const invaders = page.locator(".letter-invader");
    await expect(invaders.first()).toBeVisible();

    await invaders.nth(0).click();
    await invaders.nth(1).click();

    const rackLetters = page.locator(".word-rack button");
    await expect(rackLetters).toHaveCount(2);
    await rackLetters.nth(0).click();
    await expect(rackLetters.nth(0)).toHaveAttribute("aria-pressed", "true");
    await rackLetters.nth(1).click();
    await expect(rackLetters.nth(0)).toHaveAttribute("aria-pressed", "false");
  });

  test("Launch Lab compares repeated real-world runs", async ({ page }) => {
    await page.goto("/discover");
    await page.getByRole("button", { name: /Launch lab/i }).click();

    await page.getByRole("button", { name: "Send it" }).click();
    await page.getByRole("button", { name: "Fast" }).click();
    await page.getByRole("button", { name: "Send it" }).click();

    await expect(page.locator(".launch-ghost-marker")).toBeVisible();
    await expect(page.getByText(/last real-world run|same place/i)).toBeVisible();
  });

  test("Creature Lab can surprise and test a creature", async ({ page }) => {
    await page.goto("/discover");
    await page.getByRole("button", { name: /Creature lab/i }).click();

    await page.getByRole("button", { name: "Surprise the world" }).click();
    await expect(page.locator(".creature-event-badge")).toBeVisible();
    await page.getByRole("button", { name: "Test it" }).click();

    await expect(page.locator(".invented-creature")).toBeVisible();
  });

  test("Block Lab supports Buddy moves, transforms and undo", async ({ page }) => {
    await page.goto("/discover");
    await page.getByRole("button", { name: /Block lab/i }).click();

    const undo = page.getByRole("button", { name: "Undo last move" });
    await expect(undo).toBeDisabled();

    await page.getByRole("button", { name: "Buddy, add one" }).click();
    await expect(undo).toBeEnabled();

    await page.getByRole("button", { name: "Mirror it" }).click();
    await expect(undo).toBeEnabled();

    await undo.click();
    await expect(page.locator(".iso-block").first()).toBeVisible();
  });
});
