export type Topic = {
  id: string;
  label: string;
  synonyms?: string[];
};

export const BASE_TOPICS: Topic[] = [
  { id: "rymden", label: "rymden", synonyms: ["universum", "planeter", "stjärnor"] },
  { id: "vulkaner", label: "vulkaner", synonyms: ["lava", "magma"] },
  { id: "havet", label: "havet", synonyms: ["ocean", "sjöar"] },
  { id: "djur", label: "djur", synonyms: ["arter", "ekologi"] },
  { id: "kroppen", label: "kroppen", synonyms: ["biologi", "hälsa"] },
  { id: "väder", label: "väder", synonyms: ["klimat", "moln"] },
  { id: "energi", label: "energi", synonyms: ["sol", "vind", "el"] },
  { id: "historia", label: "historia", synonyms: ["forntid", "medeltid"] },
  { id: "uppfinningar", label: "uppfinningar", synonyms: ["teknik", "maskiner"] },
];

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFKD");
}

export function pickTwoTopics(
  recentContext: string | undefined,
  interests: string | undefined
): [Topic, Topic] {
  const interestWords = normalize(interests || "").split(/[^a-zåäö]+/i).filter(Boolean);
  const recent = normalize(recentContext || "");

  const scored = BASE_TOPICS.map(t => {
    const base = 1;
    const interestHit = interestWords.some(w => t.label.includes(w) || (t.synonyms || []).some(s => s.includes(w))) ? 2 : 0;
    const recentlyUsed = recent.includes(t.label) || (t.synonyms || []).some(s => recent.includes(s)) ? -2 : 0;
    return { t, score: base + interestHit + recentlyUsed + Math.random() * 0.5 };
  }).sort((a,b) => b.score - a.score);

  const first = scored[0]?.t || BASE_TOPICS[0];
  const second = scored.find(s => s.t.id !== first.id)?.t || BASE_TOPICS[1];
  return [first, second];
}


