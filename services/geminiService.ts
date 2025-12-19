
import { GoogleGenAI, Modality } from "@google/genai";
import { WordDetail } from "../types";

const DATA_CACHE_NAME = 'oxford-3000-data-cache-v1';
const AUDIO_CACHE_NAME = 'oxford-3000-audio-cache-v1';

const getValidApiKey = (): string | null => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === '' || apiKey === 'null') {
    return null;
  }
  return apiKey;
};

/**
 * ดึงข้อมูลรายละเอียดคำศัพท์ ประโยคตัวอย่าง และคำแปล โดยใช้ Google Search grounding
 */
export const getWordExamples = async (word: string): Promise<WordDetail | null> => {
  const cacheKey = `https://api.local/word-details/${word.toLowerCase().trim()}`;
  
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      return await cachedResponse.json();
    }

    if (!navigator.onLine) return null;

    const apiKey = getValidApiKey();
    if (!apiKey) {
      console.warn("API Key is missing or invalid");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // ปรับ Prompt ให้เรียบง่ายและเน้นโครงสร้างที่ดึงข้อมูลง่าย
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide linguistic information for the word "${word}":
      1. Phonetic (e.g. /əbˈɪləti/)
      2. Part of Speech in English (e.g. Noun, Verb)
      3. Part of Speech in Thai (เช่น คำนาม, คำกริยา)
      4. One simple English example sentence
      5. Thai translation of that example sentence
      
      Search query: "meaning of ${word} with example sentence and thai translation"
      
      Format your response exactly like this:
      PHONETIC: [content]
      POS_EN: [content]
      POS_TH: [content]
      EXAMPLE_EN: [content]
      EXAMPLE_TH: [content]`,
      config: {
        systemInstruction: "You are an English-Thai dictionary expert. Provide accurate data based on current usage.",
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "";
    
    // ปรับ Regex ให้รองรับทั้งแบบมี ** (Markdown) และไม่มี
    const extract = (key: string) => {
      const regex = new RegExp(`(?:\\*\\*)?${key}(?:\\*\\*)?:?\\s*(.*)`, 'i');
      const match = text.match(regex);
      return match ? match[1].replace(/\*\*/g, '').trim() : "";
    };

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri,
      title: chunk.web?.title
    })).filter((s: any) => s.uri) || [];

    const wordDetail: WordDetail = {
      word: word,
      thaiTranslation: "", 
      phonetic: extract("PHONETIC"),
      partOfSpeech: extract("POS_EN"),
      partOfSpeechThai: extract("POS_TH"),
      exampleEnglish: extract("EXAMPLE_EN").replace(/^"|"$/g, ''),
      exampleThai: extract("EXAMPLE_TH").replace(/^"|"$/g, ''),
      level: "", 
      sources: sources.slice(0, 3)
    };

    // ตรวจสอบว่ามีข้อมูลพื้นฐานครบหรือไม่ก่อนบันทึก
    if (wordDetail.exampleEnglish) {
      await cache.put(cacheKey, new Response(JSON.stringify(wordDetail), {
        headers: { 'Content-Type': 'application/json' }
      }));
      return wordDetail;
    }
  } catch (error) {
    console.error("Error in getWordExamples:", error);
  }
  return null;
};

/**
 * ดึงเสียงอ่าน และเก็บไว้ใน Cache
 */
export const fetchWordAudioBuffer = async (text: string, audioContext: AudioContext): Promise<AudioBuffer | null> => {
  const normalizedText = text.toLowerCase().trim();
  const safeKey = encodeURIComponent(normalizedText);
  const cacheKey = `https://api.local/word-audio/${safeKey}`;

  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
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
    console.error("Audio Fetch Error:", error);
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
