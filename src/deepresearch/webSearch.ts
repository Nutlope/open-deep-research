import { SearchData, SearchResultWeb } from "@mendable/firecrawl-js";
import { firecrawl } from "./apiClients";

import { SearchResult } from "./schemas";

type SearchResults = {
  results: SearchResult[];
};

export const searchOnWeb = async ({
  query,
}: {
  query: string;
}): Promise<SearchResults> => {
  // Use Firecrawl search with scraping
  const searchResponse = (await firecrawl.search(query, {
    limit: 5,
    sources: ["web"] as const,
    scrapeOptions: {
      formats: ["markdown"],
      timeout: 15000,
      // 48 hours - 2 days
      maxAge: 48 * 60 * 60 * 1000,
    },
  })) as SearchData;

  const webResults = searchResponse?.web as (SearchResultWeb & {
    markdown?: string;
  })[];

  // Process the results
  const results = webResults
    .filter((result) => result.markdown && result.markdown.length > 0) // Only include results with content
    ?.map((result) => ({
      title: result.title ?? "",
      link: result.url,
      content: stripUrlsFromMarkdown(result.markdown ?? "").substring(
        0,
        80_000
      ),
    }))
    ?.filter((result) => result.content !== "");

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
