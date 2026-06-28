import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error('[embeddingService] CRITICAL: Neither GEMINI_API_KEY nor GOOGLE_API_KEY is set!');
}

// Initialize the native Google Gen AI SDK
const genAI = new GoogleGenerativeAI(apiKey);

// FIX: Switched to the modern, active standard embedding model
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

/**
 * Generates embeddings for a collection of documents/chunks.
 * @param {string[]} chunks - List of text chunks to embed.
 * @returns {Promise<number[][]>} - 2D array representing embeddings for each chunk.
 */
export async function generateEmbeddings(chunks) {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  try {
    console.log(`[embeddingService] Batch processing ${chunks.length} chunks via Gemini API...`);

    // Use Gemini's native batchEmbedContents API
    const response = await embeddingModel.batchEmbedContents({
      requests: chunks.map((chunk) => ({
        content: { parts: [{ text: chunk }] },
      })),
    });

    // Extract the raw numerical vector arrays
    if (response && response.embeddings) {
      const vectors = response.embeddings.map((e) => e.values);
      console.log(`[embeddingService] Successfully generated ${vectors.length} vectors.`);
      return vectors;
    }

    throw new Error('API response did not contain expected embeddings array.');
  } catch (error) {
    console.error('[embeddingService] Gemini Embedding API Error:', error);
    throw new Error(`Gemini Embedding generation failed: ${error.message}`);
  }
}

/**
 * Generates a vector embedding for a single user query.
 * @param {string} query - User search query.
 * @returns {Promise<number[]>} - 1D array containing the query's vector embedding.
 */
export async function generateQueryEmbedding(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string.');
  }

  try {
    const response = await embeddingModel.embedContent(query);
    if (response && response.embedding && response.embedding.values) {
      return response.embedding.values;
    }
    throw new Error('API response did not contain expected embedding values.');
  } catch (error) {
    console.error('[embeddingService] Gemini Query Embedding Error:', error);
    throw new Error(`Gemini Query Embedding failed: ${error.message}`);
  }
}