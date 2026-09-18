import { createTogetherAI } from "@ai-sdk/togetherai";
import Together from "together-ai";
import Exa from "exa-js";

const APP_NAME_HELICONE = "deepresearch";

export const togetheraiClient = createTogetherAI({
  apiKey: process.env.TOGETHER_API_KEY ?? "",
  baseURL: "https://together.helicone.ai/v1",
  headers: {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
    "Helicone-Property-AppName": APP_NAME_HELICONE,
  },
});

// Dynamic TogetherAI client for client-side use
export function togetheraiClientWithKey(apiKey: string) {
  return createTogetherAI({
    apiKey: apiKey || process.env.TOGETHER_API_KEY || "",
    baseURL: "https://together.helicone.ai/v1",
    headers: {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Property-AppName": APP_NAME_HELICONE,
    },
  });
}

export function togetheraiWithKey(apiKey?: string) {
  const options: ConstructorParameters<typeof Together>[0] = {
    apiKey: apiKey || process.env.TOGETHER_API_KEY,
  };

  if (process.env.HELICONE_API_KEY) {
    options.baseURL = "https://together.helicone.ai/v1";
    options.defaultHeaders = {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Property-Appname": APP_NAME_HELICONE,
    };
  }
  return new Together(options);
}

const options: ConstructorParameters<typeof Together>[0] = {
  apiKey: process.env.TOGETHER_API_KEY,
};

if (process.env.HELICONE_API_KEY) {
  options.baseURL = "https://together.helicone.ai/v1";
  options.defaultHeaders = {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
    "Helicone-Property-Appname": APP_NAME_HELICONE,
  };
}

export const togetherai = new Together(options);

export const exa = new Exa(process.env.EXA_API_KEY ?? "");

// You.com search client (optional provider, used when SEARCH_PROVIDER=youcom).
// Talks to the You.com MCP `you-search` tool with a plain fetch — no SDK needed.
// Without YDC_API_KEY it falls back to the keyless free profile, so the
// provider works with zero signup.
const YOUCOM_MCP_URL =
  process.env.YDC_API_KEY && process.env.YDC_API_KEY.trim() !== ""
    ? "https://api.you.com/mcp"
    : "https://api.you.com/mcp?profile=free";

type McpJsonRpcResponse<T> = {
  result?: { content?: Array<{ type: string; text?: string }> };
  error?: { message?: string };
};

export async function youcomSearchTool<T>({
  name,
  arguments: args,
}: {
  name: string;
  arguments: Record<string, unknown>;
}): Promise<T> {
  const response = await fetch(YOUCOM_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(process.env.YDC_API_KEY && process.env.YDC_API_KEY.trim() !== ""
        ? { Authorization: `Bearer ${process.env.YDC_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });

  if (!response.ok) {
    throw new Error(`You.com MCP request failed: ${response.status}`);
  }

  // The server answers with `text/event-stream`; each notification is a
  // `data:` line and the final tool result is the last one carrying `result`.
  const raw = await response.text();
  let result: McpJsonRpcResponse<T> | undefined;
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      const parsed = JSON.parse(line.slice("data: ".length));
      if (parsed.result !== undefined || parsed.error !== undefined) {
        result = parsed;
      }
    } catch {
      // ignore malformed/keepalive lines
    }
  }

  if (!result) {
    throw new Error("You.com MCP returned no result");
  }
  if (result.error) {
    throw new Error(`You.com MCP error: ${result.error.message ?? "unknown"}`);
  }

  const text = result.result?.content?.find(
    (part) => part.type === "text",
  )?.text;
  if (!text) {
    throw new Error("You.com MCP returned no text content");
  }
  return JSON.parse(text) as T;
}
