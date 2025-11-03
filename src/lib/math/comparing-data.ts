// Mer eller Mindre - Comparing quantities for 5-year-olds

export type ComparisonActivity = {
  id: string;
  type: "visual-compare" | "count-compare" | "size-compare" | "length-compare";
  question: string;
  audioText: string;
  option1: {
    emoji: string;
    count: number;
    label?: string;
  };
  option2: {
    emoji: string;
    count: number;
    label?: string;
  };
  correctAnswer: "option1" | "option2" | "same";
  explanation: string;
};

export type ComparingLesson = {
  id: string;
  title: string;
  introduction: string;
  audioIntro: string;
  activities: ComparisonActivity[];
  celebration: string;
};

export const COMPARING_LESSON: ComparingLesson = {
  id: "mer-eller-mindre",
  title: "Mer eller Mindre",
  introduction: "Låt oss lära oss att jämföra saker! Vi ska se vad som är mer, vad som är mindre, och när saker är lika många.",
  audioIntro: "Hej! Idag ska vi lära oss att jämföra saker! Det betyder att vi ska titta på två grupper och se vilken som har mer, vilken som har mindre, eller om de är lika många. Det är jättekul och lätt!",
  
  activities: [
    // Activity 1: Simple comparison with apples
    {
      id: "compare-1",
      type: "visual-compare",
      question: "Var finns det fler äpplen?",
      audioText: "Titta noga! Till vänster ser du några äpplen, och till höger ser du några andra äpplen. Var finns det fler äpplen? Klicka på den sida som har mest!",
      option1: {
        emoji: "🍎",
        count: 3,
        label: "Vänster"
      },
      option2: {
        emoji: "🍎",
        count: 5,
        label: "Höger"
      },
      correctAnswer: "option2",
      explanation: "Jättebra! På höger sida finns det 5 äpplen, och på vänster sida finns det bara 3 äpplen. 5 är mer än 3!"
    },

    // Activity 2: Stars comparison
    {
      id: "compare-2",
      type: "visual-compare",
      question: "Var finns det färre stjärnor?",
      audioText: "Nu ska vi hitta var det finns färre stjärnor. Färre betyder mindre, alltså inte lika många. Titta på båda sidorna och klicka på den som har minst stjärnor!",
      option1: {
        emoji: "⭐",
        count: 6,
        label: "Vänster"
      },
      option2: {
        emoji: "⭐",
        count: 2,
        label: "Höger"
      },
      correctAnswer: "option2",
      explanation: "Superbra! På höger sida finns det bara 2 stjärnor, men på vänster sida finns det 6 stjärnor. 2 är färre än 6!"
    },

    // Activity 3: Equal amounts
    {
      id: "compare-3",
      type: "visual-compare",
      question: "Är det lika många hjärtan på båda sidorna?",
      audioText: "Titta noga! Är det lika många hjärtan på vänster sida som på höger sida? Om du tycker de är lika många, klicka på den gröna knappen i mitten!",
      option1: {
        emoji: "💚",
        count: 4,
        label: "Vänster"
      },
      option2: {
        emoji: "💚",
        count: 4,
        label: "Höger"
      },
      correctAnswer: "same",
      explanation: "Perfekt! Du har rätt! Det är exakt 4 hjärtan på varje sida. De är lika många!"
    },

    // Activity 4: Toys comparison
    {
      id: "compare-4",
      type: "visual-compare",
      question: "Var finns det fler bollar?",
      audioText: "Låt oss räkna bollar! Titta på vänster sida och räkna bollarna. Sen tittar du på höger sida och räknar där också. Vilken sida har fler bollar?",
      option1: {
        emoji: "⚽",
        count: 7,
        label: "Vänster"
      },
      option2: {
        emoji: "⚽",
        count: 4,
        label: "Höger"
      },
      correctAnswer: "option1",
      explanation: "Fantastiskt! På vänster sida finns det 7 bollar, men på höger sida finns det bara 4 bollar. 7 är mer än 4!"
    },

    // Activity 5: Flowers comparison
    {
      id: "compare-5",
      type: "visual-compare",
      question: "Var finns det färre blommor?",
      audioText: "Nu ska vi leta efter färre blommor igen. Kom ihåg - färre betyder den sida som har minst! Vilken sida har färre blommor?",
      option1: {
        emoji: "🌸",
        count: 3,
        label: "Vänster"
      },
      option2: {
        emoji: "🌸",
        count: 8,
        label: "Höger"
      },
      correctAnswer: "option1",
      explanation: "Utmärkt! På vänster sida finns det 3 blommor, och på höger sida finns det 8 blommor. 3 är färre än 8!"
    },

    // Activity 6: Equal comparison
    {
      id: "compare-6",
      type: "visual-compare",
      question: "Är det lika många bananer på båda sidorna?",
      audioText: "Räkna noga nu! Är det lika många bananer på båda sidorna? Om de är lika många, klicka på den gröna knappen i mitten!",
      option1: {
        emoji: "🍌",
        count: 6,
        label: "Vänster"
      },
      option2: {
        emoji: "🍌",
        count: 6,
        label: "Höger"
      },
      correctAnswer: "same",
      explanation: "Fantastiskt! Du räknade jättebra! Det är exakt 6 bananer på båda sidorna. De är lika många!"
    },

    // Activity 7: Larger comparison
    {
      id: "compare-7",
      type: "visual-compare",
      question: "Var finns det fler tårtor?",
      audioText: "Mmm, tårtor! Låt oss se var det finns fler tårtor. Räkna noga och klicka på den sida som har mest tårtor!",
      option1: {
        emoji: "🎂",
        count: 5,
        label: "Vänster"
      },
      option2: {
        emoji: "🎂",
        count: 9,
        label: "Höger"
      },
      correctAnswer: "option2",
      explanation: "Jättebra! På höger sida finns det 9 tårtor, men på vänster sida finns det bara 5 tårtor. 9 är mer än 5!"
    },

    // Activity 8: Mixed comparison
    {
      id: "compare-8",
      type: "visual-compare",
      question: "Var finns det färre träd?",
      audioText: "Nu ska vi jämföra träd! Titta på båda sidorna och hitta den sida som har färre träd. Kom ihåg, färre betyder minst!",
      option1: {
        emoji: "🌳",
        count: 10,
        label: "Vänster"
      },
      option2: {
        emoji: "🌳",
        count: 7,
        label: "Höger"
      },
      correctAnswer: "option2",
      explanation: "Perfekt! På höger sida finns det 7 träd, och på vänster sida finns det 10 träd. 7 är färre än 10!"
    },
  ],

  celebration: "Grattis! Du är jätteduktig på att jämföra! Nu kan du se skillnad på mer och mindre, och du kan också se när saker är lika många. Du är en riktig jämförelse-mästare! 🌟"
};









