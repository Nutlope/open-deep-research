import z from "zod";
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
  // 1. Call Brave Search API for web results
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
      query
    )}&count=5&result_filter=web`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": process.env.BRAVE_API_KEY || "",
      } as HeadersInit,
    }
  );
  const responseJson = await res.json();
  const parsedResponseJson = z
    .object({
      web: z.object({
        results: z.array(
          z.object({
            url: z.string(),
            title: z.string(),
            meta_url: z.object({
              favicon: z.string(),
            }),
            extra_snippets: z.array(z.string()).default([]),
            thumbnail: z
              .object({
                original: z.string(),
              })
              .optional(),
          })
        ),
      }),
    })
    .parse(responseJson);

  const parsedResults = parsedResponseJson.web.results.map((r) => ({
    title: r.title,
    url: r.url,
    favicon: r.meta_url.favicon,
    extraSnippets: r.extra_snippets,
    thumbnail: r.thumbnail?.original,
  }));

  // 2. Validate and type results
  const searchResultSchema = z.object({
    title: z.string(),
    url: z.string(),
    favicon: z.string(),
    extraSnippets: z.array(z.string()).default([]),
    thumbnail: z.string().optional(),
  });
  type SearchResult = z.infer<typeof searchResultSchema>;
  const schema = z.array(searchResultSchema);
  const searchResults = schema.parse(parsedResults);

  // 4. Scrape each result with Firecrawl
  async function scrapeSearchResult(searchResult: SearchResult) {
    let scrapedText = "";
    let scrapeResponse:
      | Awaited<ReturnType<typeof firecrawl.scrape>>
      | undefined;
    try {
      scrapeResponse = await firecrawl.scrape(searchResult.url, {
        formats: ["markdown"],
        timeout: 15000,
        // 24 hours
        maxAge: 24 * 60 * 60 * 1000,
      });
      const rawText = scrapeResponse.markdown ?? "";
      scrapedText = stripUrlsFromMarkdown(rawText).substring(0, 80_000);
    } catch (e) {
      // ignore individual scrape errors
      console.warn("Error scraping", searchResult.url, " with error", e);
    }
    return {
      title: searchResult.title,
      link: searchResult.url,
      content: scrapedText,
    };
  }

  const resultsSettled = await Promise.allSettled(
    searchResults.map(scrapeSearchResult)
  );

  const results = resultsSettled
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<any>).value)
    .filter((r) => r.content !== "");

  if (results.length === 0) {
    return { results: [] };
  }
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
