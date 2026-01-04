import { z } from "zod";
import { defineTool } from "@/definitions/define.ts";
import { ScrapboxWriter } from "@/features/scrapbox-writer/scrapbox-writer.ts";

export const updatePageTool = defineTool({
  name: "update_page",
  title: "Update Page",
  description: "既存ページを更新（全置換）。WebSocket API経由で即時更新。",
  inputSchema: {
    title: z.string().describe("ページタイトル"),
    body: z.string().describe("新しい本文（Scrapbox記法）"),
  },
  handler: async ({ title, body }) => {
    const writer = ScrapboxWriter.getInstance();
    const result = await writer.updatePage(title, body);

    if (result.isErr()) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: result.error.message }],
      };
    }

    const { url } = result.value;
    return {
      content: [
        {
          type: "text" as const,
          text: `Updated page: ${title}\nURL: ${url}`,
        },
      ],
    };
  },
});
