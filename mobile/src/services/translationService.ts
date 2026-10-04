/**
 * translationService.ts
 * High-performance, zero-lag translator utility for NatureSync.
 * Translates AI Agent responses into natural Malayalam for Kerala farmers.
 * Features in-memory caching, paragraph-aware chunking, and dual-engine fallback.
 */

import apiClient from '../api/client';

// In-memory cache to guarantee 0ms instant toggle once translated
const translationCache = new Map<string, string>();

/** Simple hash generator for cache keys */
function getCacheKey(text: string, targetLang: string): string {
  return `${targetLang}_${text.trim()}`;
}

/**
 * Translates a single chunk of text using Google Translate GTX endpoint.
 */
async function translateChunkWithGoogle(text: string, targetLang = 'ml'): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Google translate returned status ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0].map((item: any) => item[0]).join('');
      return translated || text;
    }
    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fallback translation using the backend /agent/translate endpoint.
 */
async function translateWithBackend(text: string, targetLang = 'ml'): Promise<string> {
  const res = await apiClient.post<{ translated_text: string; target_lang: string }>(
    '/agent/translate',
    {
      text,
      target_lang: targetLang,
      source_lang: 'en',
    },
    { timeout: 15000 }
  );
  return res.data?.translated_text || text;
}

/**
 * Main translation entry point.
 * Translates markdown text to Malayalam while preserving formatting.
 */
export async function translateToMalayalam(text: string): Promise<string> {
  if (!text || !text.trim()) return '';

  const cacheKey = getCacheKey(text, 'ml');
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // If text is short enough (< 1200 chars), translate in one shot
  if (text.length <= 1200) {
    try {
      const result = await translateChunkWithGoogle(text, 'ml');
      translationCache.set(cacheKey, result);
      return result;
    } catch {
      // Fallback to backend
      try {
        const backendResult = await translateWithBackend(text, 'ml');
        translationCache.set(cacheKey, backendResult);
        return backendResult;
      } catch (err) {
        console.warn('Translation failed on both engines:', err);
        throw new Error('Translation service currently unavailable. Please try again.');
      }
    }
  }

  // For longer multi-paragraph responses, split by paragraph to preserve markdown & prevent truncation
  const paragraphs = text.split('\n\n');
  const translatedParagraphs: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      translatedParagraphs.push('');
      continue;
    }

    // Don't translate table separator lines like |---|---|
    if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
      translatedParagraphs.push(para);
      continue;
    }

    try {
      const trans = await translateChunkWithGoogle(trimmed, 'ml');
      translatedParagraphs.push(trans);
    } catch {
      try {
        const transBack = await translateWithBackend(trimmed, 'ml');
        translatedParagraphs.push(transBack);
      } catch {
        translatedParagraphs.push(trimmed); // fallback to original chunk
      }
    }
  }

  const finalResult = translatedParagraphs.join('\n\n');
  translationCache.set(cacheKey, finalResult);
  return finalResult;
}

/**
 * Clears the memory cache if needed.
 */
export function clearTranslationCache() {
  translationCache.clear();
}
