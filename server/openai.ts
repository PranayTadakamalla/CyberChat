
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CYBERSECURITY_SYSTEM_PROMPT = `You are a friendly and knowledgeable cybersecurity expert chatbot. Your role is to:

1. Respond naturally to greetings and pleasantries while maintaining a security-focused persona
2. Answer questions related to cybersecurity, information security, and digital safety in detail
3. Provide practical advice and step-by-step guidance on security best practices
4. Explain complex security concepts in a clear, understandable way
5. For non-security questions, politely redirect to cybersecurity topics

When responding:
- For greetings (e.g., "hi", "hello", "how are you"): Respond naturally but mention your security expertise
- For cybersecurity questions: Provide detailed, actionable answers
- For non-security questions: Politely explain that you specialize in cybersecurity and suggest some security-related topics
- Always maintain context for follow-up questions about security topics

Format your response as a JSON object with:
{
  "content": "Your response text",
  "isCyberSecurityRelated": boolean,
  "suggestedTopics": ["topic1", "topic2"] // Only include for non-security questions
}`;

interface ChatResponse {
  content: string;
  isCyberSecurityRelated: boolean;
  suggestedTopics?: string[];
}

export async function generateChatResponse(message: string): Promise<ChatResponse> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      content: "OpenAI API key is not configured. Please add it to the Secrets tool.",
      isCyberSecurityRelated: false,
      suggestedTopics: ["Configure API Key"]
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a more widely available model
      messages: [
        { role: "system", content: CYBERSECURITY_SYSTEM_PROMPT },
        { role: "user", content: message }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{"content": "Error generating response", "isCyberSecurityRelated": false}';

    try {
      const result = JSON.parse(content);
      return {
        content: result.content,
        isCyberSecurityRelated: result.isCyberSecurityRelated,
        suggestedTopics: result.suggestedTopics
      };
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return {
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        isCyberSecurityRelated: false
      };
    }
  } catch (error: unknown) {
    console.error('OpenAI API error:', error);
    let errorMessage = "An error occurred while processing your request.";
    
    if (error instanceof Error) {
      if (error.message.includes("quota")) {
        errorMessage = "API quota exceeded. Please check your OpenAI account.";
      } else if (error.message.includes("invalid")) {
        errorMessage = "Invalid API key. Please check your API key configuration.";
      }
    }

    return {
      content: errorMessage,
      isCyberSecurityRelated: false,
      suggestedTopics: ["Check API Configuration", "Verify API Key"]
    };
  }
}
