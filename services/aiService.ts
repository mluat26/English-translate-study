import { AIContentConfig, VocabularyItem, EvaluationResult, TokenUsage, PromptConfig, DEFAULT_PROMPTS } from "../types";

// Helper to get prompts from local storage
const getStoredPrompts = () => {
  const storedPrompts = localStorage.getItem("ds_prompts");
  const prompts: PromptConfig = storedPrompts ? JSON.parse(storedPrompts) : DEFAULT_PROMPTS;
  return { prompts };
};

const cleanJsonOutput = (text: string): string => {
  // Remove markdown code blocks if present
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json/, '').replace(/```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```/, '').replace(/```$/, '');
  }
  return clean.trim();
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const callDeepSeek = async (systemContent: string, userContent: string, retries = 3) => {
  const apiKey = localStorage.getItem("ds_api_key");
  if (!apiKey) {
    throw new Error("Please enter your DeepSeek API Key in Settings.");
  }

  const attempt = async (retryCount: number): Promise<any> => {
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: userContent }
          ],
          response_format: { type: "json_object" },
          temperature: 1.1, 
          stream: false
        })
      });

      if (!response.ok) {
        // Handle Rate Limits or Server Overload specifically
        if (response.status === 429 || response.status >= 500) {
            if (retryCount > 0) {
                console.warn(`DeepSeek Busy (${response.status}), retrying... attempts left: ${retryCount}`);
                await wait(2000); // Wait 2 seconds before retry
                return attempt(retryCount - 1);
            }
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = cleanJsonOutput(data.choices[0].message.content);
      
      return {
        content: JSON.parse(content),
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          responseTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        }
      };
    } catch (error: any) {
      if (retryCount > 0 && (error.message.includes('fetch') || error.message.includes('network'))) {
         await wait(2000);
         return attempt(retryCount - 1);
      }
      throw error;
    }
  };

  try {
    return await attempt(retries);
  } catch (error: any) {
    console.error("DeepSeek Call Failed:", error);
    throw new Error(error.message || "Failed to connect to DeepSeek API. Please try again.");
  }
};

const SYSTEM_PROMPT = `You are an expert English language tutor for Vietnamese learners. 
You MUST return responses in valid JSON format strictly adhering to the requested structure. 
Ensure vocabulary types include: 'Noun', 'Verb', 'Adjective', 'Adverb', 'Phrasal Verb', 'Idiom', etc.
CEFR levels should be: A1, A2, B1, B2, C1, or C2.`;

export const generatePracticeContent = async (config: AIContentConfig): Promise<{ title: string; text: string; vocabulary: VocabularyItem[]; usage: TokenUsage }> => {
  const { prompts } = getStoredPrompts();
  
  const lengthVal = config.length === 'Short' ? '60' : config.length === 'Medium' ? '150' : '250';
  
  const userPrompt = prompts.generate
    .replace("{topic}", config.topic)
    .replace("{difficulty}", config.difficulty)
    .replace("{length}", lengthVal);

  const result = await callDeepSeek(SYSTEM_PROMPT, userPrompt);
  return { ...result.content, usage: result.usage };
};

export const analyzeCustomText = async (text: string): Promise<{ title: string; text: string; vocabulary: VocabularyItem[]; usage: TokenUsage }> => {
  const { prompts } = getStoredPrompts();

  const userPrompt = prompts.analyze + `\n\nTEXT TO ANALYZE: "${text.substring(0, 4000)}"`;

  const result = await callDeepSeek(SYSTEM_PROMPT, userPrompt);
  // Ensure the original text is preserved exactly
  return { ...result.content, text: text, usage: result.usage };
};

export const lookupWordContext = async (word: string, fullContext: string): Promise<VocabularyItem & { usage: TokenUsage }> => {
  const { prompts } = getStoredPrompts();
  
  const contextSnippet = fullContext.length > 500 ? fullContext.substring(0, 500) + "..." : fullContext;
  
  const userPrompt = prompts.lookup
    .replace("{word}", word)
    .replace("{context}", contextSnippet);

  const result = await callDeepSeek(SYSTEM_PROMPT, userPrompt);
  return { ...result.content, word, usage: result.usage };
};

export const evaluateFullTranslation = async (original: string, userTranslation: string): Promise<EvaluationResult & { usage: TokenUsage }> => {
  const { prompts } = getStoredPrompts();
  
  const userPrompt = prompts.evaluate
    .replace("{original}", original)
    .replace("{translation}", userTranslation);

  const result = await callDeepSeek(SYSTEM_PROMPT, userPrompt);
  return { ...result.content, usage: result.usage };
};