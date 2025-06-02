// server/src/game/gameManager.js
const Game = require('./Game');

class GameManager {
  constructor() {
    this.games = new Map();
  }

  generatePartyCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;

    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
    } while (this.games.has(code));

    return code;
  }

  createGame(username, fingerprint) {
    const partyCode = this.generatePartyCode();
    const game = new Game(partyCode);

    const playerId = game.addPlayer(username, fingerprint, true);
    this.games.set(partyCode, game);

    // Clean up old games periodically
    this.cleanupOldGames();

    return { partyCode, playerId };
  }

  getGame(partyCode) {
    return this.games.get(partyCode);
  }

  gameExists(partyCode) {
    return this.games.has(partyCode);
  }

  addPlayer(partyCode, username, fingerprint) {
    const game = this.getGame(partyCode);
    if (!game) {
      throw new Error('Game not found');
    }

    return game.addPlayer(username, fingerprint, false);
  }

  removeGame(partyCode) {
    this.games.delete(partyCode);
  }

  cleanupOldGames() {
    const now = Date.now();
    const maxAge = 4 * 60 * 60 * 1000; // 4 hours

    for (const [code, game] of this.games.entries()) {
      if (now - game.createdAt > maxAge) {
        this.games.delete(code);
      }
    }
  }

  getActiveGamesCount() {
    return this.games.size;
  }
}

module.exports = new GameManager();