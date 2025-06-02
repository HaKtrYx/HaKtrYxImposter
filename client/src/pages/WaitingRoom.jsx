// client/src/pages/WaitingRoom.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext';
import PlayerList from '../components/PlayerList';
import toast from 'react-hot-toast';

const WaitingRoom = () => {
  const { partyCode } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { gameState, updateSettings } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    imposterCount: 1,
    maxChatRounds: 3
  });

  // Ensure players is always an array
  const players = gameState.players || [];

  console.log('WaitingRoom render:', {
    partyCode,
    gameState,
    hasUsername: !!gameState.username,
    hasPartyCode: !!gameState.partyCode,
    players: players
  });

  // Navigate to game room if game starts
  useEffect(() => {
    if (gameState.gameStatus === 'playing') {
      navigate(`/game/${partyCode}`);
    }
  }, [gameState.gameStatus, navigate, partyCode]);

  // Update local settings when game settings change
  useEffect(() => {
    if (gameState.settings) {
      setSettings(gameState.settings);
    }
  }, [gameState.settings]);

  // Check if user has required game state, with delay to allow state to load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!gameState.username || !gameState.partyCode) {
        console.log('No game state found, redirecting to home');
        navigate('/');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [gameState.username, gameState.partyCode, navigate]);

  // Emit join-game when socket connects or reconnects
  useEffect(() => {
    if (gameState.partyCode && gameState.username && gameState.fingerprint && socket && socket.connected) {
      console.log('Emitting join-game:', {
        partyCode: gameState.partyCode,
        fingerprint: gameState.fingerprint
      });
      socket.emit('join-game', {
        partyCode: gameState.partyCode,
        fingerprint: gameState.fingerprint
      });
    }
  }, [socket?.connected, gameState.partyCode, gameState.username, gameState.fingerprint, socket]);

  // Debug log for players
  useEffect(() => {
    console.log('WaitingRoom - Players updated:', {
      players: players,
      playerCount: players.length,
      isLeader: gameState.isLeader
    });
  }, [players, gameState.isLeader]);

  const handleStartGame = () => {
    if (players.length < 3) {
      toast.error('Need at least 3 players to start');
      return;
    }

    console.log('Starting game with settings:', settings);
    socket.emit('start-game', { partyCode, settings });
  };

  const handleSettingsChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateSettings(newSettings);
  };

  const copyPartyCode = () => {
    navigator.clipboard.writeText(partyCode);
    toast.success('Party code copied!');
  };

  const maxImposters = Math.max(1, Math.floor(players.length / 2) - 1) || 1;

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Waiting Room</h1>
          <div className="bg-gray-800 rounded-lg p-4 inline-block">
            <p className="text-gray-400 mb-2">Party Code:</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-mono font-bold text-white tracking-wider">
                {partyCode}
              </span>
              <button
                onClick={copyPartyCode}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition duration-200"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Players List */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Players ({players.length})
            </h2>
            <PlayerList players={players} showTurnIndicator={false} />
            {players.length < 3 && (
              <p className="text-yellow-500 text-sm mt-4">
                Need at least 3 players to start
              </p>
            )}
          </div>

          {/* Game Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Game Settings</h2>

            {gameState.isLeader ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Number of Imposters
                  </label>
                  <select
                    value={settings.imposterCount}
                    onChange={(e) => handleSettingsChange('imposterCount', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[...Array(Math.max(1, maxImposters))].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} Imposter{i > 0 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Chat Rounds
                  </label>
                  <select
                    value={settings.maxChatRounds}
                    onChange={(e) => handleSettingsChange('maxChatRounds', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[2, 3, 4, 5].map(rounds => (
                      <option key={rounds} value={rounds}>
                        {rounds} Rounds
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleStartGame}
                  disabled={players.length < 3}
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition duration-200"
                >
                  Start Game
                </button>
              </div>
            ) : (
              <div className="text-gray-400">
                <p className="mb-2">Imposters: {settings.imposterCount}</p>
                <p className="mb-4">Chat Rounds: {settings.maxChatRounds}</p>
                <p className="text-sm">Waiting for the party leader to start the game...</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition duration-200"
          >
            Leave Game
          </button>
        </div>

        {/* Debug info - remove in production */}
        <div className="mt-4 p-4 bg-gray-900 rounded text-xs font-mono">
          <p>Debug Info:</p>
          <p>Players in state: {players.length}</p>
          <p>Players: {JSON.stringify(players.map(p => p.username))}</p>
          <p>My fingerprint: {gameState.fingerprint}</p>
          <p>Socket connected: {socket?.connected ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;