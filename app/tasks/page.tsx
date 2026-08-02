import { createAuthorizedClient } from "@/lib/auth";
import TaskWorkspace from "./TaskWorkspace";

export default async function TasksPage() {
  const supabase = await createAuthorizedClient();
  const { data: membership } = await supabase.from("organization_memberships").select("organization_id").limit(1).maybeSingle();
  const [tasksResult, tripsResult, teamResult] = await Promise.all([
    supabase.from("booking_tasks").select("*").order("completed", { ascending: true }).order("due_date", { ascending: true }),
    supabase.from("trips").select("id, trip_name, destination, clients(first_name, last_name)").order("start_date", { ascending: true }),
    membership
      ? supabase.rpc("get_organization_team", { target_organization_id: membership.organization_id })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const trips = (tripsResult.data ?? []).map((trip) => ({
    id: trip.id,
    tripName: trip.trip_name ?? "Untitled trip",
    destination: trip.destination ?? "",
    clientName: `${trip.clients?.first_name ?? ""} ${trip.clients?.last_name ?? ""}`.trim() || "Client",
  }));
  const tripById = new Map(trips.map((trip) => [trip.id, trip]));
  const team = (teamResult.data ?? []).map((member) => ({
    userId: member.user_id,
    name: member.full_name || member.email || "Team member",
    role: member.role,
  }));
  const teamById = new Map(team.map((member) => [member.userId, member.name]));
  const tasks = (tasksResult.data ?? []).flatMap((task) => {
    const trip = tripById.get(task.trip_id);
    return trip ? [{
      ...task,
      title: task.title ?? "Task",
      completed: task.completed ?? false,
      tripName: trip.tripName,
      destination: trip.destination,
      clientName: trip.clientName,
      assigneeName: task.assignee_id ? teamById.get(task.assignee_id) ?? "Team member" : null,
    }] : [];
  });

  return (
    <main className="min-h-screen bg-[#f6f8f7] p-5 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-slate-200 pb-8">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0f6d78]">Advisor operations</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.035em] text-[#243c57]">Tasks</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Manage every trip follow-up from one calm, organized worklist.</p>
        </header>
        {(tasksResult.error || tripsResult.error) ? (
          <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">Tasks could not be loaded. Refresh to try again.</p>
        ) : (
          <TaskWorkspace initialTasks={tasks} trips={trips} team={team} />
        )}
      </div>
    </main>
  );
}
