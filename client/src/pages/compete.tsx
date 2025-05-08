import { useState, useEffect, useRef } from "react";
import io, { type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Navigate, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface DebateMessage {
  user: string;
  message: string;
  analysis?: Array<{
    aspect: string;
    explanation: string;
    raw_score: number;
    weighted_score: number;
  }>;
  facts?: {
    contains_errors: boolean;
    incorrect_claims: string[];
  };
  total_score?: number;
}

interface DebateResult {
  participants: string[];
  topic: string;
  scores: {
    [userId: string]: number;
  };
  analysis: Array<{
    aspect: string;
    explanation: string;
    raw_score: number;
    weighted_score: number;
  }>;
  context: string;
  facts: {
    contains_errors: boolean;
    incorrect_claims: any[];
  };
  total_score: number;
  user_id: string;
}

const suggestedTopics = [
  "Politics",
  "Finance",
  "Technology",
  "Climate Change",
  "Education",
  "Healthcare",
];

const DebateComponent: React.FC<{ userId: string }> = ({ userId }) => {
  const [status, setStatus] = useState<"idle" | "waiting" | "debating" | "ended">("idle");
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [currentTurn, setCurrentTurn] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [results, setResults] = useState<DebateResult | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [message, setMessage] = useState("");
  const [roomId, setRoomId] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [debateFormat, setDebateFormat] = useState<"public-forum" | "team-debate" | "policy-debate">("public-forum");

  const getSpeakerLabel = (speakerId: string) => {
    if (debateFormat === "team-debate") {
      return speakerId === userId ? "Team A" : "Team B";
    }
    if (debateFormat === "policy-debate") {
      return speakerId === userId ? "Affirmative" : "Negative";
    }
    return speakerId === userId ? "You" : "Opponent";
  };

  const SettingsSection = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="debateFormat">Debate Format</Label>
        <Select
          value={debateFormat}
          onValueChange={(value: "public-forum" | "team-debate" | "policy-debate") => setDebateFormat(value)}
        >
          <SelectTrigger id="debateFormat" className="bg-white">
            <SelectValue placeholder="Select debate format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public-forum">Public Forum</SelectItem>
            <SelectItem value="team-debate">Team Debate</SelectItem>
            <SelectItem value="policy-debate">Policy Debate</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  useEffect(() => {
    socketRef.current = io("http://localhost:3000", {
      query: { userId },
    });

    socketRef.current.on("waiting", () => setStatus("waiting"));
    socketRef.current.on("debate_started", handleDebateStart);
    socketRef.current.on("message_processed", handleNewMessage);
    socketRef.current.on("turn_update", handleTurnUpdate);
    socketRef.current.on("debate_ended", handleDebateEnd);

    return () => {
      socketRef.current?.disconnect();
    };
  }, [userId]);

  const handleDebateStart = (data: {
    roomId: string;
    firstTurn: string;
    turnDuration: number;
    debateDuration: number;
  }) => {
    setStatus("debating");
    setCurrentTurn(data.firstTurn);
    startTimer(data.turnDuration);
    setRoomId(data.roomId);
  };

   const handleNewMessage = (msg: DebateMessage) => {
      setMessages((prev) => [
         ...prev,
         {
            user: msg.user,
            message: msg.message,
            analysis: msg.analysis,
            facts: msg.facts,
            total_score: msg.total_score,
         },
      ]);
      console.log(msg);
   };

   const handleTurnUpdate = (data: {
      currentTurn: string;
      timeLeft: number;
   }) => {
      setCurrentTurn(data.currentTurn);
      setTimeLeft(data.timeLeft / 1000);
   };

   const handleDebateEnd = (finalResults: DebateResult) => {
      setStatus("ended");
      setResults(finalResults);
      console.log({finalResults});
   };

  const startTimer = (duration: number) => {
    let time = duration / 1000;
    const timer = setInterval(() => {
      time -= 1;
      setTimeLeft(time);
      if (time <= 0) {
        clearInterval(timer);
        socketRef.current?.emit("end_debate", roomId);
      }
    }, 1000);
  };

  const handleJoinTopic = () => {
    if (topic) {
      socketRef.current?.emit("join_topic", topic);
      setStatus("waiting");
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && currentTurn === userId) {
      socketRef.current?.emit("send_message", { roomId, message });
      setMessage("");
    }
  };

  const handleEndDebate = () => {
    if (window.confirm("Are you sure you want to end the debate early?")) {
      socketRef.current?.emit("end_debate", roomId);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const navigate = useNavigate();

  return (
    <div className="h-screen bg-[radial-gradient(50%_50%_at_50%_50%,_rgb(255_205_87_/_47%)_0,_#ffd760_100%)]">
      <div className="relative w-full overflow-hidden fill-white">
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="outline"
            onClick={() => setIsSettingsOpen(true)}
            disabled={status === "debating" || status === "waiting"}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Debate Settings</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <SettingsSection />
            </div>
          </DialogContent>
        </Dialog>

        <svg
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            opacity=".25"
            className="fill-current text-white"
          ></path>
          <path
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60-41.34,30-36,26.63-52.34,71-69.14V0Z"
            opacity=".5"
            className="fill-current text-white"
          ></path>
          <path
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
            className="fill-current text-white"
          ></path>
        </svg>
        <div className="h-full flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl bg-white shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-2xl font-bold text-gray-800">
                Modern Debate Arena
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({debateFormat.replace("-", " ")})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {status === "idle" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {suggestedTopics.map((suggestedTopic) => (
                      <Button
                        key={suggestedTopic}
                        variant="outline"
                        onClick={() => setTopic(suggestedTopic)}
                        className={`h-20 ${
                          topic === suggestedTopic ? "bg-purple-100 border-purple-500" : ""
                        }`}
                      >
                        {suggestedTopic}
                      </Button>
                    ))}
                  </div>
                  <div className="flex space-x-4">
                    <Input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Or enter your own topic"
                      className="flex-grow"
                    />
                    <Button onClick={handleJoinTopic} disabled={!topic}>
                      Start Debate
                    </Button>
                  </div>
                </div>
              )}

              {status === "waiting" && (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
                  <p className="text-lg font-semibold text-gray-700">
                    Searching for an opponent...
                  </p>
                </div>
              )}

                     {status === "debating" && (
                        <div className="space-y-4">
                           <div className="flex justify-between items-center">
                              <div className="text-lg font-semibold text-gray-700">
                                 Time Left: {timeLeft}s
                              </div>
                              <div
                                 className={`text-lg font-semibold ${
                                    currentTurn === userId
                                       ? "text-green-600"
                                       : "text-red-600"
                                 }`}
                              >
                                 {currentTurn === userId
                                    ? "Your turn"
                                    : "Opponent's turn"}
                              </div>
                              <Button
                                 variant="destructive"
                                 size="sm"
                                 onClick={() => setShowEndConfirmation(true)}
                              >
                                 End Debate
                              </Button>
                           </div>

                  <Dialog
                    open={showEndConfirmation}
                    onOpenChange={setShowEndConfirmation}
                  >
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>End Debate?</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to end the debate early? This
                          action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button
                          variant="destructive"
                          onClick={() => navigate("/dashboard")}
                        >
                          Confirm End
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <div className="h-64 overflow-y-auto space-y-2 bg-gray-50 p-4 rounded-lg">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg relative group ${
                          msg.user === userId ? "bg-purple-100 ml-auto" : "bg-gray-200"
                        } max-w-[80%]`}
                        onMouseEnter={() => setHoveredMessageId(i)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                      >
                        <div className="font-semibold text-sm text-gray-600">
                          {getSpeakerLabel(msg.user)}
                        </div>
                        <div className="text-gray-800">{msg.message}</div>

                                    {hoveredMessageId === i && msg.analysis && (
                                       <div
                                          className={`fixed transform ${
                                             msg.user === userId
                                                ? "-translate-x-full left-[calc(100%-1rem)]"
                                                : "translate-x-0 left-full"
                                          } top-1/2 -translate-y-1/2 w-72 bg-white p-4 rounded-lg shadow-xl border border-gray-200 z-50`}
                                       >
                                          <div className="text-sm font-semibold mb-3">
                                             Message Analysis
                                          </div>
                                          {msg.analysis.map((aspect, idx) => (
                                             <div key={idx} className="mb-3">
                                                <div className="flex justify-between items-center">
                                                   <span className="capitalize font-medium text-gray-700">
                                                      {aspect.aspect}
                                                   </span>
                                                   <span className="text-purple-600 font-semibold">
                                                      {aspect.weighted_score.toFixed(
                                                         1
                                                      )}
                                                   </span>
                                                </div>
                                                {/* <p className="text-xs text-gray-500 mt-1">
                                                   {aspect.explanation}
                                                </p> */}
                                             </div>
                                          ))}
                                          {msg.facts?.contains_errors && (
                                             <div className="mt-2 text-red-600 text-sm font-medium flex items-center">
                                                <span className="mr-1">⚠️</span>
                                                Contains factual errors
                                             </div>
                                          )}
                                          {!msg.facts?.contains_errors && (
                                             <div className="mt-2 text-green-600 text-sm font-medium flex items-center">
                                                <span className="mr-1">✅</span>
                                                No factual errors
                                             </div>
                                          )}
                                       </div>
                                    )}
                                 </div>
                              ))}
                              <div ref={messagesEndRef} />
                           </div>

                           <div className="flex space-x-2">
                              <Input
                                 value={message}
                                 onChange={(e) => setMessage(e.target.value)}
                                 onKeyPress={(e) =>
                                    e.key === "Enter" && handleSendMessage()
                                 }
                                 placeholder={
                                    currentTurn === userId
                                       ? "Your turn to speak..."
                                       : "Waiting for opponent..."
                                 }
                                 disabled={currentTurn !== userId}
                                 className="flex-grow"
                              />
                              <Button
                                 onClick={handleSendMessage}
                                 disabled={
                                    currentTurn !== userId || !message.trim()
                                 }
                              >
                                 Send
                              </Button>
                           </div>
                        </div>
                     )}

              {status === "ended" && results && (
                <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
                  <h3 className="text-xl font-bold mb-4">Final Results</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold mb-2">Your Total Score</h4>
                      <div className="text-3xl font-bold text-blue-600">
                        {results.scores[userId].toFixed(1)}
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-semibold mb-2">Opponent's Score</h4>
                      <div className="text-3xl font-bold text-green-600">
                        {results.scores[results.participants.find((p) => p !== userId)!].toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                    <h4 className="font-semibold mb-2">Winner</h4>
                    <div className="text-xl font-bold text-yellow-700">
                      {results.scores[userId] >
                      results.scores[results.participants.find((p) => p !== userId)!]
                        ? `${getSpeakerLabel(userId)} Wins! 🎉`
                        : `${getSpeakerLabel(results.participants.find((p) => p !== userId)!)} Wins`}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Detailed Breakdown</h4>
                    <div className="space-y-3">
                      {results?.analysis?.map((aspect) => (
                        <div key={aspect.aspect} className="bg-gray-50 p-3 rounded">
                          <div className="flex justify-between mb-1">
                            <span className="capitalize">{aspect.aspect}</span>
                            <span className="font-semibold">
                              {aspect.weighted_score.toFixed(1)} pts
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">{aspect.explanation}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DebateComponent;