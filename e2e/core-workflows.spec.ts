import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("world-studio-locale", "en-US");
    window.sessionStorage.setItem("world-studio-opening-shown", "true");
  });
});

async function openWorkspace(page: Page, path = "/dashboard") {
  await page.goto("/dashboard");
  const setupName = page.getByLabel("World name");
  if (await setupName.isVisible()) {
    await setupName.fill("Browser Test World");
    await page.getByRole("button", { name: "Enter the workspace" }).click();
    await expect(page.getByRole("button", { name: "Switch world: Browser Test World" })).toBeVisible();
  }
  if (path !== "/dashboard") await page.goto(path);
}

test("creates an entry, edits its notes, and keeps them after reload", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop authoring flow");
  const title = `Browser entry ${Date.now()}`;
  const notes = "A browser-authored note that must survive a full page reload.";

  await openWorkspace(page);
  await page.getByRole("button", { name: "New Entry" }).click();
  await page.getByPlaceholder("Entry title").fill(title);
  await page.getByPlaceholder("Short description for lists, cards, and wiki previews.").fill("Created by the core browser workflow.");
  await page.getByRole("button", { name: "Create Entry" }).click();

  await page.goto("/entries");
  await page.getByText(title, { exact: true }).first().click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("button", { name: "Edit Notes" }).click();
  const editor = page.locator('[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await editor.fill(notes);
  await page.getByRole("button", { name: "Done" }).click();

  await page.reload();
  await expect(page.getByText(notes, { exact: true })).toBeVisible();
});

test("exports the active world as a backup", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop backup flow");
  await openWorkspace(page, "/settings");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current world" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/i);
});

test("creates and activates another world", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop multi-world flow");
  const worldName = `Browser World ${Date.now()}`;

  await openWorkspace(page);
  await page.getByRole("button", { name: /Switch world:/ }).click();
  await page.getByRole("button", { name: "Create world" }).click();
  await page.getByRole("textbox").fill(worldName);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("textbox").fill("A world created by an end-to-end browser test.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("button", { name: `Switch world: ${worldName}` })).toBeVisible();
});

test("unknown routes show a recoverable not-found page", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "One route assertion is sufficient");
  await openWorkspace(page, "/this-route-does-not-exist");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("mobile navigation exposes worlds, modules, language, and theme", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile navigation flow");
  await openWorkspace(page);

  const worldSwitcher = page.getByRole("button", { name: /Switch world:/ });
  await expect(worldSwitcher).toBeVisible();
  await worldSwitcher.click();
  await expect(page.getByRole("menu", { name: "Switch world" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Dashboard" }).click();
  await expect(page.getByRole("menu", { name: "Primary navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Language" })).toBeVisible();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
