import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/types";

interface ChatWidgetProps {
  onSubmit: (message: string) => Promise<string>;
  isLoading?: boolean;
  messages?: ChatMessage[];         
  onReset?: () => void;           
}

export function ChatWidget({
  onSubmit,
  isLoading = false,
  messages,
  onReset,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isLoading]);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSubmitting || isLoading) return;

    setIsSubmitting(true);
    const outgoing = trimmed;
    setInputValue("");

    try {
      await onSubmit(outgoing);
    } catch (error) {
      console.error("ChatWidget onSubmit error", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSend();
  };

  const handleResetClick = () => {
    if (!onReset) return;
    onReset();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center z-40"
        aria-label="Open chat"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageSquare className="w-6 h-6" />
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-border flex flex-col z-40 max-w-[calc(100vw-24px)] md:max-w-96">
          <div className="p-4 border-b border-border bg-gradient-to-r from-primary to-teal-600 text-white rounded-t-2xl flex items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-lg">Lifestyle Match Assistant</h3>
              <p className="text-sm opacity-90">
                Describe your needs in your own words.
              </p>
            </div>

            {onReset && (
              <button
                type="button"
                onClick={handleResetClick}
                className="inline-flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded-full"
                title="Start a new chat"
              >
                <RotateCcw className="w-3 h-3" />
                <span>New chat</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex justify-start">
                <div className="max-w-xs px-4 py-2 rounded-lg text-sm bg-secondary text-foreground rounded-bl-none">
                  Hi! I'm your Lifestyle Match Assistant. Tell me about your
                  family, commute, hobbies, or what you want from your next car,
                  and I'll find the perfect match for you.
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-secondary text-foreground rounded-bl-none"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {(isSubmitting || isLoading) && (
              <div className="flex justify-start">
                <div className="bg-secondary text-foreground px-4 py-2 rounded-lg rounded-bl-none flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                  <div
                    className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-border p-4">
            <div className="flex gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Tell me about your lifestyle..."
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                rows={3}
                disabled={isSubmitting || isLoading}
              />
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={!inputValue.trim() || isSubmitting || isLoading}
                className="self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
