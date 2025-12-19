
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeminiWordResponse } from "../types";

// ชื่อ Cache สำหรับเก็บข้อมูล Dictionary และ Audio
const APP_CACHE_NAME = 'oxford-3000-master-cache-v6';

/**
 * ฟังก์ชันช่วยดึง JSON ออกจากข้อความที่ AI ตอบกลับ
 */
function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

/**
 * ฟังก์ชันดึง API Key จาก Environment
 */
const getValidApiKey = (): string | null => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === '' || apiKey === 'null') {
    return null;
  }
  return apiKey;
};

/**
 * ดึงรายละเอียดคำศัพท์เชิงลึก (ไทย-อังกฤษ)
 * - ตรวจสอบในเครื่องก่อน (Cache First)
 * - หากไม่มีและออนไลน์ ให้ดึงจาก Gemini
 * - บันทึกลงเครื่องอัตโนมัติ
 */
export const getWordDetails = async (word: string): Promise<GeminiWordResponse | null> => {
  const normalizedWord = word.toLowerCase().trim();
  const cacheKey = `https://api.local/word-details/${normalizedWord}`;
  
  try {
    const cache = await caches.open(APP_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);

    // 1. ลองดึงจาก Cache ก่อนเพื่อความเร็วสูงสุด
    if (cachedResponse) {
      try {
        const data = await cachedResponse.json();
        console.log(`[Cache Hit] Word: ${normalizedWord}`);
        return data;
      } catch (e) {
        console.warn("Cached data corrupt, fetching fresh data...");
      }
    }

    // 2. หากไม่มีใน Cache และออฟไลน์ ให้คืนค่า null เพื่อให้ UI ใช้ข้อมูลพื้นฐาน (Fallback)
    if (!navigator.onLine) return null;

    // 3. ออนไลน์และไม่มี Cache -> เรียก Gemini AI
    const apiKey = getValidApiKey();
    if (!apiKey) throw new Error("MISSING_API_KEY");

    console.log(`[API Call] Fetching AI details for: ${normalizedWord}`);
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `Provide dictionary details for "${normalizedWord}" based on Oxford 3000 standards.`,
      config: {
        systemInstruction: "You are an Oxford English-Thai Dictionary. Return ONLY valid JSON for the word. Use levels A1, A2, B1, B2, or C1. Ensure the translation is accurate and natural Thai.",
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
    
    // 4. บันทึกลง Cache สำหรับการเรียกใช้ครั้งถัดไป
    await cache.put(cacheKey, new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    }));

    return data;
  } catch (error: any) {
    console.error("Gemini Details Error:", error);
    throw error;
  }
};

/**
 * ดึงข้อมูลเสียงอ่าน (TTS)
 * - ตรวจสอบในเครื่องก่อน (Cache First)
 * - หากไม่มีและออนไลน์ ให้ดึงจาก Gemini TTS
 * - บันทึกลงเครื่องอัตโนมัติในรูปแบบ PCM Raw Bytes
 */
export const fetchWordAudioBuffer = async (text: string, audioContext: AudioContext): Promise<AudioBuffer | null> => {
  const normalizedText = text.toLowerCase().trim();
  const cacheKey = `https://api.local/word-audio/${normalizedText}`;

  try {
    const cache = await caches.open(APP_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);

    // 1. หากเคยโหลดเสียงนี้มาแล้ว เล่นจาก Cache ได้ทันที (Offline Ready)
    if (cachedResponse) {
      const arrayBuffer = await cachedResponse.arrayBuffer();
      console.log(`[Cache Hit] Audio: ${normalizedText}`);
      return await decodeAudioData(new Uint8Array(arrayBuffer), audioContext, 24000, 1);
    }

    // 2. หากไม่มีและออฟไลน์ ไม่สามารถโหลดใหม่ได้
    if (!navigator.onLine) return null;

    // 3. ออนไลน์และไม่มี Cache -> เรียก Gemini TTS
    const apiKey = getValidApiKey();
    if (!apiKey) return null;

    console.log(`[API Call] Generating TTS for: ${normalizedText}`);
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
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
      const audioData = decode(base64Audio);
      
      // 4. บันทึก Raw Bytes ลง Cache ทันที
      await cache.put(cacheKey, new Response(audioData, {
        headers: { 'Content-Type': 'audio/pcm' }
      }));

      return await decodeAudioData(audioData, audioContext, 24000, 1);
    }
  } catch (error) {
    console.error("Audio generation failed:", error);
  }
  return null;
};

/**
 * ฟังก์ชันถอดรหัส Base64 เป็น Uint8Array (ตามตัวอย่างไกด์ไลน์)
 */
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * ฟังก์ชันแปลง PCM Raw Bytes เป็น AudioBuffer สำหรับ Web Audio API (ตามตัวอย่างไกด์ไลน์)
 */
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
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
