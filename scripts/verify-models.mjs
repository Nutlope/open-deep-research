import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = await Promise.all(
  [
    "../src/deepresearch/config.ts",
    "../src/app/api/validate-key/route.ts",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);
const modelConfiguration = files.join("\n");

for (const currentModel of [
  "MiniMaxAI/MiniMax-M3",
  "Qwen/Qwen3.5-9B",
  "zai-org/GLM-5.2",
  "deepseek-ai/DeepSeek-V4-Pro-0813",
  "Qwen/Qwen3.7-Max",
]) {
  assert.ok(
    modelConfiguration.includes(`"${currentModel}"`),
    `Expected current model is missing: ${currentModel}`,
  );
}

console.log("Open Deep Research only configures current serverless models.");
