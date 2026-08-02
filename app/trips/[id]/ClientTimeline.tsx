"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addTimelineEventAction, deleteTimelineEventAction, generateDisneyTimelineAction, updateTimelineEventAction } from "../../actions/trip-workspace";

type TimelineEvent = {
  id: string;
  trip_id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string | null;
  status: string | null;
  created_at: string | null;
  rule_key: string | null;
  generation_source: string | null;
  is_advisor_override: boolean;
  source_url: string | null;
};

type ClientTimelineProps = {
  tripId: string;
  initialEvents: TimelineEvent[];
  isDisneyTrip: boolean;
};

const EVENT_TYPES = [
  "Lead",
  "Quote",
  "Payment",
  "Booking",
  "Dining",
  "Reminder",
  "Documents",
  "Travel",
  "Commission",
  "Other",
];

const STATUSES = ["Upcoming", "Completed", "Canceled"];

export default function ClientTimeline({
  tripId,
  initialEvents,
  isDisneyTrip,
}: ClientTimelineProps) {
  const router = useRouter();

  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);

  const [eventType, setEventType] = useState("Other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [status, setStatus] = useState("Upcoming");

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEventType, setEditEventType] = useState("Other");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editEventDate, setEditEventDate] = useState("");
  const [editStatus, setEditStatus] = useState("Upcoming");

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const firstDate = a.event_date
        ? new Date(`${a.event_date}T00:00:00`).getTime()
        : new Date(a.created_at ?? 0).getTime();

      const secondDate = b.event_date
        ? new Date(`${b.event_date}T00:00:00`).getTime()
        : new Date(b.created_at ?? 0).getTime();

      return firstDate - secondDate;
    });
  }, [events]);

  const completedCount = events.filter(
    (event) => event.status === "Completed"
  ).length;

  const upcomingCount = events.filter(
    (event) => event.status === "Upcoming"
  ).length;

  function formatDate(value: string | null) {
    if (!value) {
      return "No date added";
    }

    return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getEventTypeClasses(type: string) {
    switch (type) {
      case "Lead":
        return "border-sky-500 bg-sky-500";
      case "Quote":
        return "border-violet-500 bg-violet-500";
      case "Payment":
        return "border-emerald-500 bg-emerald-500";
      case "Booking":
        return "border-blue-500 bg-blue-500";
      case "Dining":
        return "border-orange-500 bg-orange-500";
      case "Reminder":
        return "border-amber-500 bg-amber-500";
      case "Documents":
        return "border-cyan-500 bg-cyan-500";
      case "Travel":
        return "border-fuchsia-500 bg-fuchsia-500";
      case "Commission":
        return "border-purple-500 bg-purple-500";
      default:
        return "border-slate-400 bg-slate-500";
    }
  }

  function getStatusClasses(value: string | null) {
    if (value === "Completed") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (value === "Canceled") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  async function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!title.trim()) {
      setMessage("Enter a timeline event title.");
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await addTimelineEventAction({
      tripId, eventType, title, description, eventDate, status,
    });

    setIsSubmitting(false);

    if (error || !data) {
      setMessage(error ?? "Scout could not add that timeline event.");
      return;
    }

    setEvents((currentEvents) => [...currentEvents, data]);
    setEventType("Other");
    setTitle("");
    setDescription("");
    setEventDate("");
    setStatus("Upcoming");
    setMessage("Timeline event added.");

    router.refresh();
  }

  function startEditing(event: TimelineEvent) {
    setEditingId(event.id);
    setEditEventType(event.event_type || "Other");
    setEditTitle(event.title || "");
    setEditDescription(event.description || "");
    setEditEventDate(event.event_date || "");
    setEditStatus(event.status || "Upcoming");
    setMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditEventType("Other");
    setEditTitle("");
    setEditDescription("");
    setEditEventDate("");
    setEditStatus("Upcoming");
  }

  async function saveEvent(event: TimelineEvent) {
    setMessage("");

    if (!editTitle.trim()) {
      setMessage("Enter a timeline event title.");
      return;
    }

    setUpdatingId(event.id);

    const { data, error } = await updateTimelineEventAction(event.id, {
      tripId,
      eventType: editEventType,
      title: editTitle,
      description: editDescription,
      eventDate: editEventDate,
      status: editStatus,
    });

    setUpdatingId(null);

    if (error || !data) {
      setMessage(error ?? "Scout could not update that timeline event.");
      return;
    }

    setEvents((currentEvents) =>
      currentEvents.map((currentEvent) =>
        currentEvent.id === event.id ? data : currentEvent
      )
    );

    cancelEditing();
    setMessage("Timeline event updated.");

    router.refresh();
  }

  async function markCompleted(event: TimelineEvent) {
    setMessage("");
    setUpdatingId(event.id);

    const { data, error } = await updateTimelineEventAction(event.id, {
      tripId,
      eventType: event.event_type,
      title: event.title,
      description: event.description,
      eventDate: event.event_date,
      status: "Completed",
    });

    setUpdatingId(null);

    if (error || !data) {
      setMessage(error ?? "Scout could not complete that timeline event.");
      return;
    }

    setEvents((currentEvents) =>
      currentEvents.map((currentEvent) =>
        currentEvent.id === event.id ? data : currentEvent
      )
    );

    setMessage("Timeline event completed.");
    router.refresh();
  }

  async function deleteEvent(event: TimelineEvent) {
    const confirmed = window.confirm(
      `Delete the timeline event "${event.title}"?`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setDeletingId(event.id);

    const { error } = await deleteTimelineEventAction(tripId, event.id);

    setDeletingId(null);

    if (error) {
      setMessage(error);
      return;
    }

    setEvents((currentEvents) =>
      currentEvents.filter(
        (currentEvent) => currentEvent.id !== event.id
      )
    );

    setMessage("Timeline event deleted.");
    router.refresh();
  }

  async function generateTimeline() {
    setMessage("");
    setIsGenerating(true);
    const { data, error } = await generateDisneyTimelineAction(tripId);
    setIsGenerating(false);

    if (error || !data) {
      setMessage(error ?? "Scout could not generate the Disney timeline.");
      return;
    }

    setEvents(data);
    setMessage("Disney Smart Timeline generated. Advisor-edited events were preserved.");
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Client Activity
          </p>

          <h2 className="mt-2 text-2xl font-bold">Client Timeline</h2>

          <p className="mt-1 text-sm text-slate-600">
            Track every important booking milestone in one place.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {isDisneyTrip && (
            <>
              <button
                type="button"
                onClick={generateTimeline}
                disabled={isGenerating}
                className="rounded-lg bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate Disney Smart Timeline"}
              </button>
              <p className="max-w-sm text-xs text-slate-600">
                Adds Disney booking windows and Scout workflow reminders. Regenerate safely after trip dates change.
              </p>
            </>
          )}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-[#f6f8f7] px-4 py-3 text-center">
            <p className="text-xs text-slate-600">Total</p>
            <p className="mt-1 text-xl font-bold">{events.length}</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
            <p className="text-xs text-amber-700">Upcoming</p>
            <p className="mt-1 text-xl font-bold text-amber-700">
              {upcomingCount}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
            <p className="text-xs text-emerald-700">Completed</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">
              {completedCount}
            </p>
          </div>
        </div>
        </div>
      </div>

      <form
        onSubmit={addEvent}
        className="mt-8 rounded-2xl border border-slate-200 bg-[#f6f8f7] p-5"
      >
        <h3 className="font-bold">Add Timeline Event</h3>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-cyan-500"
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Event title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-cyan-500"
          />

          <input
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-cyan-500"
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-cyan-500"
          >
            {STATUSES.map((timelineStatus) => (
              <option key={timelineStatus} value={timelineStatus}>
                {timelineStatus}
              </option>
            ))}
          </select>
        </div>

        <textarea
          placeholder="Description or notes"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-cyan-500"
        />

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-cyan-600 px-5 py-3 font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Adding..." : "Add Timeline Event"}
          </button>
        </div>
      </form>

      {message && (
        <p className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-800">
          {message}
        </p>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Timeline Events</h3>

          <span className="text-sm text-slate-600">
            {events.length} event{events.length === 1 ? "" : "s"}
          </span>
        </div>

        {sortedEvents.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-[#f6f8f7] p-8 text-center">
            <p className="font-semibold">No timeline events yet</p>

            <p className="mt-1 text-sm text-slate-600">
              Add the client&apos;s first milestone above.
            </p>
          </div>
        ) : (
          <div className="relative mt-6 space-y-6">
            <div className="absolute bottom-0 left-[15px] top-0 w-px bg-slate-200" />

            {sortedEvents.map((event) => {
              const isEditing = editingId === event.id;
              const typeClasses = getEventTypeClasses(event.event_type);

              return (
                <div key={event.id} className="relative pl-12">
                  <div
                    className={`absolute left-0 top-5 h-8 w-8 rounded-full border-4 border-white ${typeClasses}`}
                  />

                  <div className="rounded-2xl border border-slate-200 bg-[#f6f8f7] p-5">
                    {isEditing ? (
                      <div>
                        <h4 className="font-bold">Edit Timeline Event</h4>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <select
                            value={editEventType}
                            onChange={(event) =>
                              setEditEventType(event.target.value)
                            }
                            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-cyan-500"
                          >
                            {EVENT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={editTitle}
                            onChange={(event) =>
                              setEditTitle(event.target.value)
                            }
                            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-cyan-500"
                          />

                          <input
                            type="date"
                            value={editEventDate}
                            onChange={(event) =>
                              setEditEventDate(event.target.value)
                            }
                            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-cyan-500"
                          />

                          <select
                            value={editStatus}
                            onChange={(event) =>
                              setEditStatus(event.target.value)
                            }
                            className="rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-cyan-500"
                          >
                            {STATUSES.map((timelineStatus) => (
                              <option
                                key={timelineStatus}
                                value={timelineStatus}
                              >
                                {timelineStatus}
                              </option>
                            ))}
                          </select>
                        </div>

                        <textarea
                          value={editDescription}
                          onChange={(event) =>
                            setEditDescription(event.target.value)
                          }
                          rows={3}
                          className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-cyan-500"
                        />

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={updatingId === event.id}
                            onClick={() => saveEvent(event)}
                            className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                          >
                            {updatingId === event.id
                              ? "Saving..."
                              : "Save Changes"}
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="rounded-lg border border-slate-300 bg-[#edf3f2] px-4 py-2 font-semibold text-slate-900 hover:bg-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                              {event.event_type}
                            </span>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                event.status
                              )}`}
                            >
                              {event.status || "Upcoming"}
                            </span>

                            {event.generation_source === "scout" && (
                              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                                {event.is_advisor_override ? "Smart · edited" : "Smart"}
                              </span>
                            )}
                          </div>

                          <h4 className="mt-3 text-lg font-bold text-slate-900">
                            {event.title}
                          </h4>

                          <p className="mt-1 text-sm font-medium text-cyan-700">
                            {formatDate(event.event_date)}
                          </p>

                          {event.description && (
                            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                              {event.description}
                            </p>
                          )}

                          {event.source_url && (
                            <a
                              href={event.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-block text-sm font-medium text-sky-700 hover:text-sky-700"
                            >
                              View official guidance ↗
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {event.status !== "Completed" && (
                            <button
                              type="button"
                              disabled={updatingId === event.id}
                              onClick={() => markCompleted(event)}
                              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              {updatingId === event.id
                                ? "Updating..."
                                : "Complete"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => startEditing(event)}
                            className="rounded-lg border border-slate-300 bg-[#edf3f2] px-4 py-2 font-semibold text-slate-900 hover:bg-slate-200"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === event.id}
                            onClick={() => deleteEvent(event)}
                            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {deletingId === event.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
