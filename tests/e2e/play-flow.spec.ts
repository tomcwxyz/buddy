import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

test("a word can move from Add words into the shared build-and-ride world", async ({ page }) => {
  await page.goto("/practice/add-spellings");
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Add a word" }).click();
  await page.getByLabel("Spelling word").fill("because");
  await page.getByRole("button", { name: "Play with these words" }).click();

  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByRole("heading", { name: "because" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Support stays hidden until the child asks.
  await expect(page.locator(".practice-reveal")).toHaveCount(0);
  await page.getByRole("button", { name: "Give me a clue" }).click();
  await expect(page.locator(".practice-reveal")).toBeVisible();

  await page.getByRole("button", { name: "Done with this one" }).click();
  await expect(page.getByRole("heading", { name: "One word. That's enough." })).toBeVisible();

  await page.getByRole("link", { name: "Build the ride" }).click();
  await expect(page).toHaveURL(/\/practice\/coaster$/, { timeout: 20_000 });

  await page.locator("summary").filter({ hasText: "Add track" }).click();
  await page.getByRole("button", { name: "Loop", exact: true }).click();
  await page.locator(".coaster-track-kit-picker").getByRole("button", { name: "because", exact: true }).click();

  await expect(page.locator(".coaster-build-endpoint")).toBeVisible();
  await page.getByRole("button", { name: "Ride mode", exact: true }).click();
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


test("the phone shell stays inside the viewport", async ({ page }) => {
  await page.goto("/");
  await expectNoHorizontalOverflow(page);
  await page.goto("/practice");
  await expectNoHorizontalOverflow(page);
});

test("a word-piece can be dragged from the dock onto the coaster world", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Touch drag is exercised on the mobile project.");

  await page.goto("/practice/add-spellings");
  await page.getByRole("button", { name: "Add a word" }).click();
  await page.getByLabel("Spelling word").fill("cat");
  await page.getByRole("button", { name: "Play with these words" }).click();
  await page.getByRole("button", { name: "Done with this one" }).click();
  await page.getByRole("link", { name: "Build the ride" }).click();
  await expect(page).toHaveURL(/\/practice\/coaster$/, { timeout: 20_000 });

  const piece = page.getByRole("button", { name: "Drag cat onto the track" });
  const board = page.locator(".coaster-board");
  await expect(piece).toBeVisible();
  await expect(board).toBeVisible();

  const source = await piece.boundingBox();
  const target = await board.boundingBox();
  if (!source || !target) throw new Error("Coaster drag target was not measurable");

  const viewport = page.viewportSize();
  const dropX = target.x + target.width * 0.58;
  const dropY = viewport
    ? Math.max(target.y + 28, Math.min(target.y + target.height - 28, viewport.height - 48))
    : target.y + Math.min(90, target.height * 0.25);

  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(dropX, dropY, { steps: 8 });
  await page.mouse.up();

  await expect(page.locator(".coaster-build-endpoint")).toBeVisible();
  await expect(piece).toHaveCount(0);
});


test("Buddy responds to a touch without disturbing the phone layout", async ({ page }) => {
  await page.goto("/");
  const buddy = page.getByRole("button", { name: "Say hello to Buddy" }).first();
  await expect(buddy).toBeVisible();
  await expect(buddy).toHaveAttribute("data-reaction-count", "0");
  await buddy.click();
  await expect(buddy).toHaveAttribute("data-reaction-count", "1");
  await expectNoHorizontalOverflow(page);
});
