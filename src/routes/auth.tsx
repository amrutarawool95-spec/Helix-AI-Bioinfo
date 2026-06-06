import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/home" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) navigate({ to: "/home", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/home",
      });
      if (result.error) throw result.error;
    } catch (e: any) {
      toast.error(e?.message ?? "Google sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full grid place-items-center bg-zinc-950 text-foreground p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-10">
          <div className="size-7 bg-teal-500 rounded-sm" />
          <span className="font-serif italic text-2xl tracking-tight">Helix.ai</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-2xl font-serif tracking-tight mb-1">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-zinc-500 mb-6">
            {mode === "signin"
              ? "Sign in to explore concepts and your library."
              : "Start exploring visual concept breakdowns."}
          </p>

          <button
            onClick={onGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-white text-zinc-900 hover:bg-zinc-100 rounded-md py-2.5 text-sm font-medium transition-colors disabled:opacity-50 mb-4"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="relative my-4">
            <div className="h-px bg-zinc-800" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-zinc-900 px-3 text-[10px] font-mono uppercase tracking-widest text-zinc-600">
              or
            </span>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2.5 px-3 text-sm focus:outline-none focus:border-teal-500/60 placeholder:text-zinc-600"
              />
            )}
            <input
              type="email"
              required
              placeholder="you@research.lab"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2.5 px-3 text-sm focus:outline-none focus:border-teal-500/60 placeholder:text-zinc-600"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2.5 px-3 text-sm focus:outline-none focus:border-teal-500/60 placeholder:text-zinc-600"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-teal-500 text-zinc-950 hover:bg-teal-400 rounded-md py-2.5 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="text-xs text-zinc-500 mt-6 text-center">
            {mode === "signin" ? "Don't have an account?" : "Already have one?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-teal-400 hover:text-teal-300"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
