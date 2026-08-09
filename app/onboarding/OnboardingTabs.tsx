"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrganizationAction, requestJoinOrganizationAction, searchOrganizationsAction } from "../actions/auth";

type PendingRequest = { requestId: string; organizationName: string };
type OrgResult = { id: string; name: string };

export default function OnboardingTabs({ initialPendingRequest }: { initialPendingRequest: PendingRequest | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<"new" | "join">(initialPendingRequest ? "join" : "new");

  const [name, setName] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [pending, setPending] = useState(initialPendingRequest);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OrgResult[]>([]);
  const [searchError, setSearchError] = useState("");
  const [requestingId, setRequestingId] = useState("");

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError("");
    const result = await createOrganizationAction(name);
    setCreating(false);
    if (result.error) return setCreateError(result.error);
    router.refresh();
    router.replace("/dashboard");
  }

  useEffect(() => {
    if (pending || !query.trim()) return;
    const timeout = setTimeout(async () => {
      const result = await searchOrganizationsAction(query);
      if (result.error) return setSearchError(result.error);
      setSearchError("");
      setResults(result.organizations);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, pending]);

  const visibleResults = query.trim() ? results : [];

  async function requestJoin(org: OrgResult) {
    setRequestingId(org.id);
    const result = await requestJoinOrganizationAction(org.id);
    setRequestingId("");
    if (result.error) return setSearchError(result.error);
    setPending({ requestId: org.id, organizationName: org.name });
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Welcome to Scout</p>
      <h1 className="mt-3 text-3xl font-bold">Set up your workspace</h1>
      <p className="mt-2 text-slate-600">Start a new agency, or link to one that already uses Scout.</p>

      <div className="mt-6 flex rounded-lg bg-slate-200 p-1">
        <button type="button" onClick={() => setTab("new")} className={`flex-1 rounded-md p-2 text-sm font-semibold ${tab === "new" ? "bg-white" : ""}`}>
          Start a new agency
        </button>
        <button type="button" onClick={() => setTab("join")} className={`flex-1 rounded-md p-2 text-sm font-semibold ${tab === "join" ? "bg-white" : ""}`}>
          Join an existing agency
        </button>
      </div>

      {tab === "new" && (
        <form onSubmit={createOrganization} className="mt-6">
          <label className="block text-sm font-medium" htmlFor="organization-name">Organization name</label>
          <input id="organization-name" required maxLength={150} value={name}
            onChange={(event) => setName(event.target.value)} placeholder="Example Travel Co."
            className="mt-2 w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500" />
          {createError && <p aria-live="polite" className="mt-4 text-sm text-red-400">{createError}</p>}
          <button disabled={creating} className="mt-6 w-full rounded-lg bg-sky-500 px-5 py-3 font-semibold text-white disabled:opacity-50">
            {creating ? "Creating workspace..." : "Create workspace"}
          </button>
        </form>
      )}

      {tab === "join" && (
        <div className="mt-6">
          {pending ? (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              Your request to join {pending.organizationName} is pending approval from that agency&apos;s owner or admin.
            </p>
          ) : (
            <>
              <label className="block text-sm font-medium" htmlFor="organization-search">Agency name</label>
              <input id="organization-search" value={query} onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by agency name" autoComplete="off"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500" />
              {searchError && <p aria-live="polite" className="mt-4 text-sm text-red-400">{searchError}</p>}
              {visibleResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {visibleResults.map((org) => (
                    <div key={org.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#f6f8f7] p-3">
                      <span className="font-semibold">{org.name}</span>
                      <button type="button" disabled={requestingId === org.id} onClick={() => requestJoin(org)}
                        className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                        {requestingId === org.id ? "Requesting..." : "Request to join"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {query.trim() && visibleResults.length === 0 && !searchError && (
                <p className="mt-4 text-sm text-slate-500">No agencies match that name yet.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
