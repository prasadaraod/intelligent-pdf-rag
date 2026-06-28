import fs from 'fs';
import chromaClient from '../config/chromadb.js';
import { extractTextFromPdf } from '../services/pdfService.js';
import { splitText } from '../services/textSplitter.js';
import { generateEmbeddings } from '../services/embeddingService.js';

/**
 * Handle PDF Upload and Processing
 * POST /api/upload
 */
export async function handlePdfUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No PDF file uploaded. Please upload a file with the field name "file".'
    });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;

  try {
    console.log(`[uploadController] Processing uploaded file: ${originalName}`);

    // 1. Extract text from PDF
    console.log('[uploadController] Extracting text from PDF...');
    const rawText = await extractTextFromPdf(filePath);
    if (!rawText.trim()) {
      throw new Error('Extracted PDF text is empty.');
    }
    console.log(`[uploadController] Text extracted successfully. Length: ${rawText.length} characters`);

    // 2. Chunk text
    console.log('[uploadController] Splitting text into chunks...');
    const chunks = await splitText(rawText, 1000, 200);
    console.log(`[uploadController] Split text into ${chunks.length} chunks.`);

    if (chunks.length === 0) {
      throw new Error('Could not partition text into any valid chunks.');
    }

    // 3. Generate embeddings
    console.log('[uploadController] Generating embeddings via Gemini API...');
    const rawEmbeddings = await generateEmbeddings(chunks);
    console.log(`[uploadController] Received ${rawEmbeddings ? rawEmbeddings.length : 0} elements from embedding service.`);

    // 4. Validate and filter embeddings to prevent ChromaDB crashes
    const validChunks = [];
    const validEmbeddings = [];
    const validIds = [];
    const validMetadatas = [];
    const timestamp = Date.now();

    chunks.forEach((chunk, index) => {
      const vector = rawEmbeddings && rawEmbeddings[index];
      
      // Detailed logging for index 0 and empty vectors
      if (index === 0 || !vector || vector.length === 0) {
        console.log(`[uploadController Debug] Chunk ${index} length: ${chunk.trim().length} chars | Vector type: ${typeof vector} | Vector length: ${vector ? vector.length : 'N/A'}`);
      }

      // Check if vector is a non-empty array of numbers
      if (Array.isArray(vector) && vector.length > 0) {
        validEmbeddings.push(vector);
        validChunks.push(chunk);
        validIds.push(`${originalName.replace(/\s+/g, '_')}_${timestamp}_${index}`);
        validMetadatas.push({
          source: originalName,
          chunkIndex: index,
          uploadedAt: new Date().toISOString(),
        });
      } else {
        console.warn(`[uploadController Warning] Skipping chunk index ${index} due to invalid or empty embedding.`);
      }
    });

    if (validEmbeddings.length === 0) {
      throw new Error('All generated embeddings were empty or invalid. Check embeddingService.js implementation.');
    }

    // 5. Store in Vector Database (ChromaDB)
    console.log(`[uploadController] Connecting to ChromaDB and storing ${validEmbeddings.length} valid embeddings...`);
    const collectionName = 'intelligent_pdf_rag';
    const collection = await chromaClient.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: null,
    });

    await collection.add({
      ids: validIds,
      embeddings: validEmbeddings,
      metadatas: validMetadatas,
      documents: validChunks,
    });

    console.log('[uploadController] All valid chunks successfully stored in ChromaDB!');

    return res.status(200).json({
      success: true,
      message: 'PDF processed and indexed successfully.',
      data: {
        filename: originalName,
        chunksCount: validChunks.length,
        collectionName: collectionName,
      }
    });

  } catch (error) {
    console.error('[uploadController] Error during PDF processing flow:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during PDF upload and processing.',
      error: error.message
    });
  } finally {
    // 6. Clean up temporary uploaded file
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`[uploadController] Temporary file cleaned up: ${filePath}`);
      } catch (cleanupError) {
        console.error(`[uploadController] Failed to delete temporary file ${filePath}:`, cleanupError);
      }
    }
  }
}