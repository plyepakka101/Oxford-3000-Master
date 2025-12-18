
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeminiWordResponse } from "../types";

const DATA_CACHE_NAME = 'gemini-content';

export const getWordDetails = async (word: string): Promise<GeminiWordResponse | null> => {
  const cacheKey = `word-details-v3-${word.toLowerCase()}`;
  const cache = await caches.open(DATA_CACHE_NAME);
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) return await cachedResponse.json();

  if (!navigator.onLine) return null;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide details for "${word}" based on Oxford 3000/5000 standards.`,
      config: {
        systemInstruction: "You are an Oxford Dictionary Expert. Return JSON including: Thai translation, part of speech, part of speech in Thai, IPA phonetic, simple English example, Thai translation of example, and the word's CEFR level (A1, A2, B1, or B2) according to the Oxford 3000 list.",
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
            level: { type: Type.STRING, description: "Must be A1, A2, B1, or B2" },
          },
          required: ["thaiTranslation", "partOfSpeech", "partOfSpeechThai", "phonetic", "exampleEnglish", "exampleThai", "level"],
        },
      },
    });

    const data = JSON.parse(response.text.trim());
    await cache.put(cacheKey, new Response(JSON.stringify(data)));
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const fetchWordAudioBuffer = async (text: string, audioContext: AudioContext): Promise<AudioBuffer | null> => {
  if (!navigator.onLine) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) return await decodeAudioData(decodeBase64(base64Audio), audioContext, 24000, 1);
  } catch (error) { console.error(error); }
  return null;
};

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}
