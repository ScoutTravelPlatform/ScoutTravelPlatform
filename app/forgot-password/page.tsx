"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await requestPasswordResetAction(email);
    setPending(false);
    if (result.error) return setError(result.error);
    setSent(true);
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#f6f8f7] p-6 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Scout Travel</p>
        <h1 className="mt-3 text-3xl font-bold">Reset your password</h1>

        {sent ? (
          <div aria-live="polite">
            <p className="mt-4 text-slate-700">
              If an account exists for that email, Scout sent a password-reset link. Check your inbox and spam folder.
            </p>
            <Link href="/login" className="mt-6 inline-block font-semibold text-sky-700 hover:text-sky-800">
              Return to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="mt-2 text-slate-600">Enter the email address you use for Scout.</p>
            <label className="mt-8 block text-sm font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
            />
            {error && <p aria-live="polite" className="mt-4 text-sm text-red-700">{error}</p>}
            <button disabled={pending} className="mt-6 w-full rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
              {pending ? "Sending…" : "Send reset link"}
            </button>
            <Link href="/login" className="mt-5 block text-center text-sm font-semibold text-sky-700 hover:text-sky-800">
              Return to sign in
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}
