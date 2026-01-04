import { z } from "zod";
import { defineTool } from "@/definitions/define.ts";
import { ScrapboxWriter } from "@/features/scrapbox-writer/scrapbox-writer.ts";

export const createPageTool = defineTool({
  name: "create_page",
  title: "Create Page",
  description:
    "新規ページを作成。既存ページの場合は全置換される。WebSocket API経由で即時作成。",
  inputSchema: {
    title: z.string().describe("ページタイトル"),
    body: z.string().describe("ページ本文（Scrapbox記法）"),
  },
  handler: async ({ title, body }) => {
    const writer = ScrapboxWriter.getInstance();
    const result = await writer.createPage(title, body);

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
          text: `Created page: ${title}\nURL: ${url}`,
        },
      ],
    };
  },
});
