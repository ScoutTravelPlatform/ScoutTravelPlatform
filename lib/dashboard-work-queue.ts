export type WorkQueueItem = {
  id: string;
  tripId: string;
  category: "task" | "payment" | "timeline" | "booking" | "departure" | "commission";
  title: string;
  tripName: string;
  clientName: string;
  dueDate: string;
  detail: string;
};

export type WorkQueueView = "all" | "overdue" | "today" | "week";

export type PrioritizedWorkQueueItem = WorkQueueItem & {
  timing: "overdue" | "today" | "week" | "later";
  daysUntilDue: number;
};

const categoryPriority: Record<WorkQueueItem["category"], number> = {
  payment: 0,
  task: 1,
  timeline: 2,
  booking: 3,
  departure: 4,
  commission: 5,
};

export function getPrioritizedWorkQueue(
  items: WorkQueueItem[],
  today: string,
  view: WorkQueueView = "all",
) {
  return items
    .map((item): PrioritizedWorkQueueItem => {
      const daysUntilDue = differenceInDays(today, item.dueDate);
      const timing = daysUntilDue < 0 ? "overdue" : daysUntilDue === 0 ? "today" : daysUntilDue <= 7 ? "week" : "later";
      return { ...item, daysUntilDue, timing };
    })
    .filter((item) => view === "all" || item.timing === view || (view === "week" && item.timing === "today"))
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue || categoryPriority[a.category] - categoryPriority[b.category] || a.title.localeCompare(b.title));
}

export function normalizeWorkQueueView(value: string | string[] | undefined): WorkQueueView {
  return value === "overdue" || value === "today" || value === "week" ? value : "all";
}

function differenceInDays(today: string, dueDate: string) {
  const start = Date.parse(`${today}T00:00:00Z`);
  const end = Date.parse(`${dueDate}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}
