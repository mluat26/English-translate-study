

export enum AppMode {
  SETUP = 'SETUP',
  PRACTICE = 'PRACTICE',
  REVIEW = 'REVIEW',
  VOCABULARY = 'VOCABULARY',
}

export enum ContentSource {
  AI_GENERATED = 'AI_GENERATED',
  CUSTOM_TEXT = 'CUSTOM_TEXT',
}

export interface TokenUsage {
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
}

export interface VocabularyItem {
  word: string; 
  definition: string;
  pronunciation?: string;
  type?: string;
  translation: string;
  context?: string; // The full sentence containing the word
  cefr?: string; // B1, B2, C1, C2
}

export interface EvaluationResult {
  correctedTranslation: string;
  keyImprovements: string[];
  difficultWords: VocabularyItem[]; 
  usage?: TokenUsage;
  score?: number;
}

export interface PracticeSession {
  id: string;
  title: string;
  text: string;
  vocabulary: VocabularyItem[];
  date: number;
  
  initialUsage: TokenUsage;
  lookupUsage: TokenUsage;
  evaluationUsage?: TokenUsage;

  userTranslation?: string;
  evaluation?: EvaluationResult;
}

export interface AIContentConfig {
  topic: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  length: 'Short' | 'Medium' | 'Long';
}

export interface PromptConfig {
  generate: string;
  analyze: string;
  lookup: string;
  evaluate: string;
}

export const DEFAULT_PROMPTS: PromptConfig = {
  generate: `Write an engaging English text about "{topic}". Difficulty: {difficulty}. Length: {length} words. Return JSON: { "title": "...", "text": "...", "vocabulary": [{word, definition (VN), translation (VN), pronunciation, type, cefr}] }`,
  analyze: `Analyze this English text. Return JSON: { "title": "...", "text": "...", "vocabulary": [{word, definition (VN), translation (VN), pronunciation, type, cefr}] }`,
  lookup: `Define "{word}" in context: "{context}". Return JSON: { "definition": "VN definition", "translation": "VN word", "pronunciation": "...", "type": "...", "cefr": "..." }`,
  evaluate: `Correct translation. Original: "{original}". User: "{translation}". Return JSON: { "score": 0-100, "correctedTranslation": "...", "keyImprovements": ["specific error 1", "specific error 2"], "difficultWords": [{word, definition, translation, type, cefr}] }`
};