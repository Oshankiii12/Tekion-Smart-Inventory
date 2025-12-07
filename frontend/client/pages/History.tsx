import { Card } from "@/components/ui/card";

export function History() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Search History
          </h1>
          <p className="text-muted-foreground">
            View your recent recommendation searches
          </p>
        </div>

        <Card className="text-center py-16">
          <div className="text-5xl mb-4">⏱️</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            History Page
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            This page would show your recent searches and recommendations.
            Each item would display the original description, persona, and top
            match. Tell me to add search history tracking!
          </p>
        </Card>
      </div>
    </div>
  );
}
