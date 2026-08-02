"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addTaskAction, deleteTaskAction, setTaskAssigneeAction, setTaskCompletedAction } from "@/app/actions/trip-workspace";

type TripOption = { id: string; tripName: string; destination: string; clientName: string };
type TeamMember = { userId: string; name: string; role: string };
type TaskItem = {
  id: string;
  trip_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  tripName: string;
  destination: string;
  clientName: string;
  assignee_id: string | null;
  assigneeName: string | null;
};
type View = "open" | "overdue" | "week" | "completed" | "all";

export default function TaskWorkspace({ initialTasks, trips, team }: { initialTasks: TaskItem[]; trips: TripOption[]; team: TeamMember[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<View>("open");
  const [tripId, setTripId] = useState(trips[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date();
  week.setDate(week.getDate() + 7);
  const weekDate = week.toISOString().slice(0, 10);

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    if (view === "open") return !task.completed;
    if (view === "completed") return task.completed;
    if (view === "overdue") return !task.completed && Boolean(task.due_date && task.due_date < today);
    if (view === "week") return !task.completed && Boolean(task.due_date && task.due_date >= today && task.due_date <= weekDate);
    return true;
  }), [tasks, today, view, weekDate]);

  const openCount = tasks.filter((task) => !task.completed).length;
  const overdueCount = tasks.filter((task) => !task.completed && task.due_date && task.due_date < today).length;
  const dueSoonCount = tasks.filter((task) => !task.completed && task.due_date && task.due_date >= today && task.due_date <= weekDate).length;

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!tripId || !title.trim()) return setMessage("Choose a trip and enter a task name.");
    setAdding(true);
    const result = await addTaskAction({ tripId, title, dueDate, assigneeId });
    setAdding(false);
    if (result.error || !result.data) return setMessage(result.error ?? "Scout could not add that task.");
    const trip = trips.find((item) => item.id === tripId);
    if (trip) setTasks((current) => [{
      ...result.data,
      title: result.data.title ?? "Task",
      completed: result.data.completed ?? false,
      tripName: trip.tripName,
      destination: trip.destination,
      clientName: trip.clientName,
      assigneeName: result.data.assignee_id ? team.find((member) => member.userId === result.data.assignee_id)?.name ?? "Team member" : null,
    }, ...current]);
    setTitle("");
    setDueDate("");
    router.refresh();
  }

  async function assignTask(task: TaskItem, nextAssigneeId: string) {
    setMessage("");
    const result = await setTaskAssigneeAction(task.trip_id, task.id, nextAssigneeId || null);
    if (result.error) return setMessage(result.error);
    const assigneeName = nextAssigneeId ? team.find((member) => member.userId === nextAssigneeId)?.name ?? "Team member" : null;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, assignee_id: nextAssigneeId || null, assigneeName } : item));
    router.refresh();
  }

  async function toggleTask(task: TaskItem) {
    setMessage("");
    const completed = !task.completed;
    const result = await setTaskCompletedAction(task.trip_id, task.id, completed);
    if (result.error) return setMessage(result.error);
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed } : item));
    router.refresh();
  }

  async function removeTask(task: TaskItem) {
    setMessage("");
    const result = await deleteTaskAction(task.trip_id, task.id);
    if (result.error) return setMessage(result.error);
    setTasks((current) => current.filter((item) => item.id !== task.id));
    router.refresh();
  }

  return (
    <>
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric label="Open tasks" value={openCount} />
        <Metric label="Overdue" value={overdueCount} tone={overdueCount ? "attention" : "default"} />
        <Metric label="Due next 7 days" value={dueSoonCount} />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-[#243c57]">Add a task</h2>
          <p className="mt-1 text-sm text-slate-500">Tie each task to a trip so Scout keeps the right context.</p>
        </div>
        <form onSubmit={addTask} className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-[1fr_1.3fr_180px_1fr_auto]">
          <select aria-label="Trip" value={tripId} onChange={(event) => setTripId(event.target.value)} className="rounded-xl border border-slate-300 bg-[#f7faf9] px-4 py-3 outline-none focus:border-[#0f6d78]" required>
            {trips.length ? trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.clientName} — {trip.tripName}</option>) : <option value="">Add a trip first</option>}
          </select>
          <input aria-label="Task name" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Follow up with the client" className="rounded-xl border border-slate-300 bg-[#f7faf9] px-4 py-3 outline-none focus:border-[#0f6d78]" required />
          <input aria-label="Due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="rounded-xl border border-slate-300 bg-[#f7faf9] px-4 py-3 outline-none focus:border-[#0f6d78]" />
          <select aria-label="Assign to" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="rounded-xl border border-slate-300 bg-[#f7faf9] px-4 py-3 outline-none focus:border-[#0f6d78]"><option value="">Unassigned</option>{team.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</select>
          <button disabled={adding || !trips.length} className="rounded-xl bg-[#0f6d78] px-6 py-3 font-bold text-white transition hover:bg-[#0c5963] disabled:cursor-not-allowed disabled:opacity-50">{adding ? "Adding…" : "Add task"}</button>
        </form>
        {message && <p role="status" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{message}</p>}
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-xl font-semibold text-[#243c57]">Worklist</h2><p className="mt-1 text-sm text-slate-500">{visibleTasks.length} task{visibleTasks.length === 1 ? "" : "s"} in this view</p></div>
          <div className="flex flex-wrap gap-2" aria-label="Task filters">
            {(["open", "overdue", "week", "completed", "all"] as View[]).map((item) => (
              <button key={item} type="button" onClick={() => setView(item)} className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize transition ${view === item ? "border-[#0f6d78] bg-[#0f6d78] text-white" : "border-slate-300 bg-white text-slate-600 hover:border-[#0f6d78] hover:text-[#0f6d78]"}`}>
                {item === "week" ? "Next 7 days" : item}
              </button>
            ))}
          </div>
        </div>
        {visibleTasks.length ? <div className="divide-y divide-slate-100">{visibleTasks.map((task) => (
          <article key={task.id} className="grid gap-4 px-5 py-5 md:grid-cols-[auto_1fr_auto] md:items-center">
            <button type="button" onClick={() => toggleTask(task)} aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"} className={`grid h-7 w-7 place-items-center rounded-full border-2 transition ${task.completed ? "border-[#0f6d78] bg-[#0f6d78] text-white" : "border-slate-300 bg-white text-transparent hover:border-[#0f6d78]"}`}>
              <CheckIcon />
            </button>
            <div>
              <p className={`font-semibold ${task.completed ? "text-slate-400 line-through" : "text-[#243c57]"}`}>{task.title}</p>
              <p className="mt-1 text-sm text-slate-500">{task.clientName} · {task.tripName} · {task.destination}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#0f6d78]">{task.assigneeName ? `Assigned to ${task.assigneeName}` : "Unassigned"}</p>
            </div>
            <div className="flex items-center gap-3 md:justify-end">
              <select aria-label={`Assignee for ${task.title}`} value={task.assignee_id ?? ""} onChange={(event) => assignTask(task, event.target.value)} className="max-w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none focus:border-[#0f6d78]"><option value="">Unassigned</option>{team.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</select>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${dateClasses(task, today)}`}>{formatDate(task.due_date)}</span>
              <Link href={`/trips/${task.trip_id}`} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#0f6d78] hover:bg-[#edf7f7]">Open trip</Link>
              <button type="button" onClick={() => removeTask(task)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700">Delete</button>
            </div>
          </article>
        ))}</div> : <div className="p-12 text-center"><p className="font-semibold text-[#243c57]">No tasks in this view</p><p className="mt-2 text-sm text-slate-500">Change the filter or add a new task above.</p></div>}
      </section>
    </>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "attention" }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className={`mt-2 text-3xl font-semibold ${tone === "attention" ? "text-rose-700" : "text-[#243c57]"}`}>{value}</p></div>;
}
function formatDate(value: string | null) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No due date"; }
function dateClasses(task: TaskItem, today: string) { if (task.completed) return "bg-slate-100 text-slate-500"; if (task.due_date && task.due_date < today) return "bg-rose-100 text-rose-800"; return "bg-[#edf7f7] text-[#0f6d78]"; }
function CheckIcon() { return <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="m4 10 4 4 8-9" /></svg>; }
