// client/src/components/ChatBox.jsx
import React, { useRef, useEffect } from 'react';

const ChatBox = ({ chats, onSendMessage, message, setMessage, canSend, currentTurn, players }) => {
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  const getCurrentPlayer = () => {
    return players.find(p => p.fingerprint === currentTurn);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="h-96 overflow-y-auto mb-4 space-y-2">
        {chats.map((chat, index) => (
          <div key={index} className="bg-gray-700 rounded p-3">
            <div className="flex justify-between items-start mb-1">
              <span className="font-semibold text-blue-400">{chat.username}</span>
              <span className="text-xs text-gray-500">Round {chat.round}</span>
            </div>
            <p className="text-gray-200">{chat.message}</p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {canSend ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
            className="flex-1 px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
            autoFocus
          />
          <button
            onClick={onSendMessage}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition duration-200"
          >
            Send
          </button>
        </div>
      ) : (
        <div className="text-center py-2 text-gray-400">
          {getCurrentPlayer() ? (
            <span>Waiting for {getCurrentPlayer().username} to send a message...</span>
          ) : (
            <span>Waiting for next turn...</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatBox;