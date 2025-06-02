// client/src/pages/LandingPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext';
import { getUserIdentifier } from '../utils/fingerprint';
import toast from 'react-hot-toast';

const LandingPage = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { gameState, setGameState } = useGame();
  const [mode, setMode] = useState(null);
  const [username, setUsername] = useState('');
  const [partyCode, setPartyCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('party-created', ({ partyCode, party }) => {
      setGameState(prev => ({ ...prev, partyCode, isLeader: true }));
      navigate(`/waiting/${partyCode}`);
    });

    socket.on('party-state', (party) => {
      navigate(`/waiting/${party.code}`);
    });

    socket.on('error', ({ message }) => {
      toast.error(message);
      setLoading(false);
    });

    return () => {
      socket.off('party-created');
      socket.off('party-state');
      socket.off('error');
    };
  }, [socket, navigate, setGameState]);

  const handleCreateParty = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setLoading(true);
    const userIdentifier = await getUserIdentifier(username, null);
    setGameState(prev => ({ ...prev, username, fingerprint: userIdentifier.fingerprint }));

    socket.emit('create-party', {
      username,
      fingerprint: userIdentifier.fingerprint
    });
  };

  const handleJoinParty = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    if (!partyCode.trim() || partyCode.length !== 6) {
      toast.error('Please enter a valid 6-digit party code');
      return;
    }

    setLoading(true);
    const userIdentifier = await getUserIdentifier(username, partyCode.toUpperCase());
    setGameState(prev => ({ ...prev, username, fingerprint: userIdentifier.fingerprint }));

    socket.emit('join-party', {
      partyCode: partyCode.toUpperCase(),
      username,
      fingerprint: userIdentifier.fingerprint
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Imposter Word Game</h1>
          <p className="text-gray-400">Find the imposter among your friends!</p>
        </div>

        {!mode ? (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition duration-200"
            >
              Create Party
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition duration-200"
            >
              Join Party
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 p-6 rounded-lg space-y-4">
            <button
              onClick={() => setMode(null)}
              className="text-gray-400 hover:text-white transition"
            >
              ← Back
            </button>

            <h2 className="text-2xl font-semibold">
              {mode === 'create' ? 'Create New Party' : 'Join Existing Party'}
            </h2>

            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your username"
                maxLength={20}
              />
            </div>

            {mode === 'join' && (
              <div>
                <label className="block text-sm font-medium mb-2">Party Code</label>
                <input
                  type="text"
                  value={partyCode}
                  onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="6-DIGIT CODE"
                  maxLength={6}
                />
              </div>
            )}

            <button
              onClick={mode === 'create' ? handleCreateParty : handleJoinParty}
              disabled={loading}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition duration-200"
            >
              {loading ? 'Loading...' : mode === 'create' ? 'Create Party' : 'Join Party'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;