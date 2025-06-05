// server/src/sockets/socketHandler.js
const gameManager = require('../game/gameManager');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join a game room
    socket.on('join-game', ({ partyCode, fingerprint }) => {
      if (!partyCode || !fingerprint) {
        socket.emit('error', { message: 'Invalid join request' });
        return;
      }

      const game = gameManager.getGame(partyCode);
      if (!game) {
        socket.emit('game-not-found');
        return;
      }

      // Check if player exists in the game
      let player = game.getPlayerByFingerprint(fingerprint);

      // If player doesn't exist, they need to be added first
      if (!player) {
        socket.emit('player-not-found', {
          message: 'Please join the game first',
          partyCode: partyCode
        });
        return;
      }

      // Join the socket room
      socket.join(partyCode);
      socket.data.partyCode = partyCode;
      socket.data.fingerprint = fingerprint;

      // Mark player as connected
      game.setPlayerConnected(fingerprint, true);

      // Send current game state to the joining player
      const playerState = game.getPlayerState(fingerprint);
      console.log('Sending game-state to player:', {
        username: player.username,
        fingerprint: fingerprint,
        playerCount: playerState.players.length,
        players: playerState.players.map(p => p.username)
      });
      socket.emit('game-state', playerState);

      // Notify ALL players in the room about the update
      const allPlayers = game.getPlayers();
      console.log('Broadcasting players-updated:', {
        playerCount: allPlayers.length,
        players: allPlayers.map(p => ({ username: p.username, fingerprint: p.fingerprint })),
        roomSize: io.sockets.adapter.rooms.get(partyCode)?.size || 0,
        socketsInRoom: io.sockets.adapter.rooms.get(partyCode) ? [...io.sockets.adapter.rooms.get(partyCode)] : []
      });

      // Log each socket in the room
      const room = io.sockets.adapter.rooms.get(partyCode);
      if (room) {
        console.log(`Room ${partyCode} has ${room.size} sockets:`);
        for (const socketId of room) {
          const sock = io.sockets.sockets.get(socketId);
          console.log(`  - Socket ${socketId}: fingerprint=${sock?.data?.fingerprint}`);
        }
      }

      io.to(partyCode).emit('players-updated', allPlayers);

      // Also ensure all connected players with this partyCode get the update
      // This handles cases where sockets might not be in the room properly
      game.getPlayers().forEach(gamePlayer => {
        const playerSocket = [...io.sockets.sockets.values()]
          .find(s => s.data.fingerprint === gamePlayer.fingerprint && s.data.partyCode === partyCode);

        if (playerSocket && playerSocket.id !== socket.id) {
          console.log(`Ensuring player ${gamePlayer.username} gets update`);
          playerSocket.emit('players-updated', allPlayers);
        }
      });

      console.log(`Player ${player.username} joined. Total players: ${game.getPlayers().length}`);
    });

    // Start the game
    socket.on('start-game', ({ partyCode, settings }) => {
      const game = gameManager.getGame(partyCode);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const player = game.getPlayerByFingerprint(socket.data.fingerprint);
      if (!player || !player.isLeader) {
        socket.emit('error', { message: 'Only the party leader can start the game' });
        return;
      }

      try {
        game.startGame(settings);

        // Send personalized game state to each player
        game.getPlayers().forEach(player => {
          const playerSocket = [...io.sockets.sockets.values()]
            .find(s => s.data.fingerprint === player.fingerprint);

          if (playerSocket) {
            const playerState = game.getPlayerState(player.fingerprint);
            playerSocket.emit('game-started', playerState);
          }
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Send chat message
    socket.on('send-chat', ({ partyCode, message }) => {
      const game = gameManager.getGame(partyCode);
      if (!game || game.status !== 'playing') {
        socket.emit('error', { message: 'Cannot send message' });
        return;
      }

      const player = game.getPlayerByFingerprint(socket.data.fingerprint);
      if (!player || game.currentTurn !== player.fingerprint) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      try {
        const chatMessage = game.addChat(player.fingerprint, message);
        io.to(partyCode).emit('new-chat', chatMessage);

        // Check if round should end (everyone has sent a message)
        if (game.shouldEndRound()) {
          // After EACH round, go to voting phase
          console.log('Round ended, moving to voting phase');
          game.status = 'voting-continue';
          io.to(partyCode).emit('voting-phase', { type: 'continue' });
        } else {
          // Next player's turn
          game.nextTurn();
          io.to(partyCode).emit('turn-update', {
            currentTurn: game.currentTurn
          });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Submit vote
    socket.on('submit-vote', ({ partyCode, voteType, vote }) => {
      const game = gameManager.getGame(partyCode);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const player = game.getPlayerByFingerprint(socket.data.fingerprint);
      if (!player) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      try {
        game.submitVote(player.fingerprint, voteType, vote);

        // Check if all votes are in
        if (game.allVotesSubmitted(voteType)) {
          if (voteType === 'continue') {
            const result = game.processContinueVotes();

            if (result.decision === 'continue') {
              // Check if we've reached max rounds
              if (game.currentRound >= game.settings.maxChatRounds) {
                // Force voting for imposters
                game.status = 'voting-imposter';
                io.to(partyCode).emit('voting-phase', { type: 'imposter' });
              } else {
                // Continue playing
                game.status = 'playing';
                game.nextRound();
                io.to(partyCode).emit('continue-playing', {
                  round: game.currentRound,
                  currentTurn: game.currentTurn
                });
              }
            } else {
              // Move to imposter voting
              game.status = 'voting-imposter';
              io.to(partyCode).emit('voting-phase', { type: 'imposter' });
            }
          } else if (voteType === 'imposter') {
            const result = game.processImposterVotes();
            io.to(partyCode).emit('vote-results', result);

            if (result.caught.length > 0) {
              // Imposters were caught, they can send final messages
              game.status = 'final-messages';
              io.to(partyCode).emit('final-messages-phase');
            } else {
              // No imposters caught, check win condition
              game.checkWinCondition();
              if (game.status === 'ended') {
                io.to(partyCode).emit('game-ended', game.gameResult);
              } else {
                // Continue playing
                game.status = 'playing';
                game.nextRound();
                io.to(partyCode).emit('continue-playing', {
                  round: game.currentRound,
                  currentTurn: game.currentTurn
                });
              }
            }
          }
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Send final message (for caught imposters)
    socket.on('send-final-message', ({ partyCode, message }) => {
      const game = gameManager.getGame(partyCode);
      if (!game || game.status !== 'final-messages') {
        socket.emit('error', { message: 'Cannot send final message' });
        return;
      }

      const player = game.getPlayerByFingerprint(socket.data.fingerprint);
      if (!player || player.role !== 'imposter' || !game.caughtImposters.includes(player.fingerprint)) {
        socket.emit('error', { message: 'You cannot send a final message' });
        return;
      }

      try {
        game.addFinalMessage(player.fingerprint, message);
        io.to(partyCode).emit('new-final-message', {
          username: player.username,
          message
        });

        // Check if all caught imposters have sent messages
        if (game.allFinalMessagesSent()) {
          game.checkWinCondition();
          io.to(partyCode).emit('game-ended', game.gameResult);
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Start new game (after game ends)
    socket.on('new-game', ({ partyCode }) => {
      const game = gameManager.getGame(partyCode);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const player = game.getPlayerByFingerprint(socket.data.fingerprint);
      if (!player || !player.isLeader) {
        socket.emit('error', { message: 'Only the party leader can start a new game' });
        return;
      }

      try {
        game.resetGame();
        io.to(partyCode).emit('game-reset', {
          status: 'waiting',
          players: game.getPlayers()
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);

      if (socket.data.partyCode && socket.data.fingerprint) {
        const game = gameManager.getGame(socket.data.partyCode);
        if (game) {
          game.setPlayerConnected(socket.data.fingerprint, false);
          io.to(socket.data.partyCode).emit('player-disconnected', {
            fingerprint: socket.data.fingerprint
          });
        }
      }
    });
  });
};