import { Card } from "@/components/ui/card";
import type { Match } from "@/types";

interface ComparisonPanelProps {
  matches: Match[];
  isLoading?: boolean;
}

function capitalizePrice(price: string) {
  if (price === "upper_mid") return "Upper Mid";
  return price.charAt(0).toUpperCase() + price.slice(1);
}

function formatPriceINR(price?: number | null): string | null {
  if (price == null) return null;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `₹ ${price.toLocaleString("en-IN")}`;
  }
}

export function ComparisonPanel({
  matches,
  isLoading = false,
}: ComparisonPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  const comparisonRows: {
    label: string;
    key: string;
    getValue: (match: Match) => string;
  }[] = [
    {
      label: "Body Type",
      key: "body_type",
      getValue: (match: Match) => match.body_type || "N/A",
    },
    {
      label: "Price Band",
      key: "price_band",
      getValue: (match: Match) =>
        match.price_band ? capitalizePrice(match.price_band) : "N/A",
    },
    {
      label: "Price",
      key: "price",
      getValue: (match: Match) => {
        const price = match.specs?.price;
        const formatted = formatPriceINR(price);
        return formatted ?? "N/A";
      },
    },
    {
      label: "Fuel Type",
      key: "fuel_type",
      getValue: (match: Match) =>
        match.specs?.fuel_type ? match.specs.fuel_type : "N/A",
    },
    {
      label: "Seats",
      key: "seats",
      getValue: (match: Match) =>
        match.specs?.seats ? `${match.specs.seats}` : "N/A",
    },
    {
      label: "Engine",
      key: "engine",
      getValue: (match: Match) => match.specs?.engine || "N/A",
    },
    {
      label: "Mileage",
      key: "mileage",
      getValue: (match: Match) => match.specs?.mileage || "N/A",
    },
    {
      label: "Max Power",
      key: "max_power",
      getValue: (match: Match) => match.specs?.max_power || "N/A",
    },
    {
      label: "Torque",
      key: "torque",
      getValue: (match: Match) => match.specs?.torque || "N/A",
    },
    {
      label: "Transmission",
      key: "transmission",
      getValue: (match: Match) => match.specs?.transmission || "N/A",
    },
    {
      label: "Drivetrain",
      key: "drivetrain",
      getValue: (match: Match) => match.specs?.drivetrain || "N/A",
    },
    {
      label: "Year",
      key: "year",
      getValue: (match: Match) =>
        match.specs?.year ? match.specs.year.toString() : "N/A",
    },
    {
      label: "Lifestyle Fit",
      key: "score",
      getValue: (match: Match) => `${match.score}%`,
    },
    {
      label: "Why it fits you",
      key: "reasons",
      getValue: (match: Match) => match.reasons[0] || "N/A",
    },
  ];

  return (
    <Card className="mt-8 p-2">
      <h3 className="text-lg text-center font-bold text-foreground mb-6">
        Quick Comparison
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                Feature
              </th>
              {matches.slice(0, 3).map((match) => (
                <th
                  key={match.id}
                  className="text-left py-3 px-4 text-sm font-bold text-foreground"
                >
                  {match.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr
                key={row.key}
                className="border-b border-border hover:bg-secondary/50"
              >
                <td className="py-4 px-4 text-sm font-medium text-muted-foreground">
                  {row.label}
                </td>
                {matches.slice(0, 3).map((match) => (
                  <td
                    key={`${match.id}-${row.key}`}
                    className="py-4 px-4 text-sm text-foreground align-top"
                  >
                    {row.key === "reasons" ? (
                      <span className="line-clamp-2 text-xs">
                        {row.getValue(match)}
                      </span>
                    ) : (
                      row.getValue(match)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
