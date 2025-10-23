export type Lesson = {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  content: LessonContent[];
};

export type LessonContent = 
  | { type: "text"; content: string }
  | { type: "heading"; content: string }
  | { type: "fact"; content: string }
  | { type: "question"; question: string; answer: string }
  | { type: "activity"; title: string; description: string }
  | { type: "image"; prompt: string; altText: string };

export type Topic = {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: string;
  color: string;
  lessons: Lesson[];
};

export const EXPLORE_TOPICS: Topic[] = [
  {
    id: "solar-system",
    title: "Solsystemet",
    icon: "🪐",
    description: "Upptäck planeterna, solen och månen",
    category: "Rymden",
    color: "from-purple-500 via-indigo-500 to-blue-600",
    lessons: [
      {
        id: "planets-intro",
        title: "Planeterna i vårt solsystem",
        description: "Lär dig om de åtta planeterna",
        difficulty: "easy",
        estimatedMinutes: 5,
        content: [
          { type: "heading", content: "Välkommen till Solsystemet!" },
          { type: "text", content: "Vårt solsystem är ett fantastiskt ställe i rymden! Det består av solen, åtta spännande planeter, och många andra himlakroppar som månar, asteroider och kometer. Allt detta rör sig i en enorm dans genom universum. Solen står i mitten, och alla planeterna snurrar runt den i sina egna banor. Varje planet är unik och har sina egna speciella egenskaper." },
          { type: "text", content: "Planeterna i vårt solsystem har snurrat runt solen i miljarder år. De bildades för ungefär fyra och en halv miljard år sedan av ett stort moln av gas och damm. Idag fortsätter de sin resa runt solen, och varje planet tar olika lång tid på sig att göra ett helt varv. Jorden tar till exempel ett år på sig, medan Merkurius, som är närmast solen, bara behöver 88 dagar!" },
          { type: "image", prompt: "Educational diagram of the solar system showing the sun and eight planets in accurate scale and order from left to right, realistic space photography style with correct colors and textures, scientific illustration suitable for school textbook", altText: "Solsystemet med alla planeter" },
          { type: "heading", content: "De Inre Planeterna" },
          { type: "text", content: "De fyra planeterna närmast solen kallas för stenplaneter eller de inre planeterna. Det är Merkurius, Venus, Jorden och Mars. De kallas stenplaneter för att de har fast yta av sten och metall, precis som marken du står på! Om du skulle kunna besöka dem, skulle du faktiskt kunna gå omkring på deras yta." },
          { type: "text", content: "Merkurius är den minsta planeten och närmast solen. Det är otroligt varmt där på dagen men iskallt på natten! Venus är ungefär lika stor som jorden men täcks av tjocka moln av giftig gas. Mars kallas ofta för den röda planeten eftersom dess yta ser rödaktig ut, vilket beror på rost i marken. Forskare tror att det kanske fanns vatten på Mars för länge sedan!" },
          { type: "fact", content: "Jorden är den enda planeten vi vet har liv! Här finns allt som behövs: vatten, luft att andas, och lagom temperatur." },
          { type: "heading", content: "De Yttre Planeterna" },
          { type: "text", content: "De fyra yttre planeterna är giganter jämfört med de inre planeterna! Jupiter, Saturnus, Uranus och Neptunus är så stora att de kallas gasjättar. De består mest av gas och har inga fasta ytor som du kan stå på. Om du försökte landa på dem skulle du bara sjunka genom gaserna!" },
          { type: "text", content: "Jupiter är den största planeten i hela solsystemet. Den har en stor röd fläck som faktiskt är en storm som pågått i hundratals år! Saturnus är känd för sina vackra ringar som består av is och sten. Uranus och Neptunus är väldigt långt bort och därför svåra att studera, men vi vet att de också har ringar och många månar." },
          { type: "fact", content: "Jupiter är så stor att alla andra planeter i solsystemet skulle kunna få plats inuti den samtidigt!" },
          { type: "question", question: "Hur många planeter finns det i vårt solsystem?", answer: "Det finns åtta planeter i vårt solsystem. Från närmast solen: Merkurius, Venus, Jorden, Mars, Jupiter, Saturnus, Uranus och Neptunus." },
          { type: "activity", title: "Rita ditt eget solsystem", description: "Ta papper och pennor och försök rita solen och alla planeterna i rätt ordning. Kom ihåg: Merkurius, Venus, Jorden, Mars, Jupiter, Saturnus, Uranus, Neptunus! Rita även några månar runt några av planeterna, och glöm inte Saturnus vackra ringar!" },
        ],
      },
      {
        id: "sun",
        title: "Solen - Vår Stjärna",
        description: "Allt om solen och varför den är viktig",
        difficulty: "easy",
        estimatedMinutes: 4,
        content: [
          { type: "heading", content: "Solen - En Fantastisk Stjärna" },
          { type: "text", content: "Solen är en enorm eldkula i rymden! Den är en stjärna, precis som de små prickarna du ser på natthimlen, men den är mycket närmare oss." },
          { type: "image", prompt: "Photorealistic image of the sun showing detailed surface with solar flares and prominences, NASA-quality space photography, accurate solar corona and surface texture, educational textbook quality", altText: "Solen med solflammor" },
          { type: "fact", content: "Solen är så stor att en miljon jordklot skulle få plats inuti den!" },
          { type: "text", content: "Solen ger oss ljus och värme. Utan solen skulle det vara mörkt och kallt på jorden. Växter behöver solljus för att växa, och vi behöver växter för att äta!" },
          { type: "heading", content: "Hur Fungerar Solen?" },
          { type: "text", content: "Inne i solen händer något som kallas fusion. Det är som en gigantisk explosion som pågår hela tiden och skapar otroligt mycket energi!" },
          { type: "fact", content: "Det tar ungefär 8 minuter för solljuset att resa från solen till jorden!" },
          { type: "question", question: "Varför är solen viktig för livet på jorden?", answer: "Solen ger oss ljus och värme, och växter behöver solljus för att växa. Utan solen skulle det vara för kallt för liv." },
        ],
      },
    ],
  },
  {
    id: "dinosaurs",
    title: "Dinosaurier",
    icon: "🦕",
    description: "Lär dig om de fantastiska varelserna som levde för länge sedan",
    category: "Historia & Natur",
    color: "from-green-500 via-emerald-500 to-teal-600",
    lessons: [
      {
        id: "dino-intro",
        title: "Vad är dinosaurier?",
        description: "Möt de förhistoriska jättarna",
        difficulty: "easy",
        estimatedMinutes: 5,
        content: [
          { type: "heading", content: "Dinosauriernas Tid" },
          { type: "text", content: "Dinosaurier var enorma reptiler som levde på jorden för väldigt länge sedan - mellan 230 och 65 miljoner år sedan! Det var innan människor fanns." },
          { type: "image", prompt: "Scientifically accurate illustration of Tyrannosaurus Rex and Brachiosaurus in realistic Mesozoic era landscape with authentic prehistoric vegetation, natural history museum quality, educational paleontology illustration showing correct anatomy and proportions", altText: "Olika dinosaurier i ett förhistoriskt landskap" },
          { type: "fact", content: "Namnet 'dinosaurie' betyder 'fruktansvärd ödla' på grekiska!" },
          { type: "heading", content: "Olika Typer av Dinosaurier" },
          { type: "text", content: "Det fanns väldigt många olika dinosaurier. Några var enorma som hus, andra var små som kycklingar. Vissa åt växter, andra var rovdjur." },
          { type: "text", content: "T-Rex var en av de mest kända rovdinosaurierna. Den hade jättestora tänder och kunde springa snabbt!" },
          { type: "fact", content: "Brachiosaurus var så hög att den kunde titta in genom ett fönster på fjärde våningen!" },
          { type: "question", question: "Lever det dinosaurier idag?", answer: "Nej, dinosaurier dog ut för 65 miljoner år sedan. Men fåglar är ättlingar till dinosaurier!" },
          { type: "activity", title: "Bli en paleontolog", description: "En paleontolog är en person som studerar fossil och dinosaurier. Rita din egen dinosaurie och ge den ett namn!" },
        ],
      },
    ],
  },
  {
    id: "ocean",
    title: "Havet",
    icon: "🌊",
    description: "Dyk ner i havet och möt fascinerande havsdjur",
    category: "Natur",
    color: "from-blue-500 via-cyan-500 to-teal-500",
    lessons: [
      {
        id: "ocean-intro",
        title: "Havets Mysterier",
        description: "Upptäck livet under vattenytan",
        difficulty: "easy",
        estimatedMinutes: 6,
        content: [
          { type: "heading", content: "Välkommen till Havet!" },
          { type: "text", content: "Havet täcker mer än 70% av jorden! Det är enormt och väldigt djupt. I havet finns otroligt många spännande djur och växter." },
          { type: "image", prompt: "Colorful underwater scene with dolphins, fish, coral reef, and sea turtle, bright and child-friendly", altText: "Undervattensvärld med fiskar och koraller" },
          { type: "heading", content: "Havets Zoner" },
          { type: "text", content: "Havet är uppdelat i olika lager. Längst upp där solljuset når kallas det solzon. Där lever de flesta havsdjuren eftersom det finns ljus och värme." },
          { type: "text", content: "Ju djupare du kommer, desto mörkare och kallare blir det. På havets botten är det helt mörkt och enormt kallt!" },
          { type: "fact", content: "Det djupaste stället i havet kallas Marianergraven och är nästan 11 kilometer djupt!" },
          { type: "heading", content: "Havsdjur" },
          { type: "text", content: "I havet finns allt från små kräftdjur till den största varelsen som någonsin levat - blåvalen! Hajar, delfiner, bläckfiskar och tusentals fiskarter lever i havet." },
          { type: "fact", content: "Blåvalen kan bli 30 meter lång och väga lika mycket som 30 elefanter!" },
          { type: "question", question: "Varför är havet så viktigt för jorden?", answer: "Havet producerar mycket syre som vi andas, reglerar klimatet, och är hem för miljontals djurarter. Det är superviktigt för allt liv på jorden!" },
        ],
      },
    ],
  },
  {
    id: "human-body",
    title: "Människokroppen",
    icon: "🫀",
    description: "Upptäck hur din fantastiska kropp fungerar",
    category: "Kroppen",
    color: "from-red-500 via-pink-500 to-rose-500",
    lessons: [
      {
        id: "heart",
        title: "Hjärtat - Din Livspump",
        description: "Hur fungerar hjärtat?",
        difficulty: "medium",
        estimatedMinutes: 5,
        content: [
          { type: "heading", content: "Hjärtat - Din Livspump" },
          { type: "text", content: "Hjärtat är en muskel som pumpar blod genom hela din kropp. Det slår ungefär 100 000 gånger varje dag utan att du behöver tänka på det!" },
          { type: "image", prompt: "A friendly cartoon heart pumping blood through blood vessels, educational children's anatomy illustration", altText: "Hjärtat pumpar blod" },
          { type: "text", content: "När hjärtat pumpar, skickar det blod fullt med syre och näring till alla dina celler. Blodet kommer sedan tillbaka till hjärtat för att få mer syre från lungorna." },
          { type: "fact", content: "Ett barns hjärta är ungefär lika stort som en knytnäve!" },
          { type: "heading", content: "Blodet i din Kropp" },
          { type: "text", content: "Blodet färdas genom rör som kallas blodkärl. De som går från hjärtat kallas artärer, och de som går tillbaka kallas vener." },
          { type: "fact", content: "Om du la alla dina blodkärl på rad skulle de vara 100 000 kilometer långa - det är längre än två och ett halvt varv runt jorden!" },
          { type: "activity", title: "Känn din puls", description: "Lägg två fingrar på handleden och känn hur det bultar. Det är ditt hjärta som slår! Hoppa upp och ner i 30 sekunder och känn igen. Slår hjärtat snabbare nu?" },
          { type: "question", question: "Varför slår hjärtat snabbare när du springer?", answer: "När du springer behöver musklerna mer syre och energi, så hjärtat pumpar snabbare för att skicka mer blod till dem!" },
        ],
      },
    ],
  },
  {
    id: "weather",
    title: "Väder & Klimat",
    icon: "⛈️",
    description: "Varför regnar det? Hur bildas moln?",
    category: "Natur",
    color: "from-sky-500 via-blue-500 to-indigo-500",
    lessons: [
      {
        id: "clouds",
        title: "Molnen i Himlen",
        description: "Hur bildas moln och varför regnar det?",
        difficulty: "easy",
        estimatedMinutes: 5,
        content: [
          { type: "heading", content: "Vad är Moln?" },
          { type: "text", content: "Moln är egentligen miljontals små vattendroppar eller iskristaller som svävar i luften! De ser ut som stora vita eller gråa bollar på himlen." },
          { type: "image", prompt: "Different types of clouds in the sky - fluffy cumulus, wispy cirrus, and gray rain clouds, children's illustration", altText: "Olika typer av moln" },
          { type: "heading", content: "Hur Bildas Moln?" },
          { type: "text", content: "Solen värmer upp vatten i sjöar, hav och floder. Vattnet förvandlas till osynlig ånga som stiger upp i luften. När ångan kommer högt upp där det är kallt, blir den till små droppar igen - och då bildas moln!" },
          { type: "fact", content: "Moln kan väga miljontals kilo, men de svävar ändå i luften för att dropparna är så små och lätta!" },
          { type: "heading", content: "Varför Regnar Det?" },
          { type: "text", content: "När vattendropparna i molnet blir större och tyngre genom att fler droppar klumpar ihop sig, blir de för tunga för att sväva. Då faller de ner som regn!" },
          { type: "fact", content: "En regnbåge uppstår när solljuset lyser genom regndroppar och delas upp i alla färger!" },
          { type: "question", question: "Vad händer med regnvattnet efter att det regnat?", answer: "Regnvattnet rinner ner i marken, sjöar och floder. Sedan värmer solen upp det igen och det blir ånga som bildar nya moln. Det kallas vattnets kretslopp!" },
          { type: "activity", title: "Molnspaning", description: "Gå ut och titta på himlen. Hur många olika typer av moln kan du se? Ser något moln ut som ett djur eller en sak?" },
        ],
      },
    ],
  },
  {
    id: "plants",
    title: "Växter & Träd",
    icon: "🌳",
    description: "Hur växer växter och varför är de viktiga?",
    category: "Natur",
    color: "from-green-600 via-lime-500 to-emerald-500",
    lessons: [
      {
        id: "photosynthesis",
        title: "Hur Växter Gör Mat",
        description: "Fotosyntes - växternas superkraft",
        difficulty: "medium",
        estimatedMinutes: 6,
        content: [
          { type: "heading", content: "Växternas Superkraft" },
          { type: "text", content: "Växter har en fantastisk förmåga som kallas fotosyntes. De kan göra sin egen mat med hjälp av solljus, vatten och luft!" },
          { type: "image", prompt: "A tree showing photosynthesis process with sun, water from roots, and oxygen being released, educational children's illustration", altText: "Växt som gör fotosyntes" },
          { type: "text", content: "Växternas löv tar in koldioxid från luften (samma gas som vi andas ut). Rötterna suger upp vatten från jorden. När solljuset skiner på löven, kombineras allt detta och växten gör socker som den använder som mat!" },
          { type: "fact", content: "Som en bonus ger växter oss syre när de gör fotosyntes - samma syre som vi behöver andas!" },
          { type: "heading", content: "Varför är Löven Gröna?" },
          { type: "text", content: "Löven innehåller något som heter klorofyll. Det är det som gör löven gröna och hjälper dem att fånga upp solljus!" },
          { type: "text", content: "På hösten när det blir kallare, slutar många träd göra klorofyll. Då kan vi se andra färger som var gömda i löven hela tiden - gult, orange och rött!" },
          { type: "fact", content: "Ett enda stort träd kan ge syre till två personer under ett helt år!" },
          { type: "question", question: "Vad behöver en växt för att växa?", answer: "En växt behöver solljus, vatten, luft (koldioxid) och näringsämnen från jorden för att växa!" },
          { type: "activity", title: "Plantera ett frö", description: "Ta ett frö (t.ex. böna eller solros), plantåra det i jord, vattna det och ställ det i ett soligt fönster. Observera hur det växer varje dag!" },
        ],
      },
    ],
  },
];

export function getTopicById(topicId: string): Topic | undefined {
  return EXPLORE_TOPICS.find(t => t.id === topicId);
}

export function getLessonById(topicId: string, lessonId: string): Lesson | undefined {
  const topic = getTopicById(topicId);
  return topic?.lessons.find(l => l.id === lessonId);
}

export function getCategories(): string[] {
  const cats = new Set(EXPLORE_TOPICS.map(t => t.category));
  return Array.from(cats);
}

