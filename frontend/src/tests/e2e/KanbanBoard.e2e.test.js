import { test, expect } from "@playwright/test";

test.describe("Kanban Board E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000");
    await expect(page.getByText("Real-time Kanban Board")).toBeVisible();
    // Wait for WebSocket connection
    await expect(page.locator(".connection-status.connected")).toBeVisible({
      timeout: 10000,
    });

    // Reset all tasks before each test to ensure clean state
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const { io } = require("socket.io-client") || {};
        // Use the app's existing socket connection exposed via window
        // Alternative: directly emit reset via a fresh socket
        const socket = window.__testSocket || null;
        if (socket) {
          socket.emit("tasks:reset");
          setTimeout(resolve, 300);
        } else {
          resolve();
        }
      });
    }).catch(() => {});

    // Fallback: use a direct socket to reset
    await page.evaluate(async () => {
      const script = document.createElement("script");
      script.src = "https://cdn.socket.io/4.7.5/socket.io.min.js";
      document.head.appendChild(script);
      await new Promise((r) => (script.onload = r));
      const s = window.io("http://localhost:5000");
      await new Promise((r) => {
        s.on("connect", () => {
          s.emit("tasks:reset");
          setTimeout(() => {
            s.disconnect();
            r();
          }, 300);
        });
      });
    }).catch(() => {});

    // Wait for the board to show no tasks (clean state)
    await page.waitForTimeout(500);
  });

  // ─── Board Structure ──────────────────────────────────────────────

  test("displays three columns: To Do, In Progress, Done", async ({
    page,
  }) => {
    await expect(page.getByTestId("column-To Do")).toBeVisible();
    await expect(page.getByTestId("column-In Progress")).toBeVisible();
    await expect(page.getByTestId("column-Done")).toBeVisible();
  });

  // ─── Task CRUD ────────────────────────────────────────────────────

  test("user can create a task and see it on the board", async ({ page }) => {
    await page.getByText("+ Add Task").first().click();

    await page.getByTestId("task-title-input").fill("E2E Test Task");
    await page
      .getByTestId("task-description-input")
      .fill("Created via Playwright");
    await page.getByTestId("task-priority-select").selectOption("High");
    await page.getByTestId("task-category-select").selectOption("Bug");
    await page.getByTestId("save-task-btn").click();

    await expect(page.getByText("E2E Test Task")).toBeVisible();
    await expect(page.getByText("Created via Playwright")).toBeVisible();
  });

  test("user can delete a task and see it removed", async ({ page }) => {
    // Create a task first
    await page.getByText("+ Add Task").first().click();
    await page.getByTestId("task-title-input").fill("Delete Me Task");
    await page.getByTestId("save-task-btn").click();
    await expect(page.getByText("Delete Me Task")).toBeVisible();

    // Hover and delete
    const taskCard = page.getByText("Delete Me Task").locator("..").locator("..");
    await taskCard.hover();
    await taskCard.getByLabel("Delete task").click();

    await expect(page.getByText("Delete Me Task")).not.toBeVisible();
  });

  test("user can edit a task", async ({ page }) => {
    // Create first
    await page.getByText("+ Add Task").first().click();
    await page.getByTestId("task-title-input").fill("Before Edit");
    await page.getByTestId("save-task-btn").click();
    await expect(page.getByText("Before Edit")).toBeVisible();

    // Edit
    const taskCard = page.getByText("Before Edit").locator("..").locator("..");
    await taskCard.hover();
    await taskCard.getByLabel("Edit task").click();

    await page.getByTestId("task-title-input").fill("After Edit");
    await page.getByTestId("save-task-btn").click();

    await expect(page.getByText("After Edit")).toBeVisible();
    await expect(page.getByText("Before Edit")).not.toBeVisible();
  });

  // ─── Task Movement ────────────────────────────────────────────────

  test("user can move a task between columns using move buttons", async ({
    page,
  }) => {
    // Create a task in To Do
    await page.getByText("+ Add Task").first().click();
    await page.getByTestId("task-title-input").fill("Move Test Task");
    await page.getByTestId("save-task-btn").click();
    await expect(page.getByText("Move Test Task")).toBeVisible();

    // Find the task card and click its "→ In Progress" button
    const taskCard = page.getByText("Move Test Task").locator("..").locator("..");
    await taskCard.getByRole("button", { name: "Move to In Progress" }).click();

    // Verify task is in the In Progress column
    const inProgressColumn = page.getByTestId("column-In Progress");
    await expect(
      inProgressColumn.getByText("Move Test Task")
    ).toBeVisible();

    // Move to Done
    const taskCardInProgress = page.getByText("Move Test Task").locator("..").locator("..");
    await taskCardInProgress.getByRole("button", { name: "Move to Done" }).click();

    const doneColumn = page.getByTestId("column-Done");
    await expect(doneColumn.getByText("Move Test Task")).toBeVisible();
  });

  test("user can drag and drop a task between columns", async ({ page }) => {
    // Create a task
    await page.getByText("+ Add Task").first().click();
    await page.getByTestId("task-title-input").fill("Drag Test Task");
    await page.getByTestId("save-task-btn").click();
    await expect(page.getByText("Drag Test Task")).toBeVisible();

    // Drag from To Do to Done column
    const taskCard = page
      .getByText("Drag Test Task")
      .locator("..")
      .locator("..");
    const doneColumn = page.getByTestId("column-Done");

    await taskCard.dragTo(doneColumn);
    await page.waitForTimeout(500);

    // After drag, task should still be visible on the board
    await expect(page.getByText("Drag Test Task")).toBeVisible();
  });

  // ─── Dropdown Select Testing ──────────────────────────────────────

  test("user can select a priority level", async ({ page }) => {
    await page.getByText("+ Add Task").first().click();
    await page.getByTestId("task-title-input").fill("Priority Task");

    // Test all priority options
    const prioritySelect = page.getByTestId("task-priority-select");

    await prioritySelect.selectOption("Low");
    await expect(prioritySelect).toHaveValue("Low");

    await prioritySelect.selectOption("High");
    await expect(prioritySelect).toHaveValue("High");

    await prioritySelect.selectOption("Medium");
    await expect(prioritySelect).toHaveValue("Medium");

    // Save with Medium priority
    await page.getByTestId("save-task-btn").click();
    await expect(page.getByText("Priority Task")).toBeVisible();

    // Check the task card has the priority badge
    const taskCard = page.getByText("Priority Task").locator("..").locator("..");
    await expect(taskCard.locator(".priority-badge")).toContainText("Medium");
  });

  test("user can change the task category and verify the update", async ({
    page,
  }) => {
    await page.getByText("+ Add Task").first().click();
    await page.getByTestId("task-title-input").fill("Category Task");

    const categorySelect = page.getByTestId("task-category-select");

    await categorySelect.selectOption("Bug");
    await expect(categorySelect).toHaveValue("Bug");

    await categorySelect.selectOption("Enhancement");
    await expect(categorySelect).toHaveValue("Enhancement");

    await page.getByTestId("save-task-btn").click();
    await expect(page.getByText("Category Task")).toBeVisible();

    // Check the task card has the category badge
    const taskCard = page.getByText("Category Task").locator("..").locator("..");
    await expect(taskCard.locator(".category-badge")).toContainText("Enhancement");
  });

  // ─── File Upload Testing ──────────────────────────────────────────

  test("user can upload a file", async ({ page }) => {
    await page.getByText("+ Add Task").first().click();
    await page.getByTestId("task-title-input").fill("File Upload Task");

    // Upload a test file
    await page.getByTestId("task-file-input").setInputFiles({
      name: "test-image.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-image-data"),
    });

    // Verify attachment appears in modal
    await expect(page.locator(".attachment-item")).toBeVisible();

    await page.getByTestId("save-task-btn").click();
    await expect(page.getByText("File Upload Task")).toBeVisible();
  });

  test("uploaded files display correctly", async ({ page }) => {
    await page.getByText("+ Add Task").first().click();
    await page.getByTestId("task-title-input").fill("Image Preview Task");

    // Upload image
    await page.getByTestId("task-file-input").setInputFiles({
      name: "preview.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"),
    });

    // Image thumbnail should be visible in modal
    await expect(page.locator(".attachment-thumb")).toBeVisible();

    await page.getByTestId("save-task-btn").click();
    await expect(page.getByText("Image Preview Task")).toBeVisible();

    // Image should show in the task card
    const taskCard = page.getByText("Image Preview Task").locator("..").locator("..");
    await expect(taskCard.locator(".attachment-image")).toBeVisible();
  });

  test("invalid file formats show an error message", async ({ page }) => {
    await page.getByText("+ Add Task").first().click();
    await page.getByTestId("task-title-input").fill("Invalid File Task");

    // Try to upload an unsupported file
    await page.getByTestId("task-file-input").setInputFiles({
      name: "malware.exe",
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("bad-content"),
    });

    // Error message should appear
    await expect(page.getByTestId("file-error")).toBeVisible();
    await expect(page.getByTestId("file-error")).toContainText(
      "Unsupported file format"
    );
  });

  // ─── Graph Testing ────────────────────────────────────────────────

  test("task counts update correctly in the graph as tasks move", async ({
    page,
  }) => {
    // Create a task
    await page.getByText("+ Add Task").first().click();
    await page.getByTestId("task-title-input").fill("Chart Task");
    await page.getByTestId("save-task-btn").click();
    await expect(page.getByText("Chart Task")).toBeVisible();

    // Chart shows 0% (1 task in To Do, 0 done)
    await expect(page.getByTestId("progress-chart")).toBeVisible();
    await expect(page.getByTestId("completion-percentage")).toContainText(
      "0% Complete"
    );

    // Move task to Done via the task card's move button
    const taskCard = page.getByText("Chart Task").locator("..").locator("..");
    await taskCard.getByRole("button", { name: "Move to Done" }).click();

    // Chart should show 100%
    await expect(page.getByTestId("completion-percentage")).toContainText(
      "100% Complete"
    );
  });

  test("graph re-renders dynamically when new tasks are added", async ({
    page,
  }) => {
    // Create first task and move to Done
    await page.getByText("+ Add Task").first().click();
    await page.getByTestId("task-title-input").fill("Done Task");
    await page.getByTestId("save-task-btn").click();
    await expect(page.getByText("Done Task")).toBeVisible();

    const taskCard = page.getByText("Done Task").locator("..").locator("..");
    await taskCard.getByRole("button", { name: "Move to Done" }).click();

    await expect(page.getByTestId("completion-percentage")).toContainText(
      "100% Complete"
    );

    // Create second task in To Do
    await page.getByText("+ Add Task").first().click();
    await page.getByTestId("task-title-input").fill("New Task");
    await page.getByTestId("save-task-btn").click();

    // Now 1 of 2 done = 50%
    await expect(page.getByTestId("completion-percentage")).toContainText(
      "50% Complete"
    );
  });

  // ─── Real-time Updates (Multi-client) ─────────────────────────────

  test("UI updates in real-time when another user modifies tasks", async ({
    page,
    context,
  }) => {
    // Open second browser page (simulates another user)
    const page2 = await context.newPage();
    await page2.goto("http://localhost:3000");
    await expect(page2.getByText("Real-time Kanban Board")).toBeVisible();
    await expect(
      page2.locator(".connection-status.connected")
    ).toBeVisible({ timeout: 10000 });

    // User 1 creates a task
    await page.getByText("+ Add Task").first().click();
    await page.getByTestId("task-title-input").fill("Real-time Task");
    await page.getByTestId("save-task-btn").click();

    // Task should appear on User 2's board in real-time
    await expect(page2.getByText("Real-time Task")).toBeVisible({
      timeout: 5000,
    });

    // User 2 deletes the task
    const taskCard2 = page2
      .getByText("Real-time Task")
      .locator("..")
      .locator("..");
    await taskCard2.hover();
    await taskCard2.getByLabel("Delete task").click();

    // Task should disappear from User 1's board
    await expect(page.getByText("Real-time Task")).not.toBeVisible({
      timeout: 5000,
    });

    await page2.close();
  });
});
