"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpAction } from "../actions/auth";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await signUpAction({ fullName, email, password });
    setPending(false);
    if (result.error) return setError(result.error);
    if (!result.confirmed) return setConfirmationSent(true);
    router.replace("/onboarding");
    router.refresh();
  }

  if (confirmationSent) {
    return (
      <main className="flex min-h-screen flex-1 items-center justify-center bg-[#f6f8f7] p-6 text-slate-900">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Scout Travel</p>
          <h1 className="mt-3 text-2xl font-bold">Check your email</h1>
          <p className="mt-3 text-slate-600">Confirm {email} to finish creating your account, then sign in to continue setup.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#f6f8f7] p-6 text-slate-900">
      <form onSubmit={signUp} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Scout Travel</p>
        <h1 className="mt-3 text-3xl font-bold">Create your account</h1>
        <p className="mt-2 text-slate-600">Start your own agency or link to one that already uses Scout.</p>

        <label className="mt-8 block text-sm font-medium" htmlFor="full-name">Full name</label>
        <input id="full-name" autoComplete="name" required maxLength={150} value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500" />

        <label className="mt-5 block text-sm font-medium" htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" required value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500" />

        <label className="mt-5 block text-sm font-medium" htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="new-password" required minLength={8} value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500" />

        {error && <p aria-live="polite" className="mt-4 text-sm text-red-400">{error}</p>}
        <button disabled={pending} className="mt-6 w-full rounded-lg bg-sky-500 px-5 py-3 font-semibold text-white disabled:opacity-50">
          {pending ? "Creating account..." : "Create account"}
        </button>
        <p className="mt-5 text-center text-sm text-slate-600">
          Already have an account? <Link href="/login" className="font-semibold text-sky-700 hover:text-sky-800">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
