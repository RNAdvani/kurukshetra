import { create } from 'zustand';
import { DebateStore } from './types';

export const useDebateStore = create<DebateStore>((set) => ({
  debateType: '',
  difficulty: '',
  statement: '',
  messages: [],
  flaws: [],
  sources: [],
  setInitialData: (data) => set({ 
    debateType: data.debate_type,
    difficulty: data.difficulty,
    statement: data.statement 
  }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  setFlaws: (flaws) => set({ flaws }),
  setSources: (sources) => set({ sources })
}));