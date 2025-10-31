import React, { useState, useCallback, useRef } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { type TranscriptMessage } from './types';
import { Transcript } from './components/Transcript';
import { ConversationControls } from './components/ConversationControls';
import { BotIcon, GithubIcon } from './components/IconComponents';

const App: React.FC = () => {
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Click the microphone to start');
  const lastUserMessageRef = useRef<HTMLDivElement>(null);

  const onTranscriptUpdate = useCallback((newTranscript: TranscriptMessage[]) => {
    setTranscript(newTranscript);
    setTimeout(() => {
        lastUserMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const onStatusUpdate = useCallback((message: string) => {
    setStatusMessage(message);
  }, []);
  
  const { startSession, endSession } = useGeminiLive(onTranscriptUpdate, onStatusUpdate);

  const handleStartSession = async () => {
    try {
      await startSession();
      setIsSessionActive(true);
      setTranscript([]);
    } catch (error) {
      console.error("Failed to start session:", error);
      setStatusMessage("Error: Could not start session.");
    }
  };

  const handleEndSession = () => {
    endSession();
    setIsSessionActive(false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
      <header className="flex items-center justify-between p-4 border-b border-slate-700 shadow-md bg-slate-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <BotIcon className="w-8 h-8 text-cyan-400" />
          <h1 className="text-xl font-bold tracking-wider text-slate-100">Gemini Sales Voice Bot</h1>
        </div>
        <a href="https://github.com/google/generative-ai-docs/tree/main/site/en/gemini-api/docs/get-started/web" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-cyan-400 transition-colors">
            <GithubIcon className="w-6 h-6" />
        </a>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex-1 overflow-y-auto mb-4 pr-2">
            <Transcript transcript={transcript} lastUserMessageRef={lastUserMessageRef} />
        </div>
      </main>

      <footer className="w-full max-w-4xl mx-auto p-4 flex flex-col items-center justify-center sticky bottom-0 bg-slate-900/80 backdrop-blur-sm">
        <ConversationControls
            isSessionActive={isSessionActive}
            onStart={handleStartSession}
            onStop={handleEndSession}
        />
        <p className="mt-4 text-sm text-slate-400 h-5 transition-opacity duration-300">
            {statusMessage}
        </p>
      </footer>
    </div>
  );
};

export default App;
