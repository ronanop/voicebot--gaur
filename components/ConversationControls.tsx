import React from 'react';
import { MicrophoneIcon, StopIcon } from './IconComponents';

interface ConversationControlsProps {
  isSessionActive: boolean;
  onStart: () => void;
  onStop: () => void;
}

export const ConversationControls: React.FC<ConversationControlsProps> = ({ isSessionActive, onStart, onStop }) => {
  return (
    <button
      onClick={isSessionActive ? onStop : onStart}
      className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50
        ${isSessionActive 
          ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400' 
          : 'bg-cyan-500 hover:bg-cyan-600 focus:ring-cyan-300'
        }`}
      aria-label={isSessionActive ? 'Stop conversation' : 'Start conversation'}
    >
      {isSessionActive && <span className="absolute animate-ping h-full w-full rounded-full bg-red-500 opacity-75"></span>}
      {isSessionActive ? (
        <StopIcon className="w-8 h-8 text-white" />
      ) : (
        <MicrophoneIcon className="w-8 h-8 text-white" />
      )}
    </button>
  );
};
