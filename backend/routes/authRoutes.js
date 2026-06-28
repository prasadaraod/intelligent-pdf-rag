import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/login', (req, res) => {
  const { password } = req.body;

  // Make sure ADMIN_PASSWORD and JWT_SECRET are defined in your .env file
  if (password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign(
      { role: 'admin' }, 
      process.env.JWT_SECRET, 
      { expiresIn: '2h' }
    );
    return res.status(200).json({ token });
  }

  return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
});

export default router; // ES Module export