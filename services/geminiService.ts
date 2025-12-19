
import { GoogleGenAI, Modality } from "@google/genai";
import { WordDetail } from "../types";

// อัปเกรดเป็น v9 เพื่อล้างค่าเก่าที่ Error ออกให้หมด
const APP_CACHE_NAME = 'oxford-3000-master-cache-v9';

const getValidApiKey = (): string | null => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === '' || apiKey === 'null') {
    return null;
  }
  return apiKey;
};

/**
 * ดึงรายละเอียดคำศัพท์โดยใช้ Google Search Grounding
 * กฎ: เมื่อใช้ googleSearch ไม่ควรใช้ responseSchema เพราะผลลัพธ์อาจไม่ใช่ JSON
 */
export const getWordDetails = async (word: string): Promise<WordDetail | null> => {
  const normalizedWord = word.toLowerCase().trim();
  const cacheKey = `https://api.local/word-details/${normalizedWord}`;
  
  try {
    const cache = await caches.open(APP_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      return await cachedResponse.json();
    }

    if (!navigator.onLine) return null;

    const apiKey = getValidApiKey();
    if (!apiKey) {
      console.error("API Key is missing in environment");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // เราจะใช้ Prompt ที่สั่งให้ตอบแบบมีโครงสร้างชัดเจนเพื่อนำมา Parse เอง
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Search Google for "ตัวอย่างประโยค ${normalizedWord}" and extract details. 
      Format your response exactly like this:
      TRANSLATION: [Thai translation]
      PHONETIC: [Phonetic spelling]
      POS_EN: [Part of speech in English]
      POS_TH: [Part of speech in Thai]
      EX_EN: [English example sentence from search results]
      EX_TH: [Thai translation of that example]
      LEVEL: [Oxford level A1-C1]`,
      config: {
        systemInstruction: "You are an Oxford Dictionary Expert using Google Search. Provide accurate, grounded information.",
        tools: [{ googleSearch: {} }]
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    // ฟังก์ชันช่วยสกัดข้อมูลจากข้อความ
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

    // ตรวจสอบว่าได้ข้อมูลสำคัญครบไหม
    if (!finalData.thaiTranslation || !finalData.phonetic) {
       console.warn("AI returned incomplete data, retrying without tools...");
       // คุณสามารถเพิ่ม fallback logic ตรงนี้ได้ถ้าต้องการ
    }
    
    await cache.put(cacheKey, new Response(JSON.stringify(finalData), {
      headers: { 'Content-Type': 'application/json' }
    }));

    return finalData;
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
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
