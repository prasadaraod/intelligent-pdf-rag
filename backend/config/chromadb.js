import { ChromaClient } from 'chromadb';
import dotenv from 'dotenv';

dotenv.config();

const chromaHost = process.env.CHROMA_HOST || 'localhost';
const chromaPort = process.env.CHROMA_PORT || '8000';

// Construct a unified URL path for the modern client configuration
const chromaPath = `http://${chromaHost}:${chromaPort}`;

console.log(`[ChromaDB] Connecting to database via modern V1 path at: ${chromaPath}`);
console.log(`chroma url: ${process.env.CHROMA_URL}`)

const chromaClient = new ChromaClient({
  path: chromaPath
});

console.log('Chroma client config', chromaClient.apiClient.getConfig());
// console.log('Chroma API path',chromaClient.apiClient.buildUrl(""));
console.log('version',await chromaClient.version());

export default chromaClient;