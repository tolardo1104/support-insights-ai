import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

export function getProviderAndModel(provedor: string, apiKey: string, modelo?: string | null) {
  if (provedor === "gemini") {
    const google = createGoogleGenerativeAI({ apiKey });
    let m = modelo || "gemini-2.0-flash"; // Default seguro para free tier
    return google(m);
  }
  if (provedor === "openai") {
    const openai = createOpenAI({ apiKey });
    return openai(modelo || "gpt-4o-mini");
  }
  if (provedor === "claude") {
    const anthropic = createAnthropic({ apiKey });
    let m = modelo || "claude-3-5-sonnet-latest";
    if (m === "claude-sonnet-4") m = "claude-3-5-sonnet-latest";
    if (m === "claude-opus-4") m = "claude-3-opus-latest";
    return anthropic(m);
  }
  if (provedor === "groq") {
    const groq = createOpenAICompatible({
      name: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return groq(modelo || "llama-3.3-70b-versatile");
  }

  // Fallback Lovable AI Gateway
  const lovable = createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
  return lovable("google/gemini-2.5-flash-lite");
}

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

export function mapModel(provedor: string, modelo?: string): string {
  return "google/gemini-2.5-flash-lite";
}