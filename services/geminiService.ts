
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
 * และเก็บข้อมูลไว้ใน Cache เพื่อใช้งานแบบ Offline
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
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `ค้นหาข้อมูลคำศัพท์ภาษาอังกฤษคำว่า "${word}" ดังนี้:
      1. คำอ่าน (Phonetic spelling เช่น /haʊs/)
      2. ประเภทของคำ (Part of Speech เช่น Noun, Verb)
      3. ประเภทของคำแปลเป็นไทย (เช่น นาม, กริยา)
      4. ประโยคตัวอย่างภาษาอังกฤษที่ทันสมัย 1 ประโยค
      5. คำแปลของประโยคตัวอย่างนั้นเป็นภาษาไทย
      
      ใช้การค้นหา: "ตัวอย่างประโยค ${word} พร้อมคำแปล"
      
      ตอบกลับในรูปแบบนี้เท่านั้น:
      PHONETIC: [คำอ่าน]
      POS_EN: [ประเภทคำภาษาอังกฤษ]
      POS_TH: [ประเภทคำภาษาไทย]
      EXAMPLE_EN: [ประโยคภาษาอังกฤษ]
      EXAMPLE_TH: [คำแปลประโยคภาษาไทย]`,
      config: {
        systemInstruction: "คุณเป็นผู้ช่วยสอนภาษาอังกฤษที่เชี่ยวชาญ ค้นหาข้อมูลที่ถูกต้องที่สุดจาก Google Search",
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "";
    const extract = (key: string) => {
      const match = text.match(new RegExp(`${key}:\\s*(.*)`, 'i'));
      return match ? match[1].trim() : "";
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

    if (wordDetail.exampleEnglish) {
      await cache.put(cacheKey, new Response(JSON.stringify(wordDetail), {
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    return wordDetail;
  } catch (error) {
    console.error("Error fetching word data:", error);
    return null;
  }
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
