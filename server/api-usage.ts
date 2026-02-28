import { storage } from "./storage";
import type { InsertApiUsageLog } from "@shared/schema";

const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  "gpt-5.2": { input: 2_000_000, output: 8_000_000 },
  "gpt-5.1": { input: 1_000_000, output: 4_000_000 },
  "gpt-4o-mini": { input: 150_000, output: 600_000 },
};

const IMAGE_COST_MICRO: Record<string, number> = {
  "gpt-image-1": 40_000,
  "dall-e-3": 40_000,
};

function calculateCostMicro(model: string, promptTokens: number, completionTokens: number): number {
  const rates = COST_PER_MILLION[model];
  if (!rates) return 0;
  const inputCost = (promptTokens / 1_000_000) * rates.input;
  const outputCost = (completionTokens / 1_000_000) * rates.output;
  return Math.round(inputCost + outputCost);
}

export async function logApiUsage(
  userId: string,
  projectId: number | null,
  feature: string,
  model: string,
  response: any
): Promise<void> {
  try {
    const usage = response?.usage;
    const promptTokens = usage?.prompt_tokens || 0;
    const completionTokens = usage?.completion_tokens || 0;
    const totalTokens = usage?.total_tokens || promptTokens + completionTokens;
    const estimatedCostMicro = calculateCostMicro(model, promptTokens, completionTokens);

    await storage.createApiUsageLog({
      userId,
      projectId,
      feature,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostMicro,
    });
  } catch (err) {
    console.error("Failed to log API usage:", err);
  }
}

export async function logImageUsage(
  userId: string,
  projectId: number | null,
  feature: string,
  model: string = "gpt-image-1"
): Promise<void> {
  try {
    const cost = IMAGE_COST_MICRO[model] || 40_000;
    await storage.createApiUsageLog({
      userId,
      projectId,
      feature,
      model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostMicro: cost,
    });
  } catch (err) {
    console.error("Failed to log image usage:", err);
  }
}
