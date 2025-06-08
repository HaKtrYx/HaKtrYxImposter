// client/src/contexts/GameContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { getDeviceFingerprint } from '../utils/fingerprint';
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: true
});

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const { socket } = useSocket();
  const [gameState, setGameState] = useState(() => {
    // Load initial state from localStorage
    const saved = localStorage.getItem('gameState');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure players is always an array
      return {
        ...parsed,
        players: Array.isArray(parsed.players) ? parsed.players : []
      };
    }
    
    return {
      partyCode: null,
      username: null,
      fingerprint: null,
      isLeader: false,
      players: [],
      gameStatus: 'waiting',
      settings: {
        imposterCount: 1,
        maxChatRounds: 3
      },
      // Game state
      role: null,
      word: null,
      currentRound: 1,
      currentTurn: null,
      chats: [],
      votes: {},
      finalMessages: [],
      voteResults: null,
      gameResult: null
    };
  });

  // Save to localStorage whenever gameState changes
  useEffect(() => {
    if (gameState.partyCode && gameState.username) {
      localStorage.setItem('gameState', JSON.stringify(gameState));
    }
  }, [gameState]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Debug: Log ALL socket events
    const originalEmit = socket.emit;
    socket.emit = function(...args) {
      console.log('Socket emitting:', args[0], args[1]);
      return originalEmit.apply(socket, args);
    };

    const originalOn = socket.on;
    socket.on = function(event, handler) {
      return originalOn.call(socket, event, function(...args) {
        console.log(`Socket received [${event}]:`, args);
        return handler.apply(this, args);
      });
    };

    // When successfully joined a game
    socket.on('game-state', (state) => {
      console.log('Received game-state:', {
        ...state,
        playerCount: state.players?.length,
        playerNames: state.players?.map(p => p.username)
      });
      
      setGameState(prev => {
        // Merge the new state but preserve local data like fingerprint if not provided
        const newState = {
          ...prev,
          ...state,
          // Ensure we don't lose our fingerprint
          fingerprint: state.fingerprint || prev.fingerprint,
          // Ensure players is always an array
          players: Array.isArray(state.players) ? state.players : []
        };
        console.log('Updated game state:', newState);
        return newState;
      });
    });

    // When players join/leave
    socket.on('players-updated', (players) => {
      console.log('Players updated event received:', {
        players,
        playerCount: players?.length,
        playerNames: players?.map(p => p.username)
      });
      
      setGameState(prev => {
        // Only update players array, preserve everything else
        const newState = {
          ...prev,
          players: Array.isArray(players) ? players : []
        };
        console.log('State after players update:', {
          ...newState,
          playerCount: newState.players.length
        });
        return newState;
      });
    });

    // When game starts
    socket.on('game-started', (state) => {
      console.log('Game started:', state);
      setGameState(prev => ({
        ...prev,
        ...state,
        gameStatus: 'playing',
        // Ensure players array is preserved if not included in state
        players: state.players || prev.players
      }));
    });

    // When receiving a new chat message
    socket.on('new-chat', (chat) => {
      setGameState(prev => ({
        ...prev,
        chats: [...prev.chats, chat]
      }));
    });

    // Turn updates
    socket.on('turn-update', ({ currentTurn }) => {
      setGameState(prev => ({
        ...prev,
        currentTurn
      }));
    });

    // Round updates
    socket.on('round-update', ({ round, currentTurn }) => {
      setGameState(prev => ({
        ...prev,
        currentRound: round,
        currentTurn
      }));
    });

    // Voting phase
    socket.on('voting-phase', ({ type }) => {
      setGameState(prev => ({
        ...prev,
        gameStatus: type === 'continue' ? 'voting-continue' : 'voting-imposter'
      }));
    });

    // Continue playing
    socket.on('continue-playing', ({ round, currentTurn }) => {
      setGameState(prev => ({
        ...prev,
        gameStatus: 'playing',
        currentRound: round,
        currentTurn
      }));
    });

    // Vote results
socket.on('vote-results', (results) => {
  console.log('Vote results received:', results);
  setGameState(prev => ({
    ...prev,
    voteResults: results
  }));
});

    // Final messages phase
    socket.on('final-messages-phase', () => {
      setGameState(prev => ({
        ...prev,
        gameStatus: 'final-messages'
      }));
    });

    // New final message
    socket.on('new-final-message', (message) => {
      setGameState(prev => ({
        ...prev,
        finalMessages: [...prev.finalMessages, message]
      }));
    });

    // Game ended
    socket.on('game-ended', (result) => {
      setGameState(prev => ({
        ...prev,
        gameStatus: 'ended',
        gameResult: result
      }));
    });

    // Game reset
    socket.on('game-reset', ({ status, players }) => {
      setGameState(prev => ({
        ...prev,
        gameStatus: status,
        players: Array.isArray(players) ? players : [],
        role: null,
        word: null,
        currentRound: 1,
        currentTurn: null,
        chats: [],
        votes: {},
        finalMessages: [],
        voteResults: null,
        gameResult: null
      }));
    });

    // Player disconnected
    socket.on('player-disconnected', ({ fingerprint }) => {
      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p => 
          p.fingerprint === fingerprint 
            ? { ...p, connected: false }
            : p
        )
      }));
    });

    // Error handling
    socket.on('error', ({ message }) => {
      console.error('Game error:', message);
    });

    socket.on('game-not-found', () => {
      console.error('Game not found');
      clearGameState();
    });

    return () => {
      socket.off('game-state');
      socket.off('players-updated');
      socket.off('game-started');
      socket.off('new-chat');
      socket.off('turn-update');
      socket.off('round-update');
      socket.off('voting-phase');
      socket.off('continue-playing');
      socket.off('vote-results');
      socket.off('final-messages-phase');
      socket.off('new-final-message');
      socket.off('game-ended');
      socket.off('game-reset');
      socket.off('player-disconnected');
      socket.off('error');
      socket.off('game-not-found');
    };
  }, [socket]);

  const updateGameState = (updates) => {
    setGameState(prev => ({ ...prev, ...updates }));
  };

  const clearGameState = () => {
    localStorage.removeItem('gameState');
    setGameState({
      partyCode: null,
      username: null,
      fingerprint: null,
      isLeader: false,
      players: [],
      gameStatus: 'waiting',
      settings: {
        imposterCount: 1,
        maxChatRounds: 3
      },
      role: null,
      word: null,
      currentRound: 1,
      currentTurn: null,
      chats: [],
      votes: {},
      finalMessages: [],
      voteResults: null,
      gameResult: null
    });
  };

  const updateSettings = (settings) => {
    setGameState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings }
    }));
  };

  // At the bottom of GameContext.jsx, add these functions before the return statement:
  const joinGame = (partyCode, username, fingerprint) => {
    setGameState(prev => ({
      ...prev,
      partyCode,
      username,
      fingerprint
    }));
  };

  const createGame = (partyCode, username, fingerprint) => {
    setGameState(prev => ({
      ...prev,
      partyCode,
      username,
      fingerprint,
      isLeader: true
    }));
  };

  // Then update the context provider value:
  return (
    <GameContext.Provider value={{
      gameState,
      updateGameState,
      clearGameState,
      updateSettings,
      joinGame,      // Add this
      createGame     // Add this
    }}>
      {children}
    </GameContext.Provider>
  );
};
