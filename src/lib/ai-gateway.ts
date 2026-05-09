import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

// Map user-selected providers/models -> Lovable AI Gateway model IDs
export function mapModel(provedor: string, modelo?: string): string {
  if (provedor === "claude") return "openai/gpt-5"; // fallback to capable model
  if (provedor === "openai") {
    if (modelo?.includes("mini")) return "openai/gpt-5-mini";
    return "openai/gpt-5";
  }
  if (provedor === "groq") return "google/gemini-2.5-flash-lite";
  // gemini default
  if (modelo?.includes("pro")) return "google/gemini-2.5-pro";
  if (modelo?.includes("lite")) return "google/gemini-2.5-flash-lite";
  return "google/gemini-3-flash-preview";
}
