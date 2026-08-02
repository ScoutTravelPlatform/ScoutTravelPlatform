"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInAction } from "../actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await signInAction({ email, password });
    setPending(false);
    if (result.error) return setError(result.error);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#f6f8f7] p-6 text-slate-900">
      <form onSubmit={signIn} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Scout Travel</p>
        <h1 className="mt-3 text-3xl font-bold">Advisor sign in</h1>
        <p className="mt-2 text-slate-600">Access your clients, trips, and advisor workspace.</p>

        <label className="mt-8 block text-sm font-medium" htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" required value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500" />

        <div className="mt-5 flex items-center justify-between gap-4">
          <label className="block text-sm font-medium" htmlFor="password">Password</label>
          <Link href="/forgot-password" className="text-sm font-semibold text-sky-700 hover:text-sky-800">
            Forgot password?
          </Link>
        </div>
        <input id="password" type="password" autoComplete="current-password" required minLength={8} value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500" />

        {error && <p aria-live="polite" className="mt-4 text-sm text-red-400">{error}</p>}
        <button disabled={pending} className="mt-6 w-full rounded-lg bg-sky-500 px-5 py-3 font-semibold text-white disabled:opacity-50">
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
