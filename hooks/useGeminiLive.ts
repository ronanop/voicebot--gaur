import { useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { type TranscriptMessage, type Source } from '../types';
import { encode, decode, decodeAudioData } from '../services/audioUtils';

export const useGeminiLive = (
  onTranscriptUpdate: (transcript: TranscriptMessage[]) => void,
  onStatusUpdate: (message: string) => void
) => {
  const sessionRef = useRef<LiveSession | null>(null);
  const audioContextsRef = useRef<{
    input: AudioContext;
    output: AudioContext;
    scriptProcessor?: ScriptProcessorNode;
    micSource?: MediaStreamAudioSourceNode;
  } | null>(null);
  const audioQueueRef = useRef<{ buffer: AudioBuffer; startTime: number }[]>([]);
  const nextStartTimeRef = useRef(0);
  const audioPlaybackTimerRef = useRef<number | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  const currentTurnRef = useRef({ userInput: '', botOutput: '', botSources: [] as any[] });

  const processAudioQueue = useCallback(() => {
    if (!audioContextsRef.current) return;
    const { output: outputAudioContext } = audioContextsRef.current;

    while (audioQueueRef.current.length > 0 && audioQueueRef.current[0].startTime <= outputAudioContext.currentTime) {
      const { buffer } = audioQueueRef.current.shift()!;
      const source = outputAudioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(outputAudioContext.destination);
      source.start();
    }

    if (audioQueueRef.current.length > 0) {
      audioPlaybackTimerRef.current = window.setTimeout(processAudioQueue, 50);
    } else {
      onStatusUpdate('Listening...');
    }
  }, [onStatusUpdate]);

  const startSession = useCallback(async () => {
    onStatusUpdate('Initializing...');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
    const micSource = inputAudioContext.createMediaStreamSource(stream);

    audioContextsRef.current = { input: inputAudioContext, output: outputAudioContext, scriptProcessor, micSource };
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: "You are a friendly, persuasive, and highly effective customer support agent for Cache DigiTech. Your primary goal is to close sales by providing information about our services. All your information about services MUST come from the website https://cachedigitech.com. Use the provided search tool to find information on that website. Understand customer needs, highlight product benefits, and guide them towards making a purchase. Be helpful, confident, and professional.",
        tools: [{ googleSearch: {} }],
      },
      callbacks: {
        onopen: () => {
            onStatusUpdate('Listening...');
            micSource.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) {
                    int16[i] = inputData[i] * 32768;
                }
                const pcmBlob: Blob = {
                    data: encode(new Uint8Array(int16.buffer)),
                    mimeType: 'audio/pcm;rate=16000',
                };
                sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
        },
        onmessage: async (message: LiveServerMessage) => {
            if(message.serverContent?.inputTranscription) {
                currentTurnRef.current.userInput += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
                currentTurnRef.current.botOutput += message.serverContent.outputTranscription.text;
            }

            if (message.serverContent?.modelTurn?.candidates?.[0]?.groundingMetadata?.groundingChunks) {
              currentTurnRef.current.botSources.push(...message.serverContent.modelTurn.candidates[0].groundingMetadata.groundingChunks);
            }

            if(message.serverContent?.turnComplete) {
                const fullUserInput = currentTurnRef.current.userInput.trim();
                const fullBotOutput = currentTurnRef.current.botOutput.trim();

                if (fullUserInput) {
                    transcriptRef.current.push({ speaker: 'user', text: fullUserInput });
                }
                if (fullBotOutput) {
                    const sources: Source[] = currentTurnRef.current.botSources
                      .map(chunk => chunk.web)
                      .filter(web => web?.uri && web?.title)
                      .map(web => ({ uri: web.uri, title: web.title }));
                  
                    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

                    transcriptRef.current.push({ 
                        speaker: 'bot', 
                        text: fullBotOutput, 
                        sources: uniqueSources.length > 0 ? uniqueSources : undefined 
                    });
                }
                
                onTranscriptUpdate([...transcriptRef.current]);
                currentTurnRef.current = { userInput: '', botOutput: '', botSources: [] };
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
                onStatusUpdate('Bot is speaking...');
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                audioQueueRef.current.push({ buffer: audioBuffer, startTime: nextStartTimeRef.current });
                nextStartTimeRef.current += audioBuffer.duration;
                
                if (audioPlaybackTimerRef.current === null) {
                    processAudioQueue();
                }
            }
        },
        onerror: (e: ErrorEvent) => {
            console.error("Session error:", e);
            onStatusUpdate('Session error. Please restart.');
            endSession();
        },
        onclose: () => {
            onStatusUpdate('Session closed.');
        },
      },
    });

    sessionRef.current = await sessionPromise;
  }, [onStatusUpdate, onTranscriptUpdate, processAudioQueue]);

  const endSession = useCallback(() => {
    onStatusUpdate('Click the microphone to start');
    if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
    }
    if (audioContextsRef.current) {
        audioContextsRef.current.scriptProcessor?.disconnect();
        audioContextsRef.current.micSource?.disconnect();
        audioContextsRef.current.input.close();
        audioContextsRef.current.output.close();
        audioContextsRef.current = null;
    }
    if (audioPlaybackTimerRef.current) {
        clearTimeout(audioPlaybackTimerRef.current);
        audioPlaybackTimerRef.current = null;
    }
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
    transcriptRef.current = [];
    currentTurnRef.current = { userInput: '', botOutput: '', botSources: [] };
  }, [onStatusUpdate]);

  return { startSession, endSession };
};
