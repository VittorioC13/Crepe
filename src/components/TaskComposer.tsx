"use client";

import React, { useState } from "react";

export function TaskComposer({
  onCreate,
}: {
  onCreate: (title: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <form
      className="task-composer"
      onSubmit={(event) => {
        event.preventDefault();
        const title = value.trim();
        if (!title) {
          return;
        }

        onCreate(title);
        setValue("");
      }}
    >
      <input
        aria-label="New task title"
        className="task-composer-input"
        onChange={(event) => setValue(event.target.value)}
        placeholder="Add a calm, clear next step"
        value={value}
      />
      <button className="primary-button" type="submit">
        New task
      </button>
    </form>
  );
}
