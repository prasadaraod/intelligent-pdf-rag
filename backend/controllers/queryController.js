import chromaClient from '../config/chromadb.js';
import { generateQueryEmbedding } from '../services/embeddingService.js';
import { generateAnswer } from '../services/llmService.js';

/**
 * Handle user queries against the ingested documents.
 * POST /api/query
 */
export async function handleQuery(req, res) {
  const { query } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Query string is required in request body under the "query" field.'
    });
  }

  try {
    console.log(`[queryController] Received query: "${query}"`);

    // 1. Generate embedding for the query
    console.log('[queryController] Generating query embedding...');
    const queryEmbedding = await generateQueryEmbedding(query);

    // 2. Search ChromaDB for the closest document chunks
    console.log('[queryController] Searching ChromaDB for matching chunks...');
    const collectionName = 'intelligent_pdf_rag';
    const collection = await chromaClient.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: null,
    });

    // Query for top 4 closest documents
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 4,
    });

    const documents = results.documents[0] || [];
    const metadatas = results.metadatas[0] || [];

    console.log(`[queryController] Database search finished. Found ${documents.length} matches.`);

    // 3. Generate answer using Gemini LLM and retrieved documents
    console.log('[queryController] Invoking Gemini LLM for context-aware response...');
    const answer = await generateAnswer(query, documents);
    console.log('[queryController] Generated response successfully.');

    // 4. Return response to user
    return res.status(200).json({
      success: true,
      answer,
      sources: documents.map((doc, idx) => ({
        text: doc,
        metadata: metadatas[idx] || {},
      })),
    });

  } catch (error) {
    console.error('[queryController] Error processing search query:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during query processing.',
      error: error.message
    });
  }
}
