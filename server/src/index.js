// server/src/index.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const gameRoutes = require('./routes/gameRoutes');
const socketHandler = require('./sockets/socketHandler');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Middleware - MUST come before routes
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/game', gameRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.IO setup - AFTER routes
const io = socketIO(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Socket handling
socketHandler(io);

// Add debugging
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});