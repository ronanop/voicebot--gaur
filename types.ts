export interface Source {
  uri: string;
  title: string;
}

export interface TranscriptMessage {
  speaker: 'user' | 'bot';
  text: string;
  sources?: Source[];
}
