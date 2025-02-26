import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Send, Shield, LogOut } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Conversation } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const { user, logoutMutation } = useAuth();

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chat", { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessage("");
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold">CyberChat</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span>Welcome, {user?.username}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <ScrollArea className="flex-1 rounded-lg border border-border bg-card p-4 mb-4">
          {conversations?.map((conv) => (
            <div key={conv.id} className="mb-4">
              <div className="bg-muted p-3 rounded-lg mb-2">
                <p className="font-medium">You</p>
                <p>{conv.message}</p>
              </div>
              <div className="bg-cyan-500/10 p-3 rounded-lg">
                <p className="font-medium text-cyan-500">CyberBot</p>
                <p>{conv.response}</p>
              </div>
            </div>
          ))}
        </ScrollArea>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (message.trim()) {
              chatMutation.mutate(message);
            }
          }}
          className="flex space-x-2"
        >
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about cybersecurity..."
            className="flex-1"
            disabled={chatMutation.isPending}
          />
          <Button type="submit" disabled={chatMutation.isPending || !message.trim()}>
            {chatMutation.isPending ? "Sending..." : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </main>
    </div>
  );
}
