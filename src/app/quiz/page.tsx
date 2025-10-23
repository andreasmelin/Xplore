import ComingSoonPage from "@/components/modes/ComingSoonPage";

export default function QuizPage() {
  return (
    <ComingSoonPage
      title="Quiz & Test"
      icon="🎯"
      description="Testa dina kunskaper med roliga quiz anpassade efter din ålder"
      features={[
        "Interaktiva frågor inom matematik, naturvetenskap, svenska och mer",
        "Automatisk anpassning till barnets ålder och kunskapsnivå",
        "Omedelbar feedback och förklaringar",
        "Spåra framsteg och se förbättringar över tid",
        "Utmaningar och tidsbaserade quiz för extra spänning",
        "Belöningar och badges för att motivera lärande",
      ]}
    />
  );
}


