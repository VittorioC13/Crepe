import { beforeEach, describe, expect, it } from "vitest";
import { clearTasks, loadTasks, saveTasks } from "./taskStore";
import { createTask } from "./tasks";

describe("task store", () => {
  beforeEach(() => {
    clearTasks();
  });

  it("loads seed tasks on first load", () => {
    expect(loadTasks().length).toBeGreaterThan(0);
  });

  it("saves and loads tasks", () => {
    const task = createTask({ title: "Keep state" }, 0);
    saveTasks([task]);
    expect(loadTasks()[0].title).toBe("Keep state");
  });

  it("falls back when stored data is invalid", () => {
    window.localStorage.setItem("musashi.pm.tasks.v1", "{");
    expect(loadTasks().length).toBeGreaterThan(0);
  });
});
