import type { HealthResponse, RecommendResponse } from "@/types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;


export async function checkHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      method: "GET",
    });
console.log(response);
    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Health check error:", error);
    throw error;
  }
}

export async function recommend(
  userDescription: string,
  constraints?: Record<string, unknown>
): Promise<RecommendResponse> {
  try {
    const response = await fetch(`${BASE_URL}/api/recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_description: userDescription,
        constraints: constraints || {},
      }),
    });

    if (!response.ok) {
      throw new Error(`Recommendation failed with status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Recommendation error:", error);
    throw error;
  }
}
