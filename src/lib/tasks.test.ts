import { describe, expect, it } from "vitest";
import { createTask, normalizeTasks, reorderTasks, resizeTimeline, updateTask } from "./tasks";

describe("task helpers", () => {
  it("creates default values for a new task", () => {
    const task = createTask({ title: "Write specs" }, 0);
    expect(task.status).toBe("working");
    expect(task.priority).toBe("medium");
    expect(task.sortOrder).toBe(0);
  });

  it("moves a task into completed when dropped there", () => {
    const first = createTask({ title: "A" }, 0);
    const second = createTask({ title: "B" }, 1);
    const moved = reorderTasks([first, second], first.id, "completed", 0);
    expect(moved.find((task) => task.id === first.id)?.status).toBe("done");
  });

  it("reopens a completed task when moved back to todo", () => {
    const completed = createTask({ title: "Done", status: "done" }, 0);
    const moved = reorderTasks([completed], completed.id, "todo", 0);
    expect(moved[0].status).toBe("working");
  });

  it("normalizes sort order within sections", () => {
    const tasks = normalizeTasks([
      { ...createTask({ title: "C" }, 8), sortOrder: 8 },
      { ...createTask({ title: "D", status: "done" }, 4), sortOrder: 4 },
    ]);
    expect(tasks[0].sortOrder).toBe(0);
    expect(tasks[1].sortOrder).toBe(0);
  });

  it("changes section when status is set to done", () => {
    const task = createTask({ title: "Spec" }, 0);
    const next = updateTask([task], task.id, { status: "done" });
    expect(next[0].status).toBe("done");
  });

  it("resizes timeline and keeps dates ordered", () => {
    const task = createTask(
      {
        title: "Timeline",
        timelineStart: "2026-04-10",
        timelineEnd: "2026-04-13",
      },
      0,
    );
    const next = resizeTimeline(task, "start", 5);
    expect(next.timelineStart).toBe("2026-04-13");
    expect(next.timelineEnd).toBe("2026-04-15");
  });
});
