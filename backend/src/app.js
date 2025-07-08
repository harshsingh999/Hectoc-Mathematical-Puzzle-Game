import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';           // ✅ Add CORS
import { connectDB } from './config/db.js';
import gameRoutes from './routes/game.js';

// Load environment variables
dotenv.config();
console.log("Loaded MONGO_URI:", process.env.MONGO_URI);

const app = express();
app.use(express.json());
app.use(cors());                  // ✅ Enable CORS

// Connect to MongoDB
connectDB();

// API routes
app.use('/api/game', gameRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('🎮 HectoClash backend is live. You can use /api/game/check or /api/game/giveup');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🌐 Server started on port ${PORT}`));
