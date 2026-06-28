import express from 'express';
import rateLimit from 'express-rate-limit'; // 1. Import the rate limiter
import { handleQuery } from '../controllers/queryController.js';

const router = express.Router();
/**
 * Modern In-Memory Rate Limiter Configuration
 * Restricts public users to 10 queries per window
 */
const searchRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Hour window (in milliseconds)
  max: 100, // Limit each IP to 10 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many search requests from this device. You have reached the limit of 10 queries per hour to preserve API usage.'
  }
});
// Route to search documents and generate context-aware answers
router.post('/query',searchRateLimiter, handleQuery);

export default router;
