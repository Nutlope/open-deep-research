import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = await Promise.all(
  [
    "../src/deepresearch/config.ts",
    "../src/app/api/validate-key/route.ts",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);
const modelConfiguration = files.join("\n");

for (const removedModel of [
  "MiniMaxAI/MiniMax-M2.7",
  "Qwen/Qwen3-Next-80B-A3B-Instruct",
  "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  "deepseek-ai/DeepSeek-V3.1",
  "Qwen/Qwen3-235B-A22B-Instruct-2507-tput",
  "zai-org/GLM-5",
  "moonshotai/Kimi-K2.5",
]) {
  assert.ok(
    !modelConfiguration.includes(removedModel),
    `Removed model is still configured: ${removedModel}`,
  );
}

for (const currentModel of [
  "MiniMaxAI/MiniMax-M3",
  "Qwen/Qwen3.5-9B",
  "deepseek-ai/DeepSeek-V4-Pro",
  "Qwen/Qwen3.7-Max",
  "moonshotai/Kimi-K2.6",
]) {
  assert.ok(
    modelConfiguration.includes(currentModel),
    `Expected current model is missing: ${currentModel}`,
  );
}

console.log("Open Deep Research only configures current serverless models.");
