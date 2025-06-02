// client/src/components/RoleButton.jsx
import React, { useState } from 'react';

const RoleButton = ({ role, word }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`px-6 py-3 rounded-lg font-semibold transition duration-200 ${
          role === 'imposter' 
            ? 'bg-red-600 hover:bg-red-700' 
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        Role
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 p-3 bg-gray-900 rounded-lg shadow-lg z-10 min-w-[200px]">
          <p className="font-semibold mb-1">
            You are: <span className={role === 'imposter' ? 'text-red-400' : 'text-green-400'}>
              {role === 'imposter' ? 'Imposter' : 'Crewmate'}
            </span>
          </p>
          {role === 'crewmate' && word && (
            <p>Word: <span className="font-bold text-blue-400">{word}</span></p>
          )}
          {role === 'imposter' && (
            <p className="text-sm text-gray-400">Try to blend in!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleButton;