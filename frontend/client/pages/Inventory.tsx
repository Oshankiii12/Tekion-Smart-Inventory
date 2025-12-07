import { Card } from "@/components/ui/card";

export function Inventory() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Inventory Overview
          </h1>
          <p className="text-muted-foreground">
            View and manage your vehicle inventory
          </p>
        </div>

        <Card className="text-center py-16">
          <div className="text-5xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Inventory Page
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            This page would display your vehicle inventory with details like
            model, body type, price band, and availability. Keep building by
            prompting me to add content here!
          </p>
        </Card>
      </div>
    </div>
  );
}
