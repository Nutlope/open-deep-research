import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { research } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { stateStorage } from "@/deepresearch/storage";
import { generateText, streamText } from "ai";
import { togetheraiClient } from "@/deepresearch/apiClients";
import { PROMPTS } from "@/deepresearch/config";
import * as fs from "fs";
import * as path from "path";

import { AVAILABLE_MODELS } from "@/deepresearch/config";

// Only test NEW models that weren't in previous benchmarks
const NEW_MODELS = [
  "zai-org/GLM-5.0",
  "moonshotai/Kimi-K2.5",
];

async function fetchCompletedResearch() {
  const completedResearch = await db
    .select()
    .from(research)
    .where(eq(research.status, "completed"))
    .orderBy(desc(research.completedAt))
    .limit(1);

  if (completedResearch.length === 0) {
    throw new Error("No completed research found in database");
  }

  const researchData = completedResearch[0];
  const sessionId = researchData.id;

  let searchResults: any[] = [];
  try {
    const researchState = await stateStorage.get(sessionId);
    if (researchState && researchState.searchResults && researchState.searchResults.length > 0) {
      searchResults = researchState.searchResults;
    }
  } catch (error) {
    console.log("Could not access Redis state, extracting from report citations");
  }

  if (searchResults.length === 0 && researchData.report) {
    const citationRegex = /\[INLINE_CITATION\]\(([^)]+)\)/g;
    const citations: string[] = [];
    let match;
    while ((match = citationRegex.exec(researchData.report)) !== null) {
      citations.push(match[1]);
    }

    const uniqueUrls = [...new Set(citations)];
    searchResults = uniqueUrls.map((url, index) => ({
      link: url,
      title: `Source ${index + 1}: ${new URL(url).hostname}`,
      summary: `Content extracted from ${url} for the research topic.`,
      content: `Web content from ${url} that was scraped during the research process.`
    }));
  }

  return {
    topic: researchData.researchTopic || researchData.initialUserMessage || "Unknown Topic",
    results: searchResults,
    originalReport: researchData.report
  };
}

async function generateReportWithModel(topic: string, results: any[], model: string): Promise<string> {
  const formattedSearchResults = results
    .map(r => `- Link: ${r.link}\nTitle: ${r.title}\nSummary: ${r.summary}\n\n`)
    .join("\n");

  let fullReport = "";
  const { textStream } = await streamText({
    model: togetheraiClient(model),
    messages: [
      { role: "system", content: PROMPTS.smartAnswerPrompt },
      {
        role: "user",
        content: `Research Topic: ${topic}\n\nSearch Results:\n${formattedSearchResults}`,
      },
    ],
    maxOutputTokens: 4096,
  });

  for await (const textPart of textStream) {
    fullReport += textPart;
  }

  return fullReport.trim();
}

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Starting model benchmark");
    const body = await request.json().catch(() => ({ models: NEW_MODELS }));
    const models = body.models || NEW_MODELS;
    
    const researchData = await fetchCompletedResearch();
    const { topic, results: searchResults, originalReport } = researchData;

    console.log(`📋 Topic: "${topic}"`);
    console.log(`📊 ${searchResults.length} sources extracted from citations`);

    const benchmarkResults: { 
      model: string; 
      report: string; 
      duration: number;
      tokensPerSecond: number;
    }[] = [];

    for (const model of models) {
      console.log(`🚀 Testing: ${model}`);
      const startTime = Date.now();

      try {
        const report = await generateReportWithModel(topic, searchResults, model);
        const duration = Date.now() - startTime;
        const tokensPerSecond = Math.round(report.length / (duration / 1000));

        console.log(`✅ ${model}: ${duration}ms, ${report.length} chars, ${tokensPerSecond} char/s`);

        benchmarkResults.push({
          model,
          report,
          duration,
          tokensPerSecond,
        });
      } catch (error) {
        console.error(`❌ ${model} failed:`, error);
        benchmarkResults.push({
          model,
          report: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime,
          tokensPerSecond: 0,
        });
      }
    }

    // Save results
    const outputDir = path.join(process.cwd(), "benchmark-results");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    // Save individual reports
    for (const result of benchmarkResults) {
      const safeModelName = result.model.replace(/[\/:]/g, "-");
      const content = `# Benchmark Report - ${result.model}

**Topic:** ${topic}
**Model:** ${result.model}
**Duration:** ${result.duration}ms
**Speed:** ${result.tokensPerSecond} chars/sec
**Data Source:** ${searchResults.length} sources from research citations

---

${result.report}
`;
      fs.writeFileSync(path.join(outputDir, `${timestamp}-${safeModelName}.md`), content, "utf-8");
    }

    // Save comparison summary
    const summary = `# Model Benchmark Results

**Topic:** ${topic}
**Date:** ${new Date().toISOString()}
**Sources:** ${searchResults.length} extracted from original research

## Performance Summary

| Model | Duration (ms) | Report Length | Speed (chars/sec) |
|-------|---------------|---------------|-------------------|
${benchmarkResults.map(r => `| ${r.model} | ${r.duration} | ${r.report.length} | ${r.tokensPerSecond} |`).join("\n")}

## Models Tested
${NEW_MODELS.map(m => `- ${m}`).join("\n")}

---
*Generated by Open Deep Research Benchmark*
`;

    fs.writeFileSync(path.join(outputDir, `${timestamp}-comparison.md`), summary, "utf-8");

    return NextResponse.json({
      success: true,
      topic,
      sourceCount: searchResults.length,
      results: benchmarkResults.map(r => ({
        model: r.model,
        duration: r.duration,
        reportLength: r.report.length,
        speed: r.tokensPerSecond
      })),
      outputDir,
      timestamp
    });

  } catch (error) {
    console.error("Benchmark failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
