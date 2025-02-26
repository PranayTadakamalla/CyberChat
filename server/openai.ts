import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CYBERSECURITY_SYSTEM_PROMPT = `You are a cybersecurity expert chatbot. Your role is to:
1. Answer questions related to cybersecurity, information security, and digital safety
2. Provide practical advice on security best practices
3. Explain security concepts in a clear, understandable way
4. Decline to answer questions not related to cybersecurity

If a question is not related to cybersecurity, respond with:
"I'm here to assist with cybersecurity topics. If you need help with cybersecurity concepts, feel free to ask!"

Format your response as a JSON object with 'content' and 'isCyberSecurityRelated' fields.`;

export async function generateChatResponse(message: string): Promise<{
  content: string;
  isCyberSecurityRelated: boolean;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: CYBERSECURITY_SYSTEM_PROMPT },
        { role: "user", content: message }
      ],
      response_format: { type: "json_object" }
    });

    // Ensure the content is not null before parsing
    const content = response.choices[0].message.content || '{"content": "Error generating response", "isCyberSecurityRelated": false}';

    try {
      const result = JSON.parse(content);
      return {
        content: result.content,
        isCyberSecurityRelated: result.isCyberSecurityRelated
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error("Failed to generate response: " + errorMessage);
  }
}