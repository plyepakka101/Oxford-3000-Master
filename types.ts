
export interface WordDetail {
  word: string;
  thaiTranslation: string;
  partOfSpeech: string;
  partOfSpeechThai: string;
  phonetic: string;
  exampleEnglish: string;
  exampleThai: string;
  level: string;
  sources?: { uri: string; title: string }[]; // สำหรับเก็บแหล่งที่มาจาก Google Search
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
  level: string;
}

export interface WordCustomization {
  thaiTranslation?: string;
  exampleEnglish?: string;
  exampleThai?: string;
  phonetic?: string;
}
