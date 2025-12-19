
import { GoogleGenAI, Modality } from "@google/genai";
import { WordDetail } from "../types";

// Versioned cache name to handle updates and clear old data
const APP_CACHE_NAME = 'oxford-3000-audio-cache-v1';

const getValidApiKey = (): string | null => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === '' || apiKey === 'null') {
    return null;
  }
  return apiKey;
};

/**
 * Fetches detailed word information using Gemini with Google Search grounding.
 */
export const getWordDetails = async (word: string): Promise<WordDetail | null> => {
  const normalizedWord = word.toLowerCase().trim();
  const safeKey = encodeURIComponent(normalizedWord);
  const cacheKey = `https://api.local/word-details/${safeKey}`;
  
  try {
    const cache = await caches.open(APP_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      return await cachedResponse.json();
    }

    if (!navigator.onLine) return null;

    const apiKey = getValidApiKey();
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Search Google for "English word meaning and example: ${normalizedWord}" and extract details. 
      Format your response exactly like this:
      TRANSLATION: [Thai translation]
      PHONETIC: [Phonetic spelling]
      POS_EN: [Part of speech in English]
      POS_TH: [Part of speech in Thai]
      EX_EN: [English example sentence]
      EX_TH: [Thai translation of that example]
      LEVEL: [Oxford level A1, A2, B1, B2, or C1]`,
      config: {
        systemInstruction: "You are an Oxford Dictionary Expert using Google Search. Provide accurate, grounded information for language learners.",
        tools: [{ googleSearch: {} }]
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const extract = (key: string) => {
      const regex = new RegExp(`${key}:\\s*(.*)`, 'i');
      const match = text.match(regex);
      return match ? match[1].trim() : "";
    };

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri,
      title: chunk.web?.title
    })).filter((s: any) => s.uri) || [];

    const finalData: WordDetail = {
      word: normalizedWord,
      thaiTranslation: extract("TRANSLATION"),
      phonetic: extract("PHONETIC"),
      partOfSpeech: extract("POS_EN"),
      partOfSpeechThai: extract("POS_TH"),
      exampleEnglish: extract("EX_EN"),
      exampleThai: extract("EX_TH"),
      level: extract("LEVEL") || "A1",
      sources: sources.slice(0, 3)
    };

    if (finalData.thaiTranslation) {
      await cache.put(cacheKey, new Response(JSON.stringify(finalData), {
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    return finalData;
  } catch (error: any) {
    console.error("Gemini Details Error:", error);
    return null;
  }
};

/**
 * Fetches audio for a word or sentence, utilizing Cache API for persistent storage.
 * Improved to handle sentences safely as cache keys.
 */
export const fetchWordAudioBuffer = async (text: string, audioContext: AudioContext): Promise<AudioBuffer | null> => {
  const normalizedText = text.toLowerCase().trim();
  // Using encodeURIComponent to safely use full sentences in the cache key URL
  const safeKey = encodeURIComponent(normalizedText);
  const cacheKey = `https://api.local/word-audio/${safeKey}`;

  try {
    const cache = await caches.open(APP_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);

    // 1. Check if audio for the given text is already in the cache
    if (cachedResponse) {
      console.log(`[Audio Cache] Hit: ${normalizedText.substring(0, 20)}...`);
      const arrayBuffer = await cachedResponse.arrayBuffer();
      // The cached data is raw PCM from the previous put
      return await decodeAudioData(new Uint8Array(arrayBuffer), audioContext, 24000, 1);
    }

    if (!navigator.onLine) return null;

    const apiKey = getValidApiKey();
    if (!apiKey) return null;

    // 2. Fetch from Gemini API if not in cache
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: normalizedText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { 
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } 
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioData = decode(base64Audio);

      // 3. Store the raw audio data in the cache using caches.put
      // We store the raw bytes so we can reconstruct the AudioBuffer on cache hits
      await cache.put(cacheKey, new Response(audioData, {
        headers: { 
          'Content-Type': 'audio/pcm',
          'X-Original-Text': safeKey // Useful for debugging in DevTools
        }
      }));

      // 4. Return decoded buffer for immediate playback
      return await decodeAudioData(audioData, audioContext, 24000, 1);
    }
  } catch (error) {
    console.error("Audio Fetch/Cache Error:", error);
  }
  return null;
};

/**
 * Decodes base64 string to Uint8Array
 */
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts raw PCM bytes into an AudioBuffer usable by Web Audio API
 */
async function decodeAudioData(
  data: Uint8Array, 
  ctx: AudioContext, 
  sampleRate: number, 
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize Int16 PCM to Float32 [-1, 1]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
