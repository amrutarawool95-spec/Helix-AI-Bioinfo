import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getHistory } from "@/lib/concepts.functions";
import { Search, BookMarked, Clock, LogOut, Sparkles } from "lucide-react";
import { slugify } from "@/lib/slug";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        setEmail(u.email ?? "");
        setDisplayName(
          (u.user_metadata?.display_name as string) ||
            (u.user_metadata?.full_name as string) ||
            (u.email?.split("@")[0] ?? "Researcher"),
        );
      }
    });
  }, []);

  const fetchHistory = useServerFn(getHistory);
  const { data: history } = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistory(),
  });

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugify(query);
    if (!slug) return;
    navigate({ to: "/home", search: { q: query } });
  }

  const initials = (displayName || "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-950 text-foreground">
      <aside className="w-72 border-r border-zinc-800 flex flex-col bg-zinc-950 shrink-0">
        <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
          <Link to="/home" className="flex items-center gap-2 mb-8">
            <div className="size-6 bg-teal-500 rounded-sm" />
            <span className="font-serif italic text-lg tracking-tight">Helix.ai</span>
          </Link>

          <nav className="space-y-6">
            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
                Search & Discovery
              </h3>
              <form onSubmit={onSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-600" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter concept..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-teal-500/50 transition-colors placeholder:text-zinc-600"
                />
              </form>
            </div>

            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                <Clock className="size-3" /> Recent Queries
              </h3>
              <div className="space-y-1">
                {history?.items.slice(0, 8).map((h: any) => (
                  <Link
                    key={h.id}
                    to="/c/$slug"
                    params={{ slug: h.concepts?.slug ?? slugify(h.query) }}
                    className="block w-full text-left px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 rounded transition-colors truncate"
                    activeProps={{ className: "block w-full text-left px-3 py-1.5 text-sm text-teal-400 bg-teal-500/5 rounded truncate" }}
                  >
                    {h.concepts?.title ?? h.query}
                  </Link>
                ))}
                {(!history?.items || history.items.length === 0) && (
                  <p className="px-3 py-1.5 text-xs text-zinc-600">No queries yet.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                <BookMarked className="size-3" /> Library
              </h3>
              <Link
                to="/library"
                className="block w-full text-left px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 rounded"
                activeProps={{ className: "block w-full text-left px-3 py-1.5 text-sm text-teal-400 bg-teal-500/5 rounded" }}
              >
                Saved concepts
              </Link>
            </div>
          </nav>
        </div>

        <div className="p-6 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-mono">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">{displayName}</span>
              <span className="text-[10px] text-zinc-500 truncate">{email}</span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-white py-2 rounded border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <LogOut className="size-3" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto no-scrollbar bg-zinc-950">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md px-10 py-6 border-b border-zinc-900 flex justify-between items-center">
      <div className="min-w-0">
        <h1 className="text-3xl font-serif tracking-tight truncate flex items-center gap-3">
          <Sparkles className="size-5 text-teal-500 shrink-0" />
          {title}
        </h1>
        {subtitle && <p className="text-zinc-500 text-sm mt-1 truncate">{subtitle}</p>}
      </div>
      {right && <div className="flex gap-3 shrink-0">{right}</div>}
    </header>
  );
}
