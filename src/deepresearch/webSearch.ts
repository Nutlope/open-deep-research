import { parseSlugFromUrl } from "@/lib/utils";
import { exa, tavilyClient } from "./apiClients";

import { SearchResult } from "./schemas";

type SearchResults = {
  results: SearchResult[];
};

const searchProvider = process.env.SEARCH_PROVIDER ?? "exa";

async function searchWithExa(query: string): Promise<SearchResult[]> {
  const searchResponse = await exa.search(query, {
    moderation: true,
    contents: { text: true, livecrawl: "fallback" },
    numResults: 5,
  });

  return searchResponse.results
    .filter((result) => result.text && result.text.length > 0)
    .map((result) => ({
      title: result.title ?? parseSlugFromUrl(result.url) ?? "",
      link: result.url,
      content: stripUrlsFromMarkdown(result.text ?? "").substring(0, 80_000),
    }))
    .filter((result) => result.content !== "");
}

async function searchWithTavily(query: string): Promise<SearchResult[]> {
  const searchResponse = await tavilyClient.search(query, {
    maxResults: 5,
    searchDepth: "advanced",
    includeRawContent: "markdown",
  });

  return searchResponse.results
    .filter((result) => (result.rawContent ?? result.content).length > 0)
    .map((result) => ({
      title: result.title ?? parseSlugFromUrl(result.url) ?? "",
      link: result.url,
      content: stripUrlsFromMarkdown(result.rawContent ?? result.content).substring(0, 80_000),
    }))
    .filter((result) => result.content !== "");
}

export const searchOnWeb = async ({
  query,
}: {
  query: string;
}): Promise<SearchResults> => {
  const results =
    searchProvider === "tavily"
      ? await searchWithTavily(query)
      : await searchWithExa(query);

  return { results };
};

// 3. Markdown stripping helper
function stripUrlsFromMarkdown(markdown: string): string {
  let result = markdown;
  result = result.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g,
    "$1"
  );
  result = result.replace(
    /\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g,
    "$1"
  );
  result = result.replace(
    /^\[[^\]]+\]:\s*https?:\/\/[^\s]+(?:\s+"[^"]*")?$/gm,
    ""
  );
  result = result.replace(/<(https?:\/\/[^>]+)>/g, "");
  result = result.replace(/https?:\/\/[^\s]+/g, "");
  return result.trim();
}
