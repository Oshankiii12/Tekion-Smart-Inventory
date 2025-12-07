import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/Chip";
import type { Persona } from "@/types";

interface PersonaBannerProps {
  persona: Persona;
  isLoading?: boolean;
}

function humanizeLabel(label: string): string {
  return label
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function PersonaBanner({ persona, isLoading }: PersonaBannerProps) {
  if (isLoading) {
    return (
      <Card className="mb-8">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4" />
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-muted rounded-full w-24" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-8 border-l-4 border-l-primary p-4 pb-0">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          Persona: <span className="text-primary">{persona.label}</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Based on your description, this is how we understand your lifestyle
          and priorities.
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Primary Needs
        </p>
        <div className="flex gap-2 flex-wrap mb-6">
          {persona.primary_needs.map((need) => (
            <Chip key={need} label={humanizeLabel(need)} variant="primary" />
          ))}
        </div>
      </div>

      {persona.secondary_needs.length > 0 && (
        <div className="mb-0">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Secondary Needs
          </p>
          <div className="flex gap-2 flex-wrap">
            {persona.secondary_needs.map((need) => (
              <Chip
                key={need}
                label={humanizeLabel(need)}
                variant="secondary"
              />
            ))}
          </div>
        </div>
      )}

    </Card>
  );
}
