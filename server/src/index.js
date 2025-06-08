const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const apiUrl = process.env.REACT_APP_API_URL;
require('dotenv').config();


const app = express();
const server = createServer(app);

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ["GET", "POST", 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorisation']
}));


// Socket.IO setup
const io = new Server(server, {
  cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      methods: ["GET", "POST", 'PUT', 'DELETE'],
	  allowedHeaders: ['Content-Type', 'Authorisation']
  }
});

// Game state
let rooms = new Map();
let userSocketMap = new Map();

// Root route
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Socket events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', (username) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    rooms.set(roomId, {
      id: roomId,
      players: [{id: socket.id, username, isHost: true}],
      gameStarted: false
    });
    userSocketMap.set(socket.id, {roomId, username});
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', rooms.get(roomId));
  });

  socket.on('joinRoom', ({roomId, username}) => {
    const room = rooms.get(roomId);
    if (room && !room.gameStarted) {
      room.players.push({id: socket.id, username, isHost: false});
      userSocketMap.set(socket.id, {roomId, username});
      socket.join(roomId);
      io.to(roomId).emit('roomUpdate', room);
    }
  });

  socket.on('disconnect', () => {
    const userInfo = userSocketMap.get(socket.id);
    if (userInfo) {
      const room = rooms.get(userInfo.roomId);
      if (room) {
        room.players = room.players.filter(player => player.id !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(userInfo.roomId);
        } else {
          io.to(userInfo.roomId).emit('roomUpdate', room);
        }
      }
      userSocketMap.delete(socket.id);
    }
  });
});

// API routes
app.get('/api/rooms', (req, res) => {
  const roomsList = Array.from(rooms.values());
  res.json(roomsList);
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';


server.listen(PORT, HOST, () => {
  console.log(`Server running on ${process.env.API_BASE_URL || `http://${HOST}:${PORT}`}`);
});
