# Language Guidelines Implementation Summary

## Overview
All AI prompts in Xplore now include explicit instructions to use age-appropriate language and explain advanced/technical terms.

---

## ✅ Updated Prompts

### 1. Explore Mode - "Berätta mer" (Tell More)
**File:** `src/app/api/explore/ai-assist/route.ts`

**Added Section:**
```
SPRÅKANPASSNING:
- Du får använda avancerade/tekniska ord (som "ekolokalisering", "fotosyntesen", "gravitation")
- Men FÖRKLARA ALLTID sådana ord direkt i samma mening
- Exempel: "Fladdermössen använder ekolokalisering - de skickar ut ljud och lyssnar på ekot för att hitta i mörkret"
- För ${ageGroup}: Använd ord de kan förstå, men introducera gärna nya begrepp med tydliga förklaringar
```

**Effect:**
- Technical terms will be introduced naturally
- Immediate explanations in the same or next sentence
- Builds vocabulary while maintaining comprehension
- Adapts to age group (4-6 år, 7-9 år, 10-12 år)

---

### 2. Explore Mode - "Ställ en fråga" (Ask Question)
**File:** `src/app/api/explore/ai-assist/route.ts`

**Added Section:**
```
SPRÅKANPASSNING:
- Du får använda tekniska/avancerade ord när det passar
- Men FÖRKLARA ALLTID dem direkt: "Ekolokalisering betyder att man använder ljud för att hitta saker"
- Introducera nya begrepp på ett naturligt sätt som passar ${ageGroup}
- Bygg på barnets ordförråd samtidigt som du gör det begripligt
```

**Effect:**
- Question answers will use appropriate vocabulary
- New terms are explained immediately
- Encourages vocabulary building
- Age-appropriate explanations

---

### 3. Chat Mode - Main System Message
**File:** `src/lib/system/XploreSystemMessage.ts`

**Added Section:**
```
Språk och ordval:
- Du får gärna använda avancerade eller tekniska ord när det berikar samtalet
- Men FÖRKLARA ALLTID nya/svåra ord direkt i samma mening eller nästa
- Exempel: "Fladdermöss använder ekolokalisering – det betyder att de skickar ut ljud och lyssnar på ekot"
- Bygg på barnets ordförråd samtidigt som allt är begripligt
```

**Effect:**
- Chat conversations can introduce advanced concepts
- Natural vocabulary building through conversation
- Immediate explanations prevent confusion
- Educational without being condescending

---

## 🎯 Examples of Expected Behavior

### Before Language Guidelines:
**Bad response:**
"Fladdermöss använder ekolokalisering för att navigera i mörkret."
*(Child might not understand "ekolokalisering")*

### After Language Guidelines:
**Good response:**
"Fladdermöss använder ekolokalisering - de skickar ut höga ljud och lyssnar på ekot som studsar tillbaka. Precis som när du ropar i en tunnel och hör ekot!"

---

## 📊 Age-Appropriate Complexity Levels

The system automatically adjusts based on profile age:

### 4-6 år (Young Children)
- Very simple explanations
- Many relatable comparisons
- Shorter sentences
- More basic vocabulary with gentle introduction of new terms

**Example:**
"Fotosyntesen är när växten äter solljus. Den använder ljuset för att göra mat, precis som du äter frukost!"

### 7-9 år (Middle Elementary)
- More detailed explanations
- Introduction of scientific terms with explanations
- Can handle slightly longer explanations
- Encourages curiosity about mechanisms

**Example:**
"Fotosyntesen är processprocessen där växter gör sin egen mat. De använder solljus, vatten och koldioxid (den luft vi andas ut) för att skapa socker som de äter. Det är som att ha en solpanel i varje löv!"

### 10-12 år (Upper Elementary)
- Technical terms introduced more freely
- Deeper explanations with more nuance
- Can discuss abstract concepts
- Building foundation for scientific literacy

**Example:**
"Fotosyntesen är en kemisk reaktion där klorofyll (det gröna i bladen) fångar solenergi. Växten kombinerar koldioxid från luften med vatten från rötterna och skapar glukos (socker) och syre. Reaktionen är: 6CO₂ + 6H₂O + ljusenergi → C₆H₁₂O₆ + 6O₂"

---

## ✅ Verification Checklist

- [x] **Explore "Berätta mer"** - Language guidelines added
- [x] **Explore "Ställ en fråga"** - Language guidelines added
- [x] **Chat system message** - Language guidelines added
- [x] **Age-appropriate adjustments** - Built into all prompts
- [x] **Examples provided** - Shows AI what good explanations look like
- [x] **No linter errors** - All code validated

---

## 🧪 Testing Recommendations

Before beta launch, test these scenarios:

1. **Young child (age 5) in Explore Mode**
   - Click "Berätta mer" on a science topic
   - Verify explanations are simple with good analogies

2. **Older child (age 10) in Explore Mode**
   - Click "Berätta mer" on same topic
   - Should get more technical detail but still explained

3. **Ask complex question in Chat**
   - Question: "Hur fungerar DNA?"
   - Response should introduce terms like "gener" and "kromosomer" but explain them

4. **Check consistency**
   - Same term should be explained first time used
   - Later uses can be more casual

---

## 📝 Content Creation Guidelines for Manual Content

When creating lessons in `topics-data.ts`:

### ✅ Good Example:
```
"Fladdermöss använder ekolokalisering - de skickar ut ljud och lyssnar på ekot - för att hitta vägen i mörkret."
```

### ❌ Bad Example:
```
"Fladdermöss använder ekolokalisering för att navigera." 
(No explanation provided)
```

### Recommended Pattern:
**[Technical term] - [simple explanation in same sentence/clause] - [additional context]**

Examples:
- "Dinosaurierna var kallblodiga - deras kroppstemperatur följde omgivningen - så de behövde solen för att bli varma."
- "Mars har en atmosfär - ett luftlager runt planeten - men den är mycket tunnare än jordens."
- "Hjärtat pumpar syresatt blod - blod fyllt med syre - till alla delar av kroppen."

---

## 🔄 Future Improvements

Potential enhancements for later versions:

1. **Vocabulary Tracking**
   - Track which terms a child has seen before
   - Don't re-explain already learned terms

2. **Progressive Complexity**
   - Start simple, gradually increase complexity over time
   - Adapt based on child's responses

3. **Glossary Feature**
   - Clickable terms that show definitions
   - "Word of the day" feature

4. **Parent Dashboard**
   - Show new vocabulary child has learned
   - Suggest related topics to explore

---

## Summary

All AI interactions in Xplore now follow these principles:

✅ **Use age-appropriate language for the current profile**  
✅ **Advanced terms are allowed and encouraged**  
✅ **Always explain technical/difficult terms immediately**  
✅ **Build vocabulary naturally through rich content**  
✅ **Maintain comprehension while introducing new concepts**

This creates an educational experience that challenges children appropriately while ensuring they understand everything they encounter.

