import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#f6f8f7] p-6 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Scout Travel</p>
        <h1 className="mt-3 text-3xl font-bold">Choose a new password</h1>
        <ResetPasswordForm invalidLink={error === "invalid"} />
      </section>
    </main>
  );
}
