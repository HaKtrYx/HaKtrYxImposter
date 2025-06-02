// client/src/pages/HomePage.jsx (continued)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext';
import { getDeviceFingerprint } from '../utils/fingerprint';
import toast from 'react-hot-toast';

const HomePage = () => {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { createGame, joinGame } = useGame();
  const [username, setUsername] = useState('');
  const [partyCode, setPartyCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateGame = async () => {
    if (!username.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!connected) {
      toast.error('Not connected to server');
      return;
    }

    setIsCreating(true);
    try {
      const fingerprint = await getDeviceFingerprint();
      console.log('Creating game with fingerprint:', fingerprint);

      console.log('Creating game with:', { username, fingerprint });

      const response = await fetch('http://localhost:3001/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, fingerprint })
      });

      const data = await response.json();
      console.log('Create game response:', data);

      if (data.success) {
        createGame(data.partyCode, username, fingerprint);

        // Ensure socket is connected before emitting
        if (socket && socket.connected) {
          console.log('Emitting join-game:', { partyCode: data.partyCode, fingerprint });
          socket.emit('join-game', { partyCode: data.partyCode, fingerprint });
        } else {
          console.error('Socket not connected');
          toast.error('Connection issue, please try again');
          return;
        }

        navigate(`/waiting/${data.partyCode}`);
      } else {
        toast.error(data.error || 'Failed to create game');
      }
    } catch (error) {
      toast.error('Failed to create game');
      console.error('Create game error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGame = async () => {
    if (!username.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!partyCode.trim()) {
      toast.error('Please enter a party code');
      return;
    }

    if (!connected) {
      toast.error('Not connected to server');
      return;
    }

    setIsJoining(true);
    try {
      const fingerprint = await getDeviceFingerprint();
      console.log('Joining game with fingerprint:', fingerprint);
      const upperPartyCode = partyCode.toUpperCase();

      console.log('Joining game with:', { partyCode: upperPartyCode, username, fingerprint });

      const response = await fetch('http://localhost:3001/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyCode: upperPartyCode,
          username,
          fingerprint
        })
      });

      const data = await response.json();
      console.log('Join game response:', data);

      if (data.success) {
        joinGame(upperPartyCode, username, fingerprint);

        // Ensure socket is connected before emitting
        if (socket && socket.connected) {
          console.log('Emitting join-game:', { partyCode: upperPartyCode, fingerprint });
          socket.emit('join-game', {
            partyCode: upperPartyCode,
            fingerprint
          });
        } else {
          console.error('Socket not connected');
          toast.error('Connection issue, please try again');
          return;
        }

        navigate(`/waiting/${upperPartyCode}`);
      } else {
        toast.error(data.error || 'Failed to join game');
      }
    } catch (error) {
      toast.error('Failed to join game');
      console.error('Join game error:', error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-2">Imposter Game</h1>
          <p className="text-gray-400">Find the imposter among your friends!</p>
          {!connected && (
            <p className="text-yellow-500 text-sm mt-2">Connecting to server...</p>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 space-y-6">
          {/* Username Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
              maxLength={20}
            />
          </div>

          {/* Create Game */}
          <div className="space-y-3">
            <button
              onClick={handleCreateGame}
              disabled={isCreating || isJoining || !connected}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition duration-200"
            >
              {isCreating ? 'Creating...' : 'Create New Game'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">OR</span>
            </div>
          </div>

          {/* Join Game */}
          <div className="space-y-3">
            <input
              type="text"
              value={partyCode}
              onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-xl tracking-wider"
              placeholder="PARTY CODE"
              maxLength={6}
            />
            <button
              onClick={handleJoinGame}
              disabled={isJoining || isCreating || !connected}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition duration-200"
            >
              {isJoining ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm">
          <p>Create a game and share the party code with your friends!</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;