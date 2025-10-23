import ComingSoonPage from "@/components/modes/ComingSoonPage";

export default function LabPage() {
  return (
    <ComingSoonPage
      title="Laboration"
      icon="🧪"
      description="Genomför virtuella experiment och lär dig genom praktik"
      features={[
        "Virtuella vetenskapsexperiment som är säkra att utföra",
        "Steg-för-steg instruktioner anpassade för barn",
        "Interaktiva simuleringar av fysik, kemi och biologi",
        "Lär dig genom att göra och experimentera",
        "Se resultat i realtid och förstå orsak och verkan",
        "Utmaningar och hypoteser att testa",
      ]}
    />
  );
}


