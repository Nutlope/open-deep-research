import { parseSlugFromUrl } from "@/lib/utils";
import { exa } from "./apiClients";

import { SearchResult } from "./schemas";

type SearchResults = {
  results: SearchResult[];
};

export const searchOnWeb = async ({
  query,
}: {
  query: string;
}): Promise<SearchResults> => {
  // Use Exa search with contents
  const searchResponse = await exa.search(query, {
    moderation: true,
    contents: { text: true, livecrawl: "fallback" },
    numResults: 5,
  });

  const webResults = searchResponse.results;

  // Process the results
  const results = webResults
    .filter((result) => result.text && result.text.length > 0) // Only include results with content
    ?.map((result) => ({
      title: result.title ?? parseSlugFromUrl(result.url) ?? "",
      link: result.url,
      content: stripUrlsFromMarkdown(result.text ?? "").substring(0, 80_000),
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
