// client/src/components/PlayerList.jsx
import React from 'react';

const PlayerList = ({ players, currentTurn, showTurnIndicator }) => {
  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div
          key={player.fingerprint}
          className={`flex items-center justify-between p-2 rounded ${
            showTurnIndicator && currentTurn === player.fingerprint
              ? 'bg-blue-600'
              : 'bg-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              player.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className={`${!player.isConnected ? 'text-gray-500' : ''}`}>
              {player.username}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {player.isLeader && (
              <span className="text-xs bg-yellow-600 px-2 py-1 rounded">Leader</span>
            )}
            {showTurnIndicator && currentTurn === player.fingerprint && (
              <span className="text-xs">🎤</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlayerList;