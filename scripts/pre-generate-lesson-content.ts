/**
 * Pre-generate all lesson audio and images
 * 
 * This script generates and caches all audio narration and images for lessons,
 * so users get instant playback without waiting for API calls.
 * 
 * Usage:
 *   npx ts-node scripts/pre-generate-lesson-content.ts
 * 
 * Options:
 *   --audio-only: Only generate audio
 *   --images-only: Only generate images
 *   --topic=solar-system: Only generate for specific topic
 *   --lesson=planets-intro: Only generate for specific lesson
 */

import { EXPLORE_TOPICS, type Lesson, type LessonContent } from "../src/lib/explore/topics-data";
import { getCachedContent } from "../src/lib/cache/content-cache";

type GenerationStats = {
  totalAudio: number;
  totalImages: number;
  cachedAudio: number;
  cachedImages: number;
  generatedAudio: number;
  generatedImages: number;
  failedAudio: number;
  failedImages: number;
  totalCost: number;
};

const stats: GenerationStats = {
  totalAudio: 0,
  totalImages: 0,
  cachedAudio: 0,
  cachedImages: 0,
  generatedAudio: 0,
  generatedImages: 0,
  failedAudio: 0,
  failedImages: 0,
  totalCost: 0,
};

// Pricing (approximate)
const PRICING = {
  elevenlabs: 0.30 / 1000, // $0.30 per 1K characters
  dalle3: 0.040, // $0.04 per image (standard quality)
};

async function generateAudio(
  topicId: string,
  lessonId: string,
  contentIndex: number,
  text: string
): Promise<boolean> {
  try {
    // Check if cached
    const cached = await getCachedContent("audio", topicId, lessonId, contentIndex, text);
    if (cached) {
      stats.cachedAudio++;
      console.log(`  ✓ Audio ${contentIndex} (cached)`);
      return true;
    }

    // Generate
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/tts-cached`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        provider: "elevenlabs",
        format: "mp3",
        topicId,
        lessonId,
        contentIndex,
      }),
    });

    if (response.ok) {
      stats.generatedAudio++;
      stats.totalCost += (text.length * PRICING.elevenlabs);
      console.log(`  ✓ Audio ${contentIndex} (generated) - ${text.length} chars`);
      return true;
    } else {
      stats.failedAudio++;
      console.error(`  ✗ Audio ${contentIndex} failed:`, response.status);
      return false;
    }
  } catch (error) {
    stats.failedAudio++;
    console.error(`  ✗ Audio ${contentIndex} error:`, error);
    return false;
  }
}

async function generateImage(
  topicId: string,
  lessonId: string,
  contentIndex: number,
  prompt: string
): Promise<boolean> {
  try {
    // Check if cached
    const cached = await getCachedContent("image", topicId, lessonId, contentIndex, prompt);
    if (cached) {
      stats.cachedImages++;
      console.log(`  ✓ Image ${contentIndex} (cached)`);
      return true;
    }

    // Generate
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/explore/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        topicId,
        lessonId,
        contentIndex,
      }),
    });

    if (response.ok) {
      stats.generatedImages++;
      stats.totalCost += PRICING.dalle3;
      console.log(`  ✓ Image ${contentIndex} (generated)`);
      return true;
    } else {
      stats.failedImages++;
      console.error(`  ✗ Image ${contentIndex} failed:`, response.status);
      return false;
    }
  } catch (error) {
    stats.failedImages++;
    console.error(`  ✗ Image ${contentIndex} error:`, error);
    return false;
  }
}

function getTextFromContent(content: LessonContent): string | null {
  if (content.type === "heading") return content.content;
  if (content.type === "text") return content.content;
  if (content.type === "fact") return "Visste du att... " + content.content;
  if (content.type === "question") return content.question;
  if (content.type === "activity") return `Aktivitet: ${content.title}. ${content.description}`;
  return null;
}

async function generateLessonContent(
  topicId: string,
  lessonId: string,
  lesson: Lesson,
  options: { audioOnly?: boolean; imagesOnly?: boolean }
) {
  console.log(`\n📖 ${lesson.title}`);
  
  for (let i = 0; i < lesson.content.length; i++) {
    const content = lesson.content[i];

    // Generate audio for text content
    if (!options.imagesOnly) {
      const text = getTextFromContent(content);
      if (text) {
        stats.totalAudio++;
        await generateAudio(topicId, lessonId, i, text);
        // Rate limit: wait 100ms between requests
        await new Promise(r => setTimeout(r, 100));
      }
    }

    // Generate images
    if (!options.audioOnly && content.type === "image") {
      stats.totalImages++;
      await generateImage(topicId, lessonId, i, content.prompt);
      // Rate limit: wait 1s between image generations
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    audioOnly: args.includes("--audio-only"),
    imagesOnly: args.includes("--images-only"),
    topicFilter: args.find(a => a.startsWith("--topic="))?.split("=")[1],
    lessonFilter: args.find(a => a.startsWith("--lesson="))?.split("=")[1],
  };

  console.log("🚀 Pre-generating lesson content...\n");
  console.log("Options:", options);

  for (const topic of EXPLORE_TOPICS) {
    if (options.topicFilter && topic.id !== options.topicFilter) continue;

    console.log(`\n${topic.icon} ${topic.title}`);
    
    for (const lesson of topic.lessons) {
      if (options.lessonFilter && lesson.id !== options.lessonFilter) continue;

      await generateLessonContent(topic.id, lesson.id, lesson, options);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 GENERATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Audio:`);
  console.log(`  Total:     ${stats.totalAudio}`);
  console.log(`  Cached:    ${stats.cachedAudio} ✓`);
  console.log(`  Generated: ${stats.generatedAudio} 🆕`);
  console.log(`  Failed:    ${stats.failedAudio} ✗`);
  console.log();
  console.log(`Images:`);
  console.log(`  Total:     ${stats.totalImages}`);
  console.log(`  Cached:    ${stats.cachedImages} ✓`);
  console.log(`  Generated: ${stats.generatedImages} 🆕`);
  console.log(`  Failed:    ${stats.failedImages} ✗`);
  console.log();
  console.log(`Estimated Cost: $${stats.totalCost.toFixed(2)}`);
  console.log("=".repeat(60));

  if (stats.failedAudio + stats.failedImages > 0) {
    console.log("\n⚠️  Some generations failed. Check logs above.");
    process.exit(1);
  } else {
    console.log("\n✅ All content generated successfully!");
  }
}

main().catch(console.error);









