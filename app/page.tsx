import Image from "next/image";
import Link from "next/link";

const features = [
  {
    eyebrow: "Stay ahead",
    title: "A smarter daily work queue",
    description: "See the payments, booking details, deadlines, and client follow-ups that need attention next.",
  },
  {
    eyebrow: "Plan beautifully",
    title: "Every trip in one organized place",
    description: "Bring client details, dining, park days, documents, and itinerary plans together without the spreadsheet shuffle.",
  },
  {
    eyebrow: "Serve confidently",
    title: "A clear client experience",
    description: "Give travelers a simple portal for their plans, important dates, and secure information—wherever they are.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7faf9] text-[#19323c]">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Scout home">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0f6d78] text-white">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3Z" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span>
              <span className="block text-xl font-bold leading-none tracking-tight">Scout</span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.24em] text-[#5a7780]">Travel Advisor</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex" aria-label="Main navigation">
            <a href="#features" className="transition hover:text-[#0f6d78]">Features</a>
            <a href="#how-it-works" className="transition hover:text-[#0f6d78]">How it works</a>
            <a href="#about" className="transition hover:text-[#0f6d78]">Why Scout</a>
          </nav>
          <Link href="/login" className="rounded-full border border-[#0f6d78] px-5 py-2.5 text-sm font-bold text-[#0f6d78] transition hover:bg-[#0f6d78] hover:text-white">
            Advisor sign in
          </Link>
        </div>
      </header>

      <section className="relative px-6 pb-16 pt-16 text-center lg:px-8 lg:pb-24 lg:pt-24">
        <div className="pointer-events-none absolute left-1/2 top-4 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#0f6d78]">Thoughtful tools for travel advisors</p>
          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold leading-[1.04] tracking-[-0.045em] text-[#243c57] sm:text-6xl lg:text-7xl">
            Plan every trip with <span className="text-[#5796e6]">clarity, care,</span> and confidence.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-600">
            Scout brings client plans, important dates, payments, commissions, and advisor follow-ups together—so nothing gets lost between booking and departure.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login" className="rounded-xl bg-[#0f6d78] px-7 py-3.5 font-bold text-white shadow-lg shadow-teal-900/10 transition hover:-translate-y-0.5 hover:bg-[#0c5963]">
              Open Scout
            </Link>
            <a href="#features" className="rounded-xl border border-slate-300 bg-white px-7 py-3.5 font-bold text-[#243c57] transition hover:border-slate-400 hover:bg-slate-50">
              Explore the platform
            </a>
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-7xl">
          <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-r from-sky-100 via-amber-50 to-rose-100 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border-8 border-white bg-white shadow-2xl shadow-slate-900/15">
            <Image
              src="/scout-hero.png"
              alt="A peaceful coastal resort at golden hour with a travel journal ready for planning"
              width={1536}
              height={1024}
              priority
              className="h-[360px] w-full object-cover sm:h-[500px] lg:h-[620px]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#173f47]/80 via-[#173f47]/10 to-transparent px-6 pb-7 pt-24 text-left text-white sm:px-10 sm:pb-10">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-100">From first idea to welcome home</p>
              <p className="mt-2 max-w-xl text-2xl font-semibold sm:text-3xl">Keep the details organized. Keep the experience personal.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0f6d78]">Built around the way advisors work</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-[#243c57] sm:text-5xl">More time advising. Less time chasing details.</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
              <article key={feature.title} className="rounded-3xl border border-slate-200 bg-[#f7faf9] p-8 shadow-sm">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#dceff0] text-lg font-bold text-[#0f6d78]">0{index + 1}</div>
                <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-[#5796e6]">{feature.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-semibold text-[#243c57]">{feature.title}</h3>
                <p className="mt-4 leading-7 text-slate-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0f6d78]">One calm workspace</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-[#243c57] sm:text-5xl">Scout remembers what comes next.</h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">Build the trip once, then let Scout turn the details into a useful timeline for both advisor and client.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {["Add the client and trip", "Organize booking details", "Follow smart deadlines", "Share the client experience"].map((step, index) => (
              <div key={step} className="flex min-h-36 flex-col justify-between rounded-3xl bg-[#183f47] p-6 text-white even:bg-[#e8b978] even:text-[#2f3b40]">
                <span className="text-sm font-bold opacity-70">STEP {index + 1}</span>
                <p className="mt-8 text-xl font-semibold">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="px-6 pb-20 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#dceff0] px-8 py-14 text-center sm:px-14 lg:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0f6d78]">Your clients trust you with the details</p>
          <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-[#243c57] sm:text-5xl">Scout helps you carry them with confidence.</h2>
          <Link href="/login" className="mt-8 inline-block rounded-xl bg-[#0f6d78] px-7 py-3.5 font-bold text-white transition hover:bg-[#0c5963]">Advisor sign in</Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-[#243c57]">Scout Travel Advisor</p>
          <p>Built to make thoughtful travel planning feel simpler.</p>
        </div>
      </footer>
    </main>
  );
}
