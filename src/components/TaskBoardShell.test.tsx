import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { TaskBoardShell } from "./TaskBoardShell";

describe("TaskBoardShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("adds a task from the composer", async () => {
    const user = userEvent.setup();
    render(<TaskBoardShell />);

    await user.type(screen.getByLabelText("New task title"), "Prepare roadmap");
    await user.click(screen.getByRole("button", { name: "New task" }));

    expect(screen.getByDisplayValue("Prepare roadmap")).toBeInTheDocument();
  });

  it("deletes a task", async () => {
    const user = userEvent.setup();
    render(<TaskBoardShell />);

    await user.click(
      screen.getByRole("button", { name: "Delete Align product goals" }),
    );

    expect(screen.queryAllByDisplayValue("Align product goals")).toHaveLength(0);
  });

  it("updates a task field inline", async () => {
    render(<TaskBoardShell />);

    const titleInput = screen.getByLabelText("Title for Align product goals");
    fireEvent.change(titleInput, { target: { value: "Refined goal" } });

    expect(screen.getByDisplayValue("Refined goal")).toBeInTheDocument();
  });
});
