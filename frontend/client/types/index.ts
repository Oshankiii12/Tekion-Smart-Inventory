export interface Persona {
  label: string;
  primary_needs: string[];
  secondary_needs: string[];
  constraints: string[];
}

export interface Match {
  id: string;
  name: string;
  score: number;
  reasons: string[];
  image_url?: string;
  price_band?: "low" | "mid" | "upper_mid" | "high" | string;
  body_type?: string;
  specs?: CarSpecs | null;
}

export interface RecommendResponse {
  persona: Persona;
  matches: Match[];
}

export interface HealthResponse {
  status: string;
  env?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface CarSpecs {
  make: string | null;
  model: string | null;
  raw_name: string | null;
  year: number | null;
  seats: number | null;
  price: number | null;
  price_band: "low" | "mid" | "upper_mid" | "high" | string | null;
  fuel_type: string | null;
  engine: string | null;
  max_power: string | null;
  torque: string | null;
  mileage: string | null;
  drivetrain: string | null;
  transmission: string | null;
  tags: string | null;
}