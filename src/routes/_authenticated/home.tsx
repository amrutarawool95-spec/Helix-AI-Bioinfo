import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { generateConcept } from "@/lib/concepts.functions";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

const SUGGESTIONS = [
  "Hidden Markov Model",
  "BLAST alignment",
  "Principal Component Analysis",
  "Transformer architecture",
  "CRISPR-Cas9",
  "K-means clustering",
  "Bayesian inference",
  "Gradient descent",
  "RNA-seq pipeline",
  "Dynamic programming",
];

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/_authenticated/home")({
  validateSearch: searchSchema,
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [query, setQuery] = useState(search.q ?? "");
  const [loading, setLoading] = useState(false);
  const gen = useServerFn(generateConcept);

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const res = await gen({ data: { query: trimmed } });
      navigate({ to: "/c/$slug", params: { slug: res.slug } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate concept.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (search.q && !loading) {
      submit(search.q);
      navigate({ to: "/home", search: {}, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader title="Concept Explorer" subtitle="Search any concept — get a visual breakdown" />
      <div className="px-10 py-16 max-w-4xl mx-auto">
        <div className="mb-12">
          <h2 className="text-5xl font-serif tracking-tight mb-4 text-balance leading-tight">
            Explore the architecture of <span className="italic text-teal-400">intelligence</span> and <span className="italic text-teal-400">life</span>.
          </h2>
          <p className="text-zinc-500 text-lg max-w-2xl leading-relaxed">
            Type any concept across bioinformatics, computational biology, AI/ML, statistics, or programming. Get a visual bento-grid breakdown with a generated diagram.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(query);
          }}
          className="relative mb-6"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Hidden Markov Model, BLAST, Transformer..."
            disabled={loading}
            autoFocus
            className="w-full h-16 bg-zinc-900 border-2 border-zinc-800 rounded-xl px-6 pr-16 text-lg focus:outline-none focus:border-teal-500/60 transition-all placeholder:text-zinc-600 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-lg bg-teal-500 text-zinc-950 flex items-center justify-center hover:bg-teal-400 disabled:opacity-40 transition-colors"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          </button>
        </form>

        {loading && (
          <p className="text-sm text-zinc-500 font-mono mb-8">
            <span className="text-teal-400">▸</span> Synthesizing breakdown and diagram… this takes ~20–30s.
          </p>
        )}

        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
            Quick start
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                disabled={loading}
                onClick={() => {
                  setQuery(s);
                  submit(s);
                }}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-300 hover:border-teal-500/40 hover:text-teal-400 transition-colors disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
