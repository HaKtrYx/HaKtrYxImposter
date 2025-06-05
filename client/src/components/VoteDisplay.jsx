// client/src/components/VoteDisplay.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const VoteDisplay = ({ votes, imposters, caught, players }) => {
  const chartData = Object.entries(votes).map(([fingerprint, voteCount]) => ({
    name: players.find(p => p.fingerprint === fingerprint)?.username || 'Unknown',
    votes: voteCount,
    isImposter: imposters.includes(fingerprint),
    fingerprint
  }));

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Vote Results</h2>

      <div className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="name"
              stroke="#9CA3AF"
              tick={{ fill: props => props.isImposter ? '#EF4444' : '#9CA3AF' }}
            />
            <YAxis stroke="#9CA3AF" />
            <Bar
              dataKey="votes"
              fill={(entry) => entry.isImposter ? '#EF4444' : '#60A5FA'}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {caught?.length > 0 ? (
          <div>
            <p className="text-green-400 font-semibold mb-2">
              Caught Imposters:
            </p>
            <div className="flex flex-wrap gap-2">
              {caught.map(fingerprint => (
                <span key={fingerprint} className="px-3 py-1 bg-red-600 rounded text-white">
                  {players.find(p => p.fingerprint === fingerprint)?.username}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-yellow-400">
            No imposters were caught this round. The game continues...
          </p>
        )}
      </div>
    </div>
  );
};

export default VoteDisplay;