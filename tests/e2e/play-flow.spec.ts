import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

test("a word can move from Add words into the shared build-and-ride world", async ({ page }) => {
  await page.goto("/practice/add-spellings");

  await page.getByRole("button", { name: "Add a word" }).click();
  await page.getByLabel("Spelling word").fill("because");
  await page.getByRole("button", { name: "Play with these words" }).click();

  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByRole("heading", { name: "because" })).toBeVisible();

  // Support stays hidden until the child asks.
  await expect(page.locator(".practice-reveal")).toHaveCount(0);
  await page.getByRole("button", { name: "Give me a clue" }).click();
  await expect(page.locator(".practice-reveal")).toBeVisible();

  await page.getByRole("button", { name: "Done with this one" }).click();
  await expect(page.getByRole("heading", { name: "One word. That's enough." })).toBeVisible();

  await page.getByRole("link", { name: "Build the ride" }).click();
  await expect(page).toHaveURL(/\/practice\/coaster$/);

  await page.locator("summary").filter({ hasText: "Add track" }).click();
  await page.getByRole("button", { name: "Loop", exact: true }).click();
  await page.getByRole("button", { name: /because/i }).click();

  await expect(page.getByText("BUILD HERE")).toBeVisible();
  await page.getByRole("button", { name: "Ride" }).click();
  await expect(page.getByText("Station launch")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send it" }).first()).toBeVisible();
});

test("every word-piece can use the adventurous end of the track kit", async ({ page }) => {
  await page.goto("/practice/add-spellings");
  await page.getByRole("button", { name: "Add a word" }).click();
  await page.getByLabel("Spelling word").fill("cat");
  await page.getByRole("button", { name: "Play with these words" }).click();
  await page.getByRole("button", { name: "Done with this one" }).click();
  await page.getByRole("link", { name: "Build the ride" }).click();

  await page.locator("summary").filter({ hasText: "Add track" }).click();
  await expect(page.getByRole("button", { name: "Mega jump" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Wall ride" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Double loop" })).toBeVisible();
});
