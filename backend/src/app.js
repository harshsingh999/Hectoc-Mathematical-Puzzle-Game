import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import gameRoutes, { setIo } from './routes/game.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// ✅ Socket.IO setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

// Pass io to game.js for emitting events
setIo(io);

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
connectDB();

// REST API routes
app.use('/api/game', gameRoutes);

// Root
app.get('/', (req, res) => res.send('🎮 HectoClash Multiplayer backend running'));

// Basic socket connection logging
io.on('connection', (socket) => {
  console.log('✅ Socket connected:', socket.id);

  socket.on('joinRoom', ({ roomCode, playerName }) => {
    socket.join(roomCode);
    console.log(`👥 ${playerName} joined room ${roomCode}`);
  });

  socket.on('disconnect', () => console.log('❌ Socket disconnected:', socket.id));
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));
