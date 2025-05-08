import { useState, useEffect } from 'react';
import useSignLanguage from '../hooks/useSignLanguage';
// import { TranscriptEntry } from '../types';

interface Props {
  currentSpeaker: string;
  onNewTranscript: (entry: any) => void;
  debateTopic: string;
  isRecording: boolean;
}

const SignLanguageRecognition = ({
  currentSpeaker,
  onNewTranscript,
  debateTopic,
  isRecording
}: Props) => {
  const { videoRef, isCameraOn, startCamera, captureFrame } = useSignLanguage();
  const [confidence, setConfidence] = useState(0);

  const predictSign = async () => {
    const imageData = captureFrame();
    if (!imageData) return;

    try {
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: imageData,
          speaker: currentSpeaker,
          topic: debateTopic
        }),
      });
      
      const data = await response.json();
      if (data.text && data.confidence > 0.7) { // Confidence threshold
        const newEntry: any = {
          speaker: currentSpeaker,
          text: data.text,
          timestamp: Date.now(),
          confidence: data.confidence
        };
        onNewTranscript(newEntry);
      }
      setConfidence(data.confidence);
    } catch (error) {
      console.error('Prediction error:', error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && isCameraOn) {
      interval = setInterval(predictSign, 2000); // Process every 2 seconds
    }
    return () => clearInterval(interval);
  }, [isRecording, isCameraOn]);

  return (
    <div className="sign-language-container">
      <video ref={videoRef} autoPlay playsInline muted />
      <div className="controls">
        {!isCameraOn && (
          <button onClick={startCamera}>Enable Camera</button>
        )}
        {isCameraOn && (
          <div className="confidence">
            Confidence: {(confidence * 100).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default SignLanguageRecognition;