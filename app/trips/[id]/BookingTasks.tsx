"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { addTaskAction, deleteTaskAction, setTaskCompletedAction } from "../../actions/trip-workspace";

type BookingTask = { id: string; title: string; description: string | null; due_date: string | null; completed: boolean };
type BookingTasksProps = { tripId: string; initialTasks: BookingTask[] };

export default function BookingTasks({ tripId, initialTasks }: BookingTasksProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (!title.trim()) return setMessage("Enter a task name.");
    setAdding(true);
    const { data, error } = await addTaskAction({ tripId, title, dueDate });
    setAdding(false);
    if (error || !data) return setMessage(error ?? "Scout could not add that task.");
    setTasks((current) => [...current, { ...data, title: data.title ?? "Task", completed: data.completed ?? false }]); setTitle(""); setDueDate(""); router.refresh();
  }

  async function toggleTask(task: BookingTask) {
    setMessage("");
    const completed = !task.completed;
    const { error } = await setTaskCompletedAction(tripId, task.id, completed);
    if (error) return setMessage(error);
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed } : item));
    router.refresh();
  }

  async function deleteTask(taskId: string) {
    setMessage("");
    const { error } = await deleteTaskAction(tripId, taskId);
    if (error) return setMessage(error);
    setTasks((current) => current.filter((task) => task.id !== taskId)); router.refresh();
  }

  const formatDate = (date: string | null) => date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "No due date";
  const completedCount = tasks.filter((task) => task.completed).length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold">Booking Tasks</h2>
      <p className="mt-1 text-sm text-slate-600">{completedCount} of {tasks.length} tasks completed</p>
      <form onSubmit={addTask} className="mt-6 rounded-xl border border-slate-200 bg-[#f6f8f7] p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_190px_auto]">
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a booking task" className="rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500" />
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-sky-500" />
          <button type="submit" disabled={adding} className="rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-500 disabled:opacity-50">{adding ? "Adding..." : "Add Task"}</button>
        </div>
      </form>
      {message && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</p>}
      <div className="mt-6 space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <p className="font-semibold">No booking tasks yet</p><p className="mt-2 text-sm text-slate-600">Add the first task for this booking.</p>
          </div>
        ) : tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-[#f6f8f7] p-4">
            <button type="button" onClick={() => toggleTask(task)} aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${task.completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-400 text-transparent"}`}>✓</button>
            <div className="min-w-0 flex-1">
              <p className={task.completed ? "font-medium text-slate-500 line-through" : "font-medium text-slate-900"}>{task.title}</p>
              <p className="mt-1 text-sm text-slate-500">{formatDate(task.due_date)}</p>
            </div>
            <button type="button" onClick={() => deleteTask(task.id)} className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>
          </div>
        ))}
      </div>
    </section>
  );
}
