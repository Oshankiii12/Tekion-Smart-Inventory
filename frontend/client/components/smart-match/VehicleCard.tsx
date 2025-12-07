import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { Button } from "@/components/ui/button";
import type { Match } from "@/types";

interface VehicleCardProps {
  match: Match;
}

function getPlaceholderGradient(id: string): string {
  const colors = [
    "from-teal-400 to-cyan-500",
    "from-blue-400 to-teal-500",
    "from-emerald-400 to-teal-500",
  ];
  const index = id.charCodeAt(0) % colors.length;
  return colors[index];
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

export function VehicleCard({ match }: VehicleCardProps) {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const imageUrl = match.image_url
      ? match.image_url.startsWith("http")
        ? match.image_url
        : `${API_BASE_URL}${match.image_url}`
      : null;
  const gradientClass = getPlaceholderGradient(match.id);
  const specs = match.specs ?? null;
  const formattedPrice = specs?.price ? formatPriceINR(specs.price) : null;


  const makeModelLine =
    (specs?.make || specs?.model) ?
      `${specs?.make ?? ""} ${specs?.model ?? ""}`.trim() :
      null;

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow relative overflow-hidden group">

      <div className="relative -mx-6 -mt-6 mb-4">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={match.name}
            className="w-full h-48 object-cover rounded-t-xl"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              const fallback = img.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        ) : null}

        <div
          className={`w-full h-48 bg-gradient-to-br ${gradientClass} flex items-center justify-center`}
          style={{ display: imageUrl ? "none" : "flex" }}
        >
          <div className="text-center text-white">
            <div className="text-5xl opacity-20 mb-2">🚗</div>
            <p className="text-sm font-medium opacity-70">
              {match.body_type || "Vehicle"}
            </p>
          </div>
        </div>

        <div className="absolute top-8 right-8 opacity-90 group-hover:opacity-100 transition-opacity">
          <ScoreBadge score={match.score} />
        </div>
      </div>

      <div className="flex-1 px-4 pb-4">
        <h3 className="text-lg font-bold text-center text-foreground mb-1">
          {match.name}
        </h3>

        {makeModelLine && (
          <p className="text-xs text-muted-foreground text-center mb-1">
            {makeModelLine}
            {specs?.year ? ` · ${specs.year}` : ""}
          </p>
        )}

        <div className="text-xs text-muted-foreground mb-2 text-center">
          {match.body_type && (
            <>
              {match.body_type}
              {match.price_band && match.price_band !== "N/A" && (
                <>
                  {" · "}
                  <span className="text-primary font-medium">
                    {capitalizePrice(match.price_band)}
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {(formattedPrice || specs?.fuel_type || specs?.seats) && (
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-3">
            {formattedPrice && (
              <span className="font-semibold text-primary/90">
                {formattedPrice}
              </span>
            )}
            {specs?.fuel_type && <span>{specs.fuel_type}</span>}
            {specs?.seats && <span>{specs.seats} seats</span>}
          </div>
        )}

        <div className="mb-3 space-y-2">
          {match.reasons.slice(0, 2).map((reason, idx) => (
            <div key={idx} className="flex gap-2 text-xs text-foreground">
              <div className="flex-shrink-0 text-primary font-bold">•</div>
              <p>{reason}</p>
            </div>
          ))}
        </div>

        {specs && (specs.engine || specs.mileage) && (
          <div className="border-t border-border pt-2 mt-auto text-[11px] text-muted-foreground space-y-1">
            {specs.engine && (
              <div className="flex justify-between">
                <span>Engine</span>
                <span>{specs.engine}</span>
              </div>
            )}
            {specs.mileage && (
              <div className="flex justify-between">
                <span>Mileage</span>
                <span>{specs.mileage}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Link to={`/vehicle/${match.id}`} state={{ match }} className="w-full">
        <Button variant="default" className="w-full rounded-t-none">
          View Details
        </Button>
      </Link>
    </Card>
  );
}
