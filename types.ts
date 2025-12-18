
export interface WordDetail {
  word: string;
  thaiTranslation: string;
  partOfSpeech: string;
  partOfSpeechThai: string;
  phonetic: string;
  exampleEnglish: string;
  exampleThai: string;
  level: string; // เพิ่มให้ AI ระบุ Level เสมอ
}

export interface OxfordWord {
  word: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  translation?: string;
}

export interface GeminiWordResponse {
  thaiTranslation: string;
  partOfSpeech: string;
  partOfSpeechThai: string;
  phonetic: string;
  exampleEnglish: string;
  exampleThai: string;
  level: string; // ระบุระดับตาม Oxford 3000 (A1, A2, B1, B2)
}

export interface WordCustomization {
  thaiTranslation?: string;
  exampleEnglish?: string;
  exampleThai?: string;
  phonetic?: string;
}
