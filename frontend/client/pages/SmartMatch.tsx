import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { recommend, checkHealth } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PersonaBanner } from "@/components/smart-match/PersonaBanner";
import { VehicleCard } from "@/components/smart-match/VehicleCard";
import { ComparisonPanel } from "@/components/smart-match/ComparisonPanel";
import { ChatWidget } from "@/components/chat/ChatWidget";
import type { RecommendResponse, ChatMessage } from "@/types";

interface SmartMatchState {
  data: RecommendResponse | null;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = "smartMatch:recommendation:v1";
const CHAT_STORAGE_KEY = "smartMatch:chat:v1";

export function SmartMatch() {
  const [state, setState] = useState<SmartMatchState>({
    data: null,
    isLoading: false,
    error: null,
  });
  const [searchInput, setSearchInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [healthStatus, setHealthStatus] = useState(true);

  
  const persistSession = (
    data: RecommendResponse | null,
    messages: ChatMessage[]
  ) => {
    try {
      if (data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.warn("Failed to persist SmartMatch session", err);
    }
  };

  useEffect(() => {
    checkHealth()
      .then(() => setHealthStatus(true))
      .catch(() => setHealthStatus(false));

    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      const storedChat = localStorage.getItem(CHAT_STORAGE_KEY);

      if (storedData) {
        const parsed: RecommendResponse = JSON.parse(storedData);
        setState((prev) => ({
          ...prev,
          data: parsed,
        }));
      }

      if (storedChat) {
        const parsedMessages: ChatMessage[] = JSON.parse(storedChat);
        setChatMessages(parsedMessages);
      }
    } catch (err) {
      console.warn("Failed to restore SmartMatch session", err);
    }
  }, []);

  const buildUserDescriptionFromMessages = (
    messages: ChatMessage[]
  ): string => {
    const userTexts = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content.trim())
      .filter(Boolean);

    return userTexts.join(" ");
  };

  const handleChatSubmit = async (message: string): Promise<string> => {
    const trimmed = message.trim();
    if (!trimmed || !healthStatus) {
      return "Please describe your needs or lifestyle so I can recommend a vehicle.";
    }

    const lower = trimmed.toLowerCase();
    if (
      ["hi", "hello", "hey"].includes(lower) ||
      lower.startsWith("who are you") ||
      lower.startsWith("what can you do")
    ) {
      const reply =
        "Hi! I'm your Lifestyle Match Assistant. Tell me about your family, commute, trips, or what you want from your next car, and I'll recommend vehicles that fit you.";
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        timestamp: Date.now(),
      };
      const updatedMessages = [...chatMessages, userMessage, assistantMessage];
      setChatMessages(updatedMessages);
      persistSession(state.data, updatedMessages);
      return reply;
    }
    
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    const nextMessages = [...chatMessages, userMessage];

    const fullDescription = buildUserDescriptionFromMessages(nextMessages);

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await recommend(fullDescription);

      
      let assistantReply: string;
      if (response.matches.length > 0) {
        const topMatch = response.matches[0];
        const reason = topMatch.reasons[0] || "";
        assistantReply = `Based on what you've shared so far, your best match is the ${topMatch.name} (${topMatch.score}% lifestyle fit). ${reason}`;
      } else {
        assistantReply =
          "I couldn't find a strong match yet. Try describing your lifestyle in more detail — include family size, commute type, trips, or must-have features like mileage or space.";
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantReply,
        timestamp: Date.now(),
      };

      const finalMessages = [...nextMessages, assistantMessage];

      setChatMessages(finalMessages);
      setState({
        data: response,
        isLoading: false,
        error: null,
      });

      persistSession(response, finalMessages);

      return assistantReply;
    } catch (error) {
      console.error("recommend() failed", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get recommendations",
      }));
      return "Sorry, I couldn't reach the recommendation service. Please try again in a moment.";
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim() || !healthStatus) return;

    await handleChatSubmit(searchInput);
    setSearchInput("");
  };


  const handleResetConversation = () => {
    const emptyMessages: ChatMessage[] = [];
  
    setState({
      data: null,
      isLoading: false,
      error: null,
    });
  
    setChatMessages(emptyMessages);
  
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(emptyMessages));
    } catch (err) {
      console.warn("Failed to reset SmartMatch session", err);
    }
  };

  const isInitial = !state.data && !state.isLoading;

  return (
    <div className="min-h-screen">
      
      <div className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Describe your perfect day, your lifestyle, or how you'll use the car…"
                disabled={!healthStatus || state.isLoading}
                className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <Button
              type="submit"
              variant="default"
              disabled={!searchInput.trim() || !healthStatus || state.isLoading}
            >
              {state.isLoading ? "Thinking…" : "Search"}
            </Button>
          </form>
          {!healthStatus && (
            <p className="text-sm text-red-600 mt-2">
              ⚠️ Backend unavailable. Please check your connection.
            </p>
          )}
        </div>
      </div>


      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        {isInitial && (
          <div className="text-center py-20">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Lifestyle Vehicle Match
            </h1>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              Turn your lifestyle story into the perfect vehicle match. Describe
              how you live, and we'll recommend cars that fit your needs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="py-12">
                  <div className="text-5xl mb-4 text-muted-foreground opacity-30">
                    🚗
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Your recommendations will appear here once you describe your
                    needs.
                  </p>
                </Card>
              ))}
            </div>

            <div className="bg-secondary/50 rounded-xl p-8 max-w-2xl mx-auto">
              <h3 className="font-bold text-foreground mb-4">
                How it works:
              </h3>
              <ul className="text-left space-y-3 text-muted-foreground text-sm">
                <li className="flex gap-3">
                  <span className="text-primary font-bold">→</span>
                  <span>Tell us about your lifestyle, family, and commute</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary font-bold">→</span>
                  <span>We analyze your needs using AI-powered semantics</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary font-bold">→</span>
                  <span>
                    Get personalized recommendations with detailed explanations
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {state.isLoading && !state.data && (
          <div className="space-y-8">
            <PersonaBanner
              persona={{
                label: "",
                primary_needs: [],
                secondary_needs: [],
                constraints: [],
              }}
              isLoading
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted rounded-xl h-96" />
                </div>
              ))}
            </div>
          </div>
        )}

        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm">{state.error}</p>
          </div>
        )}

        {state.data && (
          <div className="space-y-8">
            <PersonaBanner persona={state.data.persona} />

            {state.data.matches.length === 0 ? (
              <Card className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  We couldn't find a strong match yet. Try describing your
                  lifestyle in a bit more detail, such as family size, commute
                  type, trips, or hobbies.
                </p>
              </Card>
            ) : (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-6">
                    Smart Recommendations
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {state.data.matches.map((match) => (
                      <VehicleCard key={match.id} match={match} />
                    ))}
                  </div>
                </div>

                <ComparisonPanel matches={state.data.matches} />
              </>
            )}
          </div>
        )}
      </div>

      <ChatWidget
        onSubmit={handleChatSubmit}
        isLoading={state.isLoading}
        messages={chatMessages} 
        onReset={handleResetConversation}
      />
    </div>
  );
}
