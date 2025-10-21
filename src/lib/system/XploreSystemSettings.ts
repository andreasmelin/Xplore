export type XploreSettings = {
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
};

export function getXploreSettings(): XploreSettings {
  const model = process.env.XPLORE_MODEL || "gpt-4o-mini";
  const temperature = clampNum(parseFloat(process.env.XPLORE_TEMPERATURE || "0.7"), 0, 2, 0.7);
  const maxTokens = Math.max(1, parseInt(process.env.XPLORE_MAX_TOKENS || "220", 10));
  const topP = parseFloat(process.env.XPLORE_TOP_P || "0.85");
  const presencePenalty = parseFloat(process.env.XPLORE_PRESENCE_PENALTY || "0.7");
  const frequencyPenalty = parseFloat(process.env.XPLORE_FREQUENCY_PENALTY || "0.7");
  return {
    model,
    temperature,
    maxTokens,
    topP: Number.isFinite(topP) ? topP : undefined,
    presencePenalty: Number.isFinite(presencePenalty) ? presencePenalty : 0.7,
    frequencyPenalty: Number.isFinite(frequencyPenalty) ? frequencyPenalty : 0.7,
  };
}

function clampNum(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}


