import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Send, Volume2 } from 'lucide-react';
import { useDebateStore } from '../store';
import { DebateConfig, DebateRequest, DebateResponse } from '../types';
import { SetupWizard } from '@/components/SetupWizard';
import axios from 'axios';
import { Teacher } from '@/components/Teacher';
 // Replace with your key


const DebateChat: React.FC = () => {
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSetup, setShowSetup] = useState(true);
    const [speaking, setSpeaking] = useState(false);
    const [teacherText, setTeacherText] = useState('');
    const audioRef = useRef<HTMLAudioElement | null>(null);

  const API_KEY = import.meta.env.VITE_PUBLIC_GOOGLE_API_KEY as string;
  const store = useDebateStore();

  const fetchAndPlaySpeech = async (text: string) => {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`
    const requestBody = {
      input: { text },
      voice: { languageCode: 'en-US', name: 'en-US-Wavenet-D', ssmlGender: 'MALE' },
      audioConfig: { audioEncoding: 'MP3' },
    }

    try {
      const response = await axios.post(url, requestBody)
      const audioContent = response.data.audioContent
      const audioUrl = `data:audio/mp3;base64,${audioContent}`
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      // When audio plays, set up the analyser
      audio.onplay = () => {
        setSpeaking(true)
        setTeacherText(text)
      }
      audio.onended = () => {
        setSpeaking(false)
        setTeacherText('')
      }
      audio.play()
    } catch (error) {
      console.error('Error fetching speech audio:', error)
    }
  }

  const handleSetupComplete = async (setupData: DebateConfig) => {
    setIsLoading(true);
    const initialData: DebateRequest = {
      ...setupData,
      user_argument: "",
      messages: []
    };

    try {
      const response = await fetch('http://localhost:5001/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialData)
      });
      
      const data: DebateResponse = await response.json();
      store.setInitialData(setupData);
      store.addMessage({ role: 'assistant', content: data.counterargument });
      store.setFlaws(data.flaws);
      store.setSources(data.sources);
      setShowSetup(false);

      fetchAndPlaySpeech(data.counterargument);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    stopCurrentSpeech()
    if (!userInput.trim()) return;
    
    setIsLoading(true);
    store.addMessage({ role: 'user', content: userInput });

    const debateData: DebateRequest = {
      debate_type: store.debateType as DebateConfig['debate_type'],
      difficulty: store.difficulty as DebateConfig['difficulty'],
      statement: store.statement,
      user_argument: userInput,
      messages: store.messages
    };

    try {
      const response = await fetch('http://localhost:5001/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debateData)
      });
      
      const data: DebateResponse = await response.json();
      store.addMessage({ role: 'assistant', content: data.counterargument });
      store.setFlaws(data.flaws);
      store.setSources(data.sources);

      fetchAndPlaySpeech(data.counterargument);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      setUserInput('');
    }
  };

  const stopCurrentSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setSpeaking(false);
      setTeacherText('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
    // Stop speaking when user starts typing
    if (speaking) {
      stopCurrentSpeech();
    }
  };

  if (showSetup) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto p-6">
        <Card className="flex-1 mb-4 overflow-hidden shadow-lg">
          <CardContent className="h-full flex flex-col p-4">
            {/* Chat Header */}
            <div className="border-b pb-4 mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{store.statement}</h2>
              <div className="flex gap-2 mt-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {store.debateType}
                </span>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                  {store.difficulty}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1  space-y-4 p-4 max-h-[70vh] overflow-y-scroll"> 
              {store.messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl p-4 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                        : 'bg-white shadow-md text-gray-800'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white shadow-md rounded-2xl p-4 max-w-[70%]">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
              <Input
                value={userInput}
                onChange={handleInputChange}
                placeholder="Type your argument..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="w-96 bg-white p-6 shadow-lg">
        {/* Flaws Section */}
        <div className="h-64 mb-6">
          <Teacher text={teacherText} setText={setTeacherText} isCoach flaws={store.flaws} />
          {speaking && (
            <div className="flex items-center justify-center mt-4 text-blue-600">
              <Volume2 className="w-5 h-5 animate-pulse" />
              <span className="ml-2">Speaking...</span>
            </div>
          )}
        </div>

        {/* Sources Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Sources</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebateChat;