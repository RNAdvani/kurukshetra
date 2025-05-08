import express from "express";
import morgan from "morgan";
import cors from "cors";
import { connectDb } from "./lib/db";
import { userRoutes } from "./routes/user.routes";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import axios from "axios";
import dotenv from "dotenv";
import { Mistral } from "@mistralai/mistralai";
import { ChatCompletionChoice } from "@mistralai/mistralai/models/components";

dotenv.config({
  path: ".env",
});
const apiKey = process.env.MISTRAL_API_KEY;

const client = new Mistral({ apiKey: apiKey });

const DEBATE_DURATION = 300000; // 5 minutes
const TURN_DURATION = 30000; // 30 seconds
const FLASK_ANALYZE_ENDPOINT = "http://localhost:5000/analyze";

interface DebateRoom {
  participants: string[];
  currentTurn: string;
  timer: NodeJS.Timeout | null;
  history: Array<{ user: string; message: string }>;
  debateTimer: NodeJS.Timeout;
  topic: string;
  contexts: [string[], string[]]; // Contexts for both participants
  scores: {
    [userId: string]: number;
  };
}

interface MessageAnalysis {
  user_id: string;
  analysis: Array<{
    aspect: string;
    raw_score: number;
    weighted_score: number;
    explanation: string;
  }>;
  facts: {
    contains_errors: boolean;
    incorrect_claims: any[];
  };
  total_score: number;
  context: string;
}

const activeRooms = new Map<string, DebateRoom>();
const waitingTopics = new Map<string, string>();
const userRooms = new Map<string, string>();
const userSocketMap = new Map<string, string>();

const app = express();

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },
});

function getOpponentSocket(opponentId: string): string | undefined {
  return userSocketMap.get(opponentId);
}

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;

  userSocketMap.set(userId, socket.id);

  socket.on("join_topic", (topic: string) => {
    console.log("User", userId, "joined topic", topic);
    if (waitingTopics.has(topic)) {
      console.log("User", userId, "found a debate on topic", topic);
      const opponent = waitingTopics.get(topic)!;
      waitingTopics.delete(topic);

      const roomId = `debate_${topic}_${Date.now()}`;
      userRooms.set(userId, roomId);
      userRooms.set(opponent, roomId);

      const newRoom: DebateRoom = {
        participants: [userId, opponent],
        currentTurn: userId,
        timer: null,
        history: [],
        debateTimer: setTimeout(() => endDebate(roomId), DEBATE_DURATION),
        topic,
        contexts: [[], []],
        scores: {
          [userId]: 0,
          [opponent]: 0,
        },
      };

      activeRooms.set(roomId, newRoom);
      startTurnTimer(roomId);

      socket.join(roomId);
      io.to(getOpponentSocket(opponent)!).socketsJoin(roomId);
      io.to(roomId).emit("debate_started", {
        roomId,
        firstTurn: userId,
        turnDuration: TURN_DURATION,
        debateDuration: DEBATE_DURATION,
      });
      console.log(
        "Debate started on topic",
        topic,
        "between",
        userId,
        "and",
        opponent,
        "in room",
        roomId
      );
    } else {
      waitingTopics.set(topic, userId);
      console.log("User", userId, "is waiting for a debate on topic", topic);
      socket.emit("waiting", { topic });
    }
  });

  socket.on("end_debate", (roomId: string) => {
    const room = activeRooms.get(roomId);
    if (
      room &&
      room.participants.includes(socket.handshake.query.userId as string)
    ) {
      endDebate(roomId);
    }
  });

  socket.on("send_message", async ({ roomId, message }) => {
    const room = activeRooms.get(roomId);
    if (!room) return;

    try {
      const userIndex = room.participants.indexOf(userId);

      // Get LAST context string only (not full history)
      const lastContext =
        room.contexts[userIndex].length > 0
          ? room.contexts[userIndex][room.contexts[userIndex].length - 1]
          : "";

      // Send ONLY MESSAGE for analysis
      const { data } = await axios.post(
        "http://127.0.0.1:5000/analyze-message",
        {
          message, // Only current message
          context: message, // Last individual context
          topic: room.topic,
          userId,
        }
      );

      // Store NEW context as separate array entry
      room.contexts[userIndex].push(data.context);

      // Keep only last 5 contexts
      const MAX_CONTEXT = 5;
      if (room.contexts[userIndex].length > MAX_CONTEXT) {
        room.contexts[userIndex].shift();
      }

      // Add the message to the history
      room.history.push({ user: userId, message });

      // Update the user's score
      room.scores[userId] = data.total_score;

      // Broadcast the message with analysis
      io.to(roomId).emit("message_processed", {
        user: userId,
        message,
        context: room.contexts, // Send the new context
        analysis: data.analysis,
        facts: data.facts,
        total_score: data.total_score,
      });
    } catch (error) {
      console.error("Analysis failed:", error);
      socket.emit("analysis_error", "Failed to process message");
    }
  });

  function startTurnTimer(roomId: string) {
    const room = activeRooms.get(roomId)!;
    if (room.timer) clearTimeout(room.timer);

    room.timer = setTimeout(() => {
      room.currentTurn = room.participants.find((p) => p !== room.currentTurn)!;
      io.to(roomId).emit("turn_update", {
        currentTurn: room.currentTurn,
        timeLeft: TURN_DURATION,
      });
      startTurnTimer(roomId);
    }, TURN_DURATION);

    io.to(roomId).emit("turn_update", {
      currentTurn: room.currentTurn,
      timeLeft: TURN_DURATION,
    });
  }

  async function endDebate(roomId: string) {
    const room = activeRooms.get(roomId)!;
    if (!room) return;

    // Clear all timers
    clearTimeout(room.debateTimer);
    if (room.timer) clearTimeout(room.timer);

    // Convert history to transcription format
    const transcription = room.history.map((msg) => ({
      text: msg.message,
      speaker: msg.user === room.participants[0] ? "person1" : "person2",
    }));

    try {
      const { data } = await axios.post(FLASK_ANALYZE_ENDPOINT, {
        transcription,
        topic: room.topic,
      });

      // Add participant IDs to the results
      const enhancedResults = {
        ...data,
        participants: room.participants,
        scores: room.scores,
        topic: room.topic,
      };

      io.to(roomId).emit("debate_ended", enhancedResults);
    } catch (error) {
      console.error("Final analysis failed:", error);
      io.to(roomId).emit("analysis_error");
    }

    // Cleanup
    activeRooms.delete(roomId);
    room.participants.forEach((p) => userRooms.delete(p));

    // Reset contexts to empty arrays
    room.contexts = [[], []];
  }
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());

app.post("/translate", async (req, res, next) => {
  const { q, target } = req.body;

  const response = await axios.post(
    "https://translation.googleapis.com/language/translate/v2?key=AIzaSyCSemLUjPuZL85Fae9mWdaUsGSJK1YErSo",
    {
      q,
      target,
      key: "AIzaSyCSemLUjPuZL85Fae9mWdaUsGSJK1YErSo",
    }
  );

  res.status(200).json({
    success: true,
    data: response.data.data,
  });
});
app.post("/translate-transcripts", async (req, res, next) => {
  const { q, target } = req.body;

  const response = await axios.post(
    "https://translation.googleapis.com/language/translate/v2?key=AIzaSyCSemLUjPuZL85Fae9mWdaUsGSJK1YErSo",
    {
      q,
      target,
      key: "AIzaSyCSemLUjPuZL85Fae9mWdaUsGSJK1YErSo",
    }
  );

  res.status(200).json({
    success: true,
    data: response.data.data,
  });
});
app.post("/detect", async (req, res, next) => {
  const { q, target } = req.body;

  const response = await axios.post(
    "https://translation.googleapis.com/language/translate/v2/detect?key=AIzaSyCSemLUjPuZL85Fae9mWdaUsGSJK1YErSo",
    {
      q,
      key: "AIzaSyCSemLUjPuZL85Fae9mWdaUsGSJK1YErSo",
    }
  );

  res.status(200).json({
    success: true,
    data: response.data.data.detections[0][0].language,
  });
});

// app.use("/api/user", userRoutes);
app.use("/chatbot-chat", async (req, res, next) => {
  const { prompt } = req.body;
  if (!prompt) {
    res.status(400).json({
      success: false,
      reply: "Prompt is required",
    });
    return;
  }
  const chatResponse = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [
      {
        role: "system",
        content: ` You are a world-class debate coach specializing in competitive parliamentary debating anything else asked you should reply with cannot answer this question. Follow these rules:
    
    1. Responses must be structured with:
    - Clear thesis statement
    - 3-5 supporting arguments
    - Rebuttal considerations
    - Summary conclusion
    
    2. Use formal debate terminology:
    * "This House Would/Believes..."
    * "Opposition benches..."
    * "Points of information..."
    
    3. Reference real debate examples from WUDC, EUDC, and national championships
    
    4. Maintain Socratic questioning approach
    5. Always provide actionable feedback
    6. Use markdown formatting for structure
`,
      },
      { role: "user", content: prompt },
    ],
  });

  if (
    (chatResponse.choices as Array<ChatCompletionChoice>)[0].message.content ===
    "cannot answer this question"
  ) {
    res.status(200).json({
      success: false,
      reply: "I cannot answer this question",
    });
    return;
  }

  res.status(200).json({
    success: true,
    reply: (chatResponse.choices as Array<ChatCompletionChoice>)[0].message
      .content,
  });
});

app.use(morgan("dev"));
const PORT = process.env.PORT || 3000;

httpServer.listen(3000, () => {
  console.log(`Server is running on port ${PORT}`);
});
