import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SaveInput = z.object({
  amount: z.number(),
  recipient: z.string(),
  country: z.string(),
  category: z.string(),
  description: z.string(),
  score: z.number(),
  level: z.string(),
  reasons: z.array(z.string()),
  aiSummary: z.string().nullable(),
  aiWarnings: z.array(z.string()),
});

export const saveTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
      try {
        const { getDb } = await import("./mongo.server");
        const db = await getDb();
        const res = await db.collection("transactions").insertOne({
          userId: context.userId,
          amount: data.amount,
          recipient: data.recipient,
          country: data.country,
          category: data.category,
          description: data.description,
          riskScore: data.score,
          riskLevel: data.level,
          riskReasons: data.reasons,
          aiAssessment: { summary: data.aiSummary, warnings: data.aiWarnings },
          createdAt: new Date(),
        });
        console.log("saveTransaction inserted", res.insertedId?.toString());
        return { ok: true };
      } catch (error) {
        console.error("saveTransaction failed", error);
        return {
          ok: false,
          error: error instanceof Error ? error.message : "save failed",
        };
      }
    },
  );
