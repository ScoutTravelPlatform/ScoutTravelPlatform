import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clientIntakeProfileSchema } from "@/lib/client-intake";
import IntakeForm from "./IntakeForm";

export const metadata: Metadata = { title: "Travel Profile | Scout Travel", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ClientIntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_client_intake_profile", { intake_token: token });
  const parsed = clientIntakeProfileSchema.safeParse(data);
  if (error || !parsed.success) notFound();

  return (
    <main className="min-h-screen w-full bg-[#f6f8f7] text-slate-900">
      <header className="border-b border-sky-200 bg-gradient-to-br from-sky-100 to-[#e8eef0] px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-700">Your Travel Profile</p>
          <h1 className="mt-4 text-4xl font-bold md:text-5xl">Tell us about your trip</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">
            Fill in what you can now — you can come back to this same link anytime to add more. Anything already on file is filled in below.
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <IntakeForm token={token} initialProfile={parsed.data} />
        <footer className="py-6 text-center text-sm text-slate-500">Prepared by your travel advisor.</footer>
      </div>
    </main>
  );
}
