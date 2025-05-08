export interface DebateConfig {
    debate_type: 'policy' | 'value' | 'fact';
    difficulty: 'beginner' | 'intermediate' | 'expert';
    statement: string;
  }
  
  export interface Message {
    role: 'user' | 'assistant';
    content: string;
  }
  
  export interface DebateRequest extends DebateConfig {
    user_argument: string;
    messages: Message[];
  }
  
  export interface DebateResponse {
    chat_history: Message[];
    counterargument: string;
    flaws: string[];
    sources: string[];
  }
  
  export interface DebateStore {
    debateType: string;
    difficulty: string;
    statement: string;
    messages: Message[];
    flaws: string[];
    sources: string[];
    setInitialData: (data: DebateConfig) => void;
    addMessage: (message: Message) => void;
    setFlaws: (flaws: string[]) => void;
    setSources: (sources: string[]) => void;
  }

  export type TranscriptionSegment = {
    speaker: string;
    text: string;
    timestamp: number;
  };
  
  export type AnalysisAspect = {
    scores: { person1: number; person2: number };
    explanations: { person1: string; person2: string };
    difference: number;
    leading: string;
    all_claims?: Array<{
      claim: string;
      verdict: string;
      confidence: number;
      summary: string;
      context: string;
    }>;
    incorrect_claims?: Array<{
      claim: string;
      verdict: string;
      confidence: number;
      summary: string;
      context: string;
    }>;
  };
  
  export type AnalysisResult = {
    [key: string]: AnalysisAspect;
  } & {
    total: {
      person1: number;
      person2: number;
      winner: string;
    };
  };