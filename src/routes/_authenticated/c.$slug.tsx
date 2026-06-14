import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { getConcept, toggleLibrary } from "@/lib/concepts.functions";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/c/$slug")({
  component: ConceptPage,
});

function ConceptPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ConceptInner />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="px-10 py-24 flex items-center gap-3 text-zinc-500">
      <Loader2 className="size-4 animate-spin" /> Loading concept…
    </div>
  );
}

function ConceptInner() {
  const { slug } = Route.useParams();
  const fetchConcept = useServerFn(getConcept);
  const toggle = useServerFn(toggleLibrary);
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: ["concept", slug],
    queryFn: () => fetchConcept({ data: { slug } }),
  });

  const [saved, setSaved] = useState(data.saved);
  const [busy, setBusy] = useState(false);

  if (!data.concept) {
    throw notFound();
  }
  const c = data.concept as any;
  const steps = (c.key_steps as { title: string; detail: string }[]) ?? [];
  const ideas = (c.core_idea as string[]) ?? [];

  async function onToggle() {
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    try {
      await toggle({ data: { conceptId: c.id, save: next } });
      toast.success(next ? "Saved to library" : "Removed from library");
      qc.invalidateQueries({ queryKey: ["library"] });
    } catch (e: any) {
      setSaved(!next);
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={c.title}
        subtitle={`${c.category ?? ""}${c.subcategory ? " • " + c.subcategory : ""}`}
        right={
          <button
            onClick={onToggle}
            disabled={busy}
            className="px-4 py-2 text-xs border border-zinc-800 rounded-md hover:bg-zinc-900 transition-colors flex items-center gap-2"
          >
            {saved ? <BookmarkCheck className="size-3.5 text-teal-400" /> : <Bookmark className="size-3.5" />}
            {saved ? "Saved" : "Save to Library"}
          </button>
        }
      />
      <div className="p-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-12 auto-rows-min gap-6">
          {/* Definition */}
          <div className="col-span-12 lg:col-span-4 bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col tile-in" style={{ animationDelay: "0ms" }}>
            <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest mb-4">01 Definition</span>
            <p className="text-zinc-300 leading-relaxed">{c.definition}</p>
            <div className="mt-auto pt-6">
              <div className="h-px bg-zinc-800 w-full mb-4" />
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{c.category}</span>
            </div>
          </div>

          {/* Diagram */}
          <div className="col-span-12 lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden relative tile-in min-h-[420px]" style={{ animationDelay: "100ms" }}>
            <div className="absolute top-6 left-6 z-10">
              <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest">02 Architectural View</span>
            </div>
            {c.image_data_url ? (
              <img src={c.image_data_url} alt={`${c.title} diagram`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center min-h-[420px]">
                <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">No diagram available</span>
              </div>
            )}
          </div>

          {/* Core Idea */}
          <div className="col-span-12 lg:col-span-4 bg-zinc-900 border border-zinc-800 p-6 rounded-xl tile-in" style={{ animationDelay: "200ms" }}>
            <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest mb-4 block">03 Core Idea</span>
            <ul className="space-y-4">
              {ideas.map((idea, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-teal-500 font-mono text-xs mt-1 shrink-0">{romanize(i + 1)}.</span>
                  <p className="text-sm text-zinc-400 leading-relaxed">{idea}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Steps */}
          <div className="col-span-12 lg:col-span-8 bg-zinc-900 border border-zinc-800 p-6 rounded-xl tile-in" style={{ animationDelay: "300ms" }}>
            <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest mb-6 block">04 Key Steps</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-4">
                  <span className="font-serif italic text-teal-400 text-lg shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-200 mb-1">{s.title}</p>
                    <p className="text-sm text-zinc-500 leading-relaxed">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analogy */}
          <div className="col-span-12 lg:col-span-5 bg-zinc-900 border border-zinc-800 p-6 rounded-xl tile-in" style={{ animationDelay: "400ms" }}>
            <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest mb-4 block">05 Analogy</span>
            <p className="text-base font-serif italic text-zinc-300 leading-relaxed">
              &ldquo;{c.analogy}&rdquo;
            </p>
          </div>

          {/* Applied Case */}
          <div className="col-span-12 lg:col-span-7 bg-teal-500/5 border border-teal-500/20 p-6 rounded-xl tile-in" style={{ animationDelay: "500ms" }}>
            <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest mb-4 block">06 Applied Case</span>
            <p className="text-sm text-zinc-300 leading-relaxed">{c.applied_case}</p>
          </div>

          {/* Code */}
          <div className="col-span-12 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden tile-in" style={{ animationDelay: "600ms" }}>
            <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest">07 Implementation</span>
              <span className="text-[10px] font-mono text-zinc-500">{c.code_lang}</span>
            </div>
            <pre className="p-6 font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto">
              <code>{c.code_snippet}</code>
            </pre>
          </div>

          {/* Deep Dive */}
          {c.deep_dive && (
            <div className="col-span-12 bg-zinc-900 border border-zinc-800 p-6 rounded-xl tile-in" style={{ animationDelay: "700ms" }}>
              <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest mb-4 block">08 Deep Dive</span>
              <div className="text-sm text-zinc-300 leading-relaxed space-y-4 max-w-4xl">
                {String(c.deep_dive).split(/\n\n+/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          )}

          {/* Common Pitfalls */}
          {Array.isArray(c.common_pitfalls) && c.common_pitfalls.length > 0 && (
            <div className="col-span-12 lg:col-span-6 bg-zinc-900 border border-zinc-800 p-6 rounded-xl tile-in" style={{ animationDelay: "800ms" }}>
              <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest mb-4 block">09 Common Pitfalls</span>
              <ul className="space-y-3">
                {(c.common_pitfalls as string[]).map((p, i) => (
                  <li key={i} className="flex gap-3 text-sm text-zinc-400 leading-relaxed">
                    <span className="text-teal-500 font-mono text-xs mt-1 shrink-0">!</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Further Reading */}
          {Array.isArray(c.further_reading) && c.further_reading.length > 0 && (
            <div className="col-span-12 lg:col-span-6 bg-zinc-900 border border-zinc-800 p-6 rounded-xl tile-in" style={{ animationDelay: "900ms" }}>
              <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest mb-4 block">10 Further Reading</span>
              <ul className="space-y-3">
                {(c.further_reading as string[]).map((r, i) => (
                  <li key={i} className="flex gap-3 text-sm text-zinc-400 leading-relaxed">
                    <span className="text-teal-500 font-mono text-xs mt-1 shrink-0">→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function romanize(n: number) {
  const map = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
  return map[n - 1] ?? String(n);
}
