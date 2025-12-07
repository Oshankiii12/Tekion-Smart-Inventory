import "./global.css";

import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ChatWidget } from "@/components/chat/ChatWidget";
import Index from "./pages/Index";
import { SmartMatch } from "./pages/SmartMatch";
import { VehicleDetail } from "./pages/VehicleDetail";
import { Inventory } from "./pages/Inventory";
import { History } from "./pages/History";
import NotFound from "./pages/NotFound";
import { recommend } from "@/services/api";

const queryClient = new QueryClient();

const AppContent = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<string[]>([]);

  const handleChatSubmit = async (message: string): Promise<string> => {
    const fullDescription = [...chatHistory, message].join(" ");

    try {
      const response = await recommend(fullDescription);
      setChatHistory((prev) => [...prev, message]);

      if (response.matches.length > 0) {
        const topMatch = response.matches[0];
        return `Based on your description, I found ${response.matches.length} great options! Your best match is the ${topMatch.name} (${topMatch.score}% lifestyle fit). ${topMatch.reasons[0]}`;
      } else {
        return "I couldn't find a strong match yet. Try describing your lifestyle in more detail, including family size, commute type, or hobbies.";
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <AppShell onChatOpen={() => setChatOpen(!chatOpen)}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/smart-match" element={<SmartMatch />} />
        <Route path="/vehicle/:id" element={<VehicleDetail />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {chatOpen && (
        <ChatWidget onSubmit={handleChatSubmit} />
      )}
    </AppShell>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
