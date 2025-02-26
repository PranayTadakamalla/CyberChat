import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { generateChatResponse } from "./openai";
import { rateLimit } from "express-rate-limit";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });

  app.use("/api", limiter);

  // Get user's conversation history
  app.get("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const conversations = await storage.getConversations(req.user._id);
    res.json(conversations);
  });

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    try {
      const response = await generateChatResponse(message);

      const conversation = await storage.saveConversation({
        userId: req.user._id,
        message,
        response: response.content,
        suggestedTopics: response.suggestedTopics || []
      });

      res.json(response);
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}