import { useState } from "react";
import { Bot, Sparkles, ArrowRight, SkipForward } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TeacherProps {
  text: string;
  setText: (text: string) => void;
  isCoach?: boolean;
  flaws?: string[];
}

const debateContent = [
  {
    title: "Welcome to Competitive Debating",
    content:
      "Competitive debating is an exciting battle of ideas where teams argue for and against a motion. It's a sport for the mind that develops critical thinking, public speaking, and analytical skills.",
  },
  {
    title: "Debate Structure",
    content:
      "A typical debate consists of:\n\n• Opening Speeches (7 minutes)\n• Reply Speeches (4 minutes)\n• Points of Information\n• Rebuttals\n\nEach speaker has specific roles and responsibilities, making it a structured and engaging format.",
  },
  {
    title: "Popular Debate Formats",
    content:
      "1. British Parliamentary (BP)\n - 4 teams, 8 speakers\n - Complex strategic elements\n\n2. World Schools\n - 3 speakers per team\n - Emphasis on style\n\n3. Asian Parliamentary\n - 3 vs 3 format\n - Focus on matter and method",
  },
  {
    title: "Key Debating Skills",
    content:
      "• Argument Construction\n• Active Listening\n• Quick Thinking\n• Persuasive Speaking\n• Strategic Analysis\n\nMastering these skills will make you a formidable debater.",
  },
  {
    title: "Ask Your Questions",
    content:
      "Now that you understand the basics of competitive debating, what would you like to know more about? I'm here to help you dive deeper into any aspect of debating.",
    isQuestion: true,
  },
];

export function Teacher({ text, setText,flaws,isCoach }: TeacherProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [botResponse, setBotResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Function to move to the next slide. For question slide, only move forward if a bot response exists.
  const handleNext = () => {
    if (debateContent[currentSlide].isQuestion && !botResponse) {
      return; // Prevent moving on if the user hasn't received a response yet.
    }
    // Reset the prompt and response for the next slide.
    setText("");
    setBotResponse("");
    if (currentSlide < debateContent.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  // Navigate to the /compete route.
  const handleSkip = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate("/dashboard");
  };

  // Sends the user's prompt to the chatbot API and updates the botResponse state.
  const handleSend = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:3000/chatbot-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      console.log(data);
      const textRes = data?.reply.replace("*","").replace("#","");
      setBotResponse(textRes);
    } catch (error) {
      setBotResponse("An error occurred. Please try again.");
    }
    setIsLoading(false);
  };

  // Allow the user to re-prompt by clearing the current bot response.
  const handleRePrompt = () => {
    setBotResponse("");
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto gap-8 p-8">
      {/* Speech Bubble */}
      <div className="relative w-full transform transition-all duration-300 hover:scale-[1.02]">
        <div
          className={`bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl shadow-2xl 
          border border-blue-100 backdrop-blur-sm animate-fadeIn
          ${isTyping ? "ring-2 ring-blue-400 ring-opacity-50" : ""}`}
        >
          <div
            className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-8 h-8 
            bg-gradient-to-br from-blue-50 to-white rotate-45 border-r border-b border-blue-100"
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
              <span className="text-sm font-medium text-blue-400">
                Debate Coach
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span>Skip</span>
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          
          {!isCoach &&  <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 animate-fadeIn">
              {debateContent[currentSlide].title}
            </h2>
            {debateContent[currentSlide].isQuestion ? (
              <div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  placeholder="What would you like to know about competitive debating?"
                  className="w-full h-full bg-transparent border-none focus:outline-none 
                  resize-none text-gray-700 text-lg leading-relaxed placeholder-gray-400"
                  disabled={isLoading}
                />
                <div className="mt-4">
                  {botResponse && (
                    <div className="bg-gray-100 p-4 rounded-lg text-gray-800 whitespace-pre-line max-h-[10rem] overflow-y-scroll">
                      {botResponse}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  {botResponse ? (
                    <>
                      <button
                        onClick={handleRePrompt}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg
                        hover:bg-yellow-600 transition-colors transform hover:scale-105 active:scale-95"
                      >
                        <span>Re-prompt</span>
                      </button>
                      <button
                        onClick={handleNext}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg
                        hover:bg-blue-600 transition-colors transform hover:scale-105 active:scale-95"
                      >
                        <span>Next</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleSend}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg
                      hover:bg-blue-600 transition-colors transform hover:scale-105 active:scale-95"
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending..." : "Send"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="prose prose-blue max-w-none">
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line animate-fadeIn">
                  {debateContent[currentSlide].content}
                </p>
              </div>
            )}
          </div>}

          
          {!isCoach && !debateContent[currentSlide].isQuestion && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg
                hover:bg-blue-600 transition-colors transform hover:scale-105 active:scale-95"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {
            isCoach && <div className="space-y-4">
              {
                flaws && <div className="flex flex-col gap-1 overflow-y-scroll max-h-[10rem]">
                  {
                    flaws.map((flaw, index) => (
                      <div key={index} className="bg-gray-100 p-4 rounded-lg text-gray-800 whitespace-pre-line">
                        <span>{index+1}</span>{" "} {flaw}
                      </div>
                    ))
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>

      {/* 3D Bot Avatar */}
      <div className="relative group perspective">
        {/* Outer glow */}
        <div
          className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-20 
          group-hover:opacity-30 transition-opacity duration-300"
        />

        {/* 3D Bot Container */}
        <div className="relative">
          {/* Main bot circle with 3D effect */}
          <div
            className="w-40 h-40 rounded-full relative transform-gpu transition-all duration-300
            group-hover:scale-105 group-hover:rotate-y-12 animate-float"
          >
            {/* Front face */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 
              rounded-full shadow-xl flex items-center justify-center
              before:absolute before:inset-0 before:bg-gradient-to-br before:from-transparent 
              before:to-black/20 before:rounded-full"
            >
              <Bot
                className="w-20 h-20 text-white transform 
                group-hover:scale-110 transition-transform duration-300"
              />
            </div>

            {/* Metallic ring */}
            <div
              className="absolute -inset-2 bg-gradient-to-r from-blue-400 via-blue-300 to-blue-500 
              rounded-full -z-10 opacity-50 blur-sm group-hover:opacity-70 transition-opacity duration-300"
            />
          </div>

          {/* Bottom shadow/reflection */}
          <div
            className="absolute -bottom-4 left-0 right-0 h-12 
            bg-gradient-to-r from-blue-600/80 to-blue-700/80 rounded-full -z-10 blur-md
            transform transition-transform duration-300 group-hover:scale-105"
          />

          {/* Interactive light effects */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 
            rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
        </div>

        {/* Progress indicators */}
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 flex gap-2">
          {debateContent.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? "bg-blue-500 w-4" : "bg-blue-200"
              }`}
            />
          ))}
        </div>

        {/* Ambient particles */}
        <div className="absolute inset-0 animate-particles">
          <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-blue-300 rounded-full animate-particle-1" />
          <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-blue-300 rounded-full animate-particle-2" />
          <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-blue-300 rounded-full animate-particle-3" />
        </div>
      </div>
    </div>
  );
}
