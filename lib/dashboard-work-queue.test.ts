import { describe, expect, it } from "vitest";
import { getPrioritizedWorkQueue, normalizeWorkQueueView, type WorkQueueItem } from "./dashboard-work-queue";

const base = { tripId: "trip-1", tripName: "Magic Kingdom", clientName: "Ava Guest", detail: "Review this item" };
const items: WorkQueueItem[] = [
  { ...base, id: "later", category: "timeline", title: "Dining window", dueDate: "2026-08-10" },
  { ...base, id: "today-task", category: "task", title: "Confirm names", dueDate: "2026-07-24" },
  { ...base, id: "overdue", category: "commission", title: "Commission follow-up", dueDate: "2026-07-20" },
  { ...base, id: "today-payment", category: "payment", title: "Final payment", dueDate: "2026-07-24" },
];

describe("getPrioritizedWorkQueue", () => {
  it("orders overdue work first and uses operational category priority for equal dates", () => {
    expect(getPrioritizedWorkQueue(items, "2026-07-24").map((item) => item.id)).toEqual([
      "overdue", "today-payment", "today-task", "later",
    ]);
  });

  it("includes today in the next-seven-days view", () => {
    expect(getPrioritizedWorkQueue(items, "2026-07-24", "week").map((item) => item.id)).toEqual([
      "today-payment", "today-task",
    ]);
  });
});

describe("normalizeWorkQueueView", () => {
  it("accepts known views and rejects arbitrary query values", () => {
    expect(normalizeWorkQueueView("overdue")).toBe("overdue");
    expect(normalizeWorkQueueView("anything")).toBe("all");
    expect(normalizeWorkQueueView(["today"])).toBe("all");
  });
});
