import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type CacheType = "audio" | "image";

export type CacheEntry = {
  id: string;
  cache_key: string;
  content_type: CacheType;
  topic_id: string;
  lesson_id: string;
  content_index: number;
  content_hash: string;
  storage_bucket: string;
  storage_path: string;
  public_url: string;
  file_size?: number;
  mime_type?: string;
  provider?: string;
  generation_params?: Record<string, unknown>;
  created_at: string;
  last_accessed_at: string;
  access_count: number;
};

/**
 * Simple hash function for cache keys (works in Edge runtime)
 * Uses a basic hash algorithm instead of crypto module
 */
export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to hex and take first 12 characters
  return Math.abs(hash).toString(16).padStart(12, '0').substring(0, 12);
}

/**
 * Generate cache key for content
 */
export function generateCacheKey(
  type: CacheType,
  topicId: string,
  lessonId: string,
  contentIndex: number,
  contentHash: string
): string {
  return `${type}/${topicId}/${lessonId}/${contentIndex}_${contentHash}`;
}

/**
 * Generate storage path for file
 */
export function generateStoragePath(
  topicId: string,
  lessonId: string,
  contentIndex: number,
  contentHash: string,
  extension: string
): string {
  return `${topicId}/${lessonId}/${contentIndex}_${contentHash}.${extension}`;
}

/**
 * Check if content is cached and return cache entry
 */
export async function getCachedContent(
  type: CacheType,
  topicId: string,
  lessonId: string,
  contentIndex: number,
  sourceContent: string
): Promise<CacheEntry | null> {
  const supabase = createSupabaseAdminClient();
  const hash = hashContent(sourceContent);
  const cacheKey = generateCacheKey(type, topicId, lessonId, contentIndex, hash);

  const { data, error } = await supabase
    .from("content_cache")
    .select("*")
    .eq("cache_key", cacheKey)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return null;
  }

  // Update access stats (fire and forget)
  void supabase
    .from("content_cache")
    .update({
      last_accessed_at: new Date().toISOString(),
      access_count: (data.access_count || 0) + 1,
    })
    .eq("id", data.id);

  return data as CacheEntry;
}

/**
 * Store generated content in cache
 */
export async function storeCachedContent(
  type: CacheType,
  topicId: string,
  lessonId: string,
  contentIndex: number,
  sourceContent: string,
  fileBlob: Blob,
  options: {
    provider?: string;
    generationParams?: Record<string, unknown>;
    mimeType?: string;
  } = {}
): Promise<CacheEntry | null> {
  const supabase = createSupabaseAdminClient();
  const hash = hashContent(sourceContent);
  const cacheKey = generateCacheKey(type, topicId, lessonId, contentIndex, hash);

  // Determine bucket and file extension
  const bucket = type === "audio" ? "lesson-audio" : "lesson-images";
  const extension = type === "audio" ? "mp3" : "png";
  const storagePath = generateStoragePath(topicId, lessonId, contentIndex, hash, extension);

  try {
    // Upload to Supabase Storage
    const { data: _uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBlob, {
        contentType: options.mimeType || (type === "audio" ? "audio/mpeg" : "image/png"),
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.error("[Cache] Upload error:", uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Store metadata in database
    const cacheEntry: Partial<CacheEntry> = {
      cache_key: cacheKey,
      content_type: type,
      topic_id: topicId,
      lesson_id: lessonId,
      content_index: contentIndex,
      content_hash: hash,
      storage_bucket: bucket,
      storage_path: storagePath,
      public_url: publicUrl,
      file_size: fileBlob.size,
      mime_type: options.mimeType || (type === "audio" ? "audio/mpeg" : "image/png"),
      provider: options.provider,
      generation_params: options.generationParams,
    };

    const { data: dbData, error: dbError } = await supabase
      .from("content_cache")
      .upsert(cacheEntry, { onConflict: "cache_key" })
      .select()
      .single();

    if (dbError) {
      console.error("[Cache] DB error:", dbError);
      return null;
    }

    return dbData as CacheEntry;
  } catch (error) {
    console.error("[Cache] Store error:", error);
    return null;
  }
}

/**
 * Get all cached content for a lesson
 */
export async function getLessonCache(
  topicId: string,
  lessonId: string
): Promise<CacheEntry[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("content_cache")
    .select("*")
    .eq("topic_id", topicId)
    .eq("lesson_id", lessonId)
    .is("deleted_at", null)
    .order("content_index", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as CacheEntry[];
}

/**
 * Delete cached content (soft delete)
 */
export async function deleteCachedContent(cacheKey: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("content_cache")
    .update({ deleted_at: new Date().toISOString() })
    .eq("cache_key", cacheKey);

  return !error;
}

/**
 * Clear entire cache for a lesson
 */
export async function clearLessonCache(
  topicId: string,
  lessonId: string
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("content_cache")
    .update({ deleted_at: new Date().toISOString() })
    .eq("topic_id", topicId)
    .eq("lesson_id", lessonId)
    .is("deleted_at", null);

  return !error;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalAudio: number;
  totalImages: number;
  totalSize: number;
  mostAccessed: CacheEntry[];
}> {
  const supabase = createSupabaseAdminClient();

  const { data: audioData } = await supabase
    .from("content_cache")
    .select("file_size")
    .eq("content_type", "audio")
    .is("deleted_at", null);

  const { data: imageData } = await supabase
    .from("content_cache")
    .select("file_size")
    .eq("content_type", "image")
    .is("deleted_at", null);

  const { data: mostAccessed } = await supabase
    .from("content_cache")
    .select("*")
    .is("deleted_at", null)
    .order("access_count", { ascending: false })
    .limit(10);

  const totalSize =
    [...(audioData || []), ...(imageData || [])].reduce(
      (sum, item) => sum + (item.file_size || 0),
      0
    );

  return {
    totalAudio: audioData?.length || 0,
    totalImages: imageData?.length || 0,
    totalSize,
    mostAccessed: (mostAccessed || []) as CacheEntry[],
  };
}

