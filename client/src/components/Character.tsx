import React, { useState } from "react";
import { User2, Send, Sparkles, RefreshCw } from "lucide-react";

interface CharacterBotProps {
  messages: { text: string; isUser: boolean }[];
  onSendMessage: (message: string) => void;
  istyping: boolean;
  character: "trump" | "jaishankar";
  onSwitchCharacter: () => void;
}

const characterConfig = {
  trump: {
    name: "Trump AI",
    slogan: "Making Chat Great Again!",
    colors: {
      primary: "red",
      gradient: "from-red-50",
      border: "border-red-100",
      button: "bg-red-500 hover:bg-red-600",
      messageGradient: "from-red-500 to-red-600",
    },
    avatar:
      "https://images.unsplash.com/photo-1580128660010-fd027e1e587a?auto=format&fit=crop&w=400",
    placeholder: "Ask me anything, folks!",
  },
  jaishankar: {
    name: "Jaishankar AI",
    slogan: "Diplomatic Dialogues for a Multipolar World",
    colors: {
      primary: "indigo",
      gradient: "from-indigo-50",
      border: "border-indigo-100",
      button: "bg-indigo-500 hover:bg-indigo-600",
      messageGradient: "from-indigo-500 to-indigo-600",
    },
    avatar: "./jaishankar.jpg",
    placeholder: "Lets discuss global diplomacy...",
  },
};

export function CharacterBot({
  messages,
  onSendMessage,
  istyping,
  character,
  onSwitchCharacter,
}: CharacterBotProps) {
  const [inputText, setInputText] = useState("");
  const config = characterConfig[character];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto gap-8 p-8">
      {/* Chat Container */}
      <div className="relative w-full transform transition-all duration-300">
        <div
          className={`bg-gradient-to-br ${config.colors.gradient} to-white p-8 rounded-2xl shadow-2xl 
          border ${config.colors.border} backdrop-blur-sm min-h-[400px] flex flex-col`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between mb-6 pb-4 border-b ${config.colors.border}`}
          >
            <div className="flex items-center gap-2">
              <Sparkles
                className={`w-5 h-5 text-${config.colors.primary}-400 animate-pulse`}
              />
              <span
                className={`text-lg font-bold text-${config.colors.primary}-500`}
              >
                {config.name}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className={`text-sm text-${config.colors.primary}-400`}>
                {config.slogan}
              </div>
              <button
                onClick={onSwitchCharacter}
                className={`p-2 ${config.colors.button} text-white rounded-lg 
                transition-colors duration-300 flex items-center gap-2`}
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">Switch Character</span>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.isUser ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    message.isUser
                      ? "bg-blue-500 text-white rounded-br-none"
                      : `bg-gradient-to-r ${config.colors.messageGradient} text-white rounded-bl-none`
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!message.isUser && (
                      <div
                        className={`w-8 h-8 rounded-full bg-${config.colors.primary}-600 flex items-center justify-center flex-shrink-0 overflow-hidden`}
                      >
                        <img
                          src={config.avatar}
                          alt={`${character} Avatar`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <p className="text-lg leading-relaxed">{message.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {istyping && (
            <div className="flex justify-start">
              <div
                className={`max-w-[80%] p-4 rounded-2xl bg-gradient-to-r ${config.colors.messageGradient} text-white rounded-bl-none`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full bg-${config.colors.primary}-600 flex items-center justify-center flex-shrink-0 overflow-hidden`}
                  >
                    <img
                      src={config.avatar}
                      alt={`${character} Avatar`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={config.placeholder}
              className={`w-full px-6 py-4 bg-gray-50 rounded-xl pr-12
                border ${config.colors.border} focus:border-${config.colors.primary}-300 
                focus:ring-2 focus:ring-${config.colors.primary}-200
                transition-all duration-300`}
            />
            <button
              type="submit"
              className={`absolute right-2 top-1/2 transform -translate-y-1/2
                p-2 ${config.colors.button} text-white rounded-lg
                transition-colors duration-300`}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* 3D Character Avatar */}
      <div className="relative group perspective">
        {/* Outer glow */}
        <div
          className={`absolute inset-0 bg-${config.colors.primary}-400 rounded-full blur-2xl opacity-20 
          group-hover:opacity-30 transition-opacity duration-300`}
        />

        {/* Avatar Container */}
        <div className="relative">
          {/* Main avatar circle with 3D effect */}
          <div
            className="w-40 h-40 rounded-full relative transform-gpu transition-all duration-300
            group-hover:scale-105 group-hover:rotate-y-12 animate-float"
          >
            {/* Front face */}
            <div
              className={`absolute inset-0 bg-gradient-to-br from-${config.colors.primary}-500 to-${config.colors.primary}-600 
              rounded-full shadow-xl overflow-hidden
              before:absolute before:inset-0 before:bg-gradient-to-br before:from-transparent 
              before:to-black/20 before:rounded-full`}
            >
              <img
                src={config.avatar}
                alt={`${character} Avatar`}
                className="w-full h-full object-cover scale-110 transform group-hover:scale-125 transition-transform duration-300"
              />
            </div>

            {/* Metallic ring */}
            <div
              className={`absolute -inset-2 bg-gradient-to-r from-${config.colors.primary}-400 
              via-${config.colors.primary}-300 to-${config.colors.primary}-500 
              rounded-full -z-10 opacity-50 blur-sm group-hover:opacity-70 transition-opacity duration-300`}
            />
          </div>

          {/* Bottom shadow/reflection */}
          <div
            className={`absolute -bottom-4 left-0 right-0 h-12 
            bg-gradient-to-r from-${config.colors.primary}-600/80 to-${config.colors.primary}-700/80 rounded-full -z-10 blur-md
            transform transition-transform duration-300 group-hover:scale-105`}
          />

          {/* Interactive light effects */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 
            rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />

          {/* Theme-specific overlay effect */}
          {character === "trump" && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-red-500/10 
              rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
          )}
          {character === "jaishankar" && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-white/10 to-green-500/10 
              rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
          )}
        </div>

        {/* Ambient particles */}
        <div className="absolute inset-0">
          {character === "trump" ? (
            <>
              <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-red-300 rounded-full animate-particle-1" />
              <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-blue-300 rounded-full animate-particle-2" />
              <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-white rounded-full animate-particle-3" />
            </>
          ) : (
            <>
              <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-orange-300 rounded-full animate-particle-1" />
              <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-white rounded-full animate-particle-2" />
              <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-green-300 rounded-full animate-particle-3" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
