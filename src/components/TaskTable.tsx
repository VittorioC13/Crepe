"use client";

import React, { useMemo, useState } from "react";
import { TaskComposer } from "./TaskComposer";
import { TaskRow } from "./TaskRow";
import type { Task, TaskDraft, TaskSection } from "../types/tasks";

type DragState = {
  taskId: string;
  sourceSection: TaskSection;
} | null;

export function TaskTable({
  todo,
  completed,
  onAddTask,
  onDeleteTask,
  onReorderTask,
  onUpdateTask,
}: {
  todo: Task[];
  completed: Task[];
  onAddTask: (draft: TaskDraft) => void;
  onDeleteTask: (taskId: string) => void;
  onReorderTask: (taskId: string, targetSection: TaskSection, targetIndex: number) => void;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
}) {
  const [dragState, setDragState] = useState<DragState>(null);
  const sections = useMemo(
    () => [
      { key: "todo" as const, title: "To-Do", tasks: todo },
      { key: "completed" as const, title: "Completed", tasks: completed },
    ],
    [todo, completed],
  );

  return (
    <div className="panel">
      <div className="panel-header panel-header-task">
        <div className="panel-header-main">
          <p className="eyebrow">Main table</p>
          <TaskComposer onCreate={onAddTask} />
        </div>
      </div>

      {sections.map((section) => (
        <section className="task-section" key={section.key}>
          <div className="section-heading">
            <h3>{section.title}</h3>
            <span>{section.tasks.length} tasks</span>
          </div>

          <div className="table-scroll">
            <table className="task-table">
              <thead>
                <tr>
                  <th aria-hidden="true"></th>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Due date</th>
                  <th>Priority</th>
                  <th>Timeline</th>
                </tr>
              </thead>
              <tbody
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!dragState) {
                    return;
                  }

                  onReorderTask(dragState.taskId, section.key, section.tasks.length);
                  setDragState(null);
                }}
              >
                {section.tasks.map((task, index) => (
                  <TaskRow
                    isDragging={dragState?.taskId === task.id}
                    key={task.id}
                    onDelete={() => onDeleteTask(task.id)}
                    onDragEnd={() => setDragState(null)}
                    onDragStart={() =>
                      setDragState({ taskId: task.id, sourceSection: section.key })
                    }
                    onDropAbove={() => {
                      if (!dragState) {
                        return;
                      }

                      onReorderTask(dragState.taskId, section.key, index);
                      setDragState(null);
                    }}
                    onFieldChange={(patch) => onUpdateTask(task.id, patch)}
                    task={task}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
