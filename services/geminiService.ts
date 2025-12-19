
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeminiWordResponse } from "../types";

// ใช้ชื่อ Cache เดิมเพื่อให้ข้อมูลที่เคยเก็บไว้ยังอยู่
const APP_CACHE_NAME = 'oxford-3000-master-cache-v6';

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

const getValidApiKey = (): string | null => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === '' || apiKey === 'null') {
    return null;
  }
  return apiKey;
};

/**
 * ดึงรายละเอียดคำศัพท์
 * 1. เช็ค Cache ก่อน (ความเร็วสูงสุด)
 * 2. ถ้าไม่มีใน Cache และ Online ให้ดึงจาก AI และบันทึกลง Cache
 */
export const getWordDetails = async (word: string): Promise<GeminiWordResponse | null> => {
  const normalizedWord = word.toLowerCase().trim();
  const cacheKey = `https://api.local/word-details/${normalizedWord}`;
  
  try {
    const cache = await caches.open(APP_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);

    // ถ้ามีใน Cache แล้ว คืนค่าทันทีเพื่อให้แอป "เร็วเหมือน Native"
    if (cachedResponse) {
      try {
        const data = await cachedResponse.json();
        return data;
      } catch (e) {
        console.warn("Cached data corrupt...");
      }
    }

    // ถ้าไม่มีใน Cache และ Offline อยู่ จะคืนค่า null เพื่อให้ UI ใช้ Fallback
    if (!navigator.onLine) return null;

    const apiKey = getValidApiKey();
    if (!apiKey) throw new Error("MISSING_API_KEY");

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Provide dictionary details for "${normalizedWord}" based on Oxford 3000 standards.`,
      config: {
        systemInstruction: "You are an Oxford English-Thai Dictionary. Return ONLY valid JSON. Ensure level matches Oxford 3000 (A1-C1).",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            thaiTranslation: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            partOfSpeechThai: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            exampleEnglish: { type: Type.STRING },
            exampleThai: { type: Type.STRING },
            level: { type: Type.STRING },
          },
          required: ["thaiTranslation", "partOfSpeech", "partOfSpeechThai", "phonetic", "exampleEnglish", "exampleThai", "level"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(extractJSON(text));
    
    // บันทึกลง Cache สำหรับการเปิดครั้งหน้า
    await cache.put(cacheKey, new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    }));

    return data;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return null;
  }
};

/**
 * ดึงไฟล์เสียง
 * 1. เช็คใน Cache ก่อน (เล่นได้ทันทีแม้ไม่มีเน็ต)
 * 2. ถ้าไม่มีและ Online ให้เจนเนอเรทใหม่และบันทึกลง Cache
 */
export const fetchWordAudioBuffer = async (text: string, audioContext: AudioContext): Promise<AudioBuffer | null> => {
  const normalizedText = text.toLowerCase().trim();
  const cacheKey = `https://api.local/word-audio/${normalizedText}`;

  try {
    const cache = await caches.open(APP_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      const arrayBuffer = await cachedResponse.arrayBuffer();
      return await decodeAudioData(new Uint8Array(arrayBuffer), audioContext, 24000, 1);
    }

    if (!navigator.onLine) return null;

    const apiKey = getValidApiKey();
    if (!apiKey) return null;

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
      // เก็บเสียงดิบลง Cache
      await cache.put(cacheKey, new Response(audioData, {
        headers: { 'Content-Type': 'audio/pcm' }
      }));
      return await decodeAudioData(audioData, audioContext, 24000, 1);
    }
  } catch (error) {
    console.error("Audio failed:", error);
  }
  return null;
};

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
