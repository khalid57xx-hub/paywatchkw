import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — PayWatch" },
      {
        name: "description",
        content:
          "Sign in or create a PayWatch account to analyze transactions before you pay.",
      },
      { property: "og:title", content: "Sign in — PayWatch" },
      {
        property: "og:description",
        content:
          "Sign in or create a PayWatch account to analyze transactions before you pay.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function ShieldMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 46" fill="none" className={className} aria-hidden>
      <path
        d="M20 2.5 3.5 8.6v14.9C3.5 33.2 10.6 40.9 20 43.5c9.4-2.6 16.5-10.3 16.5-20V8.6L20 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M20 2.5v41" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <path d="M3.5 20.5h33" stroke="currentColor" strokeWidth="1" opacity="0.2" />
    </svg>
  );
}

const fieldClass =
  "w-full field-underline py-2.5 text-[15px] text-foreground placeholder:text-foreground/25";

const labelClass =
  "block font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/45 mb-1.5 transition-colors group-focus-within:text-foreground";

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (result.data.session) navigate({ to: "/", replace: true });
    else setError("Check your email to confirm your account, then sign in.");
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center gap-3">
          <ShieldMark className="h-7 w-auto text-foreground" />
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
            Transaction Assessment
          </span>
        </div>

        <h1 className="mb-3 font-display text-4xl font-light leading-none tracking-tight">
          Pay<span className="font-medium">Watch</span>
        </h1>
        <p className="mb-10 text-base leading-relaxed text-foreground/60">
          {mode === "signin"
            ? "Sign in to run transaction assessments."
            : "Create an account to run transaction assessments."}
        </p>

        <form
          onSubmit={submit}
          className="rounded-sm border border-border bg-card p-8 shadow-soft md:p-10"
        >
          <div className="space-y-6">
            <div className="group">
              <label className={labelClass} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="group">
              <label className={labelClass} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                minLength={6}
                required
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
              />
            </div>

            {error && (
              <p className="text-sm leading-relaxed text-risk-high">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-sm bg-primary py-4 font-display text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground transition-all enabled:hover:bg-primary/90 enabled:active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {busy
                ? "Please wait"
                : mode === "signin"
                  ? "Log In"
                  : "Sign Up"}
            </button>
          </div>

          <p className="mt-8 text-center text-[13px] text-foreground/50">
            {mode === "signin" ? "New to PayWatch?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {mode === "signin" ? "Create an account" : "Log in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
