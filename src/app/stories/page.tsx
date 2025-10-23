import ComingSoonPage from "@/components/modes/ComingSoonPage";

export default function StoriesPage() {
  return (
    <ComingSoonPage
      title="Berättelser"
      icon="📚"
      description="Lyssna på personliga berättelser eller skapa egna med Sinus"
      features={[
        "AI-genererade berättelser anpassade efter barnets intressen",
        "Lär dig genom berättelser om vetenskap, historia och natur",
        "Skapa egna berättelser med Sinus hjälp",
        "Uppläsning med röst för bättre inlevelse",
        "Illustrationer som följer med berättelsen",
        "Spara favoriter och lyssna igen",
      ]}
    />
  );
}


