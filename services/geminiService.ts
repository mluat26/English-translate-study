import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { AIContentConfig, VocabularyItem, EvaluationResult, TokenUsage } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to extract usage
const getUsage = (response: GenerateContentResponse): TokenUsage => {
  const usage = response.usageMetadata;
  return {
    promptTokens: usage?.promptTokenCount || 0,
    responseTokens: usage?.candidatesTokenCount || 0,
    totalTokens: usage?.totalTokenCount || 0,
  };
};

// Shared Schema for Vocabulary Items
const vocabSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING },
      definition: { type: Type.STRING },
      translation: { type: Type.STRING },
      pronunciation: { type: Type.STRING },
      type: { type: Type.STRING },
      cefr: { type: Type.STRING, description: "CEFR Level (A1-C2)" },
    },
    required: ["word", "definition", "translation", "type"],
  },
} as const;

export const generatePracticeContent = async (config: AIContentConfig): Promise<{ title: string; text: string; vocabulary: VocabularyItem[]; usage: TokenUsage }> => {
  const ai = getClient();
  const modelId = "gemini-3-flash-preview";

  const lengthPrompt = config.length === 'Short' ? 'around 60 words' : config.length === 'Medium' ? 'around 150 words' : 'around 250 words';
  
  const prompt = `Write an engaging English text about "${config.topic}". 
  Difficulty: ${config.difficulty}. Length: ${lengthPrompt}.
  
  Also, extract a list of USEFUL vocabulary words AND PHRASES (idioms, phrasal verbs) from the generated text for a Vietnamese learner.
  
  Return JSON with:
  - title: The title of the piece.
  - text: The full English content.
  - vocabulary: An array of vocabulary objects.`;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          text: { type: Type.STRING },
          vocabulary: vocabSchema,
        },
        required: ["title", "text", "vocabulary"],
      } as Schema,
    },
  });

  const textResponse = response.text;
  if (!textResponse) throw new Error("No content generated");
  
  return { ...JSON.parse(textResponse), usage: getUsage(response) };
};

export const analyzeCustomText = async (text: string): Promise<{ title: string; text: string; vocabulary: VocabularyItem[]; usage: TokenUsage }> => {
  const ai = getClient();
  const modelId = "gemini-3-flash-preview";

  const prompt = `Analyze the following English text: "${text.substring(0, 2000)}..."
  
  1. Create a short title for it.
  2. Extract a comprehensive list of vocabulary (Verbs, Nouns, Adjectives, Adverbs, Idioms) for a Vietnamese learner.
  
  Return JSON with:
  - title
  - text: (Just return the original text)
  - vocabulary: Array of objects.`;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          text: { type: Type.STRING },
          vocabulary: vocabSchema,
        },
        required: ["title", "text", "vocabulary"],
      } as Schema,
    },
  });

  const textResponse = response.text;
  if (!textResponse) throw new Error("Analysis failed");
  
  return { ...JSON.parse(textResponse), usage: getUsage(response) };
};

export const evaluateFullTranslation = async (original: string, userTranslation: string): Promise<EvaluationResult & { usage: TokenUsage }> => {
  const ai = getClient();
  const modelId = "gemini-3-flash-preview";

  const prompt = `Original English Text: "${original}"
  User's Vietnamese Translation: "${userTranslation}"
  
  Task: Evaluate the user's translation.
  1. Score it from 0 to 100 based on accuracy and natural flow.
  2. Provide a Correct/Better Vietnamese translation.
  3. Provide general feedback.
  4. List 3 key improvements.
  5. Identify 3-5 "Difficult Words/Phrases" from the text that are B1, B2, C1, or C2 level. Return their definitions and CEFR level.
  
  Return JSON.`;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          feedback: { type: Type.STRING },
          correctedTranslation: { type: Type.STRING },
          keyImprovements: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          difficultWords: vocabSchema,
        },
        required: ["score", "feedback", "correctedTranslation", "keyImprovements", "difficultWords"],
      } as Schema,
    },
  });

  const textResponse = response.text;
  if (!textResponse) throw new Error("Evaluation failed");

  return { ...JSON.parse(textResponse), usage: getUsage(response) };
};

export const lookupWordContext = async (word: string, fullContext: string): Promise<VocabularyItem & { usage: TokenUsage }> => {
  const ai = getClient();
  const modelId = "gemini-3-flash-preview";
  
  const contextSnippet = fullContext.length > 500 ? fullContext.substring(0, 500) + "..." : fullContext;

  const prompt = `Define the word/phrase "${word}" as used in this text: "${contextSnippet}".
  Output in Vietnamese. Determine the CEFR level (A1-C2).
  Return JSON: definition, translation, pronunciation, type, cefr.`;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          definition: { type: Type.STRING },
          translation: { type: Type.STRING },
          pronunciation: { type: Type.STRING },
          type: { type: Type.STRING },
          cefr: { type: Type.STRING },
        },
        required: ["definition", "translation", "type"],
      } as Schema,
    },
  });

  const textResponse = response.text;
  if (!textResponse) throw new Error("Lookup failed");
  
  const data = JSON.parse(textResponse);
  return { ...data, word, usage: getUsage(response) };
};
