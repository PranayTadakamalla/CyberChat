
import { GoogleGenerativeAI } from "@google/generative-ai";
import rateLimit from "express-rate-limit";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const CYBERSECURITY_SYSTEM_PROMPT = `You are a friendly and knowledgeable cybersecurity expert chatbot. Your role is to:

1. Respond naturally to greetings and pleasantries while maintaining a security-focused persona
2. Answer questions related to cybersecurity, information security, and digital safety in detail
3. Provide practical advice and step-by-step guidance on security best practices
4. Explain complex security concepts in a clear, understandable way
5. For non-security questions, politely redirect to cybersecurity topics`;

interface ChatResponse {
  content: string;
  isCyberSecurityRelated: boolean;
  suggestedTopics?: string[];
}

// Create rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5 // limit each IP to 5 requests per minute
});

export async function generateChatResponse(message: string): Promise<ChatResponse> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      content: "Gemini API key is not configured. Please add it to the Secrets tool.",
      isCyberSecurityRelated: false,
      suggestedTopics: ["Configure API Key"]
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: CYBERSECURITY_SYSTEM_PROMPT }]
        }
      ]
    });

    const result = await chat.sendMessage([{ text: message }]);
    const response = await result.response;
    const content = response.text();

    return {
      content,
      isCyberSecurityRelated: true
    };
  } catch (error: any) {
    console.error('Gemini API error:', error);
    let errorMessage = "An error occurred while processing your request.";

    if (error.status === 429) {
      errorMessage = "I'm currently experiencing high traffic. Please try again in a minute.";
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }

    return {
      content: errorMessage,
      isCyberSecurityRelated: false,
      suggestedTopics: ["Try a different question", "Wait a moment"]
    };
  }
}
