import { User, InsertUser, Conversation, InsertConversation } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";
import { UserModel, ChatModel } from './db';

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyUser(email: string, code: string): Promise<boolean>;
  updateVerificationCode(email: string, code: string, expiry: Date): Promise<void>;
  getConversations(userId: string): Promise<Conversation[]>;
  saveConversation(conversation: InsertConversation): Promise<Conversation>;
  sessionStore: session.Store;
}

export class MongoStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const user = await UserModel.findById(id);
    return user ? user.toObject() : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ email });
    return user ? user.toObject() : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user = new UserModel(insertUser);
    await user.save();
    return user.toObject();
  }

  async verifyUser(email: string, code: string): Promise<boolean> {
    const user = await UserModel.findOne({ 
      email,
      verificationCode: code,
      verificationExpiry: { $gt: new Date() }
    });

    if (user) {
      user.isVerified = true;
      user.verificationCode = null;
      user.verificationExpiry = null;
      await user.save();
      return true;
    }
    return false;
  }

  async updateVerificationCode(email: string, code: string, expiry: Date): Promise<void> {
    await UserModel.updateOne(
      { email },
      { verificationCode: code, verificationExpiry: expiry }
    );
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return ChatModel.find({ userId }).sort({ timestamp: -1 });
  }

  async saveConversation(conversation: InsertConversation): Promise<Conversation> {
    const chat = new ChatModel(conversation);
    await chat.save();
    return chat.toObject();
  }
}

export const storage = new MongoStorage();