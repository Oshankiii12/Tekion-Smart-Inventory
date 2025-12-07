import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, MessageSquare } from "lucide-react";
import { checkHealth } from "@/services/api";
import type { HealthResponse } from "@/types";

interface AppShellProps {
  children: React.ReactNode;
  onChatOpen?: () => void;
}

export function AppShell({ children, onChatOpen }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthResponse | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkHealthStatus = async () => {
      try {
        const status = await checkHealth();
        setHealthStatus(status);
      } catch (error) {
        console.error("Failed to check health:", error);
        setHealthStatus(null);
      } finally {
        setIsHealthLoading(false);
      }
    };

    checkHealthStatus();
    const interval = setInterval(checkHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: "Dashboard", path: "/" },
    { label: "Smart Match", path: "/smart-match" },
    { label: "Inventory", path: "/inventory" },
    { label: "History", path: "/history" },
  ];

  return (
    <div className="flex h-screen bg-background">

      <aside
        className={`${sidebarOpen ? "w-64" : "w-0"
          } hidden md:flex flex-col bg-white border-r border-border transition-all duration-300`}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm">
              <img
                src="/logo.jpg"
                alt="CatchMeIfYouCan logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = "none";
                  const fallback = img.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = "flex";
                }}
              />


              <div className="hidden w-full h-full bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                CI
              </div>
            </div>

            <div>
              <h1 className="text-sm font-bold text-foreground">Tekion AI</h1>
              <p className="text-xs text-muted-foreground">Smart Match</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive(item.path)
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary"
                }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          <p>© 2025 CatchMeIfYouCan</p>
          <p className="mt-1">AI-powered vehicle matching</p>
        </div>
      </aside>


      <div className="flex-1 flex flex-col overflow-hidden">

        <header className="bg-white border-b border-border">
          <div className="flex items-center justify-between h-20 px-4 md:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden md:block p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>

              <h1 className="text-xl font-bold text-foreground hidden md:block">
                Smart Inventory Match
              </h1>
            </div>

            <div className="flex items-center gap-4">

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-white font-bold">
                OP
              </div>
            </div>
          </div>


          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border px-4 py-4 space-y-2 bg-secondary/50">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-white/50"
                    }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
