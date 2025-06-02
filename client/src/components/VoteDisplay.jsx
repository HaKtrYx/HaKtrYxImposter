// client/src/components/VoteDisplay.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const VoteDisplay = ({ votes, imposters, caught, players }) => {
  const chartData = votes.map(vote => ({
    name: vote.username,
    votes: vote.votes,
    isImposter: imposters.includes(vote.fingerprint)
  }));

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Vote Results</h2>

      <div className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Bar
              dataKey="votes"
              fill="#3B82F6"
              label={{ fill: '#F3F4F6', fontSize: 12 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {caught.length > 0 ? (
          <div>
            <p className="text-green-400 font-semibold">Imposters caught:</p>
            <div className="flex gap-2 mt-1">
              {caught.map(fp => {
                const player = players.find(p => p.fingerprint === fp);
                return (
                  <span key={fp} className="px-3 py-1 bg-red-600 rounded">
                    {player?.username}
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-red-400 font-semibold">No imposters were caught!</p>
        )}
      </div>
    </div>
  );
};

export default VoteDisplay;