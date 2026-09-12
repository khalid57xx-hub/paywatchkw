import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import {
  analyzeTransaction,
  type RiskResult,
  type TransactionInput,
} from "@/lib/risk-engine";
import { getAiInsight, type AiInsight } from "@/lib/ai-insight.functions";
import { saveTransaction } from "@/lib/transactions.functions";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PayWatch — Think before you pay" },
      {
        name: "description",
        content:
          "PayWatch analyzes every transaction before you pay. A calm, precise risk assessment with a clear score and clear reasons.",
      },
      { property: "og:title", content: "PayWatch — Think before you pay" },
      {
        property: "og:description",
        content:
          "Analyze transactions before you pay. Instant risk score, clear reasons, zero guesswork.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const CATEGORIES = [
  "General",
  "Shopping",
  "Wire transfer",
  "Crypto",
  "Gift cards",
  "Gambling",
  "Services",
  "Person-to-person",
];

const COUNTRIES = [
  "Kuwait",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Saudi Arabia",
  "Germany",
  "France",
  "India",
  "Nigeria",
  "Russia",
  "North Korea",
  "Iran",
  "Venezuela",
  "Other",
];

/* Minimal shield brand mark — a single hairline crest. */
function ShieldMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 46" fill="none" className={className} aria-hidden>
      <path
        d="M20 2.5 3.5 8.6v14.9C3.5 33.2 10.6 40.9 20 43.5c9.4-2.6 16.5-10.3 16.5-20V8.6L20 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M20 2.5v41"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.35"
      />
      <path
        d="M3.5 20.5h33"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.2"
      />
    </svg>
  );
}

const LEVEL_TEXT: Record<RiskResult["level"], string> = {
  "LOW RISK": "text-risk-low",
  "MEDIUM RISK": "text-risk-medium",
  "HIGH RISK": "text-risk-high",
};

const LEVEL_STROKE: Record<RiskResult["level"], string> = {
  "LOW RISK": "var(--color-risk-low)",
  "MEDIUM RISK": "var(--color-risk-medium)",
  "HIGH RISK": "var(--color-risk-high)",
};

const LEVEL_CHIP: Record<RiskResult["level"], string> = {
  "LOW RISK": "border-risk-low/35 text-risk-low bg-risk-low/[0.06]",
  "MEDIUM RISK": "border-risk-medium/35 text-risk-medium bg-risk-medium/[0.07]",
  "HIGH RISK": "border-risk-high/35 text-risk-high bg-risk-high/[0.06]",
};

const LEVEL_VERDICT: Record<RiskResult["level"], string> = {
  "LOW RISK":
    "Nothing in this transaction stands out. Proceeding is reasonable.",
  "MEDIUM RISK":
    "Some signals warrant a second look before this payment is released.",
  "HIGH RISK":
    "Multiple strong signals align. We recommend pausing and verifying independently.",
};

const fieldClass =
  "w-full field-underline py-2.5 text-[15px] text-foreground placeholder:text-foreground/25";

const labelClass =
  "block font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/45 mb-1.5 transition-colors group-focus-within:text-foreground";

function Index() {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const [form, setForm] = useState({
    amount: "",
    recipient: "",
    country: "Kuwait",
    category: "General",
    description: "",
  });
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const fetchInsight = useServerFn(getAiInsight);
  const persistTransaction = useServerFn(saveTransaction);
  const runIdRef = useRef(0);
  const savedRef = useRef<number | null>(null);

  const canAnalyze =
    form.amount !== "" &&
    Number(form.amount) > 0 &&
    form.recipient.trim() !== "" &&
    !scanning;

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const runAnalysis = () => {
    if (!canAnalyze) return;
    const runId = ++runIdRef.current;
    setScanning(true);
    setResult(null);
    setInsight(null);
    const tx: TransactionInput = {
      amount: Number(form.amount),
      recipient: form.recipient,
      country: form.country,
      category: form.category,
      description: form.description,
    };
    window.setTimeout(() => {
      const r = analyzeTransaction(tx);
      setResult(r);
      setScanning(false);
      setInsightLoading(true);
      const reasons = r.reasons.map((x) => x.label);
      fetchInsight({
        data: {
          ...tx,
          score: r.score,
          level: r.level,
          reasons,
        },
      })
        .then((res) => {
          setInsight(res);
          return res;
        })
        .catch(() => {
          const failed: AiInsight = {
            ok: false,
            error: "AI analysis could not be completed.",
          };
          setInsight(failed);
          return failed;
        })
        .then(async (res) => {
          if (savedRef.current === runId) return;
          savedRef.current = runId;
          try {
            const saved = await persistTransaction({
              data: {
                ...tx,
                score: r.score,
                level: r.level,
                reasons,
                aiSummary: res.ok ? (res.summary ?? null) : null,
                aiWarnings: res.ok ? (res.warnings ?? []) : [],
              },
            });
            if (!saved.ok) {
              savedRef.current = null;
              console.error("Transaction was not saved", saved.error);
            }
          } catch (err) {
            savedRef.current = null;
            console.error("Transaction save request failed", err);
          }
        })
        .finally(() => setInsightLoading(false));
    }, 1700);
  };


  useEffect(() => {
    if (!sessionLoading && !session) navigate({ to: "/auth", replace: true });
  }, [sessionLoading, session, navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (sessionLoading || !session) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  return (
    <div className="min-h-screen w-full bg-background px-6 py-12 md:px-12 md:py-20 lg:px-20">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-24">
        {/* Left: brand story + assessment */}
        <div className="lg:col-span-7">
          <header className="mb-14">
            <div className="mb-8 flex items-center gap-3">
              <ShieldMark className="h-7 w-auto text-foreground" />
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
                Transaction Assessment
              </span>
              <button
                onClick={signOut}
                className="ml-auto font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/45 transition-colors hover:text-foreground"
              >
                Log out
              </button>
            </div>
            <h1 className="mb-6 font-display text-5xl font-light leading-none tracking-tight md:text-7xl">
              Pay<span className="font-medium">Watch</span>
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-foreground/65 md:text-xl">
              Think before you pay. Every transaction is measured against
              deterministic risk signals before a single unit leaves your
              account.
            </p>
          </header>

          <div className="border-t border-border pt-12">
            {scanning ? (
              <ScanningState />
            ) : result ? (
              <ResultState
                result={result}
                insight={insight}
                insightLoading={insightLoading}
              />

            ) : (
              <IdleState />
            )}
          </div>
        </div>

        {/* Right: the form */}
        <div className="lg:col-span-5">
          <div className="rounded-sm border border-border bg-card p-8 shadow-soft md:p-10">
            <h2 className="mb-8 font-display text-lg font-medium tracking-tight">
              Transaction Parameters
            </h2>

            <div className="space-y-6">
              <div className="group">
                <label className={labelClass} htmlFor="amount">
                  Amount
                </label>
                <input
                  id="amount"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="0.00"
                  onInput={(e) => update("amount", e.currentTarget.value)}
                  className={fieldClass}
                />
              </div>

              <div className="group">
                <label className={labelClass} htmlFor="recipient">
                  Recipient
                </label>
                <input
                  id="recipient"
                  type="text"
                  placeholder="Name or account"
                  value={form.recipient}
                  onChange={(e) => update("recipient", e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="group">
                  <label className={labelClass} htmlFor="country">
                    Country
                  </label>
                  <select
                    id="country"
                    value={form.country}
                    onChange={(e) => update("country", e.target.value)}
                    className={`${fieldClass} appearance-none`}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="group">
                  <label className={labelClass} htmlFor="category">
                    Category
                  </label>
                  <select
                    id="category"
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                    className={`${fieldClass} appearance-none`}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="group">
                <label className={labelClass} htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={2}
                  placeholder="Why are you sending this payment?"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className={`${fieldClass} resize-none`}
                />
              </div>

              <button
                onClick={runAnalysis}
                disabled={!canAnalyze}
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-sm bg-primary py-4 font-display text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground transition-all enabled:hover:bg-primary/90 enabled:active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {scanning ? (
                  <>
                    <span className="animate-spin-slow h-3.5 w-3.5 rounded-full border border-primary-foreground/30 border-t-primary-foreground" />
                    Analyzing
                  </>
                ) : (
                  "Analyze Transaction"
                )}
              </button>
            </div>

            <p className="mt-8 text-center text-[11px] uppercase tracking-tight text-foreground/40">
              Deterministic engine · Transaction details are sent to Google
              Gemini for the AI assessment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IdleState() {
  return (
    <div className="flex max-w-lg items-start gap-6">
      <ShieldMark className="mt-1 h-12 w-auto shrink-0 text-foreground/20" />
      <div>
        <p className="font-display text-xl font-light leading-snug text-foreground/70">
          No assessment yet.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground/50">
          Enter the transaction parameters and run an analysis. Your score and
          the reasoning behind it will appear here.
        </p>
      </div>
    </div>
  );
}

function ScanningState() {
  return (
    <div className="flex max-w-lg items-start gap-8">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden">
        <ShieldMark className="absolute inset-0 m-auto h-20 w-auto text-foreground/25" />
        <div
          className="animate-sweep absolute inset-x-0 h-6"
          style={{
            background:
              "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--color-primary) 16%, transparent), transparent)",
          }}
        />
      </div>
      <div className="pt-2">
        <p className="font-display text-xl font-light leading-snug">
          Running assessment
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground/50">
          Amount · Recipient · Jurisdiction · Category · Language
        </p>
      </div>
    </div>
  );
}

function ScoreRing({
  score,
  level,
}: {
  score: number;
  level: RiskResult["level"];
}) {
  const r = 78;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  return (
    <div className="relative h-48 w-48 shrink-0">
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke={LEVEL_STROKE[level]}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          style={
            {
              "--ring-circumference": `${c}`,
              "--ring-offset-target": `${offset}`,
              strokeDashoffset: offset,
              animation: "ring-draw 1.1s cubic-bezier(0.22, 1, 0.36, 1) both",
            } as React.CSSProperties
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-6xl font-light leading-none tracking-tighter tabular-nums">
          {score}
        </span>
        <span className="mt-2 font-display text-[10px] uppercase tracking-[0.2em] text-foreground/40">
          of 100
        </span>
      </div>
    </div>
  );
}

function ResultState({
  result,
  insight,
  insightLoading,
}: {
  result: RiskResult;
  insight: AiInsight | null;
  insightLoading: boolean;
}) {
  return (


    <div className="animate-rise-in">
      <div className="flex flex-col gap-10 sm:flex-row sm:items-center">
        <ScoreRing score={result.score} level={result.level} />

        <div>
          <span
            className={`inline-block rounded-full border px-3.5 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.2em] ${LEVEL_CHIP[result.level]}`}
          >
            {result.level}
          </span>
          <p
            className={`mt-4 max-w-sm font-display text-xl font-light leading-snug ${LEVEL_TEXT[result.level]}`}
          >
            {LEVEL_VERDICT[result.level]}
          </p>
        </div>
      </div>

      <div className="mt-12 max-w-lg">
        <p className="mb-6 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/45">
          Contributing signals
        </p>
        <div className="space-y-5">
          {result.reasons.map((r, i) => (
            <div
              key={i}
              className="flex items-start gap-4 border-b border-border pb-5 last:border-b-0"
            >
              <span className="font-display text-base font-light tabular-nums text-foreground/45">
                {String(i + 1).padStart(2, "0")}.
              </span>
              <p className="flex-1 pt-0.5 text-sm leading-relaxed text-foreground/80">
                {r.label}
              </p>
              {r.points !== 0 && (
                <span
                  className={`pt-0.5 font-display text-sm font-medium tabular-nums ${
                    r.kind === "increase" ? "text-risk-high" : "text-risk-low"
                  }`}
                >
                  {r.points > 0 ? `+${r.points}` : r.points}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 max-w-lg border-t border-border pt-10">
        <p className="mb-6 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/45">
          AI assessment
        </p>
        {insightLoading ? (
          <p className="text-sm leading-relaxed text-foreground/45">
            Preparing an explanation…
          </p>
        ) : insight?.ok ? (
          <div>
            <p className="text-sm leading-relaxed text-foreground/80">
              {insight.summary}
            </p>
            {insight.warnings && insight.warnings.length > 0 && (
              <ul className="mt-6 space-y-3">
                {insight.warnings.map((w, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm leading-relaxed text-foreground/70"
                  >
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/35" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/45">
            {insight?.error ??
              "AI analysis is unavailable. The risk assessment above is unaffected."}
          </p>
        )}
      </div>
    </div>

  );
}
