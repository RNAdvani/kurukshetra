import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Model } from '@/components/Model';
import { Center, OrbitControls } from '@react-three/drei'
import axios from 'axios';

function LearningPage() {
  const [speaking, setSpeaking] = useState(false)
  const [lipSyncValue, setLipSyncValue] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const API_KEY = import.meta.env.VITE_PUBLIC_GOOGLE_API_KEY as string;

  const fetchAndPlaySpeech = async (text: string) => {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;
const requestBody = {
  input: { text },
  voice: { 
    languageCode: 'en-US', 
    name: 'en-US-Wavenet-D', 
    ssmlGender: 'MALE' 
  },
  audioConfig: { 
    audioEncoding: 'MP3',
    speakingRate: 0.85,  // Slightly slower than normal
    pitch: -2.0          // Lower the pitch for a deeper tone
  },
};

    try {
      const response = await axios.post(url, requestBody)
      const audioContent = response.data.audioContent
      const audioUrl = `data:audio/mp3;base64,${audioContent}`
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      // When audio plays, set up the analyser
      audio.onplay = () => {
        setSpeaking(true)
        setupAudioAnalyser()
      }
      audio.onended = () => {
        setSpeaking(false)
        setLipSyncValue(0)
      }
      audio.play()
    } catch (error) {
      console.error('Error fetching speech audio:', error)
    }
  }

  const setupAudioAnalyser = () => {
    if (!audioRef.current) return
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    const audioContext = new AudioContext()
    audioContextRef.current = audioContext
    const source = audioContext.createMediaElementSource(audioRef.current)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyser.connect(audioContext.destination)
    analyserRef.current = analyser
  }

  // Continuously update lipSyncValue based on audio frequency data
  useEffect(() => {
    let animationFrame: number
    const updateLipSync = () => {
      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyserRef.current.getByteFrequencyData(dataArray)
        // Calculate an average volume from the frequency data
        const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength
        // Scale average to [0,1] (tweak the divisor as needed)
        const value = Math.min(avg / 100, 1)
        setLipSyncValue(value)
      }
      animationFrame = requestAnimationFrame(updateLipSync)
    }
    if (speaking) {
      updateLipSync()
    }
    return () => cancelAnimationFrame(animationFrame)
  }, [speaking])
  const [messages, setMessages] = useState<Array<{ text: string; type: 'user' | 'ai' }>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [improvement, setImprovement] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat on new message
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle mic button click
  const handleMicClick = () => {
    setIsRecording(!isRecording);
  };

  // Handle form submission for sending messages.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;

    setMessages((prev) => [...prev, { text: currentMessage, type: 'user' }]);

    setTimeout(() => {
      const aiResponse = "Here's a counter-argument to consider:\nYour point could be strengthened by considering the opposing perspective...";
      setMessages((prev) => [...prev, { text: aiResponse, type: 'ai' }]);
      setImprovement(
        "To make your argument stronger, try incorporating specific examples and data to support your claims. Additionally, consider addressing potential counterarguments preemptively."
      );
    }, 1000);

    setCurrentMessage('');
  };

  const CameraLock = () => {
    const controls = useRef<any>(null);
    useFrame(() => {
      if (controls.current) {
        controls.current.enabled = false;  // Disable OrbitControls
      }
    });

    return <OrbitControls ref={controls} />;
  };

  return (
    <div className="flex h-screen bg-white border-t-2 border-purple-500/30">
      {/* Left Side - Counter Arguments and Improvements */}
      
      {/* Right Side - Chat Interface */}
      <div className="w-1/2 flex flex-col bg-white border-r-2 border-purple-500/30">
        <div className="flex-grow overflow-y-auto p-6">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-lg ${message.type === 'user' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-200 border border-purple-500/30'}`}>{message.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-purple-500/30 outline-none">
          <div className="relative flex items-center outline-none">
            <button type="button" onClick={handleMicClick} className="absolute left-4 p-2 text-purple-400 hover:text-purple-300 transition-colors">
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              className="flex-grow bg-white text-black rounded-lg pl-12 pr-12 py-3 !focus:outline-none border border-purple-500/80 outline-none"
              placeholder="Type your argument here…"
            />

            <button type="submit" className="absolute right-4 p-2 text-purple-400 hover:text-purple-300 transition-colors">
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>

      <div className="w-1/2 p-6 bg-white border-r border-purple-500/30">
        <div className="h-full flex flex-col">
          <h2 className="text-2xl font-bold mb-6 text-purple-400">Analysis & Improvements</h2>

           <div className='w-full h-full'>
                <Canvas style={{ background: '#272727' }} camera={{ position: [0, 0.7, 1.3] }} onCreated={({ gl }) => gl.setClearColor(0xFFFFFF)}>
                  <ambientLight intensity={1} />
                  <directionalLight position={[2, 2, 2]} />
                  <Center>
                  <Model speaking={speaking} lipSyncValue={lipSyncValue} />
                  </Center>
                  {/* <OrbitControls /> */}
                  <CameraLock /> 
                </Canvas>
                <div>
                  <button
                    onClick={() =>
                      fetchAndPlaySpeech(
                        'fuck you gay haani'
                      )
                    }
                    style={{
                      padding: '10px 20px',
                      fontSize: '16px',
                      backgroundColor: '#007bff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    Speak
                  </button>
                </div>
              </div>

          {/* Improvement Suggestions */}
          {improvement && (
            <div className="flex-grow overflow-y-auto h-fit">
              <h3 className="text-xl font-semibold mb-4 text-purple-300">How to Improve</h3>
              <div className="p-4 rounded-lg bg-gray-700/50 border border-purple-500/30">
                <p className="text-gray-200">{improvement}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LearningPage;
