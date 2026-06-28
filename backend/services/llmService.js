import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error('[llmService] Neither GEMINI_API_KEY nor GOOGLE_API_KEY is set in environment variables!');
}

// FIX: Switched from the deprecated gemini-1.5-flash to gemini-3.5-flash
const chatModel = new ChatGoogleGenerativeAI({
  apiKey: apiKey,
  model: 'gemini-3.5-flash',//'gemini-3.5-flash',
  maxOutputTokens: 2048,
  temperature: 0.2, // Low temperature forces model to stay highly focused on the provided context
});

/**
 * Generates a context-aware answer using Gemini by prompting it with retrieved snippets.
 * @param {string} query - The user's prompt or question.
 * @param {string[]} contexts - Array of matching text chunks retrieved from the vector database.
 * @returns {Promise<string>} - The model's answer.
 */
export async function generateAnswer(query, contexts) {
  if (!query) {
    throw new Error('Query is required to generate an answer.');
  }

  const contextBlock = (contexts && contexts.length > 0)
    ? contexts.map((text, i) => `[Source ${i + 1}]:\n${text}`).join('\n\n')
    : 'No relevant context found in documents.';

  const prompt = `You are a helpful AI assistant. Answer the user's question using only the provided context below.
If the context does not contain the answer, say "I couldn't find the answer in the uploaded documents." and answer based on your general knowledge but clearly state that it is general knowledge.

---
CONTEXT:
${contextBlock}
---

USER QUESTION:
${query}

Intelligent context-aware answer:`;

  try {
    console.log(`[llmService] Routing query to gemini-3.5-flash via LangChain...`);
    const response = await chatModel.invoke(prompt);
    return response.content || '';
  } catch (error) {
    console.error('[llmService] Error generating answer via Gemini API:', error);
    throw new Error(`Gemini LLM response generation failed: ${error.message}`);
  }
}