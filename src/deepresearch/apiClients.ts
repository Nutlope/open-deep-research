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

export function togetheraiWithKey(apiKey: string) {
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
