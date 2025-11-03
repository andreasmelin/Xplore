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
        estimatedMinutes: 10,
        content: [
          { type: "heading", content: "Välkommen till Solsystemet!" },
          { type: "text", content: "Vårt solsystem är ett fantastiskt ställe i rymden! Det består av solen som står i mitten, åtta spännande planeter, och många andra himlakroppar som månar och asteroider. Allt detta rör sig i en enorm dans genom universum. Planeterna snurrar runt solen i sina egna banor. Varje planet är helt unik och har sina egna speciella egenskaper." },
          
          { type: "heading", content: "Hur Solsystemet Bildades" },
          { type: "text", content: "För ungefär 4,6 miljarder år sedan fanns här bara ett stort moln av gas och damm. Detta moln började snurra runt och runt och blev allt mindre. I mitten blev det så varmt att solen föddes. Runt omkring klumpade dammet ihop sig och blev till planeter. Det tog miljontals år innan vårt solsystem såg ut som det gör idag." },
          
          { type: "heading", content: "Merkurius - Den Snabba Planeten" },
          { type: "text", content: "Merkurius är den minsta planeten och ligger närmast solen. Den färdas snabbast av alla planeter och tar bara 88 dagar på sig att snurra runt solen. På dagen är det otroligt varmt där, upp till 430 grader! Men på natten blir det iskallt, ner till minus 180 grader. Merkurius har nästan ingen atmosfär, så det finns ingen luft att andas där." },
          
          { type: "heading", content: "Venus - Den Heta Planeten" },
          { type: "text", content: "Venus är ungefär lika stor som vår jord men mycket varmare. Den täcks av tjocka moln av giftig gas som gör att värmen fastnar. Det är faktiskt den hetaste planeten i solsystemet, även värmare än Merkurius! Temperaturen där är 460 grader, tillräckligt varmt för att smälta bly. Venus snurrar åt motsatt håll jämfört med de flesta andra planeter, vilket gör den extra speciell." },
          
          { type: "heading", content: "Jorden - Vår Hemplanet" },
          { type: "text", content: "Jorden är den tredje planeten från solen och den enda planet vi vet har liv. Här finns allt som behövs för liv: vatten i haven, luft att andas, och lagom temperatur. Jorden har en måne som snurrar runt den och påverkar tidvattnet i haven. Vår planet är cirka 12 740 kilometer bred och är täckt till 71% av vatten. Det är på jorden vi bor tillsammans med miljontals andra djur- och växtarter!" },
          
          { type: "heading", content: "Mars - Den Röda Planeten" },
          { type: "text", content: "Mars kallas ofta för den röda planeten eftersom dess yta ser rödaktig ut. Detta beror på att det finns mycket rost i marken där. Mars är mindre än jorden och mycket kallare. Forskare tror att det kanske fanns vatten på Mars för länge sedan, och kanske till och med liv! Idag skickar vi robotar dit för att undersöka planeten närmare." },
          
          { type: "heading", content: "Jupiter - Jätten" },
          { type: "text", content: "Jupiter är den allra största planeten i vårt solsystem. Den är så stor att alla andra planeter skulle kunna få plats inuti den samtidigt! Jupiter är en gasplanet, vilket betyder att den inte har någon fast yta att stå på. Den har en stor röd fläck som faktiskt är en jättestor storm som pågått i hundratals år. Jupiter har också över 90 månar som snurrar runt den!" },
          
          { type: "heading", content: "Saturnus - Planeten med Ringarna" },
          { type: "text", content: "Saturnus är känd för sina fantastiskt vackra ringar. Ringarna består av miljarder bitar av is och sten som snurrar runt planeten. Saturnus är nästan lika stor som Jupiter och är också en gasplanet. Den är så lätt att om det fanns ett tillräckligt stort hav skulle Saturnus kunna flyta på vattnet! Saturnus har över 80 månar, och den största heter Titan." },
          
          { type: "heading", content: "Uranus och Neptunus - De Avlägsna Jättarna" },
          { type: "text", content: "Uranus och Neptunus ligger väldigt långt bort från solen och är därför svåra att studera. Båda är isiga gasjättar med vackra blå färger. Uranus är speciell för att den ligger på sidan när den snurrar runt solen. Neptunus är den mest avlägsna planeten och har de starkaste vindarna i hela solsystemet. Båda planeterna har ringar och många månar, fast de är svåra att se från jorden." },
          
          { type: "heading", content: "Allt Snurrar och Rör Sig" },
          { type: "text", content: "Alla planeter i solsystemet rör sig hela tiden. De snurrar runt solen i banor som kallas orbiter. Samtidigt snurrar varje planet runt sin egen axel, vilket ger oss dag och natt. Ju längre bort från solen en planet är, desto längre tid tar det att snurra runt solen. Allt detta har pågått i miljarder år och kommer fortsätta i miljarder år till!" },
        ],
      },
      {
        id: "sun",
        title: "Solen - Vår Stjärna",
        description: "Allt om solen och varför den är viktig",
        difficulty: "easy",
        estimatedMinutes: 10,
        content: [
          { type: "heading", content: "Solen - En Fantastisk Stjärna" },
          { type: "text", content: "Solen är en enorm eldkula i rymden som ger oss ljus och värme varje dag. Den är en stjärna, precis som de små prickarna du ser på natthimlen, men den är mycket närmare oss. Solen är så stor att ungefär en miljon jordklot skulle få plats inuti den! Den består av glödande heta gaser som hela tiden rör sig och snurrar. Utan solen skulle det inte finnas något liv på jorden." },
          
          { type: "heading", content: "Hur Stor är Solen?" },
          { type: "text", content: "Solen är otroligt mycket större än jorden. Om jorden var lika stor som ett fotbollsägg, skulle solen vara lika stor som en gigantisk boll som är tre meter bred! Solens diameter är 1,4 miljoner kilometer, vilket är över 100 gånger bredare än jorden. Trots att solen är så stor finns det många stjärnor i universum som är ännu större. Men för oss är solen den allra viktigaste stjärnan eftersom vi bor så nära den." },
          
          { type: "heading", content: "Solens Temperatur" },
          { type: "text", content: "På solens yta är det otroligt varmt, ungefär 5 500 grader Celsius! Men inne i solens mitt är det ännu varmare - hela 15 miljoner grader! Ingenting vi känner till kan överleva sådan hetta. Därför kan vi aldrig besöka solen, även om vi ville. Värmen och ljuset från solen färdas genom rymden och når jorden efter ungefär 8 minuter." },
          
          { type: "heading", content: "Hur Solen Skapar Energi" },
          { type: "text", content: "Inne i solen händer något som kallas kärnfusion. Det är när väteatomer pressas ihop så hårt att de smälter samman och blir till helium. När detta sker frigörs enorma mängder energi i form av ljus och värme. Denna process pågår hela tiden, dag och natt. Det är denna energi som gör att solen lyser och värmer. Solen har gjort detta i 4,6 miljarder år och kommer fortsätta i ungefär lika länge till!" },
          
          { type: "heading", content: "Solens Betydelse för Livet" },
          { type: "text", content: "Solen är helt avgörande för allt liv på jorden. Växter använder solljus för att tillverka sin mat genom fotosyntetes. Djur äter växter eller andra djur som äter växter, så alla beror på solen. Solen värmer också upp vår planet så att det inte blir för kallt. Utan solen skulle det vara mörkt, fruset och helt omöjligt för liv att existera." },
          
          { type: "heading", content: "Solens Ljus och Färger" },
          { type: "text", content: "Solens ljus ser vitt eller gult ut för oss, men det innehåller faktiskt alla färger i regnbågen. När solljus går genom regndroppar delas det upp i alla dessa färger, och då kan vi se en regnbåge. Solens ljus färdas väldigt snabbt - det tar bara 8 minuter att resa de 150 miljoner kilometerna från solen till jorden. Det betyder att när du ser på solen (vilket du aldrig ska göra direkt!) ser du den som den såg ut för 8 minuter sedan!" },
          
          { type: "heading", content: "Solfläckar och Solutbrott" },
          { type: "text", content: "På solens yta finns det ibland mörkare fläckar som kallas solfläckar. Dessa fläckar är områden som är lite svalare än resten av solen, men fortfarande otroligt heta. Ibland händer det stora explosioner på solen som kallas solutbrott. Dessa explosioner skickar ut massor av energi och partiklar ut i rymden. När dessa partiklar når jorden kan de skapa vackra norrsken på himlen!" },
          
          { type: "heading", content: "Jordens Resa Runt Solen" },
          { type: "text", content: "Jorden snurrar runt solen en gång varje år, och denna resa är ungefär 940 miljoner kilometer lång. Det är därför vi har årstider - när jorden lutar mot solen blir det sommar, och när den lutar bort blir det vinter. Samtidigt som jorden åker runt solen snurrar den också runt sig själv en gång per dag. Detta ger oss dag när vår del av jorden är vänd mot solen, och natt när vi är vända bort." },
          
          { type: "heading", content: "Andra Stjärnor i Universum" },
          { type: "text", content: "Solen är bara en av miljardtals stjärnor i universum. De stjärnor vi ser på natthimlen är faktiskt andra solar, men de är så långt borta att de ser ut som små prickar. Vissa stjärnor är mycket större än vår sol, andra är mindre. Alla stjärnor fungerar ungefär som vår sol och skapar ljus och värme genom kärnfusion. Kanske finns det planeter runt några av dessa stjärnor där det också finns liv!" },
          
          { type: "heading", content: "Solens Framtid" },
          { type: "text", content: "Solen kommer att fortsätta lysa i ungefär 5 miljarder år till. Sedan kommer den långsamt att bli större och större tills den blir en så kallad röd jätte. Till slut kommer den att bli till en vit dvärg, en liten het stjärna som sakta svalnar. Men oroa dig inte - detta kommer att ta så lång tid att vi inte behöver tänka på det. Vår sol kommer att finnas där och ge oss ljus och värme under många, många generationer framöver!" },
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
        estimatedMinutes: 10,
        content: [
          { type: "heading", content: "Dinosauriernas Tid" },
          { type: "text", content: "Dinosaurier var enorma reptiler som levde på jorden för väldigt länge sedan. De levde mellan 230 och 65 miljoner år sedan, vilket var långt innan de första människorna fanns. Under denna tid kallad Mesozoikum, var jorden mycket annorlunda än idag. Det var varmare, och kontinenterna låg på andra ställen än nu. Dinosaurierna var de dominerande djuren på jorden i över 160 miljoner år!" },
          
          { type: "heading", content: "Vad Betyder Dinosaurie?" },
          { type: "text", content: "Ordet 'dinosaurie' kommer från grekiskan och betyder 'fruktansvärd ödla'. Namnet gavs av en brittisk forskare på 1800-talet när man hittade de första fossilen. Men dinosaurier var inte riktiga ödlor - de var en helt egen grupp av djur. Det fanns hundratals olika arter av dinosaurier, alla med olika storlekar, former och sätt att leva. Vissa kunde springa fort, andra kunde simma, och en del kunde till och med flyga!" },
          
          { type: "heading", content: "Köttätare och Växtätare" },
          { type: "text", content: "Dinosaurier kan delas in i två huvudgrupper: köttätare och växtätare. Köttätarna kallas rovdinosaurier och de jagade andra djur för mat. De hade vassa tänder och klor. Växtätarna åt löv, grenar och växter och hade ibland stora tankar i munnen för att mala ner växtmaterialet. Vissa växtätare hade också taggar eller pansar för att skydda sig mot rovdjuren. De flesta dinosaurier var faktiskt växtätare!" },
          
          { type: "heading", content: "Tyrannosaurus Rex - Kungen av Rovdjuren" },
          { type: "text", content: "T-Rex var en av de största och farligaste rovdinosaurierna som någonsin levt. Den var över 12 meter lång och 4 meter hög, ungefär som ett tvåvåningshus! T-Rex hade enorma käkar med tänder som var 30 centimeter långa. Den kunde tugga igenom ben med sitt kraftfulla bett. Trots att T-Rex hade små armar var den en dödlig jägare som troligen kunde springa ganska fort." },
          
          { type: "heading", content: "Brachiosaurus - Den Långhalsade Jätten" },
          { type: "text", content: "Brachiosaurus var en av de största dinosaurier som någonsin levt. Den var så hög att den kunde titta in genom ett fönster på fjärde våningen! Dess huvud satt på en lång hals som den kunde sträcka upp högt för att nå löv i trädens toppar. Brachiosaurus vägde lika mycket som 10 elefanter och åt enorma mängder växter varje dag. Trots sin storlek var den troligen ganska lugn och fridsam." },
          
          { type: "heading", content: "Stegosaurus och Andra Taggiga Dinosaurier" },
          { type: "text", content: "Stegosaurus hade stora plattor på ryggen och taggar på svansen som den använde för att skydda sig. Plattorna hjälpte kanske också till att reglera kroppstemperaturen. Triceratops var en annan cool dinosaurie med tre horn på huvudet och en stor skärm runt nacken. Ankylosaurus såg ut som en levande stridsvagn med pansar över hela kroppen och en stor klubba i slutet av svansen. Dessa försvar hjälpte dem att överleva mot rovdjuren!" },
          
          { type: "heading", content: "Flygande och Simmande Reptiler" },
          { type: "text", content: "Förutom dinosaurierna på land fanns det flygande reptiler som kallas pterosaurier. Dessa var inte riktiga dinosaurier men levde samtidigt. Pteranodon hade en vingbredd på upp till 7 meter! I haven fanns stora marina reptiler som Plesiosaurus med långa halsar och Mosasaurus som kunde bli 17 meter långa. Alla dessa fantastiska varelser levde under samma tid som dinosaurierna på land." },
          
          { type: "heading", content: "Hur Dinosaurierna Dog Ut" },
          { type: "text", content: "För 65 miljoner år sedan dog alla dinosaurier plötsligt ut. Forskare tror att en gigantisk asteroid eller komet slog ner på jorden. Detta orsakade enorma explosioner, bränder och sedan en lång vinter när damm täckte himlen. Utan solljus dog växterna, och utan växter dog växtätarna, och sedan rovdjuren. Det var en katastrof som utrotade dinosaurierna och många andra djur. Men inte alla djur dog - små däggdjur och fåglar överlevde!" },
          
          { type: "heading", content: "Fåglar är Dinosauriernas Ättlingar" },
          { type: "text", content: "Det mest spännande är att dinosaurierna inte är helt utdöda! Forskare har upptäckt att fåglar faktiskt är direkta ättlingar till en grupp små rovdinosaurier. Detta betyder att varje gång du ser en fågel, ser du egentligen en levande dinosaurie! Många små rovdinosaurier hade fjädrar, precis som fåglar idag. Så på sätt och vis lever dinosaurierna fortfarande bland oss, bara i en mindre och mer fluffig form!" },
          
          { type: "heading", content: "Hur Vi Vet om Dinosaurier" },
          { type: "text", content: "Allt vi vet om dinosaurier kommer från fossil. Fossil är rester av döda djur och växter som blivit förvandlade till sten under miljontals år. Forskare som studerar fossil kallas paleontologer. De gräver försiktigt upp benen och sätter ihop dem som ett gigantiskt pussel. Genom att studera fossilen kan de lista ut hur dinosaurierna såg ut, vad de åt, och hur de levde. Varje år hittas nya fossil som berättar mer om dessa fantastiska varelser!" },
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
        estimatedMinutes: 10,
        content: [
          { type: "heading", content: "Välkommen till Havet!" },
          { type: "text", content: "Havet täcker mer än 70% av jordens yta! Det är ett enormt och fascinerande ställe fullt av liv. I haven finns miljontals olika djur och växter, från de minsta plankton till de största valarna. Haven är djupare än de högsta bergen är höga. De flesta haven är sammankopplade och bildar ett stort världshav. Havet är livsviktigt för allt liv på jorden, även för oss människor som bor på land!" },
          
          { type: "heading", content: "Havets Olika Zoner" },
          { type: "text", content: "Havet är uppdelat i olika lager som kallas zoner. Längst upp finns solfältet där solljuset når ner. Här lever de flesta havsdjuren eftersom det finns ljus, värme och mat. Under solfältet blir det mörkare och kallare i skymningszonen. Ännu djupare ner i mörkerzonen finns inget ljus alls. På havets botten i abyssen är det helt mörkt, iskallt och trycket är enormt. Ändå lever det spännande djur även där!" },
          
          { type: "heading", content: "Koralllrev - Havets Regnskogar" },
          { type: "text", content: "Korallrev är som färgglada städer under vattnet. De består av små djur som kallas korallpolyper som bygger skelett av kalk. Tusentals olika fiskar, kräftdjur och andra varelser bor i reven. Korallrev finns i varma vatten och är hem för en fjärdedel av alla marina arter. De är också viktiga för människor eftersom de skyddar kuster från vågor och stormar. Tyvärr hotas korallreven idag av klimatförändringar och förorening." },
          
          { type: "heading", content: "Blåvalen - Havets Jätte" },
          { type: "text", content: "Blåvalen är det största djuret som någonsin levat på jorden, större än till och med de största dinosaurierna! En blåval kan bli 30 meter lång och väga så mycket som 30 elefanter. Trots sin enorma storlek äter blåvalar bara små kräftdjur som kallas krill. En blåval kan äta 4 ton krill varje dag! Deras hjärta är så stort som en liten bil, och ett barn skulle kunna krypa genom deras blodkärl." },
          
          { type: "heading", content: "Hajar - Havets Jägare" },
          { type: "text", content: "Hajar har funnits i haven i över 400 miljoner år, längre än dinosaurierna! Det finns över 500 olika arter av hajar, från den lilla dvärghajen som är 20 centimeter lång till den gigantiska valhajen som kan bli 12 meter. De flesta hajar är inte farliga för människor. Hajar har fantastiska sinnen och kan känna lukten av blod på jättelångt håll. De spelar en viktig roll i havet genom att hålla andra fiskbestånd friska." },
          
          { type: "heading", content: "Delfiner - De Smarta Havsdjuren" },
          { type: "text", content: "Delfiner är väldigt intelligenta däggdjur som lever i havet. De andas luft precis som vi och måste komma upp till ytan för att få syre. Delfiner använder ekolokalisering för att hitta mat - de skickar ut ljud och lyssnar på ekot som studsar tillbaka. De lever i grupper och kommunicerar med varandra genom visslingar och klick. Delfiner är lekfulla och nyfikna och är kända för att hjälpa människor och andra djur i nöd!" },
          
          { type: "heading", content: "Bläckfiskar och Blekksprut" },
          { type: "text", content: "Bläckfiskar och bläcksprut är några av havets mest spännande varelser. De har åtta armar fulla med sugkoppar och kan ändra färg på sin hud på några sekunder! Blekkspruten har nio hjärnor - en huvudhjärna och en liten hjärna i varje arm. Om de blir rädda kan de spruta ut bläck för att förvirra fienden och smita iväg. Jättebläckspruten kan bli upp till 13 meter lång och väga 275 kilo!" },
          
          { type: "heading", content: "Djuphavsvarelser" },
          { type: "text", content: "I havets djup där inget solljus når lever konstiga och fascinerande varelser. Många av dem lyser i mörkret med sitt eget ljus, vilket kallas bioluminiscens. Marlinfisken har en lykta som hänger framför munnen för att locka till sig byten. Jättebläckfisken och kolossalbläckfisken lever på djupt vatten och har enorma ögon för att se i mörkret. Det finns säkert många djur i djuphaven som vi inte ens har upptäckt än!" },
          
          { type: "heading", content: "Havets Betydelse för Klimatet" },
          { type: "text", content: "Havet spelar en enorm roll för jordens klimat och väder. Det tar upp värme från solen och sprider den runt jorden genom havsströmmar. Haven tar också upp mycket koldioxid från luften, vilket hjälper till att bromsa klimatförändringarna. Värmevattnet från havet bildar moln som ger oss regn. Utan havet skulle jorden vara mycket varmare på dagarna och kallare på nätterna. Havet är som jordens stora klimatanläggning!" },
          
          { type: "heading", content: "Skydda Våra Hav" },
          { type: "text", content: "Haven är hotade av plast, förorening och överfiske. Varje år hamnar miljontals ton plast i haven, vilket skadar djuren som bor där. Många fiskebestånd minskar för att vi fiskar för mycket. Klimatförändringar gör haven varmare vilket blekar korallreven. Men vi kan hjälpa till genom att slänga sopor rätt, minska plastanvändningen och äta hållbart fångad fisk. Varje liten insats hjälper till att skydda våra fantastiska hav för framtiden!" },
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
        estimatedMinutes: 10,
        content: [
          { type: "heading", content: "Hjärtat - Din Livspump" },
          { type: "text", content: "Hjärtat är en fantastisk muskel som pumpar blod genom hela din kropp varje sekund av ditt liv. Det slår ungefär 100 000 gånger varje dag utan att du behöver tänka på det! Ditt hjärta började slå innan du ens var född och kommer fortsätta hela ditt liv. Hjärtat är ungefär lika stort som din knytnäve och väger mellan 250 och 350 gram. Det är en av kroppens viktigaste organ eftersom inget i kroppen kan fungera utan blodcirkulation." },
          
          { type: "heading", content: "Hur Hjärtat Fungerar" },
          { type: "text", content: "Hjärtat är uppdelat i fyra rum - två förmak och två kammare. När hjärtat slår drar det ihop sig och trycker ut blod genom kroppen. Sedan slappnar det av och fylls med nytt blod. Detta händer ungefär 70 gånger i minuten när du vilar. Varje slag pumpar ut cirka en deciliter blod. På bara en minut pumpar hjärtat ut nästan 5 liter blod genom kroppen - det är lika mycket som i en stor läskflaska!" },
          
          { type: "heading", content: "Blodet och Dess Resa" },
          { type: "text", content: "Blodet som hjärtat pumpar ut färdas genom hela kroppen på bara 60 sekunder! Det transporterar syre och näring till alla celler. Blodet går först till lungorna för att hämta syre från luften du andas in. Sedan pumpas det ut till kroppen genom blodkärl som kallas artärer. När cellerna har använt syret återvänder blodet till hjärtat genom blodkärl som kallas vener. Hela denna resa kallas för blodcirkulationen och pågår hela tiden." },
          
          { type: "heading", content: "Blodkärlen - Kroppens Vägar" },
          { type: "text", content: "Blodet färdas genom ett nätverk av rör som kallas blodkärl. Artärer bär syrerikt blod från hjärtat till kroppen och har tjocka väggar. Vener för tillbaka blod till hjärtat och har tunnare väggar. Mellan artärerna och venerna finns små tunna blodkärl som kallas kapillärer. Om du lade alla dina blodkärl på rad skulle de vara över 100 000 kilometer långa - det är längre än två och ett halvt varv runt jorden!" },
          
          { type: "heading", content: "Pulsen - Hjärtats Rytm" },
          { type: "text", content: "När hjärtat slår skapar det en våg genom blodkärlen som du kan känna på handleden eller halsen. Detta kallas puls. Din puls kan berätta hur fort hjärtat slår. När du vilar slår hjärtat cirka 70 gånger i minuten. När du springer eller leker slår det snabbare, kanske 150 gånger i minuten! Detta är för att musklerna behöver mer syre när de arbetar hårt. Du kan känna din egen puls genom att lägga två fingrar mot insidan av handleden." },
          
          { type: "heading", content: "Vad Blodet Innehåller" },
          { type: "text", content: "Blodet består av flera olika delar. Röda blodkroppar transporterar syre och ger blodet dess röda färg. Vita blodkroppar försvarar kroppen mot sjukdomar och bakterier. Blodplättar hjälper till att stoppa blödningar genom att bilda en skorpa när du skadar dig. Allt detta flyter i en gul vätska som kallas plasma. Du har ungefär 5 liter blod i kroppen, och det byts ut helt var tredje till fyra månader!" },
          
          { type: "heading", content: "Lungorna och Hjärtat Samarbetar" },
          { type: "text", content: "Hjärtat och lungorna arbetar tillsammans som ett lag. När du andas in fyller du lungorna med luft som innehåller syre. Blodet i lungorna tar upp detta syre. Hjärtat pumpar sedan ut det syrerika blodet till hela kroppen. När cellerna har använt syret blir blodet fullt av koldioxid istället. Detta blod går tillbaka till hjärtat som pumpar det till lungorna. Där andas du ut koldioxiden. Denna cykel upprepas varje gång du andas!" },
          
          { type: "heading", content: "Varför Hjärtat Slår Olika Fort" },
          { type: "text", content: "Hjärtat anpassar sitt tempo efter vad kroppen behöver. När du sover slår hjärtat långsammare eftersom kroppen vilar. När du vaknar och börjar röra på dig slår det snabbare. Vid träning kan hjärtat slå dubbelt så fort som när du vilar. Detta är helt normalt och visar att hjärtat är smart! När du blir rädd eller nervös kan hjärtat också slå snabbare på grund av adrenalin i kroppen. Även känslor påverkar hjärtat!" },
          
          { type: "heading", content: "Att Hålla Hjärtat Friskt" },
          { type: "text", content: "Det är viktigt att ta hand om ditt hjärta så det håller sig starkt hela livet. Motion är bra för hjärtat - när du springer, cyklar eller leker aktivt tränar hjärtat precis som andra muskler. Att äta nyttig mat som frukt, grönsaker och fullkorn hjälper också. Det är bra att undvika för mycket godis och läsk. Att sova tillräckligt och må bra är också viktigt för hjärtat. Ett friskt hjärta kan slå i över 100 år!" },
          
          { type: "heading", content: "Hjärtat - Ett Livslångt Arbete" },
          { type: "text", content: "Tänk på hur fantastiskt hjärtat är! Det har slagit varje sekund sedan innan du föddes. Under ett helt liv slår ett hjärta över 2,5 miljarder gånger. Det pumpar tillräckligt med blod för att fylla över 200 tågvagnar! Hjärtat arbetar hårdare än någon annan muskel i kroppen och tar aldrig rast. Det är verkligen en av kroppens mest fantastiska delar. Var snäll mot ditt hjärta så kommer det ta hand om dig hela livet!" },
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
        estimatedMinutes: 10,
        content: [
          { type: "heading", content: "Vad är Moln?" },
          { type: "text", content: "Moln är egentligen miljontals små vattendroppar eller iskristaller som svävar högt uppe i luften. De ser ut som stora vita eller gråa bollar på himlen, men när du tittar närmare är de faktiskt genomskinliga. Moln kan ha många olika former och storlekar. Vissa är tunna och lätta som fjädrar, medan andra är tjocka och tunga. Trots att moln kan väga miljontals kilo svävar de i luften för att dropparna är så små och lätta!" },
          
          { type: "heading", content: "Hur Bildas Moln?" },
          { type: "text", content: "Moln bildas genom vattnets kretslopp. Först värmer solen upp vatten i sjöar, floder och hav. När vattnet blir varmt förvandlas det till osynlig vattenånga som stiger upp i luften. Ju högre upp ångan kommer, desto kallare blir det. När ångan når kallare luft kondenserar den, vilket betyder att den förvandlas tillbaka till små vattendroppar. Miljarder av dessa små droppar tillsammans bildar det vi ser som ett moln. På vintern kan dropparna frysa till iskristaller istället!" },
          
          { type: "heading", content: "Olika Typer av Moln" },
          { type: "text", content: "Det finns många olika typer av moln. Cumulusmoln är de stora fluffiga vita molnen som ser ut som bomullskullar. Cirrusmoln är tunna fjäderliknande moln högt uppe i himlen. Stratusmoln är grå moln som ligger som ett täcke över himlen. Cumulonimbusmoln är höga torn av moln som kan ge åskväder. Genom att titta på molnen kan meteorologer förutsäga vad för väder som kommer. Olika moln betyder olika saker!" },
          
          { type: "heading", content: "Varför Regnar Det?" },
          { type: "text", content: "Regn uppstår när vattendropparna i molnen växer och blir tyngre. Dropparna kolliderar med varandra och klumpar ihop sig till större droppar. När dropparna blir tillräckligt stora och tunga kan de inte längre sväva i luften. Då faller de ner som regn! En regndroppe innehåller ungefär en miljon små molndroppar. Om det är mycket kallt i molnet faller det snö istället för regn. Hagel uppstår när vattendroppar fryser till is och blåser upp och ner i åskmoln tills de blir stora nog att falla." },
          
          { type: "heading", content: "Vattnets Kretslopp" },
          { type: "text", content: "Vattnet på jorden är alltid i rörelse i det som kallas vattnets kretslopp. När det regnar rinner vattnet ner i marken, sjöar och floder. En del vatten sjunker ner djupt i jorden och blir grundvatten. Vattnet i sjöar och floder rinner till slut till haven. Sedan värmer solen upp vattnet igen och det blir ånga. Ångan stiger upp och bildar nya moln, och sedan regnar det igen. Detta kretslopp har pågått i miljoner år och samma vatten använder om och om igen!" },
          
          { type: "heading", content: "Regnbågar - Ljusets Magi" },
          { type: "text", content: "En regnbåge uppstår när solljus passerar genom regndroppar i luften. Ljuset böjs och delas upp i alla sina färger när det går genom dropparna. Det är därför vi ser en båge med rött, orange, gult, grönt, blått, indigo och violett. För att se en regnbåge måste solen vara bakom dig och regnet framför dig. Ibland kan man till och med se två regnbågar samtidigt! Regnbågar är egentligen hela cirklar, men vi ser oftast bara hälften eftersom marken är i vägen." },
          
          { type: "heading", content: "Åska och Blixt" },
          { type: "text", content: "Åskväder uppstår i höga cumulonimbusmoln där det finns starka uppvindar. I dessa moln bildas elektriska laddningar när is och vattendroppar kolliderar. När laddningen blir tillräckligt stor urladdas den som en blixt. En blixt kan vara fem gånger varmare än solens yta! Ljud färdas långsammare än ljus, så vi ser blixten först och hör åsksmällen efteråt. Genom att räkna sekunderna mellan blixten och åskan kan du räkna ut hur långt borta åskan är - tre sekunder för varje kilometer." },
          
          { type: "heading", content: "Vind - Luften i Rörelse" },
          { type: "text", content: "Vind uppstår när luften rör sig från ett ställe till ett annat. Detta händer för att solen värmer upp olika delar av jorden olika mycket. Varm luft stiger upp och kallare luft strömmar in för att fylla platsen - det är vinden vi känner. Vinden kan vara svag som en lätt bris eller stark som en storm. Vindar har olika namn beroende på hur starka de är. En orkan är en mycket stark storm med vindar över 118 kilometer i timmen. Vinden hjälper också till att sprida växtfrön och kyler oss när det är varmt!" },
          
          { type: "heading", content: "Årstider och Väder" },
          { type: "text", content: "Årstiderna påverkar vädret vi har. På sommaren är solen högre på himlen och värmer mer, så det blir varmt väder. På vintern står solen lågt och värmer mindre, så det blir kallt. På våren blir det varmare och växterna börjar växa. På hösten blir det kallare och träden tappar sina löv. Olika delar av världen har olika väder och årstider. Nära ekvatorn är det varmt hela året, medan det på polerna är kallt året runt." },
          
          { type: "heading", content: "Hur Väder Påverkar Oss" },
          { type: "text", content: "Vädret påverkar vårt liv på många sätt. Vi klär oss olika beroende på om det är varmt eller kallt, soligt eller regnigt. Bönder behöver regn för att få sina grödor att växa, men för mycket regn kan orsaka översvämningar. Solsken gör oss glada och hjälper kroppen att tillverka D-vitamin. Meteorologer studerar vädret för att kunna varna oss för farligt väder som stormar eller värmeböljor. Genom att förstå vädret kan vi förbereda oss och hålla oss säkra!" },
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
        estimatedMinutes: 10,
        content: [
          { type: "heading", content: "Växternas Superkraft" },
          { type: "text", content: "Växter har en fantastisk förmåga som ingen människa eller djur har - de kan göra sin egen mat! Denna process kallas fotosyntes och är en av naturens största underverk. Växter behöver bara tre saker för att göra mat: solljus, vatten och koldioxid från luften. Med hjälp av dessa enkla ingredienser skapar växterna socker som de använder som energi. Detta är anledningen till att växter kan stå still på samma plats hela sitt liv och inte behöver jaga mat som djur gör." },
          
          { type: "heading", content: "Hur Fotosyntes Fungerar" },
          { type: "text", content: "Fotosyntesen sker i växternas gröna löv. Löven innehåller små fabriker som kallas kloroplaster där magin händer. Först tar rötterna upp vatten från jorden och transporterar det upp genom stammen till löven. Samtidigt tar löven in koldioxid från luften genom små hål som kallas klyvöppningar. När solljuset träffar löven startar fotosyntesen. Ljusenergin används för att kombinera vatten och koldioxid till socker. Som en bonus släpper växten ut syre som vi andas!" },
          
          { type: "heading", content: "Klorofyll - Det Gröna Ämnet" },
          { type: "text", content: "Löven är gröna på grund av ett ämne som heter klorofyll. Klorofyll är som solpaneler för växterna - det fångar upp solljusets energi. Klorofyllen absorberar rött och blått ljus men reflekterar grönt ljus, därför ser löven gröna ut för våra ögon. Ju mer klorofyll ett löv har, desto mörkare grönt är det. Klorofyllen är den viktigaste substansen för fotosyntesen. Utan den kunde växter inte tillverka sin mat och skulle dö!" },
          
          { type: "heading", content: "Växter Ger Oss Syre" },
          { type: "text", content: "När växter gör fotosyntes släpper de ut syre som en biprodukt. Detta syre är samma gas som vi människor och alla djur behöver för att andas! Ett enda stort träd kan producera tillräckligt med syre för två människor under ett helt år. Faktiskt kommer nästan allt syre i vår atmosfär från växter och alger i havet. Växter är som jordens lungor - de renar luften och ger oss det syre vi behöver för att leva. Det är därför det är så viktigt att ta hand om träden och skogarna!" },
          
          { type: "heading", content: "Växternas Delar och Deras Uppgifter" },
          { type: "text", content: "Varje del av en växt har sitt speciella jobb. Rötterna suger upp vatten och näringsämnen från jorden och håller växten fast. Stammen eller stjälken transporterar vatten och näring mellan rötterna och löven. Löven är där fotosyntesen sker och maten tillverkas. Blommor hjälper växten att föröka sig genom att locka till sig bin och fjärilar. Frön sprids sedan för att skapa nya växter. Alla delar arbetar tillsammans som ett lag för att hålla växten frisk och stark!" },
          
          { type: "heading", content: "Varför Löven Byter Färg på Hösten" },
          { type: "text", content: "På hösten händer något magiskt med lövträden - löven byter färg från grönt till gult, orange och rött! Detta händer för att trädet förbereder sig för vintern. När det blir kallare och dagarna kortare slutar trädet att tillverka klorofyll. När det gröna klorofyllet försvinner kan vi se andra färger som varit gömda hela tiden. Gult och orange kommer från karotenoider, och rött kommer från antocyaniner. Till slut faller löven av för att trädet ska spara energi under vintern. På våren växer nya gröna löv ut igen!" },
          
          { type: "heading", content: "Växter Renar Luften" },
          { type: "text", content: "Förutom att ge oss syre hjälper växter till att rena luften på andra sätt också. De tar upp koldioxid som är en växthusgas och hjälper därmed till att bromsa klimatförändringarna. Växter kan också filtrera bort föroreningar och damm från luften. I städer med många träd och parker är luften renare och friskare. Inomhusväxter kan till och med rena luften i våra hem. Växter är som naturens egen luftrenare - de gör vår luft bättre att andas!" },
          
          { type: "heading", content: "Hur Växter Växer" },
          { type: "text", content: "Växter växer genom att deras celler delar sig och blir fler. Detta händer framför allt i växande delar som rot spetsar, skott och knoppar. När en växt får tillräckligt med solljus, vatten och näringsämnen växer den större och starkare. Sockret som tillverkas vid fotosyntesen används som energi för tillväxt. Vissa växter som bamboo kan växa upp till en meter på bara ett dygn! Träd växer både uppåt och utåt, och blir tjockare för varje år. Om du sågar av ett träd kan du se ringar som visar hur gammalt det är." },
          
          { type: "heading", content: "Växter som Mat" },
          { type: "text", content: "Växter är grunden för all mat på jorden. Vi äter växter direkt som frukt, grönsaker och spannmål. Djur som vi får kött och mjölk från äter också växter. Utan växter skulle det inte finnas någon mat alls! Olika delar av växterna är ätbara - vi äter löv (sallad), rötter (morötter), frön (ris), frukt (äpplen) och till och med blommor (broccoli är faktiskt en blomma!). Sockret som växterna tillverkar vid fotosyntes är det som ger frukter deras söta smak. Allt vi äter började med solljus och fotosyntes!" },
          
          { type: "heading", content: "Skydda Våra Växter" },
          { type: "text", content: "Växter är livsviktiga för allt liv på jorden, så vi måste ta hand om dem. Skogar täcker en stor del av jorden och är hem för många djur. Men många skogar huggs ner för att göra plats för jordbruk och städer. Vi kan hjälpa till genom att plantera träd, ta hand om växter i vår trädgård och stödja skydd av naturen. Även att återvinna papper hjälper, för då behöver färre träd huggas ner. Växter har tagit hand om oss i miljoner år - nu är det vår tur att ta hand om dem!" },
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

