// server/src/game/Game.js
const { words: WORDS } = require('../utils/words');
class Game {
  constructor(partyCode) {
    this.partyCode = partyCode;
    this.players = new Map();
    this.status = 'waiting'; // waiting, playing, voting-continue, voting-imposter, final-messages, ended
    this.settings = {
      imposterCount: 1,
      maxChatRounds: 3
    };
    this.currentRound = 1;
    this.chats = [];
    this.currentTurn = null;
    this.turnOrder = [];
    this.word = null;
    this.imposters = [];
    this.votes = new Map();
    this.finalMessages = [];
    this.caughtImposters = [];
    this.gameResult = null;
    this.createdAt = Date.now();
  }

  addPlayer(username, fingerprint, isLeader = false) {
    if (this.players.has(fingerprint)) {
      return fingerprint;
    }

    if (this.status !== 'waiting') {
      throw new Error('Game already in progress');
    }

    if (this.players.size >= 10) {
      throw new Error('Game is full');
    }

    this.players.set(fingerprint, {
      fingerprint,
      username,
      isLeader,
      connected: true,
      role: null
    });

    return fingerprint;
  }

  removePlayer(fingerprint) {
    if (this.status !== 'waiting') {
      throw new Error('Cannot remove player during game');
    }

    const player = this.players.get(fingerprint);
    if (!player) return;

    this.players.delete(fingerprint);

    // If leader left, assign new leader
    if (player.isLeader && this.players.size > 0) {
      const newLeader = this.players.values().next().value;
      newLeader.isLeader = true;
    }
  }

  setPlayerConnected(fingerprint, connected) {
    const player = this.players.get(fingerprint);
    if (player) {
      player.connected = connected;
    }
  }

  getPlayerByFingerprint(fingerprint) {
    return this.players.get(fingerprint);
  }

  getPlayers() {
    return Array.from(this.players.values());
  }

  updateSettings(settings) {
    if (this.status !== 'waiting') {
      throw new Error('Cannot change settings during game');
    }

    this.settings = { ...this.settings, ...settings };
  }

  startGame(settings) {
    if (this.status !== 'waiting') {
      throw new Error('Game already started');
    }

    if (this.players.size < 3) {
      throw new Error('Need at least 3 players to start');
    }

    if (settings) {
      this.updateSettings(settings);
    }

    // Validate imposter count
    const maxImposters = Math.floor(this.players.size / 2) - 1;
    if (this.settings.imposterCount > maxImposters) {
      this.settings.imposterCount = maxImposters;
    }

    // Select random word
    this.word = WORDS[Math.floor(Math.random() * WORDS.length)];

    // Assign roles
    const playerArray = Array.from(this.players.keys());
    const shuffled = [...playerArray].sort(() => Math.random() - 0.5);

    this.imposters = shuffled.slice(0, this.settings.imposterCount);

    // Set roles for all players
    this.players.forEach((player, fingerprint) => {
      player.role = this.imposters.includes(fingerprint) ? 'imposter' : 'crewmate';
    });

    // Set turn order
    this.turnOrder = [...playerArray].sort(() => Math.random() - 0.5);
    this.currentTurn = this.turnOrder[0];

    this.status = 'playing';
    this.currentRound = 1;
    this.chats = [];
  }

  getPlayerState(fingerprint) {
    const player = this.players.get(fingerprint);
    if (!player) return null;

    return {
      partyCode: this.partyCode,
      username: player.username,
      fingerprint: player.fingerprint,
      isLeader: player.isLeader,
      players: this.getPlayers(),
      settings: this.settings,
      gameStatus: this.status,
      role: player.role,
      word: player.role === 'crewmate' ? this.word : null,
      currentRound: this.currentRound,
      chats: this.chats,
      currentTurn: this.currentTurn,
      turnOrder: this.turnOrder,
      votes: Array.from(this.votes.entries()),
      finalMessages: this.finalMessages,
      caughtImposters: this.caughtImposters,
      gameResult: this.gameResult
    };
  }

  getPublicState() {
    return {
      partyCode: this.partyCode,
      players: this.getPlayers().map(p => ({
        username: p.username,
        fingerprint: p.fingerprint,
        isLeader: p.isLeader,
        connected: p.connected
      })),
      settings: this.settings,
      status: this.status,
      currentRound: this.currentRound,
      playerCount: this.players.size
    };
  }

  addChat(fingerprint, message) {
    const player = this.players.get(fingerprint);
    if (!player) {
      throw new Error('Player not found');
    }

    if (this.currentTurn !== fingerprint) {
      throw new Error('Not your turn');
    }

    const chat = {
      fingerprint,
      username: player.username,
      message,
      round: this.currentRound,
      timestamp: Date.now()
    };

    this.chats.push(chat);
    return chat;
  }

  nextTurn() {
    const currentIndex = this.turnOrder.indexOf(this.currentTurn);
    const nextIndex = (currentIndex + 1) % this.turnOrder.length;
    this.currentTurn = this.turnOrder[nextIndex];
  }

  shouldEndRound() {
    // Check if everyone has sent a message this round
    const messagesThisRound = this.chats.filter(chat => chat.round === this.currentRound);
    return messagesThisRound.length >= this.players.size;
  }

  nextRound() {
    this.currentRound++;
    this.currentTurn = this.turnOrder[0];
    this.votes.clear();
  }

  submitVote(fingerprint, voteType, vote) {
    if (!this.players.has(fingerprint)) {
      throw new Error('Player not found');
    }

    const voteKey = `${voteType}-${fingerprint}`;
    this.votes.set(voteKey, vote);
  }

  allVotesSubmitted(voteType) {
    let votedCount = 0;
    for (const [key, value] of this.votes) {
      if (key.startsWith(`${voteType}-`)) {
        votedCount++;
      }
    }
    return votedCount >= this.players.size;
  }

  processContinueVotes() {
    let continueVotes = 0;
    let stopVotes = 0;

    for (const [key, vote] of this.votes) {
      if (key.startsWith('continue-')) {
        if (vote === 'continue') {
          continueVotes++;
        } else {
          stopVotes++;
        }
      }
    }

    return {
      decision: continueVotes > stopVotes ? 'continue' : 'vote',
      continueVotes,
      stopVotes
    };
  }

  processImposterVotes() {
    const voteCount = new Map();

    // Count votes for each player
    for (const [key, votedFor] of this.votes) {
      if (key.startsWith('imposter-')) {
        voteCount.set(votedFor, (voteCount.get(votedFor) || 0) + 1);
      }
    }

    // Find who got the most votes
    let maxVotes = 0;
    let votedOut = [];

    for (const [fingerprint, count] of voteCount) {
      if (count > maxVotes) {
        maxVotes = count;
        votedOut = [fingerprint];
      } else if (count === maxVotes) {
        votedOut.push(fingerprint);
      }
    }

    // Check if any imposters were caught
    const caught = votedOut.filter(fp => this.imposters.includes(fp));
    this.caughtImposters = caught;

    return {
      votes: Object.fromEntries(voteCount),
      imposters: this.imposters,
      caught,
      votedOut
    };
  }

  addFinalMessage(fingerprint, message) {
    const player = this.players.get(fingerprint);
    if (!player) {
      throw new Error('Player not found');
    }

    // Check if player already sent a final message
    const alreadySent = this.finalMessages.some(msg => msg.fingerprint === fingerprint);
    if (alreadySent) {
      throw new Error('Final message already sent');
    }

    this.finalMessages.push({
      fingerprint,
      username: player.username,
      message,
      timestamp: Date.now()
    });
  }

  allFinalMessagesSent() {
    return this.finalMessages.length >= this.caughtImposters.length;
  }

  checkWinCondition() {
    const remainingImposters = this.imposters.filter(
      imp => !this.caughtImposters.includes(imp)
    );

    if (remainingImposters.length === 0) {
      // All imposters caught - crewmates win
      this.status = 'ended';
      this.gameResult = {
        winners: 'crewmates',
        imposters: this.imposters,
        word: this.word
      };
    } else if (this.currentRound > this.settings.maxChatRounds) {
      // Max rounds reached without catching all imposters - imposters win
      this.status = 'ended';
      this.gameResult = {
        winners: 'imposters',
        imposters: this.imposters,
        word: this.word
      };
    }
    // Otherwise, game continues
  }

  resetGame() {
    // Keep players but reset game state
    this.status = 'waiting';
    this.currentRound = 1;
    this.chats = [];
    this.currentTurn = null;
    this.turnOrder = [];
    this.word = null;
    this.imposters = [];
    this.votes.clear();
    this.finalMessages = [];
    this.caughtImposters = [];
    this.gameResult = null;

    // Reset player roles
    this.players.forEach(player => {
      player.role = null;
    });
  }
}

module.exports = Game;