// Import necessary types
import { User, InsertUser, Conversation, InsertConversation } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

// Storage interface definition
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      mfaEnabled: false,
      mfaSecret: null
    };
    this.users.set(id, user);
    return user;
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