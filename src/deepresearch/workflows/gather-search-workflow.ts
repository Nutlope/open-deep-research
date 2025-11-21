/**
 * Gather Search Workflow - Handles iterative search and research gathering
 * Self-sufficient workflow with all necessary LLM and search logic
 */

import { createWorkflow } from "@upstash/workflow/nextjs";
import { stateStorage, streamStorage } from "../storage";
import { WorkflowContext } from "@upstash/workflow";
import { generateText, generateObject } from "ai";
import { togetheraiClientWithKey } from "../apiClients";
import { MODEL_CONFIG, PROMPTS, RESEARCH_CONFIG } from "../config";
import {
  researchPlanSchema,
  SearchResult,
  SearchStartedEvent,
  SearchCompletedEvent,
  ContentProcessingEvent,
  ContentSummarizedEvent,
  EvaluationStartedEvent,
  EvaluationCompletedEvent,
  IterationCompletedEvent,
  ErrorEvent,
} from "../schemas";
import { searchOnWeb } from "../webSearch";
import dedent from "dedent";

// Helper function to summarize content
const summarizeContent = async ({
  result,
  query,
  togetherApiKey,
}: {
  result: SearchResult;
  query: string;
  togetherApiKey?: string;
}): Promise<string> => {
  console.log(`📝 Summarizing content from URL: ${result.link}`);

  // Use a higher threshold for very long content (around 128K characters)
  const isContentVeryLong = result.content.length > 100000;

  const model = isContentVeryLong
    ? togetheraiClientWithKey(togetherApiKey || "")(
        MODEL_CONFIG.summaryModelLongPages
      )
    : togetheraiClientWithKey(togetherApiKey || "")(MODEL_CONFIG.summaryModel);

  const response = await generateText({
    model,
    messages: [
      { role: "system", content: PROMPTS.rawContentSummarizerPrompt },
      {
        role: "user",
        content: dedent(
          `<Research Topic>${query}</Research Topic>\n\n<Raw Content>${result.content}</Raw Content>`
        ),
      },
    ],
  });

  return response.text;
};

// Helper function to perform web search with summarization
const webSearch = async ({
  query,
  sessionId,
  iteration,
  togetherApiKey,
}: {
  query: string;
  sessionId: string;
  iteration: number;
  togetherApiKey?: string;
}): Promise<SearchResult[]> => {
  console.log(`�� Perform web search with query: ${query}`);

  // Emit search started event
  await streamStorage.addEvent(sessionId, {
    type: "search_started",
    query,
    iteration,
    timestamp: Date.now(),
  } satisfies SearchStartedEvent);

  // Truncate long queries to avoid issues
  if (query.length > 400) {
    query = query.substring(0, 400);
    console.log(`⚠️ Truncated query to 400 characters: ${query}`);
  }

  const searchResults = await searchOnWeb({ query });
  console.log(
    `📊 Web Search Responded with ${searchResults.results.length} results`
  );

  // Emit search completed event
  await streamStorage.addEvent(sessionId, {
    type: "search_completed",
    query,
    urls: searchResults.results.map((r) => r.link),
    resultCount: searchResults.results.length,
    iteration,
    timestamp: Date.now(),
  } satisfies SearchCompletedEvent);

  // Process and summarize raw content if available
  const summarizationTasks = [];
  const resultInfo = [];

  for (const result of searchResults.results) {
    if (!result.content) {
      continue;
    }

    // Emit content processing event
    await streamStorage.addEvent(sessionId, {
      type: "content_processing",
      url: result.link,
      title: result.title || "",
      content: result.content,
      query,
      timestamp: Date.now(),
    } satisfies ContentProcessingEvent);

    // Create a task for summarization
    const task = summarizeContent({ result, query, togetherApiKey });
    summarizationTasks.push(task);
    resultInfo.push(result);
  }

  // Wait for all summarization tasks to complete
  const summarizedContents = await Promise.all(summarizationTasks);

  // Combine results with summarized content
  const resultsWithSummary: SearchResult[] = [];
  for (let i = 0; i < resultInfo.length; i++) {
    const result = resultInfo[i];
    const summarizedContent = summarizedContents[i];

    // Emit content summarized event
    await streamStorage.addEvent(sessionId, {
      type: "content_summarized",
      url: result.link,
      title: result.title || "",
      query,
      timestamp: Date.now(),
      summaryFirstHundredChars: summarizedContent,
    } satisfies ContentSummarizedEvent);

    resultsWithSummary.push({
      title: result.title || "",
      link: result.link,
      content: result.content,
      summary: summarizedContent,
    });
  }

  return resultsWithSummary;
};

// Helper function to perform searches for multiple queries
const performSearch = async ({
  queries,
  sessionId,
  iteration,
  togetherApiKey,
}: {
  queries: string[];
  sessionId: string;
  iteration: number;
  togetherApiKey?: string;
}): Promise<SearchResult[]> => {
  const tasks = queries.map(async (query) => {
    return await webSearch({
      query,
      sessionId,
      iteration,
      togetherApiKey,
    });
  });

  const resultsList = await Promise.all(tasks);

  // Combine all results
  let combinedResults: SearchResult[] = [];
  for (const results of resultsList) {
    combinedResults = [...combinedResults, ...results];
  }

  // Simple deduplication by URL
  const seen = new Set<string>();
  const dedupedResults = combinedResults.filter((result) => {
    if (seen.has(result.link)) {
      return false;
    }
    seen.add(result.link);
    return true;
  });

  console.log(
    `Search complete, found ${dedupedResults.length} results after deduplication`
  );
  return dedupedResults;
};

// Helper function to evaluate research completeness
const evaluateResearchCompleteness = async ({
  topic,
  results,
  queries,
  togetherApiKey,
}: {
  topic: string;
  results: SearchResult[];
  queries: string[];
  togetherApiKey?: string;
}): Promise<{
  additionalQueries: string[];
  reasoning: string;
}> => {
  const formattedResults = results
    .map(
      (result) =>
        `- ${result.title}\n${
          result.summary || result.content.slice(0, 1000)
        }\n---\n`
    )
    .join("\n");

  const formattedQueries = queries.map((query) => `- ${query}`).join("\n");

  console.log(
    `📝 Evaluating research completeness for topic: ${topic} and ${results.length} results with queries: ${queries.length}`
  );

  const prompt = `
  <Research Topic>${topic}</Research Topic>
  <Search Queries Used>${formattedQueries}</Search Queries Used>
  <Current Search Results>${formattedResults}</Current Search Results>
  `;

  const evaluation = await generateText({
    model: togetheraiClientWithKey(togetherApiKey || "")(
      MODEL_CONFIG.planningModel
    ),
    messages: [
      { role: "system", content: PROMPTS.evaluationPrompt },
      {
        role: "user",
        content: prompt,
      },
    ],
  });
  console.log(`📝 Evaluation:\n\n ${evaluation.text}`);

  // Run evaluation summary and parsing in parallel
  const [evaluationSummary, parsedEvaluation] = await Promise.all([
    generateText({
      model: togetheraiClientWithKey(togetherApiKey || "")(
        MODEL_CONFIG.summaryModel
      ),
      messages: [
        { role: "system", content: PROMPTS.planSummaryPrompt },
        { role: "user", content: evaluation.text },
      ],
    }),
    generateObject({
      model: togetheraiClientWithKey(togetherApiKey || "")(
        MODEL_CONFIG.jsonModel
      ),
      messages: [
        { role: "system", content: PROMPTS.evaluationParsingPrompt },
        {
          role: "user",
          content: `Evaluation to be parsed: ${evaluation.text}`,
        },
      ],
      schema: researchPlanSchema,
    }),
  ]);

  const existingQueriesSet = new Set(queries);
  const newQueries = parsedEvaluation.object.queries.filter(
    (query) => !existingQueriesSet.has(query)
  );

  const additionalQueries = newQueries.slice(0, RESEARCH_CONFIG.maxQueries);

  return {
    additionalQueries,
    reasoning: evaluationSummary.text,
  };
};

// Types
export type GatherSearchPayload = {
  topic: string;
  queries: string[];
  existingResults: SearchResult[];
  budget: number;
  iteration: number;
  sessionId: string;
  togetherApiKey?: string;
};

// Nested workflow that handles iterative search and research gathering
export const gatherSearchQueriesWorkflow = createWorkflow<
  GatherSearchPayload,
  SearchResult[]
>(
  async (
    context: WorkflowContext<GatherSearchPayload>
  ): Promise<SearchResult[]> => {
    const {
      topic,
      queries,
      existingResults,
      budget,
      iteration,
      sessionId,
      togetherApiKey,
    } = context.requestPayload;

    // Step 1: Perform web searches for current queries using local search function
    const newSearchResults = await context.run(
      "perform-web-searches",
      async () => {
        console.log(
          `🔄 Iteration ${iteration} (budget: ${budget}) - searching ${queries.length} queries`
        );

        // Use local search function to perform searches
        const searchResults = await performSearch({
          queries,
          sessionId,
          iteration,
          togetherApiKey,
        });

        console.log(`📊 Found ${searchResults.length} new results`);
        return searchResults;
      }
    );

    // Step 2: Update state with new results
    const allResults = await context.run("update-research-state", async () => {
      // Update state in Redis

      const currentState = await stateStorage.get(sessionId);
      if (currentState) {
        currentState.searchResults.push(...newSearchResults);
        currentState.allQueries.push(...queries);
        currentState.iteration = iteration;
        await stateStorage.store(sessionId, currentState);
        return currentState.searchResults; // Return the updated search results
      }

      return existingResults;
    });

    // Step 3: Evaluate if more research is needed using local LLM function
    const evaluationResult = await context.run(
      "evaluate-research-completeness",
      async () => {
        const currentState = await stateStorage.get(sessionId);
        // we don't do evaluation if we don't have a state or if we're at the last iteration since we won't continue even if we might need more queries.
        if (!currentState || budget === 1) {
          return { needsMore: false, additionalQueries: [] };
        }

        // Emit evaluation started event
        await streamStorage.addEvent(sessionId, {
          type: "evaluation_started",
          totalResults: allResults.length,
          iteration,
          timestamp: Date.now(),
        } satisfies EvaluationStartedEvent);

        try {
          // Use local evaluation function to evaluate completeness
          const { additionalQueries, reasoning } =
            await evaluateResearchCompleteness({
              topic,
              results: allResults,
              queries: currentState.allQueries,
              togetherApiKey,
            });

          const needsMore = additionalQueries.length > 0;

          // Emit evaluation completed event
          await streamStorage.addEvent(sessionId, {
            type: "evaluation_completed",
            needsMore,
            additionalQueries,
            iteration,
            reasoning,
            timestamp: Date.now(),
          } satisfies EvaluationCompletedEvent);

          console.log(
            `🤔 Evaluation: ${needsMore ? "needs more research" : "complete"}`
          );

          return { needsMore, additionalQueries };
        } catch (error) {
          // Emit error event
          await streamStorage.addEvent(sessionId, {
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unknown error during evaluation",
            step: "evaluate-research-completeness",
            iteration,
            timestamp: Date.now(),
          } satisfies ErrorEvent);
          throw error;
        }
      }
    );

    // Step 4: Decide whether to continue iterating
    const shouldContinue =
      budget > 1 &&
      evaluationResult.needsMore &&
      evaluationResult.additionalQueries.length > 0;

    if (shouldContinue) {
      console.log(`🔄 Continuing research...`);

      // Recursively invoke this same workflow with updated parameters
      const nestedResponse = await context.invoke("nested-gather-search", {
        workflow: gatherSearchQueriesWorkflow,
        body: {
          topic,
          queries: evaluationResult.additionalQueries,
          existingResults: allResults,
          budget: budget - 1,
          iteration: iteration + 1,
          sessionId,
          togetherApiKey,
        },
      });

      if (nestedResponse.isCanceled || nestedResponse.isFailed) {
        console.error("Nested gather search workflow failed");
        return allResults;
      }

      return nestedResponse.body;
    } else {
      // Research is complete or budget exhausted
      const reason =
        budget <= 1
          ? "BUDGET EXHAUSTED"
          : !evaluationResult.needsMore
          ? "RESEARCH COMPLETE"
          : "NO ADDITIONAL QUERIES";

      // Emit iteration completed event
      await streamStorage.addEvent(sessionId, {
        type: "iteration_completed",
        iteration,
        totalResults: allResults.length,
        timestamp: Date.now(),
      } satisfies IterationCompletedEvent);

      console.log(
        `✅ Research finished (${reason}) - ${allResults.length} results`
      );

      return allResults;
    }
  }
);
