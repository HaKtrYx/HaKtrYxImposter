// client/src/pages/GameRoom.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext';
import ChatBox from '../components/ChatBox';
import RoleButton from '../components/RoleButton';
import VoteDisplay from '../components/VoteDisplay';
import PlayerList from '../components/PlayerList';
import toast from 'react-hot-toast';

const GameRoom = () => {
  const { partyCode } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { gameState } = useGame();
  const [message, setMessage] = useState('');
  const [selectedVote, setSelectedVote] = useState(null);
  const [finalMessage, setFinalMessage] = useState('');

// Debug logs
console.log('GameRoom rendering with:', {
  partyCode,
  gameStatus: gameState.gameStatus,
  currentTurn: gameState.currentTurn,
  myFingerprint: gameState.fingerprint,
  isMyTurn: gameState.currentTurn === gameState.fingerprint,
  players: gameState.players.map(p => ({ username: p.username, fingerprint: p.fingerprint })),
  role: gameState.role,
  word: gameState.word
});

// Add this useEffect to track turn changes
useEffect(() => {
  console.log('Turn system debug:', {
    myFingerprint: gameState.fingerprint,
    currentTurn: gameState.currentTurn,
    turnOrder: gameState.turnOrder,
    isMyTurn: gameState.currentTurn === gameState.fingerprint,
    gameStatus: gameState.gameStatus
  });
}, [gameState.currentTurn, gameState.fingerprint, gameState.turnOrder, gameState.gameStatus]);
  // Remove the problematic redirect - let the game logic handle navigation
  useEffect(() => {
    // Only redirect if explicitly told game doesn't exist
    if (gameState.gameStatus === 'not-found') {
      navigate('/');
    }
  }, [gameState.gameStatus, navigate]);

  // Show loading state while socket connects
  if (!socket || !socket.connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-xl text-white">Connecting to server...</div>
      </div>
    );
  }

  // Don't block rendering if partyCode doesn't match yet - it might be updating
  const handleSendChat = () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    socket.emit('send-chat', {
      partyCode,
      message: message.trim()
    });
    setMessage('');
  };

  const handleVote = (voteType, vote) => {
  console.log('Voting:', { voteType, vote, partyCode });
  socket.emit('submit-vote', {
    partyCode,
    voteType,
    vote
  });
  setSelectedVote(vote);
};

// Add this debugging
useEffect(() => {
  console.log('GameRoom vote debug:', {
    gameStatus: gameState.gameStatus,
    players: gameState.players,
    playerCount: gameState.players.length,
    selectedVote,
    isVotingImposter: gameState.gameStatus === 'voting-imposter'
  });
}, [gameState.gameStatus, gameState.players, selectedVote]);
// Add this after line 88 (after the vote debug useEffect)
// Reset selected vote when game status changes
useEffect(() => {
  setSelectedVote(null);
}, [gameState.gameStatus]);

  const handleSendFinalMessage = () => {
    if (!finalMessage.trim()) {
      toast.error('Please enter a final message');
      return;
    }

    socket.emit('send-final-message', {
      partyCode,
      message: finalMessage.trim()
    });
    setFinalMessage('');
  };

  const handleNewGame = () => {
    socket.emit('new-game', { partyCode });
  };

const isMyTurn = gameState.currentTurn === gameState.fingerprint;
  // Provide default values to prevent crashes
  const players = gameState.players || [];
  const chats = gameState.chats || [];
  const finalMessages = gameState.finalMessages || [];
  const currentRound = gameState.currentRound || 1;
  const settings = gameState.settings || { maxChatRounds: 3 };

  return (
    <div className="min-h-screen p-4 bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Header */}
            <div className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">Round {currentRound}</h1>
                <p className="text-gray-400">
                  {gameState.gameStatus === 'waiting' && 'Waiting for players...'}
                  {gameState.gameStatus === 'playing' && 'Chat Phase'}
                  {gameState.gameStatus === 'voting-continue' && 'Vote: Continue or Find Imposter?'}
                  {gameState.gameStatus === 'voting-imposter' && 'Vote for the Imposter!'}
                  {gameState.gameStatus === 'final-messages' && 'Final Messages'}
                  {gameState.gameStatus === 'ended' && 'Game Over'}
                </p>
              </div>
              {gameState.role && <RoleButton role={gameState.role} word={gameState.word} />}
            </div>

            {/* Chat Area */}
            {(gameState.gameStatus === 'playing' || gameState.gameStatus === 'ended') && (
              <ChatBox
                chats={chats}
                onSendMessage={handleSendChat}
                message={message}
                setMessage={setMessage}
                canSend={isMyTurn && gameState.gameStatus === 'playing'}
                currentTurn={gameState.currentTurn}
                players={players}
              />
            )}

            {/* Voting Area */}
            {gameState.gameStatus === 'voting-continue' && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-white">Continue Playing or Vote for Imposter?</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleVote('continue', 'continue')}
                    disabled={selectedVote !== null}
                    className="py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition duration-200"
                  >
                    Continue Playing
                  </button>
                  <button
                    onClick={() => handleVote('continue', 'vote')}
                    disabled={selectedVote !== null}
                    className="py-4 px-6 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition duration-200"
                  >
                    Vote for Imposter
                  </button>
                </div>
                {selectedVote && (
                  <p className="mt-4 text-center text-gray-400">
                    You voted to {selectedVote === 'continue' ? 'continue playing' : 'find the imposter'}
                  </p>
                )}
              </div>
            )}

            {gameState.gameStatus === 'voting-imposter' && (
  <div className="bg-gray-800 rounded-lg p-6">
    <h2 className="text-xl font-semibold mb-4">Who is the Imposter?</h2>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {gameState.players
        .filter(p => p.fingerprint !== gameState.fingerprint)
        .map(player => (
          <button
            key={player.fingerprint}
            onClick={() => handleVote('imposter', player.fingerprint)}
            disabled={selectedVote !== null}
            className="py-3 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded-lg font-medium transition duration-200"
          >
            {player.username}
          </button>
        ))}
    </div>
    {selectedVote && (
      <p className="mt-4 text-center text-gray-400">
        You voted for {gameState.players.find(p => p.fingerprint === selectedVote)?.username}
      </p>
    )}
  </div>
)}

            {/* Vote Results */}
{gameState.voteResults && (
  <>
    {console.log('Displaying vote results:', gameState.voteResults)}
    <VoteDisplay
      votes={gameState.voteResults.votes}
      imposters={gameState.voteResults.imposters}
      caught={gameState.voteResults.caught}
      players={players}
    />
  </>
)}

            {/* Final Messages */}
            {gameState.gameStatus === 'final-messages' && gameState.role === 'imposter' && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-white">Send Your Final Message</h2>
                <p className="text-gray-400 mb-4">You've been caught! Send one last message to the crew.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={finalMessage}
                    onChange={(e) => setFinalMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendFinalMessage()}
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type your final message..."
                  />
                  <button
                    onClick={handleSendFinalMessage}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition duration-200"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

            {/* Final Messages Display */}
            {finalMessages.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-white">Final Messages from Imposters</h2>
                <div className="space-y-3">
                  {finalMessages.map((msg, index) => (
                    <div key={index} className="bg-gray-700 rounded p-3">
                      <p className="font-semibold text-red-400">{msg.username} (Imposter):</p>
                      <p className="mt-1 text-white">{msg.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Game Over */}
            {gameState.gameStatus === 'ended' && gameState.gameResult && (
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <h2 className="text-3xl font-bold mb-4">
                  {gameState.gameResult.winners === 'imposters' ? (
                    <span className="text-red-500">Imposters Win!</span>
                  ) : (
                    <span className="text-green-500">Crewmates Win!</span>
                  )}
                </h2>
                <p className="text-xl mb-4 text-white">The word was: <span className="font-bold">{gameState.gameResult.word}</span></p>
                <div className="mb-6">
                  <p className="text-gray-400 mb-2">The imposters were:</p>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {gameState.gameResult.imposters.map(fp => {
                      const player = players.find(p => p.fingerprint === fp);
                      return (
                        <span key={fp} className="px-3 py-1 bg-red-600 rounded text-white">
                          {player?.username}
                        </span>
                      );
                    })}
                  </div>
                </div>
                {gameState.isLeader && (
                  <button
                    onClick={handleNewGame}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition duration-200"
                  >
                    Start New Game
                  </button>
                )}
              </div>
            )}

            {/* Waiting State */}
            {gameState.gameStatus === 'waiting' && (
              <div className="bg-gray-800 rounded-lg p-6 text-center">
                <h2 className="text-xl font-semibold mb-4 text-white">Waiting for game to start...</h2>
                <p className="text-gray-400">The party leader will start the game when everyone is ready.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-4 sticky top-4">
              <h3 className="text-lg font-semibold mb-3 text-white">Players</h3>
              <PlayerList
                players={players}
                currentTurn={gameState.currentTurn}
                showTurnIndicator={gameState.gameStatus === 'playing'}
              />

              {gameState.gameStatus === 'playing' && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-sm text-gray-400">
                    Round {currentRound} of {settings.maxChatRounds}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom;