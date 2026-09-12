import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InsightInput = z.object({
  amount: z.number(),
  recipient: z.string(),
  country: z.string(),
  category: z.string(),
  description: z.string(),
  score: z.number(),
  level: z.string(),
  reasons: z.array(z.string()),
});

export type AiInsight = {
  ok: boolean;
  summary?: string;
  warnings?: string[];
  error?: string;
};

export const getAiInsight = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InsightInput.parse(input))
  .handler(async ({ data }): Promise<AiInsight> => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) return { ok: false, error: "AI analysis is not configured." };

    const prompt = `A deterministic fraud-risk engine analyzed this payment.

Transaction:
- Amount: ${data.amount}
- Recipient: ${data.recipient}
- Country: ${data.country}
- Category: ${data.category}
- Description: ${data.description || "(none)"}

Engine result:
- Risk score: ${data.score}/100
- Risk level: ${data.level}
- Signals: ${data.reasons.join("; ")}

Respond ONLY with JSON matching:
{"summary": "2-3 calm sentences explaining the risk in plain language", "warnings": ["3-4 short, practical warning or verification points"]}
Do not contradict the engine's score or level.`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: "You are a payment-security analyst. You are concise, calm and practical. You return strict JSON only.",
                },
              ],
            },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );

      if (!res.ok) {
        const body = await res.text();
        console.error("Gemini API error", res.status, body);
        if (res.status === 429)
          return { ok: false, error: "AI analysis is busy. Try again shortly." };
        return { ok: false, error: "AI analysis is temporarily unavailable." };
      }

      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const content = json.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("") ?? "";
      const parsed = JSON.parse(content) as {
        summary?: string;
        warnings?: string[];
      };
      if (!parsed.summary) {
        return { ok: false, error: "AI analysis returned no explanation." };
      }
      return {
        ok: true,
        summary: parsed.summary,
        warnings: Array.isArray(parsed.warnings)
          ? parsed.warnings.filter((w) => typeof w === "string").slice(0, 5)
          : [],
      };
    } catch (error) {
      console.error(error);
      return { ok: false, error: "AI analysis could not be completed." };
    }
  });
