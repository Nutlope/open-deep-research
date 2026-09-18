import { parseSlugFromUrl } from "@/lib/utils";
import { exa, youcomSearchTool } from "./apiClients";

import { SearchResult } from "./schemas";

type SearchResults = {
  results: SearchResult[];
};

const SEARCH_PROVIDER = (process.env.SEARCH_PROVIDER ?? "exa").toLowerCase();

export const searchOnWeb = async ({
  query,
}: {
  query: string;
}): Promise<SearchResults> => {
  if (SEARCH_PROVIDER === "youcom") {
    return searchWithYoucom({ query });
  }
  return searchWithExa({ query });
};

// Use You.com search with full-page extraction (SEARCH_PROVIDER=youcom)
type YoucomSearchResponse = {
  results?: {
    web?: Array<{
      url: string;
      title?: string;
      description?: string;
      snippets?: string[];
      contents?: { markdown?: string; highlights?: string[] };
    }>;
    news?: Array<{
      url: string;
      title?: string;
      description?: string;
      snippets?: string[];
      contents?: { markdown?: string; highlights?: string[] };
    }>;
  };
};

async function searchWithYoucom({
  query,
}: {
  query: string;
}): Promise<SearchResults> {
  const response = await youcomSearchTool<YoucomSearchResponse>({
    name: "you-search",
    arguments: {
      query,
      count: 5,
      extraction: "full_page",
    },
  });

  const webResults = [
    ...(response.results?.web ?? []),
    ...(response.results?.news ?? []),
  ];

  const results = webResults
    .map((result) => {
      const content =
        result.contents?.markdown ??
        result.contents?.highlights?.join("\n\n") ??
        result.snippets?.join("\n\n") ??
        result.description ??
        "";
      return {
        title: result.title ?? parseSlugFromUrl(result.url) ?? "",
        link: result.url,
        content: stripUrlsFromMarkdown(content).substring(0, 80_000),
      };
    })
    .filter((result) => result.content !== "");

  return { results };
}

// Use Exa search with contents
async function searchWithExa({
  query,
}: {
  query: string;
}): Promise<SearchResults> {
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
}

// 3. Markdown stripping helper
function stripUrlsFromMarkdown(markdown: string): string {
  let result = markdown;
  result = result.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g,
    "$1",
  );
  result = result.replace(
    /\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g,
    "$1",
  );
  result = result.replace(
    /^\[[^\]]+\]:\s*https?:\/\/[^\s]+(?:\s+"[^"]*")?$/gm,
    "",
  );
  result = result.replace(/<(https?:\/\/[^>]+)>/g, "");
  result = result.replace(/https?:\/\/[^\s]+/g, "");
  return result.trim();
}
