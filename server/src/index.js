require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// In-memory storage for rooms and users
const rooms = new Map();
const userSocketMap = new Map();

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_ORIGIN,
  credentials: true
}));

app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../public')));

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Import your existing routes and socket handlers
const gameRoutes = require('./routes/gameRoutes');
const socketHandler = require('./sockets/socketHandler');

// Use your existing routes
app.use('/api', gameRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Use the existing socketHandler for the main game logic
  socketHandler(socket, io);

  // Basic room management (for simple room creation/joining)
  socket.on('createRoom', (username) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    rooms.set(roomId, {
      id: roomId,
      players: [{id: socket.id, username, isHost: true}],
      gameStarted: false
    });
    userSocketMap.set(socket.id, {roomId, username});
    socket.join(roomId);
    socket.emit('roomCreated', { roomId, room: rooms.get(roomId) });
    io.to(roomId).emit('roomUpdate', rooms.get(roomId));
  });

  socket.on('joinRoom', ({roomId, username}) => {
    const room = rooms.get(roomId);
    if (room && !room.gameStarted) {
      room.players.push({id: socket.id, username, isHost: false});
      userSocketMap.set(socket.id, {roomId, username});
      socket.join(roomId);
      socket.emit('roomJoined', { roomId, room });
      io.to(roomId).emit('roomUpdate', room);
    } else {
      socket.emit('error', { message: 'Room not found or game already started' });
    }
  });

  socket.on('startGame', (roomId) => {
    const room = rooms.get(roomId);
    const userInfo = userSocketMap.get(socket.id);

    if (room && userInfo && userInfo.roomId === roomId) {
      const player = room.players.find(p => p.id === socket.id);
      if (player && player.isHost) {
        room.gameStarted = true;
        io.to(roomId).emit('gameStarted', { room });
      } else {
        socket.emit('error', { message: 'Only the host can start the game' });
      }
    } else {
      socket.emit('error', { message: 'Room not found or you are not in this room' });
    }
  });

  socket.on('submitGuess', ({ roomId, guess }) => {
    const room = rooms.get(roomId);
    const userInfo = userSocketMap.get(socket.id);

    if (room && userInfo && userInfo.roomId === roomId) {
      // Add your game logic here
      io.to(roomId).emit('guessSubmitted', {
        username: userInfo.username,
        guess
      });
    }
  });

  socket.on('nextRound', (roomId) => {
    const room = rooms.get(roomId);
    const userInfo = userSocketMap.get(socket.id);

    if (room && userInfo && userInfo.roomId === roomId) {
      const player = room.players.find(p => p.id === socket.id);
      if (player && player.isHost) {
        // Add your next round logic here
        io.to(roomId).emit('nextRound', { room });
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    const userInfo = userSocketMap.get(socket.id);
    if (userInfo) {
      const room = rooms.get(userInfo.roomId);
      if (room) {
        room.players = room.players.filter(player => player.id !== socket.id);

        if (room.players.length === 0) {
          rooms.delete(userInfo.roomId);
        } else {
          // If the host left, make the first player the new host
          if (room.players.length > 0 && !room.players.some(p => p.isHost)) {
            room.players[0].isHost = true;
          }
          io.to(userInfo.roomId).emit('roomUpdate', room);
        }
      }
      userSocketMap.delete(socket.id);
    }
  });
});

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});