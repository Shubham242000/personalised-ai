export type WebSource = {
  url: string;
  title?: string;
  snippet?: string;
  publishedAt?: Date;
};

type TavilyResponse = {
  results?: Array<{
    url?: string;
    title?: string;
    content?: string;
    published_date?: string;
  }>;
};

export async function searchWeb(query: string): Promise<WebSource[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return [];
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed (${response.status})`);
  }

  const data = (await response.json()) as TavilyResponse;

  return (data.results ?? [])
    .filter((item) => typeof item.url === "string" && item.url.length > 0)
    .map((item) => ({
      url: item.url as string,
      title: item.title,
      snippet: item.content,
      publishedAt: item.published_date ? new Date(item.published_date) : undefined,
    }));
}
