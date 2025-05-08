import React, { useState } from "react";
import { CharacterBot } from "@/components/Character";

type Character = 'trump' | 'jaishankar';

const initialMessages = {
  trump: [
    {
      text: "Folks, I'm here to make chatting great again! Ask me anything, and I'll give you the best answers, believe me!",
      isUser: false,
    },
  ],
  jaishankar: [
    {
      text: "Greetings. I'm here to engage in meaningful dialogue about global diplomacy and international relations. What would you like to discuss?",
      isUser: false,
    },
  ],
};

function CharacterPage() {
  const [character, setCharacter] = useState<Character>('trump');
  const [messages, setMessages] = useState(initialMessages.trump);
  const [isTyping, setIsTyping] = useState(false);

  const handleSwitchCharacter = () => {
    const newCharacter = character === 'trump' ? 'jaishankar' : 'trump';
    setCharacter(newCharacter);
    setMessages(initialMessages[newCharacter]);
  };

  const handleSendMessage = async (message: string) => {
    setMessages((prev) => [...prev, { text: message, isUser: true }]);
    setIsTyping(true);

    try {
      const response = await fetch(`http://localhost:5003/${character}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          argument: message,
          topic: 'general',
          history: messages.filter(m => m.isUser).map(m => m.text)
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      if (data.status === 'success') {
        setMessages(prev => [...prev, { text: data.response, isUser: false }]);
      }
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = character === 'trump'
        ? "We're having tremendous technical difficulties! The best technical difficulties! Try again, folks!"
        : "I apologize, but we're experiencing some technical issues. Let's continue our discussion shortly.";
      
      setMessages(prev => [...prev, { text: errorMessage, isUser: false }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b ${
      character === 'trump' ? 'from-red-50' : 'from-indigo-50'
    } to-gray-100 flex items-center justify-center p-6`}>
      <CharacterBot 
        messages={messages} 
        onSendMessage={handleSendMessage} 
        istyping={isTyping}
        character={character}
        onSwitchCharacter={handleSwitchCharacter}
      />
    </div>
  );
}

export default CharacterPage;