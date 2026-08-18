import type { DisneyPromotionRule } from "@/lib/disney-promotions";

export default function PromotionOpportunities({ matches }: { matches: DisneyPromotionRule[] }) {
  if (!matches.length) return null;

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50 p-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-violet-700">Promotion Opportunities</p>
      <h2 className="mt-2 text-2xl font-bold">This trip may qualify for a current offer</h2>
      <p className="mt-1 text-sm text-slate-600">Curated by Scout — verify current terms before mentioning this to the client.</p>
      <div className="mt-5 space-y-3">
        {matches.map((rule) => (
          <article key={rule.key} className="rounded-xl border border-violet-200 bg-white p-4">
            <h3 className="font-bold text-violet-900">{rule.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{rule.description}</p>
            {rule.sourceUrl && (
              <a href={rule.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-violet-700 hover:text-violet-800">
                View offer details →
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
