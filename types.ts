
export interface WordDetail {
  word: string;
  thaiTranslation: string;
  partOfSpeech: string;
  partOfSpeechThai: string;
  phonetic: string;
  exampleEnglish: string;
  exampleThai: string;
  level: string;
  sources?: { uri: string; title: string }[];
}

export interface OxfordWord {
  word: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  translation?: string;
  phonetic?: string;
  posEn?: string;
  posTh?: string;
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
