// Import necessary types
import { User, InsertUser, Conversation, InsertConversation } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

// Storage interface definition
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyUser(email: string, code: string): Promise<boolean>;
  updateVerificationCode(email: string, code: string, expiry: Date): Promise<void>;
  getConversations(userId: number): Promise<Conversation[]>;
  saveConversation(conversation: InsertConversation): Promise<Conversation>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private conversations: Map<number, Conversation[]>;
  private currentUserId: number;
  private currentConversationId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.currentUserId = 1;
    this.currentConversationId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      mfaEnabled: false,
      mfaSecret: null,
      isVerified: false,
      verificationCode: null,
      verificationExpiry: null
    };
    this.users.set(id, user);
    return user;
  }

  async verifyUser(email: string, code: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (!user) return false;

    const isValid = user.verificationCode === code && 
                   user.verificationExpiry && 
                   new Date() < new Date(user.verificationExpiry);

    if (isValid) {
      user.isVerified = true;
      user.verificationCode = null;
      user.verificationExpiry = null;
      this.users.set(user.id, user);
    }

    return isValid;
  }

  async updateVerificationCode(email: string, code: string, expiry: Date): Promise<void> {
    const user = await this.getUserByEmail(email);
    if (!user) return;

    user.verificationCode = code;
    user.verificationExpiry = expiry;
    this.users.set(user.id, user);
  }

  async getConversations(userId: number): Promise<Conversation[]> {
    return this.conversations.get(userId) || [];
  }

  async saveConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = this.currentConversationId++;
    const newConversation: Conversation = {
      ...conversation,
      id,
      timestamp: new Date()
    };

    const userConversations = this.conversations.get(conversation.userId) || [];
    userConversations.push(newConversation);
    this.conversations.set(conversation.userId, userConversations);

    return newConversation;
  }
}

export const storage = new MemStorage();