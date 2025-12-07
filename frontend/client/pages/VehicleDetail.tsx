import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import type { Match } from "@/types";

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

export function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const match = location.state?.match as Match | undefined;

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Vehicle not found
          </h2>
          <p className="text-muted-foreground mb-6">
            The vehicle you're looking for doesn't exist or was not loaded.
          </p>
          <Button onClick={() => navigate(-1)}>
            Back to Smart Match
          </Button>
        </Card>
      </div>
    );
  }

  const specs = match.specs ?? null;
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const imageUrl = `${API_BASE_URL}${match.image_url}`;
  const gradientClass = getPlaceholderGradient(match.id);
  const formattedPrice = specs?.price ? formatPriceINR(specs.price) : null;

  const makeModelLine =
    (specs?.make || specs?.model) ?
      `${specs?.make ?? ""} ${specs?.model ?? ""}`.trim() :
      null;

  const yearString = specs?.year ? specs.year.toString() : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-border sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Recommendations
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="relative mb-8 rounded-xl overflow-hidden shadow-lg">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={match.name}
                  className="w-full h-96 object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = "none";
                    const fallback =
                      img.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = "block";
                  }}
                />
              ) : null}

              <div
                className={`w-full h-96 bg-gradient-to-br ${gradientClass} flex items-center justify-center`}
                style={{ display: imageUrl ? "none" : "flex" }}
              >
                <div className="text-center text-white">
                  <div className="text-9xl opacity-20 mb-4">🚗</div>
                  <p className="text-2xl font-medium opacity-70">
                    {match.body_type || "Vehicle"}
                  </p>
                </div>
              </div>

            </div>


            <div className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-2">
                {match.name}
              </h1>

              {(makeModelLine || yearString) && (
                <p className="text-base text-muted-foreground mb-1">
                  {makeModelLine}
                  {yearString ? ` · ${yearString}` : ""}
                </p>
              )}

              <p className="text-lg text-muted-foreground">
                {match.score}% Lifestyle Fit Match
              </p>
            </div>

       
            <Card className="mb-8 p-4">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Key Highlights
              </h2>

              <div className="grid grid-cols-2 gap-6">
                {formattedPrice && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Price
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {formattedPrice}
                    </p>
                  </div>
                )}

                {specs?.fuel_type && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Fuel Type
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {specs.fuel_type}
                    </p>
                  </div>
                )}

                {specs?.seats && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Seating
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {specs.seats} seats
                    </p>
                  </div>
                )}

                {(match.body_type) && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Body Type
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {match.body_type || "N/A"}
                    </p>
                  </div>
                )}

                {match.price_band && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Price Band
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {capitalizePrice(match.price_band)}
                    </p>
                  </div>
                )}

                {yearString && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Year
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {yearString}
                    </p>
                  </div>
                )}
              </div>
            </Card>

         
            {specs && (
              <Card className="mb-8 p-4">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Specifications
                </h2>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  {specs.engine && (
                    <SpecRow label="Engine" value={specs.engine} />
                  )}
                  {specs.mileage && (
                    <SpecRow label="Mileage" value={specs.mileage} />
                  )}
                  {specs.max_power && (
                    <SpecRow label="Max Power" value={specs.max_power} />
                  )}
                  {specs.torque && (
                    <SpecRow label="Torque" value={specs.torque} />
                  )}
                  {specs.transmission && (
                    <SpecRow
                      label="Transmission"
                      value={specs.transmission}
                    />
                  )}
                  {specs.drivetrain && (
                    <SpecRow label="Drivetrain" value={specs.drivetrain} />
                  )}
                  {specs.tags && (
                    <SpecRow
                      label="Highlights"
                      value={specs.tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .join(" • ")}
                    />
                  )}
                </div>
              </Card>
            )}

    
            <Card className="border-l-4 border-l-primary p-4">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Why It Fits You
              </h2>

              <div className="space-y-4">
                {match.reasons.map((reason, idx) => (
                  <div key={idx} className="flex gap-4">
                  
                    <div className="pt-1">
                      <p className="text-foreground">{reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
     
            <Card className="mb-6 text-center p-4">
              <p className="text-muted-foreground text-sm mb-4">
                Overall Lifestyle Fit
              </p>
              <div className="flex justify-center mb-2">
                <div className="w-24 h-24">
                  <ScoreBadge score={match.score} />
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Based on your lifestyle description, this vehicle matches
                {match.score >= 80
                  ? " almost all"
                  : match.score >= 60
                  ? " most"
                  : " some"}{" "}
                of your needs.
              </p>

              <div className="space-y-3">
                <Button variant="default" className="w-full">
                  Save for Customer
                </Button>
              </div>
            </Card>

          
            <Card className="p-4">
              <h3 className="font-bold text-foreground mb-4">
                Additional Information
              </h3>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Model ID
                  </p>
                  <p className="text-foreground font-mono text-xs">
                    {match.id}
                  </p>
                </div>

                {makeModelLine && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Make / Model
                    </p>
                    <p className="text-foreground">{makeModelLine}</p>
                  </div>
                )}

                {specs?.year && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Year
                    </p>
                    <p className="text-foreground">{specs.year}</p>
                  </div>
                )}

                {match.body_type && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Category
                    </p>
                    <p className="text-foreground">{match.body_type}</p>
                  </div>
                )}

                {match.price_band && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Price Range
                    </p>
                    <p className="text-foreground">
                      {capitalizePrice(match.price_band)}
                    </p>
                  </div>
                )}

                {formattedPrice && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Approx. Price
                    </p>
                    <p className="text-foreground">{formattedPrice}</p>
                  </div>
                )}

                {specs?.engine && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Engine
                    </p>
                    <p className="text-foreground">{specs.engine}</p>
                  </div>
                )}

                {specs?.mileage && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Mileage
                    </p>
                    <p className="text-foreground">{specs.mileage}</p>
                  </div>
                )}

                {specs?.max_power && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Max Power
                    </p>
                    <p className="text-foreground">{specs.max_power}</p>
                  </div>
                )}

                {specs?.torque && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Torque
                    </p>
                    <p className="text-foreground">{specs.torque}</p>
                  </div>
                )}

                {specs?.transmission && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Transmission
                    </p>
                    <p className="text-foreground">{specs.transmission}</p>
                  </div>
                )}

                {specs?.drivetrain && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Drivetrain
                    </p>
                    <p className="text-foreground">{specs.drivetrain}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SpecRowProps {
  label: string;
  value: string;
}

function SpecRow({ label, value }: SpecRowProps) {
  return (
    <div className="flex justify-between border-b border-border/60 pb-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-4">
        {label}
      </span>
      <span className="text-sm text-foreground text-right">{value}</span>
    </div>
  );
}
