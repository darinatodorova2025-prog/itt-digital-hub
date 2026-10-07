import { comparisonModel, publicMcpUrl } from "@/vik-proektant/comparison/config";
import { mcpHealth } from "@/vik-proektant/mcp/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  const health = mcpHealth();
  return Response.json({
    status: "ok",
    service: "vik-proektant-comparison",
    modelConfigured: comparisonModel().length > 0,
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    mcpUrl: publicMcpUrl(),
    documents: health.documents,
    chunks: health.chunks,
    deployment: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  });
}
