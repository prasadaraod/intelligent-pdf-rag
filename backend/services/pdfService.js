import fs from 'fs';
import { PDFParse } from 'pdf-parse';

/**
 * Extracts raw text from a PDF file on disk.
 * @param {string} filePath - Absolute or relative path to the PDF file.
 * @returns {Promise<string>} - The extracted text content of the PDF.
 */
export async function extractTextFromPdf(filePath) {
  console.log(`[pdfService] Step 1: Checking if file exists at: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.error(`[pdfService] Step 1 Failed: File not found at ${filePath}`);
    throw new Error(`File not found at path: ${filePath}`);
  }

  try {
    console.log(`[pdfService] Step 2: Reading file into standard Node Buffer...`);
    const dataBuffer = fs.readFileSync(filePath);
    
    console.log(`[pdfService] Step 3: Converting Node Buffer to explicit Uint8Array...`);
    const uint8Array = new Uint8Array(dataBuffer.buffer, dataBuffer.byteOffset, dataBuffer.byteLength);
    console.log(`[pdfService] Step 3 Success: Uint8Array created. Byte length: ${uint8Array.byteLength}`);

    console.log(`[pdfService] Step 4: Initializing new PDFParse instance with Uint8Array...`);
    const parser = new PDFParse(uint8Array);
    console.log(`[pdfService] Step 4 Success: Instance structure keys:`, Object.getOwnPropertyNames(parser));

    console.log(`[pdfService] Step 5: Awaiting parser.getText()...`);
    const parsedData = await parser.getText();
    console.log(`[pdfService] Step 5 Success: Received parsedData type:`, typeof parsedData);
    console.log(`[pdfService] Step 5 Content inspection:`, parsedData);

    // Determine if the string is returned directly or nested inside an object property
    const finalText = typeof parsedData === 'object' && parsedData !== null ? (parsedData.text || '') : (parsedData || '');
    console.log(`[pdfService] Step 6: Final clean text extracted. Length: ${finalText.length} characters`);

    return finalText;
  } catch (error) {
    console.error(`[pdfService] CRITICAL Error caught during extraction workflow:`, error);
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}