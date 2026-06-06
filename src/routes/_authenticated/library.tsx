import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { PageHeader } from "@/components/AppShell";
import { getLibrary } from "@/lib/concepts.functions";
import { BookMarked } from "lucide-react";

export const Route = createFileRoute("/_authenticated/library")({
  component: LibraryPage,
});

function LibraryPage() {
  return (
    <>
      <PageHeader title="Library" subtitle="Concepts you've saved" />
      <div className="p-10 max-w-6xl mx-auto">
        <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
          <LibraryList />
        </Suspense>
      </div>
    </>
  );
}

function LibraryList() {
  const fetchLib = useServerFn(getLibrary);
  const { data, isLoading } = useQuery({ queryKey: ["library"], queryFn: () => fetchLib() });

  if (isLoading) return <p className="text-zinc-500">Loading…</p>;
  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="border border-dashed border-zinc-800 rounded-xl p-12 text-center">
        <BookMarked className="size-6 text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-400 mb-1">Your library is empty.</p>
        <p className="text-sm text-zinc-600">Save concepts from any breakdown to keep them here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((it: any) => (
        <Link
          key={it.id}
          to="/c/$slug"
          params={{ slug: it.concepts?.slug }}
          className="block p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-teal-500/40 transition-colors"
        >
          <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest">
            {it.concepts?.category}
          </span>
          <h3 className="text-lg font-serif tracking-tight mt-2 mb-2">{it.concepts?.title}</h3>
          <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">{it.concepts?.definition}</p>
        </Link>
      ))}
    </div>
  );
}
