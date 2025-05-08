export interface User {
  _id: string;
  name: string;
  email: string;
  username: string;
  isOnline: boolean;
  lastOnline: string;
}

export interface Message {
  sender?: User;
  receiver: User;
  content: string;
  timestamp: string;
}

export interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: number;
  confidence: number;
}

export interface DebateTranscript {
  topic: string;
  transcription: TranscriptEntry[];
}