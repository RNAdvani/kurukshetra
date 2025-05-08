import mongoose, { Mongoose } from "mongoose";

export interface IUser extends Document {
  _id: string;
  avatar: string;
  username: string;
  name: string;
  email: string;
  password: string;
  role: string;
  aadharPhoto: string;
  isAadharVerified: boolean;
  phone: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  aiChatSessions: string[];
  lawyerChatSessions: string[];
  isOnline: boolean;
  lastOnline: string;
}

export interface aiChat extends Document {
  _id: mongoose.Types.ObjectId;
}

export interface IMessage extends Document {
  sender: string;
  receiver: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  type: "text" | "image";
}
export interface IVerification extends Document {
  _id: mongoose.Types.ObjectId;
  user: IUser;
  code: string;
  expiresAt: Date;
}
