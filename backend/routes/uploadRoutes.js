import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { handlePdfUpload } from '../controllers/uploadController.js';
import chromaClient from '../config/chromadb.js'; 
import requireAdmin from '../middleware/auth.js'; // Fixed: Converted from require to ES Import

const router = express.Router();


// Ensure temporary uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to avoid filesystem issues
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${Date.now()}-${sanitizedName}`);
  }
});

// File validation (enforce PDF files only)
const fileFilter = (req, file, cb) => {
  const fileExt = path.extname(file.originalname).toLowerCase();
  if (file.mimetype === 'application/pdf' || fileExt === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // Limit PDF to 15MB
  }
});

/**
 * POST /api/upload
 * Secured: requireAdmin middleware executes before file handling to protect your API limits
 */
router.post('/upload', requireAdmin, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload Error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, handlePdfUpload);
/**
 * GET /api/documents
 * Public: Fetches all unique indexed document filenames directly from ChromaDB V2
 * Gracefully returns an empty list if the collection doesn't exist yet.
 */
router.get('/documents', async (req, res) => {
  try {
    const collectionName = 'intelligent_pdf_rag';
    
    let collection;
    try {
      // 1. Attempt to resolve the collection reference
      collection = await chromaClient.getCollection({ name: collectionName });
    } catch (chromaError) {
      // 2. Intercept resource-not-found exceptions gracefully
      const errorMessage = chromaError.message || '';
      const errorName = chromaError.name || '';

      if (
        errorName === 'ChromaNotFoundError' || 
        errorMessage.includes('could not be found') || 
        errorMessage.includes('does not exist')
      ) {
        console.log(`[uploadRoutes] Collection '${collectionName}' does not exist yet. Returning empty list.`);
        return res.status(200).json({ 
          success: true, 
          documents: [] 
        });
      }
      
      // If it's a structural network connection failure, throw it to the main catch block
      throw chromaError;
    }
    
    // 3. Get stored items from collection
    const data = await collection.get();
    
    // Extract unique source file names from the chunk metadatas
    const uniqueFiles = data.metadatas && data.metadatas.length > 0
      ? [...new Set(data.metadatas.map(meta => meta?.source).filter(Boolean))]
      : [];

    return res.status(200).json({
      success: true,
      documents: uniqueFiles
    });
  } catch (error) {
    // 4. Global top-level safety net to protect your Express runtime process
    console.error('[uploadRoutes] Error listing documents:', error);
    return res.status(200).json({ 
      success: false, 
      documents: [], 
      error: 'Vector database initialization failure.' 
    });
  }
});

export default router;