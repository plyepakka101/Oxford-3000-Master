
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeminiWordResponse, WordDetail } from "../types";

const APP_CACHE_NAME = 'oxford-3000-master-cache-v7';

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
 * ดึงรายละเอียดคำศัพท์พร้อมใช้ Google Search หาตัวอย่างประโยค
 */
export const getWordDetails = async (word: string): Promise<WordDetail | null> => {
  const normalizedWord = word.toLowerCase().trim();
  const cacheKey = `https://api.local/word-details/${normalizedWord}`;
  
  try {
    const cache = await caches.open(APP_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      try {
        const data = await cachedResponse.json();
        return data;
      } catch (e) {
        console.warn("Cached data corrupt...");
      }
    }

    if (!navigator.onLine) return null;

    const apiKey = getValidApiKey();
    if (!apiKey) throw new Error("MISSING_API_KEY");

    const ai = new GoogleGenAI({ apiKey });
    // ใช้ Google Search เพื่อหาตัวอย่างประโยคตามคำที่ผู้ใช้ระบุ
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Provide dictionary details for "${normalizedWord}". Use Google Search to find high-quality English and Thai example sentences using the search term: "ตัวอย่างประโยค ${normalizedWord}".`,
      config: {
        systemInstruction: "You are an expert English-Thai lexicographer. Return ONLY a valid JSON object. For examples, use real-world results found via Google Search.",
        tools: [{ googleSearch: {} }],
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

    const jsonData = JSON.parse(extractJSON(text));
    
    // สกัดแหล่งที่มาจาก Grounding Metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri,
      title: chunk.web?.title
    })).filter((s: any) => s.uri) || [];

    const finalData: WordDetail = {
      word: normalizedWord,
      ...jsonData,
      sources: sources.slice(0, 3) // เก็บ 3 แหล่งอ้างอิงแรก
    };
    
    await cache.put(cacheKey, new Response(JSON.stringify(finalData), {
      headers: { 'Content-Type': 'application/json' }
    }));

    return finalData;
  } catch (error: any) {
    console.error("Gemini Error:", error);
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
