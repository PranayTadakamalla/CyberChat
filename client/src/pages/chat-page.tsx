import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Send, Shield, LogOut } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Conversation } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  const scrollRef = React.useRef<HTMLDivElement>(null);

  const { data: conversations = [], refetch: refetchConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    refetchOnWindowFocus: false,
    onSuccess: () => {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chat", { message });
      const data = await res.json();
      return data;
    },
    onSuccess: async (data) => {
      await refetchConversations();
      setMessage("");
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth" });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: error.message || "Please try again later",
      });
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
            <span>Welcome, {user?.username || user?.email}</span> {/* Display username if available, otherwise email */}
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
        <ScrollArea className="flex-1 rounded-lg border border-border bg-card p-4 mb-4 flex flex-col">
          {[...conversations].reverse().map((conv) => (
            <div key={conv.id} className="mb-4">
              <div className="bg-muted p-3 rounded-lg mb-2">
                <p className="font-medium">You</p>
                <p>{conv.message}</p>
              </div>
              <div className="bg-cyan-500/10 p-3 rounded-lg">
                <p className="font-medium text-cyan-500">CyberBot</p>
                <p className="whitespace-pre-wrap break-words">{conv.response}</p>
                {conv.suggestedTopics && conv.suggestedTopics.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">Suggested security topics:</p>
                    <div className="flex flex-wrap gap-2">
                      {conv.suggestedTopics.map((topic, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMessage(topic);
                          }}
                        >
                          {topic}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
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