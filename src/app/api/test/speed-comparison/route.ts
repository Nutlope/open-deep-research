import { NextRequest, NextResponse } from "next/server";
import chrome from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { generateText } from "ai";
import { togetheraiClient } from "@/deepresearch/apiClients";
import { MODEL_CONFIG, PROMPTS } from "@/deepresearch/config";

interface SpeedComparisonResult {
  model: string;
  summary: string;
  timeMs: number;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, content, query = "Summarize this content" } = body;

    if (!url && !content) {
      return NextResponse.json(
        { error: "Either 'url' or 'content' must be provided" },
        { status: 400 }
      );
    }

    let pageContent = content;

    // If URL is provided, fetch content using puppeteer
    if (url && !content) {
      const isProd = process.env.NODE_ENV === "production";

      let browser;

      if (isProd) {
        browser = await puppeteer.launch({
          args: chrome.args,
          defaultViewport: chrome.defaultViewport,
          executablePath: await chrome.executablePath(),
          headless: true,
        });
      } else {
        browser = await puppeteer.launch({
          headless: true,
          executablePath:
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        });
      }

      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 800 });

      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

      // Extract text content from the page
      pageContent = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style');
        scripts.forEach(script => script.remove());

        // Get text content
        return document.body.innerText || document.body.textContent || '';
      });

      await browser.close();

      if (!pageContent || pageContent.trim().length < 100) {
        return NextResponse.json(
          { error: "Could not extract sufficient content from the URL" },
          { status: 400 }
        );
      }
    }

    if (!pageContent) {
      return NextResponse.json(
        { error: "No content to summarize" },
        { status: 400 }
      );
    }

    // Truncate content if too long for testing
    const maxContentLength = 50000;
    if (pageContent.length > maxContentLength) {
      pageContent = pageContent.substring(0, maxContentLength) + "...";
    }

    const results: SpeedComparisonResult[] = [];

    // Test both models
    const models = [
      { name: "Llama-3.3-70B-Instruct-Turbo", model: MODEL_CONFIG.summaryModel },
      { name: "OpenAI GPT-OSS-20B", model: "openai/gpt-oss-20b" }
    ];

    for (const { name, model } of models) {
      const startTime = Date.now();

      try {
        const response = await generateText({
          model: togetheraiClient(model),
          messages: [
            { role: "system", content: PROMPTS.rawContentSummarizerPrompt },
            {
              role: "user",
              content: `<Research Topic>${query}</Research Topic>\n\n<Raw Content>${pageContent}</Raw Content>`,
            },
          ],
        });

        const endTime = Date.now();
        const timeMs = endTime - startTime;

        results.push({
          model: name,
          summary: response.text,
          timeMs,
        });
      } catch (error) {
        const endTime = Date.now();
        const timeMs = endTime - startTime;

        results.push({
          model: name,
          summary: "",
          timeMs,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Calculate comparison
    const validResults = results.filter(r => !r.error);
    const comparison = {
      fasterModel: validResults.length === 2
        ? (results[0].timeMs < results[1].timeMs ? results[0].model : results[1].model)
        : null,
      timeDifference: validResults.length === 2
        ? Math.abs(results[0].timeMs - results[1].timeMs)
        : null,
      contentLength: pageContent.length,
      url: url || null,
    };

    return NextResponse.json({
      results,
      comparison,
    });

  } catch (error) {
    console.error("Speed comparison error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Speed Comparison Test Endpoint",
    usage: {
      method: "POST",
      body: {
        url: "https://example.com (optional, if not provided, use content)",
        content: "Direct text content to summarize (optional, if not provided, use url)",
        query: "Research topic or summarization query (optional, defaults to 'Summarize this content')"
      }
    }
  });
}