import { z } from "zod";
import { defineTool } from "@/definitions/define.ts";
import { ScrapboxClient } from "@/features/scrapbox-client/scrapbox-client.ts";

export const searchPagesTool = defineTool({
  name: "search_pages",
  title: "Search Pages",
  description: `キーワードでページを全文検索。最大100件の制限あり（API制限）。

検索構文:
- 複数語句: スペース区切りでAND検索
- 除外検索: -word で除外
- フレーズ検索: "exact phrase" で囲む`,
  inputSchema: {
    query: z.string().describe("検索クエリ"),
  },
  handler: async ({ query }) => {
    const client = ScrapboxClient.getInstance();
    const result = await client.searchPages(query);

    if (result.isErr()) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: result.error.message }],
      };
    }

    const { pages, count, searchQuery } = result.value;
    const output = [
      `Search: "${searchQuery}"`,
      `Found ${count} results:`,
      "",
      ...pages.map((page) => {
        const snippet = page.lines.slice(0, 3).join(" ").slice(0, 100);
        return `- ${page.title}\n  ${snippet}...`;
      }),
    ].join("\n");

    return {
      content: [{ type: "text" as const, text: output }],
    };
  },
});
