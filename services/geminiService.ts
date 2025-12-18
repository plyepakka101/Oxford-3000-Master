
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeminiWordResponse } from "../types";

const APP_CACHE_NAME = 'oxford-3000-master-cache-v1';

/**
 * สกัดเฉพาะส่วนที่เป็น JSON string ออกจากข้อความที่ AI ตอบกลับ
 * ป้องกันกรณี AI ใส่ Markdown backticks มาให้
 */
function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

export const getWordDetails = async (word: string): Promise<GeminiWordResponse | null> => {
  const normalizedWord = word.toLowerCase().trim();
  const cacheKey = `https://api.local/word-details/${normalizedWord}`;
  
  try {
    const cache = await caches.open(APP_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      try {
        return await cachedResponse.json();
      } catch (e) {
        console.warn("Cached data invalid, fetching fresh data...");
      }
    }

    if (!navigator.onLine) throw new Error("Offline");

    const apiKey = process.env.API_KEY;
    // ตรวจสอบทั้งการมีอยู่และค่าที่เป็นสตริง "undefined" ที่อาจเกิดจาก Vite build
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      console.error("Gemini API Key is missing or invalid.");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide details for "${normalizedWord}" based on Oxford 3000 standards.`,
      config: {
        systemInstruction: "You are an Oxford Dictionary Expert. Return ONLY valid JSON including: thaiTranslation, partOfSpeech (English), partOfSpeechThai, phonetic, exampleEnglish, exampleThai, and level (A1, A2, B1, or B2).",
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

    const cleanJson = extractJSON(text);
    const data = JSON.parse(cleanJson);
    
    // บันทึกเข้า Cache
    await cache.put(cacheKey, new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    }));

    return data;
  } catch (error) {
    console.error("Error in getWordDetails:", error);
    return null;
  }
};

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

    const apiKey = process.env.API_KEY;
    if (apiKey && apiKey !== 'undefined') {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: normalizedText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { 
            voiceConfig: { 
              prebuiltVoiceConfig: { voiceName: 'Kore' } 
            } 
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioData = decodeBase64(base64Audio);
        const audioBlob = new Blob([audioData.buffer], { type: 'audio/pcm' });
        await cache.put(cacheKey, new Response(audioBlob));
        return await decodeAudioData(audioData, audioContext, 24000, 1);
      }
    }
  } catch (error) {
    console.error("Error in fetchWordAudioBuffer:", error);
  }
  return null;
};

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
