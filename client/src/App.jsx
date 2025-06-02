import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './contexts/SocketContext';
import { GameProvider } from './contexts/GameContext';
import HomePage from './pages/HomePage';
import WaitingRoom from './pages/WaitingRoom';
import GameRoom from './pages/GameRoom';

function App() {
  return (
    <Router>
      <SocketProvider>
        <GameProvider>
          <div className="min-h-screen bg-gray-900 text-white">
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1f2937',
                  color: '#fff',
                },
              }}
            />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/waiting/:partyCode" element={<WaitingRoom />} />
              <Route path="/game/:partyCode" element={<GameRoom />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </GameProvider>
      </SocketProvider>
    </Router>
  );
}

export default App;