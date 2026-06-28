import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

/**
 * Splits a large string of text into smaller, overlapping chunks.
 * @param {string} text - The raw text to split.
 * @param {number} [chunkSize=1000] - Maximum character length of each chunk.
 * @param {number} [chunkOverlap=200] - Number of characters overlapping between adjacent chunks.
 * @returns {Promise<string[]>} - List of text chunks.
 */
export async function splitText(text, chunkSize = 1000, chunkOverlap = 200) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  return await splitter.splitText(text);
}
