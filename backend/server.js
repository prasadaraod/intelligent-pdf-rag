import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import uploadRoutes from './routes/uploadRoutes.js';
import queryRoutes from './routes/queryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import chromaClient from './config/chromadb.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing (CORS) for frontend integration
app.use(cors());

// Middleware to parse incoming JSON payloads and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
// app.get('/health', (req, res) => {
//   res.status(200).json({
//     status: 'OK',
//     message: 'Intelligent PDF RAG backend server is healthy and running.'
//   });
// });
// Example of a backend health check route in your Express server
app.get('/health', async (req, res) => {
  // try {
  //   // Standard ChromaDB v1 native heartbeat check
  //   // await chromaClient.heartbeat(); 
  //   await chromaClient.heartbeat();
  //   return res.status(200).json({ status: 'OK', version: 'v1-active' });
  // } catch (error) {
  //   console.error('ChromaDB Health check failed:', error);
  //   return res.status(503).json({ status: 'DOWN', error: error.message });
  // }
  try {
    // 1. Call the built-in SDK heartbeat method 
    // This automatically polls the correct underlying /api/v1/heartbeat route
    const heartbeatTimestamp = await chromaClient.heartbeat();
    
    // If it returns a valid timestamp/number, Chroma is healthy and responsive
    if (heartbeatTimestamp) {
      return res.status(200).json({ 
        status: 'OK', 
        message: 'Backend is connected to ChromaDB successfully.',
        timestamp: heartbeatTimestamp
      });
    } else {
      throw new Error('ChromaDB returned an empty heartbeat response.');
    }
  } catch (error) {
    console.error('[Health Check Error]: Could not communicate with Vector DB:', error.message);
    
    // Return status 200 with status: 'DOWN' so Angular's signal captures it gracefully
    return res.status(200).json({ 
      status: 'DOWN', 
      message: `ChromaDB connection offline: ${error.message}` 
    });
  }
});

// Register routes
app.use('/api', uploadRoutes);
app.use('/api', queryRoutes);
app.use('/api/auth', authRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('[server] Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error.',
    error: err.message
  });
});

// Start listening for requests
app.listen(PORT, () => {
  console.log(`[server] Express server is running on port ${PORT}`);
});
