import { createAuthorizedClient } from "@/lib/auth";
import OnboardingTabs from "./OnboardingTabs";

export default async function OnboardingPage() {
  const supabase = await createAuthorizedClient();
  const { data } = await supabase.rpc("get_my_pending_join_request");
  const pending = data?.[0];

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#f6f8f7] p-6 text-slate-900">
      <OnboardingTabs
        initialPendingRequest={pending ? { requestId: pending.request_id, organizationName: pending.organization_name } : null}
      />
    </main>
  );
}
