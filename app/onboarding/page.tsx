"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrganizationAction } from "../actions/auth";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await createOrganizationAction(name);
    setPending(false);
    if (result.error) return setError(result.error);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#f6f8f7] p-6 text-slate-900">
      <form onSubmit={createOrganization} className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Welcome to Scout</p>
        <h1 className="mt-3 text-3xl font-bold">Create your travel organization</h1>
        <p className="mt-2 text-slate-600">This becomes the secure workspace for your advisors, clients, and trips.</p>
        <label className="mt-8 block text-sm font-medium" htmlFor="organization-name">Organization name</label>
        <input id="organization-name" required maxLength={150} value={name}
          onChange={(event) => setName(event.target.value)} placeholder="Example Travel Co."
          className="mt-2 w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500" />
        {error && <p aria-live="polite" className="mt-4 text-sm text-red-400">{error}</p>}
        <button disabled={pending} className="mt-6 w-full rounded-lg bg-sky-500 px-5 py-3 font-semibold text-white disabled:opacity-50">
          {pending ? "Creating workspace..." : "Create workspace"}
        </button>
      </form>
    </main>
  );
}
