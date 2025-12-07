import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Index() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Discover Your Perfect Vehicle
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Turn your lifestyle story into smart vehicle recommendations. Our
              AI-powered matching engine understands your needs and finds the
              perfect fit for your life.
            </p>

            <div className="flex gap-4">
              <Link to="/smart-match" className="inline-block">
                <Button variant="default" size="lg" className="gap-2">
                  Start Matching <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden h-80 shadow-lg">
            <img
              src="/hero.jpg"
              alt="Smart vehicle lifestyle matching"
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.currentTarget;
                img.style.display = "none";
                const fallback = img.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "flex";
              }}
            />

            <div
              className="hidden w-full h-full bg-gradient-to-br from-primary to-teal-600 items-center justify-center text-white"
            >
              <div className="text-center">
                <div className="text-8xl mb-4">🚗</div>
                <p className="text-xl font-medium">Smart Matching</p>
              </div>
            </div>
          </div>

        </div>

        <div className="mb-20">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
            Why Choose Lifestyle Match?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-3">
              <div className="text-4xl text-center mb-4">🧠</div>
              <h3 className="text-xl text-center font-bold text-foreground mb-2">
                Semantic Understanding
              </h3>
              <p className="text-muted-foreground text-center text-sm">
                AI-powered semantic analysis understands your lifestyle beyond
                simple filters.
              </p>
            </Card>

            <Card className="p-3">
              <div className="text-4xl text-center mb-4">🎯</div>
              <h3 className="text-xl text-center font-bold text-foreground mb-2">
                Personalized Matches
              </h3>
              <p className="text-muted-foreground text-center text-sm">
                Get top 3 vehicle recommendations tailored specifically to your
                needs.
              </p>
            </Card>

            <Card className="p-3">
              <div className="text-4xl text-center mb-4">💡</div>
              <h3 className="text-xl text-center font-bold text-foreground mb-2">
                Clear Explanations
              </h3>
              <p className="text-muted-foreground text-center text-sm">
                Every recommendation includes detailed explanations of why it
                fits your lifestyle.
              </p>
            </Card>
          </div>
        </div>

        <Card className="bg-gradient-to-r from-primary/10 to-teal-100/50 border-0 text-center py-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Find Your Perfect Match?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Describe your lifestyle and let our AI find the ideal vehicle for
            you.
          </p>
          <Link to="/smart-match">
            <Button variant="default" size="lg">
              Go to Smart Match
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
