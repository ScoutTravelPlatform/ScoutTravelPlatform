"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { updatePasswordAction } from "@/app/actions/auth";

export default function ResetPasswordForm({ invalidLink }: { invalidLink: boolean }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(
    invalidLink ? "This reset link is invalid or has expired. Request a new one." : ""
  );
  const [updated, setUpdated] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await updatePasswordAction({ password, confirmPassword });
    setPending(false);
    if (result.error) return setError(result.error);
    setUpdated(true);
  }

  if (updated) {
    return (
      <div aria-live="polite">
        <p className="mt-4 text-slate-700">Your password has been updated. You can now sign in with it.</p>
        <Link href="/login" className="mt-6 inline-block rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white">
          Sign in to Scout
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <p className="mt-2 text-slate-600">Choose a new password with at least 8 characters.</p>
      <label className="mt-8 block text-sm font-medium" htmlFor="password">New password</label>
      <input
        id="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
      />
      <label className="mt-5 block text-sm font-medium" htmlFor="confirm-password">Confirm new password</label>
      <input
        id="confirm-password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-300 bg-[#f6f8f7] p-3 outline-none focus:border-sky-500"
      />
      {error && (
        <div className="mt-4 text-sm text-red-700" aria-live="polite">
          <p>{error}</p>
          {invalidLink && <Link href="/forgot-password" className="mt-2 inline-block font-semibold underline">Request a new link</Link>}
        </div>
      )}
      <button disabled={pending || invalidLink} className="mt-6 w-full rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
