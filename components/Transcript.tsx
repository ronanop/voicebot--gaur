import React from 'react';
import { type TranscriptMessage } from '../types';
import { UserIcon, BotIcon } from './IconComponents';

interface TranscriptProps {
  transcript: TranscriptMessage[];
  lastUserMessageRef: React.RefObject<HTMLDivElement>;
}

const TranscriptItem: React.FC<{ message: TranscriptMessage; isLastUserMessage: boolean; refProp: React.RefObject<HTMLDivElement> | null }> = ({ message, isLastUserMessage, refProp }) => {
    const isUser = message.speaker === 'user';
    const wrapperClasses = isUser ? 'justify-end' : 'justify-start';
    const bubbleClasses = isUser ? 'bg-cyan-600 rounded-br-none' : 'bg-slate-700 rounded-bl-none';
    const IconComponent = isUser ? UserIcon : BotIcon;
    const iconClasses = isUser ? 'text-cyan-300' : 'text-slate-400';

    return (
        <div ref={isLastUserMessage ? refProp : null} className={`flex items-start gap-3 w-full my-4 ${wrapperClasses}`}>
            {!isUser && <div className="w-8 h-8 flex-shrink-0"><IconComponent className={`w-8 h-8 p-1.5 rounded-full bg-slate-800 ${iconClasses}`} /></div>}
            <div className="max-w-xl">
                <div className={`p-4 rounded-xl shadow-md ${bubbleClasses}`}>
                    <p className="text-slate-100 whitespace-pre-wrap">{message.text}</p>
                </div>
                {message.speaker === 'bot' && message.sources && message.sources.length > 0 && (
                    <div className="mt-3">
                        <ul className="flex flex-wrap gap-2">
                            {message.sources.map((source, i) => (
                                <li key={i}>
                                    <a 
                                        href={source.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 px-3 py-1 rounded-full transition-colors truncate"
                                        title={source.title}
                                    >
                                        {source.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            {isUser && <div className="w-8 h-8 flex-shrink-0"><IconComponent className={`w-8 h-8 p-1 rounded-full bg-slate-800 ${iconClasses}`} /></div>}
        </div>
    );
};


export const Transcript: React.FC<TranscriptProps> = ({ transcript, lastUserMessageRef }) => {
    if (transcript.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <BotIcon className="w-24 h-24 mb-4" />
                <p className="text-lg">No conversation yet.</p>
                <p>Click the microphone to start talking.</p>
            </div>
        );
    }

    const lastUserMessageIndex = transcript.map(m => m.speaker).lastIndexOf('user');
    
    return (
    <div>
        {transcript.map((message, index) => (
            <TranscriptItem 
                key={index} 
                message={message} 
                isLastUserMessage={index === lastUserMessageIndex}
                refProp={lastUserMessageRef}
            />
        ))}
    </div>
    );
};
