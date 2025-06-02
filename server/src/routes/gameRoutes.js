// server/src/routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const gameManager = require('../game/gameManager');

// Create a new game
router.post('/create', (req, res) => {
  try {
    const { username, fingerprint } = req.body;

    if (!username || !fingerprint) {
      return res.status(400).json({
        error: 'Username and fingerprint are required'
      });
    }

    const { partyCode, playerId } = gameManager.createGame(username, fingerprint);

    res.json({
      success: true,
      partyCode,
      playerId
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({
      error: 'Failed to create game'
    });
  }
});

// Join an existing game (with debug logging)
router.post('/join', (req, res) => {
  try {
    const { partyCode, username, fingerprint } = req.body;

    console.log('Join request received:', { partyCode, username, fingerprint });

    if (!partyCode || !username || !fingerprint) {
      return res.status(400).json({
        error: 'Party code, username, and fingerprint are required'
      });
    }

    const game = gameManager.getGame(partyCode);

    if (!game) {
      console.log('Game not found for party code:', partyCode);
      return res.status(404).json({
        error: 'Game not found'
      });
    }

    if (game.status !== 'waiting') {
      console.log('Game already in progress:', partyCode);
      return res.status(400).json({
        error: 'Game already in progress'
      });
    }

    console.log('Before adding player, current players:', game.getPlayers().length);
    const playerId = gameManager.addPlayer(partyCode, username, fingerprint);
    console.log('After adding player, current players:', game.getPlayers().length);
    console.log('All players:', game.getPlayers().map(p => ({ username: p.username, fingerprint: p.fingerprint })));

    res.json({
      success: true,
      playerId
    });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({
      error: error.message || 'Failed to join game'
    });
  }
});

// Get game state
router.get('/state/:partyCode', (req, res) => {
  try {
    const { partyCode } = req.params;
    const game = gameManager.getGame(partyCode);

    if (!game) {
      return res.status(404).json({
        error: 'Game not found'
      });
    }

    res.json({
      success: true,
      game: game.getPublicState()
    });
  } catch (error) {
    console.error('Error getting game state:', error);
    res.status(500).json({
      error: 'Failed to get game state'
    });
  }
});

// Check if game exists
router.get('/exists/:partyCode', (req, res) => {
  const { partyCode } = req.params;
  const exists = gameManager.gameExists(partyCode);

  res.json({ exists });
});

// Add this route to check game state
router.get('/debug/:partyCode', (req, res) => {
  const { partyCode } = req.params;
  const game = gameManager.getGame(partyCode);

  if (!game) {
    return res.json({ error: 'Game not found' });
  }

  res.json({
    partyCode,
    playerCount: game.getPlayers().length,
    players: game.getPlayers().map(p => ({
      username: p.username,
      fingerprint: p.fingerprint,
      connected: p.connected,
      isLeader: p.isLeader
    })),
    status: game.status
  });
});

module.exports = router;